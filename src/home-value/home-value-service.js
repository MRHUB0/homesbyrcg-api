import { buildCanonicalLead, LeadTypes } from '../leads/lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeHomeValueRequest } from './home-value-validation.js';

export class HomeValueService extends LeadService {
  constructor({ provider, repository }) {
    super({ provider, repository, leadType: LeadTypes.HOME_VALUE });
  }

  normalize(payload, { context }) {
    const normalizedRequest = normalizeHomeValueRequest(payload);

    return buildCanonicalLead({
      leadType: LeadTypes.HOME_VALUE,
      normalizedRequest,
      context,
      metadata: {
        originalEndpoint: '/home-value',
        propertyAddress: normalizedRequest.propertyAddress,
        city: normalizedRequest.city,
        state: normalizedRequest.state,
        zipCode: normalizedRequest.zipCode,
        propertyType: normalizedRequest.propertyType,
      },
    });
  }
}
