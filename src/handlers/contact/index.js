import { normalizeContactRequest } from '../../contact/contact-validation.js';
import { MockContactProvider } from '../../contact/contact-provider.js';
import { ValidationError } from '../../errors/index.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { ResponseBuilder } from '../../responses/response-builder.js';

const contactProvider = new MockContactProvider();

export const handler = createApiHandler(async (event, { context, logger }) => {
  const payload = parseJsonBody(event);
  let contactRequest;

  try {
    contactRequest = normalizeContactRequest(payload);
  } catch (error) {
    logger.warn('contact_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  logger.info('contact_request_normalized', {
    contactRequest,
  });

  const result = await contactProvider.submitContact(contactRequest, { context, logger });

  logger.info('contact_request_submitted', {
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.success({
    message: 'Contact request received.',
    data: {
      status: result.status,
      provider: result.provider,
    },
    statusCode: 202,
    context,
  });
});

function parseJsonBody(event) {
  if (!event.body) {
    throw new ValidationError('Request body is required.', [
      {
        field: 'body',
        message: 'Request body is required.',
      },
    ]);
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  try {
    return JSON.parse(body);
  } catch {
    throw new ValidationError('Malformed JSON request body.', [
      {
        field: 'body',
        message: 'Request body must be valid JSON.',
      },
    ]);
  }
}
