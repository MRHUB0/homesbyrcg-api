import { findEventLeadIdentifier } from './boldtrail/mapper.js';

function emitMetric() {}

function toLeadSyncKey(lead) {
  return `lead:${lead.leadId}:${lead.updatedAt || lead.createdAt || lead.timestamp}`;
}

function toEventSyncKey(event) {
  return `event:${event.eventName || event.event}:${event.journeyId || 'unknown'}:${event.occurredAt || event.timestamp}:${event.correlationId || 'unknown'}`;
}

export class CrmSyncService {
  constructor({ adapter, leadRepository, idempotencyRepository, appEnvironment }) {
    this.adapter = adapter;
    this.leadRepository = leadRepository;
    this.idempotencyRepository = idempotencyRepository;
    this.appEnvironment = appEnvironment;
  }

  async syncLead(lead, { logger }) {
    const syncKey = toLeadSyncKey(lead);

    return this.withIdempotency(syncKey, { entityType: 'lead', leadId: lead.leadId }, async () => {
      emitMetric({
        operation: 'crm_sync',
        metricName: 'CrmSyncLeadAttemptCount',
        value: 1,
        dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
      });

      const result = await this.adapter.upsertLead(lead);

      if (result.skipped) {
        emitMetric({
          operation: 'crm_sync',
          metricName: 'CrmSyncLeadSkippedCount',
          value: 1,
          dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
        });
      } else {
        emitMetric({
          operation: 'crm_sync',
          metricName: 'CrmSyncLeadSuccessCount',
          value: 1,
          dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
        });
      }

      if (result.contactId && this.leadRepository?.updateLead) {
        await this.leadRepository.updateLead(lead.leadId, {
          metadata: {
            ...(lead.metadata || {}),
            crm: {
              ...(lead.metadata?.crm || {}),
              provider: this.adapter.name,
              boldtrailContactId: result.contactId,
              lastLeadSyncAt: new Date().toISOString(),
              lastLeadSyncKey: syncKey,
              lastLeadSyncStatus: result.status,
            },
          },
        });
      }

      logger.info('crm_sync_lead_completed', {
        operation: 'crm_sync',
        entityType: 'lead',
        status: result.status,
        leadId: lead.leadId,
        journeyId: lead.journeyId,
        funnel: lead.funnel,
        provider: this.adapter.name,
        skipped: Boolean(result.skipped),
        reason: result.reason,
      });

      return result;
    });
  }

  async syncEvent(event, { logger }) {
    const leadId = findEventLeadIdentifier(event);
    const lead = leadId ? await this.leadRepository?.getLead?.(leadId) : null;
    const syncKey = toEventSyncKey(event);

    return this.withIdempotency(
      syncKey,
      { entityType: 'event', eventId: event.eventId },
      async () => {
        emitMetric({
          operation: 'crm_sync',
          metricName: 'CrmSyncEventAttemptCount',
          value: 1,
          dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
        });

        const result = await this.adapter.syncEvent(event, { lead, logger });

        if (result.skipped) {
          emitMetric({
            operation: 'crm_sync',
            metricName: 'CrmSyncEventSkippedCount',
            value: 1,
            dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
          });
        } else {
          emitMetric({
            operation: 'crm_sync',
            metricName: 'CrmSyncEventSuccessCount',
            value: 1,
            dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
          });
        }

        logger.info('crm_sync_event_completed', {
          operation: 'crm_sync',
          entityType: 'event',
          status: result.status,
          event: event.eventName,
          eventId: event.eventId,
          journeyId: event.journeyId,
          provider: this.adapter.name,
          skipped: Boolean(result.skipped),
          reason: result.reason,
        });

        return result;
      },
    );
  }

  async withIdempotency(syncKey, payload, fn) {
    const acquired = await this.idempotencyRepository.acquire(syncKey, payload);

    if (!acquired) {
      emitMetric({
        operation: 'crm_sync',
        metricName: 'CrmSyncDuplicateSkipCount',
        value: 1,
        dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
      });

      return {
        provider: this.adapter.name,
        status: 'skipped',
        skipped: true,
        reason: 'duplicate_delivery',
      };
    }

    try {
      const result = await fn();
      await this.idempotencyRepository.complete(syncKey, {
        status: result.status,
        skipped: Boolean(result.skipped),
        reason: result.reason,
      });
      return result;
    } catch (error) {
      emitMetric({
        operation: 'crm_sync',
        metricName: 'CrmSyncFailureCount',
        value: 1,
        dimensions: { Environment: this.appEnvironment, Provider: this.adapter.name },
      });
      await this.idempotencyRepository.release(syncKey);
      throw error;
    }
  }
}
