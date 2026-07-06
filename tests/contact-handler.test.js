import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler } from '../src/handlers/contact/index.js';

const validBody = {
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'riley@example.com',
  phone: '+1 555 123 4567',
  message: 'I would like to schedule a showing.',
  journeySource: 'contact-page',
  currentPage: '/contact',
  leadIntent: 'schedule-showing',
  leadScore: 85,
  referral: 'google',
  campaign: 'spring-listings',
};

test('POST /contact returns accepted response', async () => {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /contact',
      rawPath: '/contact',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'correlation-123',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/contact',
        },
      },
      body: JSON.stringify(validBody),
    }),
    { awsRequestId: 'aws-request-123' },
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(response.headers['X-Request-Id'], 'api-request-123');
  assert.equal(response.headers['X-Correlation-Id'], 'correlation-123');
  assert.equal(body.success, true);
  assert.equal(body.message, 'Contact request received.');
  assert.equal(body.data.status, 'accepted');
  assert.equal(body.data.provider, 'mock');
  assert.equal(body.correlationId, 'correlation-123');
});

test('POST /contact returns 400 for malformed JSON', async () => {
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /contact',
      rawPath: '/contact',
      headers: {
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/contact',
        },
      },
      body: '{invalid',
    }),
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.success, false);
  assert.equal(body.errors[0].code, 'VALIDATION_ERROR');
});

test('POST /contact returns 422 for field validation failures', async () => {
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /contact',
      rawPath: '/contact',
      headers: {
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/contact',
        },
      },
      body: JSON.stringify({ ...validBody, email: 'invalid' }),
    }),
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(body.success, false);
  assert.equal(body.errors[0].code, 'UNPROCESSABLE_ENTITY');
  assert.equal(body.errors[0].field, 'email');
});
