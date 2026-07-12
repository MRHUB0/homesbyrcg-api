import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler } from '../src/handlers/leads/index.js';

function configureLocalEnvironment() {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';
  delete process.env.LEAD_TABLE_NAME;
  process.env.LEAD_PROVIDER_MODE = 'mock';
}

async function submit(payload) {
  return handler(
    createHttpApiEvent({
      routeKey: 'POST /leads',
      rawPath: '/leads',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'generic-correlation-123',
      },
      requestContext: {
        requestId: 'generic-request-123',
        http: { method: 'POST', path: '/leads' },
      },
      body: JSON.stringify(payload),
    }),
    { awsRequestId: 'aws-request-123' },
  );
}

test('POST /leads accepts an email-only newsletter lead', async () => {
  configureLocalEnvironment();
  const response = await submit({
    email: 'newsletter@example.com',
    journeySource: 'Newsletter',
    decisionType: 'newsletter',
    conversionType: 'newsletter',
    conversionEvent: 'newsletter_subscribed',
    campaign: 'footer-newsletter',
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Lead request received.');
  assert.ok(body.leadId);
  assert.equal(body.correlationId, 'generic-correlation-123');
});

test('POST /leads accepts a guide lead with campaign metadata', async () => {
  configureLocalEnvironment();
  const response = await submit({
    name: 'Guide Reader',
    email: 'guide@example.com',
    journeySource: 'Guide',
    decisionType: 'buyer',
    conversionType: 'resource',
    conversionEvent: 'guide_download',
    campaign: 'buyer-guide',
  });

  assert.equal(response.statusCode, 202);
});

test('POST /leads rejects an invalid email', async () => {
  configureLocalEnvironment();
  const response = await submit({
    email: 'invalid',
    conversionEvent: 'newsletter_subscribed',
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(body.errors[0].field, 'email');
});
