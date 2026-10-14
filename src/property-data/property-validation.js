import { UnprocessableEntityError } from '../errors/index.js';
import { normalizeAddressInput } from './address-normalization.js';

function ensureAddressConstraints(normalizedAddress) {
  const errors = [];

  if (normalizedAddress.line1.length > 240) {
    errors.push({
      field: 'addressLine1',
      message: 'addressLine1 must be 240 characters or fewer.',
    });
  }

  if (normalizedAddress.state && normalizedAddress.state.length !== 2) {
    errors.push({
      field: 'state',
      message: 'state must be a 2-character abbreviation when provided.',
    });
  }

  if (normalizedAddress.city && normalizedAddress.city.length > 120) {
    errors.push({
      field: 'city',
      message: 'city must be 120 characters or fewer.',
    });
  }

  if (normalizedAddress.postalCode && normalizedAddress.postalCode.length > 10) {
    errors.push({
      field: 'postalCode',
      message: 'postalCode must be 10 characters or fewer.',
    });
  }

  if (errors.length > 0) {
    throw new UnprocessableEntityError('Property address validation failed.', errors);
  }
}

export function normalizeAndValidateAddress(payload) {
  const normalizedAddress = normalizeAddressInput(payload);
  ensureAddressConstraints(normalizedAddress);
  return normalizedAddress;
}
