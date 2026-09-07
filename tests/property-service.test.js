import assert from 'node:assert/strict';
import test from 'node:test';

import { ValidationError } from '../src/errors/index.js';
import { InMemoryPropertyCacheRepository } from '../src/property-data/cache/property-cache-repository.js';
import { PropertyService } from '../src/property-data/property-service.js';
import { MockPropertyProvider } from '../src/property-data/providers/mock-property-provider.js';
import { PropertyResolutionStatus } from '../src/property-data/status.js';

function createMetricsCapture() {
  const calls = [];

  return {
    calls,
    lookupAttempt(payload) {
      calls.push({ metric: 'lookupAttempt', payload });
    },
    lookupSuccess(payload) {
      calls.push({ metric: 'lookupSuccess', payload });
    },
    lookupNotFound(payload) {
      calls.push({ metric: 'lookupNotFound', payload });
    },
    lookupMultiple(payload) {
      calls.push({ metric: 'lookupMultiple', payload });
    },
    providerFailure(payload) {
      calls.push({ metric: 'providerFailure', payload });
    },
    cacheHit(payload) {
      calls.push({ metric: 'cacheHit', payload });
    },
    cacheMiss(payload) {
      calls.push({ metric: 'cacheMiss', payload });
    },
  };
}

test('property service resolves a canonical propertyRef for a unique match', async () => {
  const metrics = createMetricsCapture();
  const service = new PropertyService({
    provider: new MockPropertyProvider(),
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics,
  });

  const result = await service.resolve({
    propertyAddress: '123 main street',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  assert.ok(result.propertyRef.startsWith('hbrcg_prop_'));
  assert.equal(result.matches.length, 1);
  assert.equal(result.propertyRecord.identity.propertyRef, result.propertyRef);
  assert.equal(result.propertyRecord.owner.displayName, 'MAIN STREET HOLDINGS LLC');
  assert.equal(result.propertyRecord.assessment.sourceType, 'ASSESSMENT');
  assert.equal(result.propertyRecord.valuations.providerEstimate, null);
});

test('property service returns multiple match status for ambiguous addresses', async () => {
  const service = new PropertyService({
    provider: new MockPropertyProvider(),
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics: createMetricsCapture(),
  });

  const result = await service.resolve({
    propertyAddress: '500 Market St',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  assert.equal(result.status, PropertyResolutionStatus.MULTIPLE_MATCHES);
  assert.equal(result.matches.length, 2);
  assert.equal(result.matches[0].ownerDisplayName, 'MARKET STREET INVESTMENTS LLC');
  assert.equal(result.candidateRecords.length, 2);
});

test('property service returns not found for missing addresses', async () => {
  const service = new PropertyService({
    provider: new MockPropertyProvider(),
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics: createMetricsCapture(),
  });

  const result = await service.resolve({
    propertyAddress: '999 Unknown Ave',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  assert.equal(result.status, PropertyResolutionStatus.NOT_FOUND);
  assert.equal(result.matches.length, 0);
});

test('property service reports provider unavailable without collapsing into not found', async () => {
  const service = new PropertyService({
    provider: {
      name: 'test-provider',
      async resolveProperty() {
        return {
          status: PropertyResolutionStatus.PROVIDER_UNAVAILABLE,
          provider: 'test-provider',
          retrievedAt: new Date().toISOString(),
          matches: [],
          diagnostics: {
            message: 'timeout',
          },
        };
      },
    },
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics: createMetricsCapture(),
  });

  const result = await service.resolve({
    propertyAddress: '123 Main St',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
  assert.equal(result.diagnostics.message, 'timeout');
});

test('property service validates required address input', async () => {
  const service = new PropertyService({
    provider: new MockPropertyProvider(),
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics: createMetricsCapture(),
  });

  await assert.rejects(() => service.resolve({ city: 'Columbus', state: 'OH' }), ValidationError);
});

test('property service uses cache and emits cache hit behavior', async () => {
  let providerCalls = 0;
  const metrics = createMetricsCapture();
  const service = new PropertyService({
    provider: {
      name: 'cache-test-provider',
      async resolveProperty() {
        providerCalls += 1;
        return {
          status: PropertyResolutionStatus.NOT_FOUND,
          provider: 'cache-test-provider',
          retrievedAt: new Date().toISOString(),
          matches: [],
        };
      },
    },
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics,
  });

  const payload = {
    propertyAddress: '404 Cache Miss Rd',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  };

  await service.resolve(payload);
  await service.resolve(payload);

  assert.equal(providerCalls, 1);
  assert.ok(metrics.calls.some((call) => call.metric === 'cacheHit'));
});

test('property value response preserves assessment-vs-market semantics', async () => {
  const service = new PropertyService({
    provider: new MockPropertyProvider(),
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics: createMetricsCapture(),
  });

  const result = await service.getPropertyValue({
    propertyAddress: '123 Main St',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  assert.equal(result.value.values[0].valueType, 'assessed_value');
  assert.equal(result.value.values[1].valueType, 'provider_estimate');
  assert.equal(result.value.values[1].amount, null);
  assert.equal(result.value.values[2].valueType, 'homesbyrcg_estimate');
  assert.equal(result.value.values[2].amount, null);
});

test('propertyRef remains stable across normalized-equivalent addresses', async () => {
  const service = new PropertyService({
    provider: new MockPropertyProvider(),
    cache: new InMemoryPropertyCacheRepository({ ttlSeconds: 900 }),
    metrics: createMetricsCapture(),
  });

  const first = await service.resolve({
    propertyAddress: '123 Main Street.',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  const second = await service.resolve({
    addressLine1: '123 MAIN ST',
    city: 'COLUMBUS',
    state: 'oh',
    postalCode: '43215',
  });

  assert.equal(first.status, PropertyResolutionStatus.FOUND);
  assert.equal(second.status, PropertyResolutionStatus.FOUND);
  assert.equal(first.propertyRef, second.propertyRef);
});
