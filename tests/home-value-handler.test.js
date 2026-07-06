import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler } from '../src/handlers/home-value/index.js';

const validBody = {
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'riley@example.com',
  phone: '+1 555 123 4567',
  journeySource: 'home-value-page',
  currentPage: '/home-value',
  leadIntent: 'home-valuation',
  leadScore: 92,
  referral: 'google',
  campaign: 'spring-listings',
  notes: 'I want a valuation.',
  propertyAddress: '123 Main St',
  city: 'Charlotte',
  state: 'NC',
  zipCode: '28202',
  propertyType: 'single-family',
};

test('POST /home-value returns accepted response', async () => {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /home-value',
      rawPath: '/home-value',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'correlation-123',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/home-value',
        },
      },
      body: JSON.stringify(validBody),
    }),
    { awsRequestId: 'aws-request-123' },
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Home value request received.');
  assert.equal(body.data.status, 'accepted');
  assert.equal(body.data.provider, 'mock');
  assert.equal(body.correlationId, 'correlation-123');
});

test('POST /home-value returns 422 for missing property fields', async () => {
  process.env.LOG_LEVEL = 'error';

  const response = await handler(
    createHttpApiEvent({
      routeKey: 'POST /home-value',
      rawPath: '/home-value',
      headers: {
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/home-value',
        },
      },
      body: JSON.stringify({ ...validBody, propertyAddress: '' }),
    }),
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(body.success, false);
  assert.equal(body.errors[0].code, 'UNPROCESSABLE_ENTITY');
  assert.equal(body.errors[0].field, 'propertyAddress');
});
