import assert from 'node:assert/strict';
import test from 'node:test';

import { FranklinCountyPropertyProvider } from '../src/property-data/providers/franklin-county-provider.js';
import { PropertyResolutionStatus } from '../src/property-data/status.js';

function normalizedAddress(overrides = {}) {
  return {
    line1: '373 S HIGH ST',
    city: 'COLUMBUS',
    state: 'OH',
    county: 'FRANKLIN',
    displayAddress: '373 S High St, Columbus, OH 43215',
    normalizedAddressKey: '373 S HIGH ST|-|COLUMBUS|OH|43215',
    ...overrides,
  };
}

function response(status, payload) {
  return {
    status,
    async json() {
      return payload;
    },
  };
}

test('franklin provider returns provider unavailable when base URL is missing', async () => {
  const provider = new FranklinCountyPropertyProvider({ baseUrl: '' });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
  assert.equal(result.matches.length, 0);
});

test('franklin provider uses locator and parcel endpoints', async () => {
  const calls = [];
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    fetchImpl: async (url) => {
      calls.push(url);

      if (url.includes('/findAddressCandidates')) {
        return response(200, {
          candidates: [
            {
              address: '373 S HIGH ST',
              score: 92,
              attributes: {
                Name: '373 S HIGH ST',
              },
            },
          ],
        });
      }

      return response(200, {
        features: [
          {
            attributes: {
              OBJECTID: 10,
              PARCELID: '010-055568',
              SITEADDRESS: '373 S HIGH ST',
              LNDVALUEBASE: 100000,
              BLDVALUEBASE: 225000,
              TOTVALUEBASE: 325000,
            },
          },
        ],
      });
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].parcel.parcelId, '010-055568');
  assert.equal(result.matches[0].assessment.assessedValue, 325000);
  assert.ok(
    calls.some((call) =>
      call.includes(
        '/hosting/rest/services/Locators/GIS_LBRS_Locator/GeocodeServer/findAddressCandidates',
      ),
    ),
  );
  assert.ok(
    calls.some((call) =>
      call.includes('/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0/query'),
    ),
  );
});

test('franklin provider retries transient 5xx and then succeeds', async () => {
  let calls = 0;
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    maxAttempts: 2,
    fetchImpl: async (url) => {
      calls += 1;

      if (calls === 1 && url.includes('/findAddressCandidates')) {
        return response(503, {});
      }

      if (url.includes('/findAddressCandidates')) {
        return response(200, {
          candidates: [
            {
              address: '373 S HIGH ST',
              score: 92,
              attributes: { Name: '373 S HIGH ST' },
            },
          ],
        });
      }

      return response(200, {
        features: [
          {
            attributes: {
              OBJECTID: 10,
              PARCELID: '010-055568',
              SITEADDRESS: '373 S HIGH ST',
              TOTVALUEBASE: 325000,
            },
          },
        ],
      });
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  assert.equal(result.matches.length, 1);
  assert.equal(calls, 3);
});

test('franklin provider returns provider unavailable for deterministic 4xx', async () => {
  let calls = 0;
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    maxAttempts: 3,
    fetchImpl: async () => {
      calls += 1;
      return response(404, { error: { message: 'Not found' } });
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
  assert.equal(calls, 1);
});

test('franklin provider returns NOT_FOUND when locator has no candidates', async () => {
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    fetchImpl: async () => response(200, { candidates: [] }),
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.NOT_FOUND);
});

test('franklin provider returns MULTIPLE_MATCHES when parcel join yields multiple parcels', async () => {
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    fetchImpl: async (url) => {
      if (url.includes('/findAddressCandidates')) {
        return response(200, {
          candidates: [
            { address: 'MAIN ST', score: 75, attributes: { Name: 'MAIN ST' } },
            { address: 'MAIN ST', score: 74, attributes: { Name: 'MAIN ST' } },
          ],
        });
      }

      return response(200, {
        features: [
          {
            attributes: {
              OBJECTID: 10,
              PARCELID: '010-000001',
              SITEADDRESS: 'MAIN ST',
              TOTVALUEBASE: 325000,
            },
          },
          {
            attributes: {
              OBJECTID: 11,
              PARCELID: '010-000002',
              SITEADDRESS: 'MAIN ST',
              TOTVALUEBASE: 250000,
            },
          },
        ],
      });
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.MULTIPLE_MATCHES);
  assert.equal(result.matches.length, 2);
});

test('franklin provider falls back to locator MULTIPLE_MATCHES when parcel join fails for multiple locator candidates', async () => {
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    fetchImpl: async (url) => {
      if (url.includes('/findAddressCandidates')) {
        return response(200, {
          candidates: [
            { address: '100 E BROAD ST', score: 80, attributes: { Name: '100 E BROAD ST' } },
            { address: '100 W BROAD ST', score: 79, attributes: { Name: '100 W BROAD ST' } },
          ],
        });
      }

      return response(200, { features: [] });
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.MULTIPLE_MATCHES);
  assert.equal(result.matches.length, 2);
  assert.equal(result.matches[0].parcel.parcelId, null);
});

test('franklin provider escapes query values for parcel where clause', async () => {
  const calls = [];
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes('/findAddressCandidates')) {
        return response(200, {
          candidates: [
            {
              address: "12 O'NEIL ST",
              score: 95,
              attributes: { Name: "12 O'NEIL ST" },
            },
          ],
        });
      }

      return response(200, {
        features: [
          {
            attributes: {
              PARCELID: '010-055568',
              SITEADDRESS: "12 O'NEIL ST",
              TOTVALUEBASE: 100000,
            },
          },
        ],
      });
    },
  });

  const result = await provider.resolveProperty({
    normalizedAddress: normalizedAddress({ line1: "12 O'NEIL ST" }),
  });

  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  const parcelQueryCall = calls.find((call) => call.includes('/query'));
  assert.ok(parcelQueryCall.includes('SITEADDRESS+%3D+%2712+O%27%27NEIL+ST%27'));
});

test('franklin provider returns provider unavailable when parcel response is malformed', async () => {
  const provider = new FranklinCountyPropertyProvider({
    baseUrl: 'https://gis.franklincountyohio.gov',
    fetchImpl: async (url) => {
      if (url.includes('/findAddressCandidates')) {
        return response(200, {
          candidates: [
            {
              address: '373 S HIGH ST',
              score: 95,
              attributes: { Name: '373 S HIGH ST' },
            },
          ],
        });
      }

      return response(200, { unexpected: [] });
    },
  });

  const result = await provider.resolveProperty({ normalizedAddress: normalizedAddress() });

  assert.equal(result.status, PropertyResolutionStatus.PROVIDER_UNAVAILABLE);
});
