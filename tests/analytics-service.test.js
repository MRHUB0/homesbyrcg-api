import assert from 'node:assert/strict';
import test from 'node:test';

import { AnalyticsService } from '../src/analytics/analytics-service.js';
import { InMemoryAnalyticsEventRepository } from '../src/repositories/analytics-event-repository.js';

function buildContext(overrides = {}) {
  return {
    requestId: 'request-123',
    correlationId: 'correlation-123',
    serviceName: 'homesbyrcg-api',
    environment: 'test',
    ...overrides,
  };
}

function buildLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

test('analytics service preserves first-touch attribution and updates last-touch', async () => {
  const repository = new InMemoryAnalyticsEventRepository();
  const service = new AnalyticsService({ repository });
  const context = buildContext();
  const logger = buildLogger();

  await service.acceptEvent(
    {
      eventId: 'event-1',
      eventName: 'funnel_started',
      journeyId: 'journey-123',
      funnel: 'home-value',
      attribution: {
        utm_source: 'google',
        utm_campaign: 'fall-launch',
      },
    },
    { context, logger },
  );

  const second = await service.acceptEvent(
    {
      eventId: 'event-2',
      eventName: 'property_resolved',
      journeyId: 'journey-123',
      propertyRef: 'zpid:1234',
      attribution: {
        utm_source: 'newsletter',
      },
    },
    { context, logger },
  );

  assert.equal(second.event.attribution.firstTouch.utm_source, 'google');
  assert.equal(second.event.attribution.lastTouch.utm_source, 'newsletter');
});

test('analytics service deduplicates events by eventId', async () => {
  const repository = new InMemoryAnalyticsEventRepository();
  const service = new AnalyticsService({ repository });
  const context = buildContext();
  const logger = buildLogger();

  const first = await service.acceptEvent(
    {
      eventId: 'event-duplicate',
      eventName: 'visitor_arrived',
      visitorId: 'visitor-123',
    },
    { context, logger },
  );
  const second = await service.acceptEvent(
    {
      eventId: 'event-duplicate',
      eventName: 'visitor_arrived',
      visitorId: 'visitor-123',
    },
    { context, logger },
  );

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
});

test('lead lifecycle tracking creates correlated high-intent event', async () => {
  const repository = new InMemoryAnalyticsEventRepository();
  const service = new AnalyticsService({ repository });
  const context = buildContext();
  const logger = buildLogger();

  await service.trackLeadLifecycle({
    lead: {
      leadId: 'lead-123',
      leadType: 'consultation',
      createdAt: '2026-09-05T00:00:00.000Z',
      conversionEvent: 'consultation_requested',
      metadata: {
        analyticsContext: {
          visitorId: 'visitor-123',
          sessionId: 'session-123',
          journeyId: 'journey-123',
          funnel: 'consultation',
          landingPage: '/consultation',
          attribution: {
            utm_source: 'google',
          },
        },
      },
    },
    context,
    logger,
  });

  const events = await repository.findJourneyEvents('journey-123', {
    scanIndexForward: true,
    limit: 10,
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].leadId, 'lead-123');
  assert.equal(events[0].funnelStage, 'HIGH_INTENT_ACTION');
  assert.equal(events[0].conversionClass, 'HIGH_INTENT');
});

test('analytics metrics remain low-cardinality and exclude identity dimensions', async () => {
  const repository = new InMemoryAnalyticsEventRepository();
  const service = new AnalyticsService({ repository });
  const context = buildContext();
  const logger = buildLogger();
  const records = [];
  const originalLog = console.log;

  console.log = (value) => records.push(JSON.parse(value));

  try {
    await service.acceptEvent(
      {
        eventName: 'visitor_arrived',
        visitorId: 'visitor-999',
      },
      { context, logger },
    );
  } finally {
    console.log = originalLog;
  }

  const metricRecord = records.find((record) => record._aws);
  assert.ok(metricRecord);
  const metricDefinition = metricRecord._aws.CloudWatchMetrics[0];
  assert.deepEqual(metricDefinition.Dimensions, [
    ['Service', 'Environment'],
    ['Service', 'Environment', 'Family'],
  ]);
  assert.equal(metricRecord.visitorId, undefined);
  assert.equal(metricRecord.leadId, undefined);
  assert.equal(metricRecord.journeyId, undefined);
  assert.equal(metricRecord.propertyRef, undefined);
});
