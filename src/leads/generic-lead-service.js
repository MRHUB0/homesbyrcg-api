import { ProviderError } from '../errors/index.js';
import { buildCanonicalLead, LeadTypes } from './lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeGenericLeadRequest } from './generic-lead-validation.js';

const campaignMetadataFields = Object.freeze([
  'source',
  'campaign',
  'eventSlug',
  'brokerage',
  'landingPage',
  'redirectDestination',
  'pageUrl',
  'referrer',
  'utm',
  'housingInterest',
  'preferredContactMethod',
  'interest',
  'timeframe',
  'helpMessage',
  'consentFollowUp',
  'qrVersion',
  'printBatch',
  'campaignVersion',
]);

function allowedMetadata(metadata = {}) {
  return Object.fromEntries(
    campaignMetadataFields
      .filter((key) => metadata[key] !== undefined)
      .map((key) => [key, metadata[key]]),
  );
}

export class GenericLeadService extends LeadService {
  constructor({
    provider,
    repository,
    analyticsService,
    leadIntelligenceService,
    leadIntelligenceRepository,
    leadIntelligenceMetrics,
    crmSyncService,
  }) {
    super({
      provider,
      repository,
      leadType: LeadTypes.GENERIC,
      analyticsService,
      leadIntelligenceService,
      leadIntelligenceRepository,
      leadIntelligenceMetrics,
      crmSyncService,
    });
  }

  async submitLead(lead, options) {
    const result = await super.submitLead(lead, options);
    if (lead.campaign === 'ARM_RESET_2026' && result.status === 'accepted') {
      result.lead = await this.repository.updateLead(result.lead.leadId, {
        notificationStatus: result.provider === 'ses' ? 'sent' : 'mocked',
      });
    }
    return result;
  }

  async handleProviderFailure(error, saved, { logger }) {
    if (saved.campaign !== 'ARM_RESET_2026' || !(error instanceof ProviderError)) return null;
    const updated = await this.repository.updateLead(saved.leadId, {
      notificationStatus: 'pending',
      notificationAttemptedAt: new Date().toISOString(),
    });
    logger.error('arm_notification_pending', {
      leadId: saved.leadId,
      reason: 'provider_unavailable',
    });
    return { provider: this.provider.name, status: 'notification_pending', lead: updated };
  }

  normalize(payload, { context }) {
    const normalizedRequest = normalizeGenericLeadRequest(payload);

    return buildCanonicalLead({
      leadType: LeadTypes.GENERIC,
      normalizedRequest,
      context,
      metadata: {
        originalEndpoint: '/leads',
        ...allowedMetadata(normalizedRequest.metadata),
        ...(normalizedRequest.campaign === 'ARM_RESET_2026'
          ? {
              requestPropertyReview: normalizedRequest.metadata.requestPropertyReview,
              propertyAddress: normalizedRequest.metadata.propertyAddress,
              requestedService: normalizedRequest.metadata.requestedService,
            }
          : {}),
      },
    });
  }
}
