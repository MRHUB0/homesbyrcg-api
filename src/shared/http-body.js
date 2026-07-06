import { ValidationError } from '../errors/index.js';

export function parseJsonBody(event) {
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
