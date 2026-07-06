import {
  LeadIntentValues,
  LeadTypes,
  normalizeLeadRequest,
  normalizeString,
} from '../leads/lead-model.js';
import { Validators } from '../validation/validators.js';

const consultationSchema = {
  consultationType: [
    Validators.required(),
    Validators.enum(['buying', 'selling', 'investment', 'relocation']),
  ],
  preferredContactMethod: [Validators.required(), Validators.enum(['phone', 'email', 'text'])],
  timeframe: [
    Validators.required(),
    Validators.enum(['immediate', '30-days', '60-days', '90-days', 'exploring']),
  ],
};

export function normalizeConsultationRequest(payload) {
  return normalizeLeadRequest(payload, {
    leadType: LeadTypes.CONSULTATION,
    intentValues: LeadIntentValues.CONSULTATION,
    schema: consultationSchema,
    additionalFields: {
      consultationType: normalizeString(payload?.consultationType),
      preferredContactMethod: normalizeString(payload?.preferredContactMethod),
      timeframe: normalizeString(payload?.timeframe),
    },
  });
}
