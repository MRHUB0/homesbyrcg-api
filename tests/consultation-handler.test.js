import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler } from '../src/handlers/consultation/index.js';

const validBody = {
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'riley@example.com',
  phone: '+1 555 123 4567',
  journeySource: 'consultation-page',
  currentPage: '/consultation',
  leadIntent: 'buying-consultation',
  leadScore: 90,
  referral: 'google',
  campaign: 'spring-listings',
  notes: 'I want to buy this year.',
  consultationType: 'buying',
  preferredContactMethod: 'phone',
  timeframe: '60-days',
};

test('POST /consultation returns accepted response', async () => {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /consultation',
      rawPath: '/consultation',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'correlation-123',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/consultation',
        },
      },
      body: JSON.stringify(validBody),
    }),
    { awsRequestId: 'aws-request-123' },
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Consultation request received.');
  assert.equal(body.data.status, 'accepted');
  assert.equal(body.data.provider, 'mock');
  assert.equal(body.correlationId, 'correlation-123');
});

test('POST /consultation returns 422 for invalid enum values', async () => {
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /consultation',
      rawPath: '/consultation',
      headers: {
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/consultation',
        },
      },
      body: JSON.stringify({ ...validBody, consultationType: 'unknown' }),
    }),
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(body.success, false);
  assert.equal(body.errors[0].code, 'UNPROCESSABLE_ENTITY');
  assert.equal(body.errors[0].field, 'consultationType');
});
