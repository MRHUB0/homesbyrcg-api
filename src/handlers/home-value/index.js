import { HomeValueService } from '../../home-value/home-value-service.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createHomeValueProvider } from '../../providers/provider-factory.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const homeValueService = new HomeValueService({ provider: createHomeValueProvider(config) });
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
    leadId: lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.success({
    message: 'Home value request received.',
    data: {
      status: result.status,
      provider: result.provider,
    },
    statusCode: 202,
    context,
  });
});
