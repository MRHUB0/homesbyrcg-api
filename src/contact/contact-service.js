import { buildCanonicalLead, LeadTypes } from '../leads/lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeContactRequest } from './contact-validation.js';

export class ContactService extends LeadService {
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
      leadType: LeadTypes.CONTACT,
      analyticsService,
      leadIntelligenceService,
      leadIntelligenceRepository,
      leadIntelligenceMetrics,
      crmSyncService,
    });
  }

  normalize(payload, { context }) {
    const normalizedRequest = normalizeContactRequest(payload);

    return buildCanonicalLead({
      leadType: LeadTypes.CONTACT,
      normalizedRequest,
      context,
      metadata: {
        originalEndpoint: '/contact',
      },
    });
  }
}
