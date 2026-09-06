import { normalizeAndValidateAddress } from './property-validation.js';
import { PropertyResolutionStatus } from './status.js';
import { toCanonicalPropertyRecord, toValueResponse } from './property-record.js';

export class PropertyService {
  constructor({ provider, cache, metrics }) {
    this.provider = provider;
    this.cache = cache;
    this.metrics = metrics;
  }

  async resolve(payload) {
    const normalizedAddress = normalizeAndValidateAddress(payload);
    const cacheKey = normalizedAddress.normalizedAddressKey;

    this.metrics.lookupAttempt({ provider: this.provider.name, resultStatus: 'ATTEMPT' });

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHit({
        provider: cached.provider ?? this.provider.name,
        resultStatus: cached.status,
      });
      return cached;
    }

    this.metrics.cacheMiss({ provider: this.provider.name });

    const providerResult = await this.provider.resolveProperty({
      normalizedAddress,
      rawPayload: payload,
    });

    const result = this.toResolutionResult({ normalizedAddress, providerResult });
    await this.cache.set(cacheKey, result);

    return result;
  }

  async getPropertyValue(payload) {
    const resolution = await this.resolve(payload);

    if (resolution.status !== PropertyResolutionStatus.FOUND) {
      return {
        ...resolution,
        value: null,
      };
    }

    return {
      ...resolution,
      value: toValueResponse(resolution.propertyRecord),
    };
  }

  toResolutionResult({ normalizedAddress, providerResult }) {
    const status = providerResult.status;
    const provider = providerResult.provider ?? this.provider.name;

    if (status === PropertyResolutionStatus.PROVIDER_UNAVAILABLE) {
      this.metrics.providerFailure({ provider, resultStatus: status });
      return {
        status,
        provider,
        normalizedAddress,
        matches: [],
        diagnostics: providerResult.diagnostics ?? null,
      };
    }

    if (status === PropertyResolutionStatus.NOT_FOUND) {
      this.metrics.lookupNotFound({ provider, resultStatus: status });
      return {
        status,
        provider,
        normalizedAddress,
        matches: [],
      };
    }

    const records = providerResult.matches.map((providerRecord) =>
      toCanonicalPropertyRecord({
        providerRecord,
        normalizedAddress,
        provider,
        retrievedAt: providerResult.retrievedAt,
      }),
    );

    if (records.length > 1 || status === PropertyResolutionStatus.MULTIPLE_MATCHES) {
      this.metrics.lookupMultiple({
        provider,
        resultStatus: PropertyResolutionStatus.MULTIPLE_MATCHES,
      });
      return {
        status: PropertyResolutionStatus.MULTIPLE_MATCHES,
        provider,
        normalizedAddress,
        matches: records.map((record) => ({
          propertyRef: record.identity.propertyRef,
          displayAddress: record.address.displayAddress,
          parcelId: record.parcel.parcelId,
        })),
        candidateRecords: records,
      };
    }

    this.metrics.lookupSuccess({ provider, resultStatus: PropertyResolutionStatus.FOUND });

    return {
      status: PropertyResolutionStatus.FOUND,
      provider,
      normalizedAddress,
      propertyRef: records[0].identity.propertyRef,
      matches: [
        {
          propertyRef: records[0].identity.propertyRef,
          displayAddress: records[0].address.displayAddress,
          parcelId: records[0].parcel.parcelId,
        },
      ],
      propertyRecord: records[0],
    };
  }
}
