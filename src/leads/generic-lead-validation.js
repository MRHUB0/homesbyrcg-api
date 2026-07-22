import { LeadTypes, normalizeLeadRequest } from './lead-model.js';
import { Validators } from '../validation/validators.js';

export function normalizeGenericLeadRequest(payload) {
  const isRegistrationCampaign = payload?.campaign === 'affordable-real-estate-broker-event';
  const isConnectCampaign = payload?.campaign === 'affordable-real-estate-connect';
  const requiresLastName = isRegistrationCampaign || isConnectCampaign;
  const normalized = normalizeLeadRequest(payload, {
    leadType: LeadTypes.GENERIC,
    schema: {
      firstName: [Validators.length({ max: 80 })],
      lastName: requiresLastName
        ? [Validators.required(), Validators.length({ min: 1, max: 80 })]
        : [Validators.length({ max: 80 })],
      phone: isConnectCampaign
        ? [Validators.required(), Validators.phone(), Validators.length({ min: 7, max: 30 })]
        : [Validators.phone(), Validators.length({ max: 30 })],
      notes: [Validators.length({ max: 4000 })],
    },
  });

  return normalized;
}
