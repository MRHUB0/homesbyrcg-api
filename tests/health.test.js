import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler } from '../src/handlers/health/index.js';

test('GET /health returns canonical success response', async () => {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      headers: {
        'x-correlation-id': 'correlation-123',
      },
    }),
    { awsRequestId: 'aws-request-123' },
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Service is healthy.');
  assert.equal(body.errors.length, 0);
  assert.equal(body.correlationId, 'correlation-123');
  assert.equal(body.data.status, 'healthy');
  assert.equal(body.data.service, 'homesbyrcg-api');
  assert.equal(body.data.environment, 'local');
  assert.ok(body.requestId);
  assert.ok(body.timestamp);
});
