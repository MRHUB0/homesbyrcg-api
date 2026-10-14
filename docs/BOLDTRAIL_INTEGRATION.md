# BoldTrail Integration

## Purpose

HomesByRCG is the canonical platform for lead, event, journey, consent, and property context data.
BoldTrail is integrated as a downstream CRM engagement adapter.

## Integration Boundary

```text
HomesByRCG Domain Models
  -> CRM Sync Service
  -> CRM Adapter Interface
  -> BoldTrail Adapter
  -> BoldTrail Public V2 API
```

The canonical lead/event schemas stay vendor-neutral. BoldTrail-specific payload mapping is isolated
in `src/integrations/crm/boldtrail/mapper.js`.

## Authentication

- Runtime token source: `BOLDTRAIL_API_TOKEN`
- Runtime base URL: `BOLDTRAIL_API_BASE_URL` (default `https://api.kvcore.com`)
- Required request header: `Authorization: Bearer <token>`
- `X-API-Token` is not required by the Public V2 contract and is not sent by this integration.
- Token must never be logged, returned, or committed.

## Secret Storage (AWS)

For production, inject `BOLDTRAIL_API_TOKEN` from an AWS-managed secret value at deploy/runtime.
Do not place real token values in SAM templates, repo files, shell history, or CI logs.

## Supported Outbound Sync

### Lead Sync

Lead endpoints (`/contact`, `/consultation`, `/home-value`, `/leads`) persist to DynamoDB first, then
attempt CRM sync without impacting acceptance responses.

Lead sync behavior:

- identity resolution by stored external contact ID, then email/phone lookup
- create contact when no match exists
- update contact when match exists
- append hashtags/tags
- append structured note with journey and attribution context

Persisted CRM metadata in canonical lead record:

- `metadata.crm.provider`
- `metadata.crm.boldtrailContactId`
- `metadata.crm.lastLeadSyncAt`
- `metadata.crm.lastLeadSyncKey`
- `metadata.crm.lastLeadSyncStatus`

### Event Sync

`/events` persists events first, then attempts CRM sync non-blockingly.

Event sync behavior:

- resolve lead identity from `properties.leadId` when present
- attach mapped event tags/hashtags when identity is available
- append structured event notes with journey/session/attribution/property context
- skip safely when no resolvable identity exists

## Idempotency

CRM sync uses `CrmIdempotencyTable` keyed by deterministic sync keys:

- lead sync key: `lead:<leadId>:<updatedAt|createdAt|timestamp>`
- event sync key: `event:<eventName>:<journeyId>:<occurredAt>:<correlationId>`

Duplicate deliveries are skipped and measured.

## Reliability Controls

BoldTrail client includes:

- bounded timeout (`CRM_SYNC_TIMEOUT_MS`)
- bounded retries (`CRM_SYNC_MAX_RETRIES`)
- exponential backoff with jitter (`CRM_SYNC_BASE_DELAY_MS` / `CRM_SYNC_MAX_DELAY_MS`)
- retry on network, timeout, `429`, and `5xx`
- no retry on permanent `4xx` errors
- structured integration errors with status metadata

## Observability

EMF metrics:

- `CrmSyncLeadAttemptCount`
- `CrmSyncLeadSuccessCount`
- `CrmSyncLeadSkippedCount`
- `CrmSyncEventAttemptCount`
- `CrmSyncEventSuccessCount`
- `CrmSyncEventSkippedCount`
- `CrmSyncDuplicateSkipCount`
- `CrmSyncFailureCount`

Dimensions are bounded (`Environment`, `Provider`) to avoid high cardinality.

## Health and Diagnostics

`GET /health` now returns integration-safe metadata:

- CRM provider mode
- CRM configured status (token present for BoldTrail mode)
- CRM endpoint URL

No secrets or PII are returned.

## Mapping Summary

Mapped event families include lead, property, valuation, funnel, and deal lifecycle categories.
When no direct BoldTrail event entity is available, events are represented as contact hashtags and
notes with canonical HomesByRCG context.

Supported canonical context in outbound payloads where applicable:

- `visitorId`, `sessionId`, `journeyId`
- funnel and landing page
- attribution (`utm*`, click IDs)
- `propertyRef`
- intent/decision context
- consent state
- lead score and conversion metadata

## Verified Contract Snapshot (2026-09-05/06)

### VERIFIED FROM OFFICIAL DOCUMENTATION

- Base URL: `https://api.kvcore.com`
- Auth: `Authorization: Bearer <token>`
- List/search contacts: `GET /v2/public/contacts`
- Contact detail: `GET /v2/public/contact/{contact_id}`
- Create contact: `POST /v2/public/contact`
- Update contact: `PUT /v2/public/contact/{contact_id}`
- Tags: `PUT /v2/public/contact/{contact_id}/tags` with `{ "tags": [{ "name": "...", "locked": 0|1 }] }`
- Notes: `PUT /v2/public/contact/{contact_id}/action/note` with `date`, `title`, and `details`

### VERIFIED LIVE

- Bearer token auth succeeds against contact endpoints.
- `X-API-Token` alone returns `401 Authentication Failed`.
- Contact list envelope returns paginator fields (`current_page`, `data`, `last_page`, URL pagination links).
- Auth failures return JSON error envelope (for example `{"errors":["Authentication Failed"]}`).

### UNVERIFIED

- Published rate-limit policy and quota headers are not documented in public responses.
- `/v2/public/contact/lookup` exists and responds live, but is not present in the published Postman V2 collection.

## Known Capability Limits

Current adapter is built around documented Public V2 contact, user, note, and tag operations.
If account-level capabilities (transactions, assignments, webhooks, offices, teams) are unavailable
for the token/account, the adapter skips unsupported flows safely without impacting core ingestion.

## Rotation Procedure

1. Create new token in BoldTrail admin controls.
2. Update the secret value used to populate `BOLDTRAIL_API_TOKEN`.
3. Deploy the stack update with unchanged template/token reference.
4. Validate `/health` integration section and CRM success metrics.
5. Revoke previous token after successful verification.

## Rollback

If CRM sync causes regressions:

1. Deploy with `CRM_PROVIDER_MODE=disabled` to stop outbound CRM calls.
2. If required, roll back to previous stack/application revision.
3. Validate lead/event ingestion remains healthy.
4. Inspect `CrmSyncFailureCount` and function logs before re-enabling.
