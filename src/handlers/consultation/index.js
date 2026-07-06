import { ConsultationService } from '../../consultation/consultation-service.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createConsultationProvider } from '../../providers/provider-factory.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const consultationService = new ConsultationService({
    provider: createConsultationProvider(config),
  });
  const payload = parseJsonBody(event);
  let lead;

  try {
    lead = consultationService.normalize(payload, { context });
  } catch (error) {
    logger.warn('consultation_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  const result = await consultationService.submitLead(lead, { context, logger });

  logger.info('consultation_request_success', {
    leadId: lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.success({
    message: 'Consultation request received.',
    data: {
      status: result.status,
      provider: result.provider,
    },
    statusCode: 202,
    context,
  });
});
