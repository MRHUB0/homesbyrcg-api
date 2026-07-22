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

test('POST /leads accepts the QR event campaign and reports mocked confirmation delivery', async () => {
  configureLocalEnvironment();
  const response = await submit({
    firstName: 'Synthetic',
    lastName: 'Campaign Test',
    email: 'campaign-test@example.com',
    journeySource: 'qr-code',
    currentPage: '/events/affordable-real-estate-event',
    leadIntent: 'Learning about the event',
    notes: 'Registered interest in Event Details Coming Soon.',
    conversionType: 'event-registration',
    conversionEvent: 'event_interest_registered',
    campaign: 'affordable-real-estate-broker-event',
    metadata: {
      source: 'qr-code',
      eventSlug: 'affordable-real-estate-event',
      brokerage: 'Affordable Real Estate Company',
      landingPage: '/events/affordable-real-estate-event',
      redirectDestination: 'https://www.afford-realestate.com/',
      ignoredField: 'must-not-persist',
    },
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.confirmationEmailSent, true);
});

test('event campaign requires last name without changing newsletter requirements', async () => {
  configureLocalEnvironment();
  const response = await submit({
    firstName: 'Synthetic',
    email: 'campaign-test@example.com',
    notes: 'Event interest.',
    campaign: 'affordable-real-estate-broker-event',
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.ok(body.errors.some((error) => error.field === 'lastName'));
});

test('POST /leads accepts the QR booth connect campaign through existing infrastructure', async () => {
  configureLocalEnvironment();
  const response = await submit({
    firstName: 'Production',
    lastName: 'Booth Test',
    email: 'booth-test@example.com',
    phone: '+1 555 555 0199',
    journeySource: 'qr-code',
    currentPage: '/events/affordable-real-estate-connect',
    leadIntent: 'Buying',
    notes: 'Clearly marked booth campaign test.',
    conversionType: 'event-lead-capture',
    conversionEvent: 'event_connection_captured',
    campaign: 'affordable-real-estate-connect',
    metadata: {
      source: 'qr-code',
      eventSlug: 'affordable-real-estate-connect',
      brokerage: 'Affordable Real Estate Company',
      landingPage: '/events/affordable-real-estate-connect',
      redirectDestination: 'https://www.afford-realestate.com/',
      interest: 'Buying',
      timeframe: '3-6 Months',
      consentFollowUp: true,
      qrVersion: '1',
      printBatch: 'initial-2026',
      campaignVersion: '1.0',
    },
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  assert.ok(body.leadId);
  assert.equal('confirmationEmailSent' in body, false);
});

test('booth connect campaign requires last name and phone', async () => {
  configureLocalEnvironment();
  const response = await submit({
    firstName: 'Synthetic',
    email: 'booth-test@example.com',
    notes: 'Booth connection.',
    campaign: 'affordable-real-estate-connect',
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.ok(body.errors.some((error) => error.field === 'lastName'));
  assert.ok(body.errors.some((error) => error.field === 'phone'));
});
