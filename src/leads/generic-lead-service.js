import { buildCanonicalLead, LeadTypes } from './lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeGenericLeadRequest } from './generic-lead-validation.js';

export class GenericLeadService extends LeadService {
  constructor({ provider, repository }) {
    super({ provider, repository, leadType: LeadTypes.GENERIC });
  }

  normalize(payload, { context }) {
    const normalizedRequest = normalizeGenericLeadRequest(payload);

    return buildCanonicalLead({
      leadType: LeadTypes.GENERIC,
      normalizedRequest,
      context,
      metadata: {
        originalEndpoint: '/leads',
      },
    });
  }
}
