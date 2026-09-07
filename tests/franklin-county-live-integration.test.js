import assert from 'node:assert/strict';
import test from 'node:test';

import { FranklinCountyPropertyProvider } from '../src/property-data/providers/franklin-county-provider.js';
import { normalizeAddressInput } from '../src/property-data/address-normalization.js';
import { PropertyResolutionStatus } from '../src/property-data/status.js';

const runLive = process.env.FRANKLIN_LIVE_TEST === '1';
const baseUrl = process.env.FRANKLIN_GIS_BASE_URL ?? 'https://gis.franklincountyohio.gov';

function provider() {
  return new FranklinCountyPropertyProvider({
    baseUrl,
    timeoutMs: 4000,
    maxAttempts: 2,
  });
}

async function resolve(payload) {
  const normalizedAddress = normalizeAddressInput(payload);
  return provider().resolveProperty({ normalizedAddress });
}

test(
  'live franklin exact address lookup resolves a parcel-backed record',
  { skip: !runLive },
  async () => {
    const result = await resolve({
      propertyAddress: '373 S High St',
      city: 'Columbus',
      state: 'OH',
    });

    assert.equal(result.status, PropertyResolutionStatus.FOUND);
    assert.equal(result.matches.length, 1);
    assert.ok(result.matches[0].parcel.parcelId);
    assert.ok(result.matches[0].address.displayAddress);
  },
);

test('live franklin normalized address variant resolves', { skip: !runLive }, async () => {
  const result = await resolve({
    propertyAddress: '373 South High Street',
    city: 'Columbus',
    state: 'OH',
  });

  assert.equal(result.status, PropertyResolutionStatus.FOUND);
  assert.equal(result.matches.length, 1);
  assert.ok(result.matches[0].parcel.parcelId);
});

test('live franklin no-match address returns NOT_FOUND', { skip: !runLive }, async () => {
  const result = await resolve({
    propertyAddress: '99999 NotAReal Rd',
    city: 'Columbus',
    state: 'OH',
  });

  assert.equal(result.status, PropertyResolutionStatus.NOT_FOUND);
});

test(
  'live franklin ambiguous style address returns MULTIPLE_MATCHES or NOT_FOUND',
  { skip: !runLive },
  async () => {
    const result = await resolve({ propertyAddress: 'MAIN ST', city: 'Columbus', state: 'OH' });

    assert.ok(
      [PropertyResolutionStatus.MULTIPLE_MATCHES, PropertyResolutionStatus.NOT_FOUND].includes(
        result.status,
      ),
    );
  },
);
