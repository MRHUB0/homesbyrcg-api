import { LeadTypes, normalizeLeadRequest } from './lead-model.js';
import { Validators } from '../validation/validators.js';

export function normalizeGenericLeadRequest(payload) {
  return normalizeLeadRequest(payload, {
    leadType: LeadTypes.GENERIC,
    schema: {
      firstName: [Validators.length({ max: 80 })],
      notes: [Validators.length({ max: 4000 })],
    },
  });
}
