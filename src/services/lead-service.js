import { AppError, ProviderError } from '../errors/index.js';
import { redactLead } from '../leads/redaction.js';
import { nowIso } from '../shared/time.js';

export class LeadService {
  constructor({ provider, repository, leadType, analyticsService = null }) {
    this.provider = provider;
    this.repository = repository;
    this.leadType = leadType;
    this.analyticsService = analyticsService;
  }

  async submitLead(lead, { context, logger }) {
    logger.info('lead_normalized', {
      lead: redactLead(lead),
    });

    const persistedLead = await this.createLead(lead, { logger });

    await this.trackLeadLifecycle(persistedLead, { context, logger });

    if (persistedLead.idempotencyReplay && persistedLead.providerStatus) {
      logger.info('lead_idempotent_replay', {
        leadId: persistedLead.leadId,
        leadType: this.leadType,
        providerStatus: persistedLead.providerStatus,
      });

      return {
        provider: persistedLead.provider ?? this.provider.name ?? 'unknown',
        status: persistedLead.providerStatus,
        requestId: context.requestId,
        lead: persistedLead,
        duplicate: true,
      };
    }

    try {
      logger.info('provider_started', {
        leadId: persistedLead.leadId,
        leadType: this.leadType,
        provider: this.provider.name ?? 'unknown',
      });

      const providerStartedAt = Date.now();
      const result = await this.provider.submitLead(persistedLead, { context, logger });
      const providerLatency = Date.now() - providerStartedAt;

      logger.info('provider_latency', {
        leadId: persistedLead.leadId,
        leadType: this.leadType,
        provider: result.provider,
        latency: providerLatency,
      });

      logger.info('provider_completed', {
        leadId: persistedLead.leadId,
        leadType: this.leadType,
        provider: result.provider,
        providerStatus: result.status,
      });

      const updatedLead = await this.updateLead(
        persistedLead.leadId,
        {
          provider: result.provider,
          providerStatus: result.status,
          updatedAt: nowIso(),
        },
        { logger },
      );

      logger.info('lead_provider_submitted', {
        leadId: updatedLead.leadId,
        leadType: this.leadType,
        provider: result.provider,
        providerStatus: result.status,
      });

      return {
        ...result,
        lead: updatedLead,
      };
    } catch (error) {
      logger.error('lead_provider_failed', {
        leadId: persistedLead.leadId,
        leadType: this.leadType,
        error: {
          name: error.name,
          message: error.message,
        },
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ProviderError('Lead provider failed.', [
        {
          provider: this.provider.name ?? 'unknown',
          message: 'Unable to submit lead.',
        },
      ]);
    }
  }

  async createLead(lead, { logger }) {
    const startedAt = Date.now();
    const persistedLead = await this.repository.createLead(lead);
    const latency = Date.now() - startedAt;

    logger.info('repository_latency', {
      operation: 'createLead',
      leadId: persistedLead.leadId,
      latency,
    });

    logger.info('lead_created', {
      leadId: persistedLead.leadId,
      leadType: this.leadType,
      status: persistedLead.status,
      duplicate: Boolean(persistedLead.idempotencyReplay),
    });

    return persistedLead;
  }

  async updateLead(leadId, updates, { logger }) {
    const startedAt = Date.now();
    const updatedLead = await this.repository.updateLead(leadId, updates);
    const latency = Date.now() - startedAt;

    logger.info('repository_latency', {
      operation: 'updateLead',
      leadId,
      latency,
    });

    logger.info('lead_updated', {
      leadId,
      leadType: this.leadType,
      status: updatedLead.status,
      provider: updatedLead.provider,
      providerStatus: updatedLead.providerStatus,
    });

    return updatedLead;
  }

  async trackLeadLifecycle(lead, { context, logger }) {
    if (!this.analyticsService) {
      return;
    }

    await this.analyticsService.trackLeadLifecycle({ lead, context, logger });
  }
}
