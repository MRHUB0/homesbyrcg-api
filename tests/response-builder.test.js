import assert from 'node:assert/strict';
import test from 'node:test';

import { UnprocessableEntityError } from '../src/errors/index.js';
import { ResponseBuilder } from '../src/responses/response-builder.js';

const context = {
  requestId: 'request-123',
  correlationId: 'correlation-123',
};

test('response builder creates canonical success responses', () => {
  const response = ResponseBuilder.success({
    message: 'Accepted.',
    data: { status: 'accepted' },
    statusCode: 202,
    context,
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Accepted.');
  assert.deepEqual(body.data, { status: 'accepted' });
  assert.deepEqual(body.errors, []);
  assert.equal(body.requestId, 'request-123');
  assert.equal(body.correlationId, 'correlation-123');
});

test('response builder creates canonical error responses', () => {
  const response = ResponseBuilder.error({
    error: new UnprocessableEntityError('Invalid contact request.', [
      { field: 'email', message: 'Value must be a valid email address.' },
    ]),
    context,
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Invalid contact request.');
  assert.equal(body.errors[0].code, 'UNPROCESSABLE_ENTITY');
  assert.equal(body.errors[0].field, 'email');
});
