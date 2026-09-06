# Property Data Architecture

## Scope and Current State

This document describes the property-data subsystem in this repository as implemented on
`feature/property-data-platform`.

Before this branch, the API only exposed lead-intake endpoints (`/contact`, `/consultation`,
`/home-value`, `/leads`) and did not implement dedicated property resolution endpoints.

This branch adds the property-data boundary and contracts for:

- `POST /property-search`
- `POST /property-record/resolve`
- `POST /property-record/value`
- `POST /property-value`

## Canonical Property Identity Model

Canonical HomesByRCG identity is separate from provider identity.

- `identity.propertyRef`: stable internal identity (`hbrcg_prop_<hash>`)
- `identity.identityType`: `parcel` or `normalized_address`
- `identity.canonicalIdentity`: source identity used to derive `propertyRef`
- `identity.providerIdentity`: provider-scoped identifier fields

Identity precedence:

1. `state|county|parcel` when parcel/APN is available
2. normalized address identity key when parcel identity is absent

This prevents dependence on a provider-specific ID and avoids using raw display address as the sole
identity mechanism.

## Address Normalization

Normalization is deterministic and intentionally bounded (not a full postal parser).

Implemented normalization behavior:

- trims whitespace and control characters
- uppercases state/city/address tokens
- removes punctuation noise
- normalizes common directionals (`NORTH` -> `N`)
- normalizes common suffixes (`STREET` -> `ST`, `AVENUE` -> `AVE`, etc.)
- extracts and normalizes ZIP (`12345` or `12345-6789`)
- preserves unit context when present

Output model:

- normalized line fields (`line1`, `line2`, `city`, `state`, `postalCode`, `county`)
- `normalizedAddressKey` for deterministic identity/caching
- `displayAddress` for user-facing display

## Resolution Flow

```
request input
  -> normalizeAndValidateAddress
  -> cache lookup
  -> provider resolveProperty
  -> status mapping (FOUND | MULTIPLE_MATCHES | NOT_FOUND | PROVIDER_UNAVAILABLE)
  -> canonical property record / match summary
```

Invalid payloads return `422` with field-specific errors.

Provider failures are represented as `PROVIDER_UNAVAILABLE` (not collapsed into `NOT_FOUND`).

## Provider Abstraction

`PropertyService` depends on `PropertyProvider`.

Current provider implementations:

- `mock` (default, deterministic test/local behavior)
- `franklin-county-gis` (adapter boundary for Franklin County GIS/ArcGIS-style candidates)

Provider mode is controlled by `PROPERTY_PROVIDER_MODE`.

No funnel business logic depends on Franklin implementation details.

## Franklin County Integration

Adapter file: `src/property-data/providers/franklin-county-provider.js`

Implemented concerns:

- endpoint construction via configured `FRANKLIN_GIS_BASE_URL` + ArcGIS candidate path
- query parameter composition using normalized address
- bounded timeout (`PROPERTY_PROVIDER_TIMEOUT_MS`)
- bounded retries with backoff (`PROPERTY_PROVIDER_MAX_ATTEMPTS`)
- fail-fast treatment for provider 4xx
- retry treatment for provider 5xx and transient failures
- empty candidate handling (`NOT_FOUND`)
- malformed response handling (`PROVIDER_UNAVAILABLE`)

### Verification Status

- **VERIFIED FROM PROVIDER CONTRACT**: ArcGIS candidate JSON shape handling (`candidates[]`,
  `address`, `score`, `attributes`) via tests and parser contract behavior.
- **VERIFIED LIVE**: public Franklin County root host response availability was checked.
- **ASSUMED**: exact ArcGIS path and attribute names beyond common variants (`PARCELID`,
  `AssessedValue`, etc.) may vary by county-hosted service.
- **NOT VERIFIED**: county-specific production endpoint path and full field catalog for parcel
  attributes in this repository environment.

## Canonical Property Record

Canonical property record contains:

- `identity`
- `address` (display + normalized)
- `parcel`
- `jurisdiction`
- `characteristics`
- `assessment`
- `valuations`
- `provenance`
- `timestamps`

Only provider-available fields are populated. Unknown values are `null`.

## Valuation Semantics

Valuation fields are explicitly non-interchangeable:

- `assessment.assessedValue` (`sourceType: ASSESSMENT`)
- `valuations.providerEstimate`
- `valuations.homesByRcgEstimate`
- `valuations.userVisibleValue`
- `valuations.cmaValue`

`toValueResponse()` returns typed value entries:

- `assessed_value`
- `provider_estimate`
- `homesbyrcg_estimate`

Assessed value is never relabeled as market value.

## Provenance Model

Externally sourced data includes provenance:

- provider name
- provider record identifier (when available)
- retrieval timestamp

Provider internals are not leaked beyond required operational provenance fields.

## Freshness and Cache

Current cache implementation is conservative and bounded:

- in-memory TTL cache (`InMemoryPropertyCacheRepository`)
- configurable TTL (`PROPERTY_CACHE_TTL_SECONDS`, default 900)
- cache key based on normalized address identity key

This reduces repeated provider lookups without introducing uncontrolled persistence.

## Failure and Retry Behavior

- timeout + retry are bounded
- 4xx responses fail fast as provider-unavailable
- 5xx responses retry with backoff up to configured attempts
- malformed payloads yield provider-unavailable classification
- Lambda runtime remains bounded by timeout and max attempts

## API Contract Summary

`POST /property-search`

- purpose: lookup + match summaries
- statuses in `data.status`: FOUND/MULTIPLE_MATCHES/NOT_FOUND/PROVIDER_UNAVAILABLE

`POST /property-record/resolve`

- purpose: canonical property record resolution
- same status model

`POST /property-record/value`

- purpose: typed valuation record
- journey gating by lead context (default enabled)

`POST /property-value`

- purpose: valuation view alias
- journey gating by lead context (default enabled)

## Value Gating

Backend enforcement is implemented in `enforcePropertyValueAccess()`.

- Requires `leadId` when `PROPERTY_VALUE_REQUIRE_LEAD_CONTEXT=true`
- Validates lead existence through repository lookup
- Returns authorization error when lead context is absent/invalid

This prevents value retrieval from being purely frontend-gated.

## Journey and Property Correlation

Correlation fields:

- `leadId` (journey context)
- `propertyRef` (canonical property identity)

Value endpoints are designed to carry both concepts without forcing raw address duplication.

## Observability

Low-cardinality EMF metrics added under namespace `HomesByRCG/PropertyData`:

- `PropertyLookupAttempt`
- `PropertyLookupSuccess`
- `PropertyLookupNotFound`
- `PropertyLookupMultiple`
- `PropertyProviderFailure`
- `PropertyCacheHit`
- `PropertyCacheMiss`

Dimensions:

- `Service`
- `Environment`
- `Provider`
- `ResultStatus`

No PII or high-cardinality identifiers are used as dimensions.

## Security and Privacy Notes

- address input is validated and normalized before provider requests
- provider URL construction is controlled and bounded
- no raw address/propertyRef/leadId values are emitted in metric dimensions
- provider raw payloads are not returned directly to clients

## Geographic Expansion Readiness

The provider boundary and canonical record contract allow additional counties/providers without
funnel rewrites. New providers should implement `resolveProperty()` and map into canonical record
shape.
