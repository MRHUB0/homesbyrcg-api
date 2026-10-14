import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAddressInput } from '../src/property-data/address-normalization.js';

test('normalizes case, punctuation, suffixes, and zip code deterministically', () => {
  const normalized = normalizeAddressInput({
    propertyAddress: ' 123 Main Street. ',
    city: ' columbus ',
    state: 'oh',
    zipCode: '43215-1234',
  });

  assert.equal(normalized.line1, '123 MAIN ST');
  assert.equal(normalized.city, 'COLUMBUS');
  assert.equal(normalized.state, 'OH');
  assert.equal(normalized.postalCode, '43215-1234');
  assert.equal(normalized.normalizedAddressKey, '123 MAIN ST|-|COLUMBUS|OH|43215-1234');
});

test('normalizes equivalent addresses to same identity key', () => {
  const variantA = normalizeAddressInput({
    propertyAddress: '500 market street',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  });

  const variantB = normalizeAddressInput({
    addressLine1: '500 Market St.',
    city: 'COLUMBUS',
    state: 'oh',
    postalCode: '43215-9999',
  });

  assert.equal(variantA.normalizedAddressKey, '500 MARKET ST|-|COLUMBUS|OH|43215');
  assert.equal(variantB.normalizedAddressKey, '500 MARKET ST|-|COLUMBUS|OH|43215-9999');
  assert.equal(variantA.line1, variantB.line1);
  assert.equal(variantA.city, variantB.city);
  assert.equal(variantA.state, variantB.state);
});
