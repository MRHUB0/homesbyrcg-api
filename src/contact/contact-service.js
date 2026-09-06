import { buildCanonicalLead, LeadTypes } from '../leads/lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeContactRequest } from './contact-validation.js';

export class ContactService extends LeadService {
  constructor({
    provider,
    repository,
    leadIntelligenceService,
    leadIntelligenceRepository,
    leadIntelligenceMetrics,
  }) {
    super({
      provider,
      repository,
      leadType: LeadTypes.CONTACT,
      leadIntelligenceService,
      leadIntelligenceRepository,
      leadIntelligenceMetrics,
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
