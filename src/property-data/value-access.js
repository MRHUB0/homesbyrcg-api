import { AuthorizationError, ValidationError } from '../errors/index.js';

export async function enforcePropertyValueAccess({ payload, leadRepository, requireLeadContext }) {
  if (!requireLeadContext) {
    return;
  }

  const leadId = payload?.leadId;

  if (!leadId) {
    throw new ValidationError('leadId is required for property value endpoints.', [
      {
        field: 'leadId',
        message: 'leadId is required for value retrieval.',
      },
    ]);
  }

  const lead = await leadRepository.getLead(leadId);

  if (!lead) {
    throw new AuthorizationError('Property value access requires a valid lead journey context.', [
      {
        field: 'leadId',
        message: 'No lead journey found for leadId.',
      },
    ]);
  }
}
