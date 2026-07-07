import { HomeValueService } from '../../home-value/home-value-service.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createHomeValueProvider } from '../../providers/provider-factory.js';
import { createLeadRepository } from '../../repositories/lead-repository.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const homeValueService = new HomeValueService({
    provider: createHomeValueProvider(config),
    repository: createLeadRepository(config),
  });
  const payload = parseJsonBody(event);
  let lead;

  try {
    lead = homeValueService.normalize(payload, { context });
  } catch (error) {
    logger.warn('home_value_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  const result = await homeValueService.submitLead(lead, { context, logger });

  logger.info('home_value_request_success', {
    leadId: result.lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.leadAccepted({
    message: 'Home value request received.',
    lead: result.lead,
    context,
  });
});
