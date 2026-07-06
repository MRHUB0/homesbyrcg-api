import { LeadIntentValues, LeadTypes, normalizeLeadRequest } from '../leads/lead-model.js';

export function normalizeContactRequest(payload) {
  try {
    return normalizeLeadRequest(payload, {
      leadType: LeadTypes.CONTACT,
      intentValues: LeadIntentValues.CONTACT,
    });
  } catch (error) {
    if (error.details) {
      error.details = error.details.map((detail) =>
        detail.field === 'notes' ? { ...detail, field: 'message' } : detail,
      );
    }

    throw error;
  }
}
