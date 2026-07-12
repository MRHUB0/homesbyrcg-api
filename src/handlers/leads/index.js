import { GenericLeadService } from '../../leads/generic-lead-service.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createGenericLeadProvider } from '../../providers/provider-factory.js';
import { createLeadRepository } from '../../repositories/lead-repository.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const leadService = new GenericLeadService({
    provider: createGenericLeadProvider(config),
    repository: createLeadRepository(config),
  });
  const payload = parseJsonBody(event);
  let lead;

  try {
    lead = leadService.normalize(payload, { context });
  } catch (error) {
    logger.warn('lead_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  const result = await leadService.submitLead(lead, { context, logger });

  logger.info('lead_request_success', {
    leadId: result.lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.leadAccepted({
    message: 'Lead request received.',
    lead: result.lead,
    context,
  });
});
