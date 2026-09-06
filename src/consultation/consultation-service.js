import { buildCanonicalLead, LeadTypes } from '../leads/lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeConsultationRequest } from './consultation-validation.js';

export class ConsultationService extends LeadService {
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
      leadType: LeadTypes.CONSULTATION,
      leadIntelligenceService,
      leadIntelligenceRepository,
      leadIntelligenceMetrics,
    });
  }

  normalize(payload, { context }) {
    const normalizedRequest = normalizeConsultationRequest(payload);

    return buildCanonicalLead({
      leadType: LeadTypes.CONSULTATION,
      normalizedRequest,
      context,
      metadata: {
        originalEndpoint: '/consultation',
        consultationType: normalizedRequest.consultationType,
        preferredContactMethod: normalizedRequest.preferredContactMethod,
        timeframe: normalizedRequest.timeframe,
        intent: normalizedRequest.intent,
      },
    });
  }
}
