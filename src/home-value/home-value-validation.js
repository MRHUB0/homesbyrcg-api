import {
  LeadIntentValues,
  LeadTypes,
  normalizeLeadRequest,
  normalizeString,
} from '../leads/lead-model.js';
import { Validators } from '../validation/validators.js';

const homeValueSchema = {
  propertyAddress: [Validators.required(), Validators.length({ min: 1, max: 240 })],
  city: [Validators.length({ max: 120 })],
  state: [Validators.length({ min: 2, max: 2 })],
  zipCode: [Validators.length({ min: 5, max: 10 })],
  propertyType: [
    Validators.optionalEnum([
      'single-family',
      'condo',
      'townhome',
      'multi-family',
      'land',
      'residential',
    ]),
  ],
};

export function normalizeHomeValueRequest(payload) {
  return normalizeLeadRequest(payload, {
    leadType: LeadTypes.HOME_VALUE,
    intentValues: LeadIntentValues.HOME_VALUE,
    schema: homeValueSchema,
    additionalFields: {
      propertyAddress: normalizeString(payload?.propertyAddress),
      city: normalizeString(payload?.city),
      state: normalizeString(payload?.state)?.toUpperCase(),
      zipCode: normalizeString(payload?.zipCode),
      propertyType: normalizeString(payload?.propertyType),
    },
  });
}
