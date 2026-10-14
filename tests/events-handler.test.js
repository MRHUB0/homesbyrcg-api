import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler as eventsHandler } from '../src/handlers/events/index.js';

test('events handler accepts canonical analytics events', async () => {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';
  process.env.LEAD_PROVIDER_MODE = 'mock';
  process.env.CORS_ALLOWED_ORIGINS = 'https://homesbyrcg.com';

  const response = await eventsHandler(
    createHttpApiEvent({
      routeKey: 'POST /events',
      rawPath: '/events',
      headers: {
        origin: 'https://homesbyrcg.com',
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'api-request-123',
        http: {
          method: 'POST',
          path: '/events',
        },
      },
      body: JSON.stringify({
        eventName: 'funnel_started',
        visitorId: 'visitor-123',
        journeyId: 'journey-123',
        funnel: 'home-value',
      }),
    }),
    { awsRequestId: 'aws-request-123' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  assert.equal(body.data.eventName, 'funnel_started');
  assert.equal(body.data.duplicate, false);
});
