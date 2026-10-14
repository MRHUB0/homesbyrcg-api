# Property Provider Onboarding Checklist

Use this checklist to add a new county/provider without changing HomesByRCG funnel contracts.

## 1) Provider Fit and Contract

- Confirm public/legal access to provider data source.
- Identify read-only endpoint(s) and query inputs.
- Capture provider response schema examples (success, zero results, multi results, errors).
- Record provider limits (rate limits, auth, uptime expectations).

## 2) Implement Provider Adapter

Create adapter in `src/property-data/providers/` implementing `resolveProperty()`.

Required adapter output:

- `status`: `FOUND | MULTIPLE_MATCHES | NOT_FOUND | PROVIDER_UNAVAILABLE`
- `provider`
- `retrievedAt`
- `matches` as provider records mappable to canonical property record

Adapter requirements:

- bounded timeout
- bounded retries for retryable failures only
- fail-fast handling for permanent errors (e.g., 4xx)
- safe handling of malformed responses

## 3) Map to Canonical Record

Ensure provider mapping supports canonical fields when available:

- parcel/APN
- jurisdiction (county, municipality, state)
- display address
- property characteristics
- assessed values (when available)

Do not fabricate unavailable values.

Do not represent assessed value as market value.

## 4) Identity and Dedup

- Prefer parcel-based identity when possible.
- Fallback to normalized-address identity.
- Verify equivalent address formats resolve to stable `propertyRef`.

## 5) Configuration

Add/verify environment variables:

- `PROPERTY_PROVIDER_MODE`
- provider-specific base URL and optional path settings (for Franklin:
  `FRANKLIN_GIS_BASE_URL`, `FRANKLIN_LOCATOR_PATH`, `FRANKLIN_PARCEL_LAYER_PATH`)
- timeout and retry settings
- cache TTL

Use safe defaults in non-production environments.

## 6) Observability

Emit low-cardinality metrics:

- `PropertyLookupAttempt`
- `PropertyLookupSuccess`
- `PropertyLookupNotFound`
- `PropertyLookupMultiple`
- `PropertyProviderFailure`
- `PropertyCacheHit`
- `PropertyCacheMiss`

Allowed dimensions: provider/result/service/environment only.

Never emit address, parcel, propertyRef, leadId, visitorId, email, phone in dimensions.

## 7) API Compatibility

Do not break existing property endpoint contracts.

Preserve status semantics for frontend handling:

- `FOUND`
- `MULTIPLE_MATCHES`
- `NOT_FOUND`
- `PROVIDER_UNAVAILABLE`

## 8) Value Gating

Ensure value endpoints continue server-side gating behavior and do not rely on frontend-only hiding.

## 9) Testing Requirements

Add deterministic tests for:

- valid address
- normalized equivalent addresses
- zero/one/multiple matches
- provider timeout
- provider 4xx
- provider 5xx
- malformed provider response
- canonical propertyRef stability
- provenance correctness
- valuation semantics separation
- cache behavior

Live tests must be optional, safe, and low-volume.

## 10) Rollout

- Deploy adapter behind config flag first.
- Validate in non-production.
- Observe metrics and failure ratios.
- Enable provider mode in production only after contract verification.
