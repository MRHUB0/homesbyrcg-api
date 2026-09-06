import { ProviderError } from '../../errors/index.js';
import { PropertyProvider } from '../property-provider.js';
import { PropertyResolutionStatus } from '../status.js';

const defaultPath =
  '/arcgis/rest/services/AddressLocator/GeocodeServer/findAddressCandidates?f=json&outFields=*&maxLocations=5';

function sleep(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function resolveCounty(attributes) {
  return (
    attributes?.County ?? attributes?.COUNTY ?? attributes?.county ?? attributes?.CountyName ?? null
  );
}

function resolveState(attributes, normalizedAddress) {
  return (
    attributes?.Region ?? attributes?.STATE ?? attributes?.State ?? normalizedAddress.state ?? null
  );
}

function toProviderRecord(candidate, normalizedAddress) {
  const attributes = candidate.attributes ?? {};
  const apn =
    attributes.PARCELID ?? attributes.PARCEL_ID ?? attributes.PIN ?? attributes.APN ?? null;

  return {
    providerPropertyId:
      attributes.OBJECTID ??
      attributes.ObjectID ??
      attributes.GlobalID ??
      candidate.address ??
      null,
    parcel: {
      apn,
      parcelId: apn,
    },
    jurisdiction: {
      county: resolveCounty(attributes) ?? normalizedAddress.county ?? 'FRANKLIN',
      municipality:
        attributes.City ??
        attributes.CITY ??
        attributes.Municipality ??
        normalizedAddress.city ??
        null,
      state: resolveState(attributes, normalizedAddress),
    },
    address: {
      displayAddress: candidate.address ?? normalizedAddress.displayAddress,
    },
    characteristics: {
      propertyType: attributes.PropertyType ?? attributes.USE_CODE ?? null,
      yearBuilt: toNumber(attributes.YearBuilt ?? attributes.YEAR_BUILT),
      bedrooms: toNumber(attributes.Bedrooms ?? attributes.BEDS),
      bathrooms: toNumber(attributes.Bathrooms ?? attributes.BATHS),
      livingAreaSqft: toNumber(attributes.BuildingSqFt ?? attributes.BLDG_SQFT ?? attributes.SQFT),
      lotSizeSqft: toNumber(attributes.LotSqFt ?? attributes.LOT_SQFT),
    },
    assessment: {
      assessedValue: toNumber(
        attributes.AssessedValue ?? attributes.TOTAL_VALUE ?? attributes.VALUE,
      ),
      landAssessedValue: toNumber(attributes.LandValue ?? attributes.LAND_VALUE),
      improvementAssessedValue: toNumber(attributes.ImprovementValue ?? attributes.BUILDING_VALUE),
      taxYear: toNumber(attributes.TaxYear ?? attributes.TAX_YEAR),
    },
    valuations: {
      providerEstimate: null,
      homesByRcgEstimate: null,
      userVisibleValue: null,
      cmaValue: null,
    },
  };
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseCandidates(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new ProviderError('Franklin County provider returned malformed JSON.', [
      { provider: 'franklin-county-gis' },
    ]);
  }

  if (responseBody.error) {
    throw new ProviderError('Franklin County provider returned an error response.', [
      { provider: 'franklin-county-gis', providerError: responseBody.error.message },
    ]);
  }

  if (!Array.isArray(responseBody.candidates)) {
    throw new ProviderError('Franklin County provider response missing candidates.', [
      { provider: 'franklin-county-gis' },
    ]);
  }

  return responseBody.candidates;
}

export class FranklinCountyPropertyProvider extends PropertyProvider {
  constructor({
    baseUrl,
    requestPath = defaultPath,
    timeoutMs = 2500,
    maxAttempts = 2,
    fetchImpl = globalThis.fetch,
  }) {
    super({ name: 'franklin-county-gis' });
    this.baseUrl = (baseUrl ?? '').replace(/\/$/u, '');
    this.requestPath = requestPath;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
    this.fetchImpl = fetchImpl;
  }

  async resolveProperty({ normalizedAddress }) {
    if (!this.baseUrl) {
      return {
        status: PropertyResolutionStatus.PROVIDER_UNAVAILABLE,
        provider: this.name,
        retrievedAt: new Date().toISOString(),
        matches: [],
        diagnostics: {
          message: 'FRANKLIN_GIS_BASE_URL is not configured.',
        },
      };
    }

    const address = [normalizedAddress.line1, normalizedAddress.city, normalizedAddress.state]
      .filter(Boolean)
      .join(', ');

    const url = new URL(`${this.baseUrl}${this.requestPath}`);
    url.searchParams.set('SingleLine', address);
    url.searchParams.set('outSR', '4326');

    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url.toString());

        if (response.status >= 500) {
          lastError = new ProviderError('Franklin County provider server error.', [
            { provider: this.name, status: response.status },
          ]);
          if (attempt < this.maxAttempts) {
            await sleep(100 * 2 ** (attempt - 1));
            continue;
          }
        }

        if (response.status >= 400) {
          return {
            status: PropertyResolutionStatus.PROVIDER_UNAVAILABLE,
            provider: this.name,
            retrievedAt: new Date().toISOString(),
            matches: [],
            diagnostics: {
              message: 'Franklin County provider rejected request.',
              status: response.status,
            },
          };
        }

        const body = parseCandidates(await response.json());
        const highConfidence = body.filter((candidate) => Number(candidate.score ?? 0) >= 85);
        const candidates = highConfidence.length > 0 ? highConfidence : body;
        const matches = candidates.map((candidate) =>
          toProviderRecord(candidate, normalizedAddress),
        );

        return {
          status:
            matches.length === 0
              ? PropertyResolutionStatus.NOT_FOUND
              : matches.length === 1
                ? PropertyResolutionStatus.FOUND
                : PropertyResolutionStatus.MULTIPLE_MATCHES,
          provider: this.name,
          retrievedAt: new Date().toISOString(),
          matches,
        };
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) {
          await sleep(100 * 2 ** (attempt - 1));
          continue;
        }
      }
    }

    return {
      status: PropertyResolutionStatus.PROVIDER_UNAVAILABLE,
      provider: this.name,
      retrievedAt: new Date().toISOString(),
      matches: [],
      diagnostics: {
        message: lastError?.message ?? 'Franklin County provider is unavailable.',
      },
    };
  }

  async fetchWithTimeout(url) {
    const controller = new globalThis.AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImpl(url, {
        method: 'GET',
        signal: controller.signal,
      });
    } finally {
      globalThis.clearTimeout(timer);
    }
  }
}
