import { createHash } from 'node:crypto';

function hashIdentity(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16).toUpperCase();
}

export function buildCanonicalPropertyIdentity({ normalizedAddress, parcel, jurisdiction }) {
  const parcelId = parcel?.apn ?? parcel?.parcelId;
  const county = jurisdiction?.county ?? normalizedAddress?.county;
  const state = jurisdiction?.state ?? normalizedAddress?.state;

  const parcelIdentity = parcelId && county && state ? `${state}|${county}|${parcelId}` : undefined;
  const addressIdentity = normalizedAddress?.normalizedAddressKey;

  const identitySeed = parcelIdentity ?? addressIdentity;

  return {
    propertyRef: identitySeed ? `hbrcg_prop_${hashIdentity(identitySeed)}` : undefined,
    identityType: parcelIdentity ? 'parcel' : 'normalized_address',
    canonicalIdentity: identitySeed,
  };
}

export function buildProviderIdentity({ provider, providerPropertyId, parcelId }) {
  return {
    provider,
    providerPropertyId: providerPropertyId ?? null,
    parcelId: parcelId ?? null,
  };
}
