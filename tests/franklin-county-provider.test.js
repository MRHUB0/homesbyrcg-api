import assert from 'node:assert/strict';
import test from 'node:test';

import { FranklinCountyPropertyProvider } from '../src/property-data/providers/franklin-county-provider.js';
import { PropertyResolutionStatus } from '../src/property-data/status.js';

function normalizedAddress() {
  return {
    line1: '123 MAIN ST',
    city: 'COLUMBUS',
    state: 'OH',
    county: 'FRANKLIN',
    displayAddress: '123 Main St, Columbus, OH 43215',
    normalizedAddressKey: '123 MAIN ST|-|COLUMBUS|OH|43215',
  };
}

test('franklin provider returns provider unavailable when base URL is missing', async () => {
  const provider = new FranklinCountyPropertyProvider({ baseUrl: '' });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
  assert.equal(result.matches.length, 0);
});

test('franklin provider handles 4xx as provider unavailable without retries', async () => {
  let calls = 0;
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://example.test',
    maxAttempts: 3,
    fetchImpl: async () => {
      calls += 1;
      return {
        status: 400,
        async json() {
          return { error: { message: 'bad request' } };
        },
      };
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
  assert.equal(calls, 1);
});

test('franklin provider retries 5xx and returns parsed candidates', async () => {
  let calls = 0;
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://example.test',
    maxAttempts: 2,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          status: 503,
          async json() {
            return {};
          },
        };
      }

      return {
        status: 200,
        async json() {
          return {
            candidates: [
              {
                address: '123 Main St, Columbus, OH',
                score: 97,
                attributes: {
                  PARCELID: '010123456',
                  County: 'FRANKLIN',
                  City: 'COLUMBUS',
                  State: 'OH',
                  AssessedValue: 325000,
                },
              },
            ],
          };
        },
      };
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(calls, 2);
  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].assessment.assessedValue, 325000);
});

test('franklin provider treats malformed responses as provider unavailable', async () => {
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://example.test',
    maxAttempts: 1,
    fetchImpl: async () => ({
      status: 200,
      async json() {
        return { unexpected: [] };
      },
    }),
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
});
