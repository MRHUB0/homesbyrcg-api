import { ContactService } from '../../contact/contact-service.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createContactProvider } from '../../providers/provider-factory.js';
import { createLeadRepository } from '../../repositories/lead-repository.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const contactService = new ContactService({
    provider: createContactProvider(config),
    repository: createLeadRepository(config),
  });
  const payload = parseJsonBody(event);
  let lead;

  try {
    lead = contactService.normalize(payload, { context });
  } catch (error) {
    logger.warn('contact_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  const result = await contactService.submitLead(lead, { context, logger });

  logger.info('contact_request_success', {
    leadId: result.lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.leadAccepted({
    message: 'Contact request received.',
    lead: result.lead,
    context,
  });
});
