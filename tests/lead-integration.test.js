import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler as contactHandler } from '../src/handlers/contact/index.js';
import { handler as consultationHandler } from '../src/handlers/consultation/index.js';
import { handler as homeValueHandler } from '../src/handlers/home-value/index.js';

const basePayload = {
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'riley@example.com',
  phone: '+1 555 123 4567',
  journeySource: 'integration-test',
  leadScore: 88,
  referral: 'google',
  campaign: 'spring-listings',
};

const cases = [
  {
    route: 'POST /contact',
    path: '/contact',
    handler: contactHandler,
    message: 'Contact request received.',
    payload: {
      ...basePayload,
      currentPage: '/contact',
      leadIntent: 'schedule-showing',
      message: 'Please contact me.',
    },
  },
  {
    route: 'POST /consultation',
    path: '/consultation',
    handler: consultationHandler,
    message: 'Consultation request received.',
    payload: {
      ...basePayload,
      currentPage: '/consultation',
      leadIntent: 'buying-consultation',
      notes: 'I want to buy this year.',
      consultationType: 'buying',
      preferredContactMethod: 'phone',
      timeframe: '60-days',
    },
  },
  {
    route: 'POST /home-value',
    path: '/home-value',
    handler: homeValueHandler,
    message: 'Home value request received.',
    payload: {
      ...basePayload,
      currentPage: '/home-value',
      leadIntent: 'home-valuation',
      notes: 'I want a valuation.',
      propertyAddress: '123 Main St',
      city: 'Charlotte',
      state: 'NC',
      zipCode: '28202',
      propertyType: 'single-family',
    },
  },
];

for (const scenario of cases) {
  test(`${scenario.route} integration returns canonical accepted response`, async () => {
    process.env.APP_ENV = 'local';
    process.env.SERVICE_NAME = 'homesbyrcg-api';
    process.env.LOG_LEVEL = 'error';
    process.env.LEAD_PROVIDER_MODE = 'mock';

    const response = await scenario.handler(
      createHttpApiEvent({
        routeKey: scenario.route,
        rawPath: scenario.path,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'correlation-123',
        },
        requestContext: {
          requestId: 'api-request-123',
          http: {
            method: 'POST',
            path: scenario.path,
          },
        },
        body: JSON.stringify(scenario.payload),
      }),
      { awsRequestId: 'aws-request-123' },
    );
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 202);
    assert.equal(body.success, true);
    assert.equal(body.message, scenario.message);
    assert.ok(body.leadId);
    assert.equal(body.status, 'RECEIVED');
    assert.equal(body.requestId, 'api-request-123');
    assert.equal(body.correlationId, 'correlation-123');
    assert.equal(body.data, undefined);
    assert.equal(body.errors, undefined);
    assert.equal(body.provider, undefined);
  });
}
