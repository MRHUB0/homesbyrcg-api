import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler as contactHandler } from '../src/handlers/contact/index.js';
import { handler as consultationHandler } from '../src/handlers/consultation/index.js';
import { handler as homeValueHandler } from '../src/handlers/home-value/index.js';
import { handler as openApiHandler } from '../src/handlers/openapi/index.js';

const allowedOrigin = 'https://homesbyrcg.com';

const browserRoutes = [
  {
    route: 'POST /contact',
    path: '/contact',
    handler: contactHandler,
    payload: {
      name: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      phone: '(404) 555-0186',
      message: 'I am comparing whether to sell this fall or wait.',
      currentPage: '/contact/',
      referringPage: 'https://homesbyrcg.com/',
      journeySource: 'consultation',
      journeyStage: 'consultation',
      leadIntent: 'Request professional guidance',
      recommendedFollowUp:
        'Respond personally and schedule the consultation with page and referral context.',
      conversionType: 'consultation',
      conversionEvent: 'contact_requested',
      campaign: 'website',
      referral: 'direct',
    },
  },
  {
    route: 'POST /consultation',
    path: '/consultation',
    handler: consultationHandler,
    payload: {
      name: 'Priya Shah',
      email: 'priya.shah@example.com',
      message: 'I want help comparing readiness, financing, and search timing.',
      currentPage: '/contact/',
      journeySource: 'consultation',
      journeyStage: 'consultation',
      leadIntent: 'Request professional guidance',
      recommendedFollowUp:
        'Respond personally and schedule the consultation with page and referral context.',
      conversionType: 'consultation',
      conversionEvent: 'consultation_requested',
      intent: 'schedule-consultation',
      consultationType: 'housing-guidance',
      preferredContactMethod: 'email',
      timeframe: 'not-specified',
      campaign: 'website',
      referral: 'direct',
    },
  },
  {
    route: 'POST /home-value',
    path: '/home-value',
    handler: homeValueHandler,
    payload: {
      name: 'Taylor Morgan',
      email: 'taylor.morgan@example.com',
      phone: '(404) 555-0133',
      message: '4890 Kings Walk, planning to downsize in the next 30 days.',
      propertyAddress: '4890 Kings Walk',
      currentPage: '/home-value/',
      journeySource: 'seller',
      journeyStage: 'tools',
      leadIntent: 'Request property valuation',
      recommendedFollowUp:
        'Prepare valuation context and discuss timing, prep, and seller net proceeds.',
      conversionType: 'home-value',
      conversionEvent: 'home_value_requested',
      propertyType: 'residential',
      campaign: 'website',
      referral: 'direct',
    },
  },
];

for (const scenario of browserRoutes) {
  test(`OPTIONS ${scenario.path} returns browser preflight CORS headers`, async () => {
    configureBrowserEnv();

    const response = await scenario.handler(
      createHttpApiEvent({
        routeKey: `OPTIONS ${scenario.path}`,
        rawPath: scenario.path,
        headers: {
          origin: allowedOrigin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,x-correlation-id',
        },
        requestContext: {
          requestId: 'api-request-123',
          http: {
            method: 'OPTIONS',
            path: scenario.path,
          },
        },
      }),
      { awsRequestId: 'aws-request-123' },
    );

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['Access-Control-Allow-Origin'], allowedOrigin);
    assert.equal(response.headers['Access-Control-Allow-Methods'], 'GET,POST,OPTIONS');
    assert.match(response.headers['Access-Control-Allow-Headers'], /Content-Type/);
    assert.match(response.headers['Access-Control-Allow-Headers'], /X-Correlation-Id/);
  });

  test(`${scenario.route} accepts canonical browser lead payload with CORS`, async () => {
    configureBrowserEnv();

    const response = await scenario.handler(
      createHttpApiEvent({
        routeKey: scenario.route,
        rawPath: scenario.path,
        headers: {
          origin: allowedOrigin,
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
    assert.equal(response.headers['Access-Control-Allow-Origin'], allowedOrigin);
    assert.equal(response.headers['Access-Control-Allow-Methods'], 'GET,POST,OPTIONS');
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'accepted');
    assert.deepEqual(body.errors, []);
  });
}

test('POST validation returns 422 envelope with field-level messages', async () => {
  configureBrowserEnv();

  const response = await contactHandler(
    createHttpApiEvent({
      routeKey: 'POST /contact',
      rawPath: '/contact',
      headers: {
        origin: allowedOrigin,
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/contact',
        },
      },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: 'not-an-email',
        message: '',
        conversionEvent: 'unsupported_event',
      }),
    }),
    { awsRequestId: 'aws-request-123' },
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(body.success, false);
  assert.equal(body.requestId, 'api-request-123');
  assert.ok(body.errors.some((error) => error.field === 'email'));
  assert.ok(body.errors.some((error) => error.field === 'message'));
  assert.ok(body.errors.some((error) => error.field === 'conversionEvent'));
});

test('GET /openapi.yaml exposes the canonical browser contract with CORS', async () => {
  configureBrowserEnv();

  const response = await openApiHandler(
    createHttpApiEvent({
      routeKey: 'GET /openapi.yaml',
      rawPath: '/openapi.yaml',
      headers: {
        origin: allowedOrigin,
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'GET',
          path: '/openapi.yaml',
        },
      },
    }),
    { awsRequestId: 'aws-request-123' },
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Access-Control-Allow-Origin'], allowedOrigin);
  assert.equal(response.headers['Content-Type'], 'application/yaml; charset=utf-8');
  assert.match(response.body, /openapi: 3\.0\.1/);
  assert.match(response.body, /conversionEvent/);
  assert.match(response.body, /Request professional guidance/);
});

function configureBrowserEnv() {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';
  process.env.LEAD_PROVIDER_MODE = 'mock';
  process.env.CORS_ALLOWED_ORIGINS = 'https://homesbyrcg.com,https://newhomesbyrcg.com';
}
