import { LeadTypes, normalizeLeadRequest } from './lead-model.js';
import { Validators } from '../validation/validators.js';

export function normalizeGenericLeadRequest(payload) {
  const isEventCampaign = payload?.campaign === 'affordable-real-estate-broker-event';
  const normalized = normalizeLeadRequest(payload, {
    leadType: LeadTypes.GENERIC,
    schema: {
      firstName: [Validators.length({ max: 80 })],
      lastName: isEventCampaign
        ? [Validators.required(), Validators.length({ min: 1, max: 80 })]
        : [Validators.length({ max: 80 })],
      notes: [Validators.length({ max: 4000 })],
    },
  });

  return normalized;
}
