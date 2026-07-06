import { ValidationError } from '../errors/index.js';

export function enforceRequestSize(event, maxRequestBytes) {
  const body = event.body ?? '';
  const decoded = event.isBase64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body);

  if (decoded.byteLength > maxRequestBytes) {
    throw new ValidationError('Request body is too large.', [
      {
        field: 'body',
        message: `Request body exceeds ${maxRequestBytes} bytes.`,
      },
    ]);
  }
}
