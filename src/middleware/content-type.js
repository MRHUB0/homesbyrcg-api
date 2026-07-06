import { ValidationError } from '../errors/index.js';
import { getHeader } from '../shared/id.js';

const methodsWithBody = new Set(['POST', 'PUT', 'PATCH']);

export function enforceJsonContentType(event) {
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';

  if (!methodsWithBody.has(method.toUpperCase()) || !event.body) {
    return;
  }

  const contentType = getHeader(event.headers ?? {}, 'content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ValidationError('Unsupported content type.', [
      {
        field: 'content-type',
        message: 'Content-Type must be application/json.',
      },
    ]);
  }
}
