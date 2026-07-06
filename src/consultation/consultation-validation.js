import {
  LeadIntentValues,
  LeadTypes,
  normalizeLeadRequest,
  normalizeString,
} from '../leads/lead-model.js';
import { Validators } from '../validation/validators.js';

const consultationSchema = {
  consultationType: [
    Validators.optionalEnum([
      'buying',
      'selling',
      'investment',
      'relocation',
      'housing-guidance',
      'decision-assessment',
      'contact-request',
    ]),
  ],
  preferredContactMethod: [Validators.optionalEnum(['phone', 'email', 'text'])],
  timeframe: [
    Validators.optionalEnum([
      'immediate',
      '30-days',
      '60-days',
      '90-days',
      'exploring',
      'not-specified',
    ]),
  ],
  intent: [
    Validators.optionalEnum([
      'schedule-consultation',
      'contact-request',
      'decision-assessment-complete',
    ]),
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
      intent: normalizeString(payload?.intent),
    },
  });
}
