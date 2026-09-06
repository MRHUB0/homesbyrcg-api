import assert from 'node:assert/strict';
import test from 'node:test';

import { UnprocessableEntityError } from '../src/errors/index.js';
import {
  normalizeAnalyticsEventSafe,
  sanitizeMetadata,
} from '../src/analytics/analytics-validation.js';

const context = {
  requestId: 'request-123',
  correlationId: 'correlation-123',
};

test('analytics event validation rejects unknown event names', () => {
  assert.throws(
    () =>
      normalizeAnalyticsEventSafe(
        {
          eventName: 'not_supported',
        },
        { context },
      ),
    UnprocessableEntityError,
  );
});

test('analytics event validation enforces event-specific required fields', () => {
  assert.throws(
    () =>
      normalizeAnalyticsEventSafe(
        {
          eventName: 'property_resolved',
          journeyId: 'journey-123',
        },
        { context },
      ),
    UnprocessableEntityError,
  );
});

test('analytics event validation derives stage and conversion class', () => {
  const event = normalizeAnalyticsEventSafe(
    {
      eventName: 'consultation_requested',
      leadId: 'lead-123',
      journeyId: 'journey-123',
    },
    { context },
  );

  assert.equal(event.family, 'CONSULTATION');
  assert.equal(event.funnelStage, 'HIGH_INTENT_ACTION');
  assert.equal(event.conversionClass, 'HIGH_INTENT');
});

test('metadata sanitization removes obvious PII keys', () => {
  const sanitized = sanitizeMetadata({
    preferredNeighborhood: 'Ballantyne',
    email: 'user@example.com',
    phone_number: '+1 555 123 4567',
    nested: {
      firstName: 'Riley',
      funnelStep: 'address_entered',
    },
  });

  assert.deepEqual(sanitized, {
    preferredNeighborhood: 'Ballantyne',
    nested: {
      funnelStep: 'address_entered',
    },
  });
});
