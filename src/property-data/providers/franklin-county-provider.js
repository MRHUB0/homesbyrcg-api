import { ProviderError } from '../../errors/index.js';
import { PropertyProvider } from '../property-provider.js';
import { PropertyResolutionStatus } from '../status.js';

const defaultLocatorPath = '/hosting/rest/services/Locators/GIS_LBRS_Locator/GeocodeServer';
const defaultParcelLayerPath = '/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0';

const parcelOutFields = [
  'OBJECTID',
  'PARCELID',
  'SITEADDRESS',
  'ZIPCD',
  'LNDVALUEBASE',
  'BLDVALUEBASE',
  'TOTVALUEBASE',
].join(',');

function sleep(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/gu, "''");
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function stripCityStateZip(value) {
  const compact = normalizeWhitespace(value).toUpperCase();
  if (!compact) return compact;

  return compact
    .replace(/\s+[A-Z][A-Z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/u, '')
    .replace(/\s+[A-Z][A-Z\s]+,\s*[A-Z]{2}$/u, '')
    .replace(/\s+\d{5}(?:-\d{4})?$/u, '')
    .trim();
}

function normalizeSiteAddress(value) {
  const primary = normalizeWhitespace(value).split(',')[0] ?? '';
  const upper = stripCityStateZip(primary).replace(/[.]/gu, ' ').replace(/\s+/gu, ' ').trim();

  return upper || null;
}

function stripTrailingUnit(value) {
  if (!value) return value;
  return value
    .replace(/\s+#\s*[A-Z0-9-]+$/u, '')
    .replace(/\s+(APT|UNIT|STE|SUITE)\s+[A-Z0-9-]+$/u, '')
    .trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const cleaned = normalizeWhitespace(value);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    output.push(cleaned);
  }

  return output;
}

function parseLocatorCandidates(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new ProviderError('Franklin locator returned malformed JSON.', [
      { provider: 'franklin-county-gis' },
    ]);
  }

  if (responseBody.error) {
    throw new ProviderError('Franklin locator returned an error response.', [
      { provider: 'franklin-county-gis', providerError: responseBody.error.message },
    ]);
  }

  if (!Array.isArray(responseBody.candidates)) {
    throw new ProviderError('Franklin locator response missing candidates.', [
      { provider: 'franklin-county-gis' },
    ]);
  }

  return responseBody.candidates;
}

function parseParcelFeatures(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new ProviderError('Franklin parcel layer returned malformed JSON.', [
      { provider: 'franklin-county-gis' },
    ]);
  }

  if (responseBody.error) {
    throw new ProviderError('Franklin parcel layer returned an error response.', [
      { provider: 'franklin-county-gis', providerError: responseBody.error.message },
    ]);
  }

  if (!Array.isArray(responseBody.features)) {
    throw new ProviderError('Franklin parcel layer response missing features.', [
      { provider: 'franklin-county-gis' },
    ]);
  }

  return responseBody.features;
}

function toLocatorRecord(candidate, normalizedAddress) {
  return {
    providerPropertyId: candidate.attributes?.Name ?? candidate.address ?? null,
    parcel: {
      apn: null,
      parcelId: null,
    },
    jurisdiction: {
      county: normalizedAddress.county ?? 'FRANKLIN',
      municipality: normalizedAddress.city ?? null,
      state: normalizedAddress.state ?? 'OH',
    },
    address: {
      displayAddress: candidate.address ?? normalizedAddress.displayAddress,
    },
    characteristics: {
      propertyType: null,
      yearBuilt: null,
      bedrooms: null,
      bathrooms: null,
      livingAreaSqft: null,
      lotSizeSqft: null,
    },
    assessment: {
      assessedValue: null,
      landAssessedValue: null,
      improvementAssessedValue: null,
      taxYear: null,
    },
    valuations: {
      providerEstimate: null,
      homesByRcgEstimate: null,
      userVisibleValue: null,
      cmaValue: null,
    },
  };
}

function toParcelRecord(feature, candidate, normalizedAddress) {
  const attributes = feature.attributes ?? {};
  const parcelId = attributes.PARCELID ?? null;

  return {
    providerPropertyId: attributes.OBJECTID ?? parcelId ?? candidate?.address ?? null,
    parcel: {
      apn: parcelId,
      parcelId,
    },
    jurisdiction: {
      county: normalizedAddress.county ?? 'FRANKLIN',
      municipality: normalizedAddress.city ?? null,
      state: normalizedAddress.state ?? 'OH',
    },
    address: {
      displayAddress:
        attributes.SITEADDRESS ?? candidate?.address ?? normalizedAddress.displayAddress,
    },
    characteristics: {
      propertyType: null,
      yearBuilt: null,
      bedrooms: null,
      bathrooms: null,
      livingAreaSqft: null,
      lotSizeSqft: null,
    },
    assessment: {
      assessedValue: toNumber(attributes.TOTVALUEBASE),
      landAssessedValue: toNumber(attributes.LNDVALUEBASE),
      improvementAssessedValue: toNumber(attributes.BLDVALUEBASE),
      taxYear: null,
    },
    valuations: {
      providerEstimate: null,
      homesByRcgEstimate: null,
      userVisibleValue: null,
      cmaValue: null,
    },
  };
}

function dedupeParcelMatches(matches) {
  const byIdentity = new Map();

  for (const match of matches) {
    const parcelKey = match?.parcel?.parcelId;
    const addressKey = normalizeSiteAddress(match?.address?.displayAddress);
    const dedupeKey = parcelKey ?? addressKey;

    if (!dedupeKey || byIdentity.has(dedupeKey)) continue;
    byIdentity.set(dedupeKey, match);
  }

  return [...byIdentity.values()];
}

function determinePlausibleLocatorCandidates(candidates) {
  const highConfidence = candidates.filter((candidate) => Number(candidate.score ?? 0) >= 85);
  return highConfidence.length > 0 ? highConfidence : candidates;
}

function appendPath(basePath, operation) {
  const normalized = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  if (normalized.endsWith(`/${operation}`)) return normalized;
  return `${normalized}/${operation}`;
}

function sanitizeBaseUrl(baseUrl) {
  return String(baseUrl ?? '').replace(/\/+$/u, '');
}

function isDeterministicClientError(error) {
  if (!(error instanceof ProviderError)) return false;
  return error.details?.some((detail) => {
    const status = Number(detail?.status);
    return Number.isInteger(status) && status >= 400 && status < 500;
  });
}

function buildLocatorSingleLine(normalizedAddress) {
  return [
    normalizedAddress.line1,
    normalizedAddress.city,
    normalizedAddress.state,
    normalizedAddress.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
}

export class FranklinCountyPropertyProvider extends PropertyProvider {
  constructor({
    baseUrl,
    locatorPath = defaultLocatorPath,
    parcelLayerPath = defaultParcelLayerPath,
    timeoutMs = 2500,
    maxAttempts = 2,
    maxLocatorCandidates = 5,
    maxParcelResultsPerQuery = 5,
    fetchImpl = globalThis.fetch,
  }) {
    super({ name: 'franklin-county-gis' });
    this.baseUrl = sanitizeBaseUrl(baseUrl);
    this.locatorPath = locatorPath;
    this.parcelLayerPath = parcelLayerPath;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
    this.maxLocatorCandidates = maxLocatorCandidates;
    this.maxParcelResultsPerQuery = maxParcelResultsPerQuery;
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

    const retrievedAt = new Date().toISOString();

    try {
      const locatorCandidates = await this.findAddressCandidates(normalizedAddress);

      if (locatorCandidates.length === 0) {
        return {
          status: PropertyResolutionStatus.NOT_FOUND,
          provider: this.name,
          retrievedAt,
          matches: [],
        };
      }

      const plausibleCandidates = determinePlausibleLocatorCandidates(locatorCandidates);
      const parcelMatches = await this.findParcelMatches({
        normalizedAddress,
        locatorCandidates: plausibleCandidates,
      });

      if (parcelMatches.length === 1) {
        return {
          status: PropertyResolutionStatus.FOUND,
          provider: this.name,
          retrievedAt,
          matches: parcelMatches,
        };
      }

      if (parcelMatches.length > 1) {
        return {
          status: PropertyResolutionStatus.MULTIPLE_MATCHES,
          provider: this.name,
          retrievedAt,
          matches: parcelMatches,
        };
      }

      if (plausibleCandidates.length > 1) {
        return {
          status: PropertyResolutionStatus.MULTIPLE_MATCHES,
          provider: this.name,
          retrievedAt,
          matches: plausibleCandidates
            .slice(0, this.maxLocatorCandidates)
            .map((candidate) => toLocatorRecord(candidate, normalizedAddress)),
        };
      }

      return {
        status: PropertyResolutionStatus.NOT_FOUND,
        provider: this.name,
        retrievedAt,
        matches: [],
      };
    } catch (error) {
      return {
        status: PropertyResolutionStatus.PROVIDER_UNAVAILABLE,
        provider: this.name,
        retrievedAt,
        matches: [],
        diagnostics: {
          message: error?.message ?? 'Franklin County provider is unavailable.',
        },
      };
    }
  }

  async findAddressCandidates(normalizedAddress) {
    const url = this.buildLocatorUrl(normalizedAddress);
    const body = await this.fetchJsonWithRetry(url.toString());
    const candidates = parseLocatorCandidates(body);
    return candidates.slice(0, this.maxLocatorCandidates);
  }

  buildLocatorUrl(normalizedAddress) {
    const url = new URL(`${this.baseUrl}${appendPath(this.locatorPath, 'findAddressCandidates')}`);
    url.searchParams.set('f', 'json');
    url.searchParams.set('SingleLine', buildLocatorSingleLine(normalizedAddress));
    url.searchParams.set('outFields', 'Match_addr,Name,Score,Addr_type');
    url.searchParams.set('maxLocations', String(this.maxLocatorCandidates));
    return url;
  }

  async findParcelMatches({ normalizedAddress, locatorCandidates }) {
    const candidateAddresses = locatorCandidates
      .map((candidate) => normalizeSiteAddress(candidate.address))
      .filter(Boolean);

    const normalizedLine1 = normalizeSiteAddress(normalizedAddress.line1);

    const queryCandidates = uniqueStrings([
      ...candidateAddresses,
      normalizedLine1,
      stripTrailingUnit(normalizedLine1),
    ]).slice(0, this.maxLocatorCandidates);

    const parcelMatches = [];

    for (const queryAddress of queryCandidates) {
      const features = await this.queryParcelBySiteAddress(queryAddress);
      if (features.length === 0) continue;

      for (const feature of features) {
        const siteAddress = normalizeSiteAddress(feature.attributes?.SITEADDRESS);
        const addressMatches = siteAddress === queryAddress;
        if (!addressMatches) continue;

        const matchingLocatorCandidate = locatorCandidates.find((candidate) => {
          return normalizeSiteAddress(candidate.address) === siteAddress;
        });

        parcelMatches.push(toParcelRecord(feature, matchingLocatorCandidate, normalizedAddress));
      }
    }

    return dedupeParcelMatches(parcelMatches);
  }

  async queryParcelBySiteAddress(siteAddress) {
    const url = new URL(`${this.baseUrl}${appendPath(this.parcelLayerPath, 'query')}`);
    url.searchParams.set('f', 'json');
    url.searchParams.set('where', `SITEADDRESS = '${escapeSqlLiteral(siteAddress)}'`);
    url.searchParams.set('outFields', parcelOutFields);
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('resultRecordCount', String(this.maxParcelResultsPerQuery));

    const body = await this.fetchJsonWithRetry(url.toString());
    return parseParcelFeatures(body);
  }

  async fetchJsonWithRetry(url) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url);

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
          throw new ProviderError('Franklin County provider rejected request.', [
            { provider: this.name, status: response.status },
          ]);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (isDeterministicClientError(error)) {
          break;
        }
        if (attempt < this.maxAttempts) {
          await sleep(100 * 2 ** (attempt - 1));
          continue;
        }
      }
    }

    throw lastError ?? new ProviderError('Franklin County provider is unavailable.', []);
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
