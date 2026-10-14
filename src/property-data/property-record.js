import { buildCanonicalPropertyIdentity, buildProviderIdentity } from './property-identity.js';

function valueOrNull(value) {
  return value === undefined ? null : value;
}

export function toCanonicalPropertyRecord({
  providerRecord,
  normalizedAddress,
  provider,
  retrievedAt,
}) {
  const parcel = {
    apn: providerRecord.parcel?.apn ?? providerRecord.parcel?.parcelId ?? null,
    parcelId: providerRecord.parcel?.parcelId ?? providerRecord.parcel?.apn ?? null,
  };

  const jurisdiction = {
    county: valueOrNull(providerRecord.jurisdiction?.county ?? normalizedAddress?.county),
    municipality: valueOrNull(providerRecord.jurisdiction?.municipality),
    state: valueOrNull(providerRecord.jurisdiction?.state ?? normalizedAddress?.state),
  };

  const identity = buildCanonicalPropertyIdentity({ normalizedAddress, parcel, jurisdiction });

  return {
    identity: {
      propertyRef: valueOrNull(identity.propertyRef),
      canonicalIdentity: valueOrNull(identity.canonicalIdentity),
      identityType: valueOrNull(identity.identityType),
      providerIdentity: buildProviderIdentity({
        provider,
        providerPropertyId: providerRecord.providerPropertyId,
        parcelId: parcel.parcelId,
      }),
    },
    address: {
      displayAddress: valueOrNull(
        providerRecord.address?.displayAddress ?? normalizedAddress.displayAddress,
      ),
      normalized: {
        line1: valueOrNull(normalizedAddress.line1),
        line2: valueOrNull(normalizedAddress.line2),
        city: valueOrNull(normalizedAddress.city),
        state: valueOrNull(normalizedAddress.state),
        postalCode: valueOrNull(normalizedAddress.postalCode),
      },
    },
    owner: {
      displayName: valueOrNull(providerRecord.owner?.displayName),
    },
    parcel,
    jurisdiction,
    characteristics: {
      propertyType: valueOrNull(providerRecord.characteristics?.propertyType),
      yearBuilt: valueOrNull(providerRecord.characteristics?.yearBuilt),
      bedrooms: valueOrNull(providerRecord.characteristics?.bedrooms),
      bathrooms: valueOrNull(providerRecord.characteristics?.bathrooms),
      livingAreaSqft: valueOrNull(providerRecord.characteristics?.livingAreaSqft),
      lotSizeSqft: valueOrNull(providerRecord.characteristics?.lotSizeSqft),
    },
    assessment: {
      assessedValue: valueOrNull(providerRecord.assessment?.assessedValue),
      landAssessedValue: valueOrNull(providerRecord.assessment?.landAssessedValue),
      improvementAssessedValue: valueOrNull(providerRecord.assessment?.improvementAssessedValue),
      taxYear: valueOrNull(providerRecord.assessment?.taxYear),
      sourceType: providerRecord.assessment?.assessedValue ? 'ASSESSMENT' : null,
    },
    valuations: {
      providerEstimate: valueOrNull(providerRecord.valuations?.providerEstimate),
      homesByRcgEstimate: valueOrNull(providerRecord.valuations?.homesByRcgEstimate),
      userVisibleValue: valueOrNull(providerRecord.valuations?.userVisibleValue),
      cmaValue: valueOrNull(providerRecord.valuations?.cmaValue),
    },
    provenance: {
      provider,
      providerRecordId: valueOrNull(providerRecord.providerPropertyId),
      retrievedAt,
    },
    timestamps: {
      retrievedAt,
      canonicalizedAt: new Date().toISOString(),
    },
  };
}

export function toValueResponse(propertyRecord) {
  const assessedValue = propertyRecord.assessment?.assessedValue;

  return {
    propertyRef: propertyRecord.identity.propertyRef,
    displayAddress: propertyRecord.address.displayAddress,
    values: [
      {
        valueType: 'assessed_value',
        amount: assessedValue,
        currency: assessedValue === null ? null : 'USD',
        provenance: {
          provider: propertyRecord.provenance.provider,
          providerRecordId: propertyRecord.provenance.providerRecordId,
          retrievedAt: propertyRecord.provenance.retrievedAt,
        },
      },
      {
        valueType: 'provider_estimate',
        amount: propertyRecord.valuations.providerEstimate,
        currency: propertyRecord.valuations.providerEstimate === null ? null : 'USD',
        provenance: {
          provider: propertyRecord.provenance.provider,
          providerRecordId: propertyRecord.provenance.providerRecordId,
          retrievedAt: propertyRecord.provenance.retrievedAt,
        },
      },
      {
        valueType: 'homesbyrcg_estimate',
        amount: propertyRecord.valuations.homesByRcgEstimate,
        currency: propertyRecord.valuations.homesByRcgEstimate === null ? null : 'USD',
        provenance: {
          provider: 'homesbyrcg',
          providerRecordId: propertyRecord.identity.propertyRef,
          retrievedAt: propertyRecord.timestamps.canonicalizedAt,
        },
      },
    ],
  };
}
