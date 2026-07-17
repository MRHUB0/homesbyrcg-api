# Lead Platform

## Architecture Diagram

```text
HomesByRCG.com
  -> API Gateway HTTP API
  -> Lambda Handler
  -> Endpoint Service
  -> LeadRepository
  -> DynamoDB LeadTable
  -> Provider Interface
  -> SES Provider or Mock Provider
  -> LeadRepository update
  -> ResponseBuilder
  -> Non-PII Accepted Response
```

Implemented routes:

- `POST /contact`
- `POST /consultation`
- `POST /home-value`

## Canonical Lead Model

Every lead is normalized into one object:

```json
{
  "leadId": "...",
  "leadType": "consultation",
  "timestamp": "2026-07-06T00:00:00.000Z",
  "requestId": "...",
  "correlationId": "...",
  "status": "RECEIVED",
  "firstName": "Riley",
  "lastName": "Carter",
  "email": "riley@example.com",
  "phone": "+1 555 123 4567",
  "journeySource": "consultation-page",
  "currentPage": "/consultation",
  "leadIntent": "buying-consultation",
  "leadScore": 90,
  "leadScoreBand": "Very High",
  "leadScoreReasons": [
    { "id": "strategy-session", "label": "Requested a Strategy Session", "points": 35 }
  ],
  "campaign": "spring-listings",
  "referral": "google",
  "conversionType": "consultation",
  "conversionEvent": "consultation_requested",
  "decisionType": "buyer",
  "recommendedFollowUp": "Schedule a consultation.",
  "leadContext": {
    "schemaVersion": "1.0",
    "decisionJourney": "buying-first-home",
    "primaryGoal": "Build a buying plan",
    "landingPage": "/life-decisions/buying-first-home/",
    "pagesViewed": 5,
    "deviceType": "desktop",
    "platformVersion": "1.5.0"
  },
  "journeyTimeline": [
    { "event": "landing", "path": "/life-decisions/buying-first-home/" },
    { "event": "consultation_requested", "path": "/strategy-session/" }
  ],
  "notes": "I want to buy this year.",
  "metadata": {},
  "provider": null,
  "providerStatus": null,
  "createdAt": "2026-07-06T00:00:00.000Z",
  "updatedAt": "2026-07-06T00:00:00.000Z"
}
```

Endpoint-specific data is stored in `metadata`. Examples include consultation preferences and home
valuation property details. Lead intelligence is also available at the canonical top level and is
mirrored into metadata for compatibility with existing consumers.

## Lead Lifecycle

1. Website submits a JSON payload.
2. API middleware creates request context, security headers, CORS headers, and logger context.
3. Handler parses JSON and delegates validation and normalization to the service.
4. Service builds the canonical lead object with `status=RECEIVED`, validates the optional context,
   scoring band/reasons, and a maximum 50-event journey timeline.
5. `LeadRepository.createLead()` persists the record to `LeadTable`.
6. Provider receives the persisted lead and sends it through SES or accepts it in mock mode.
7. `LeadRepository.updateLead()` records `provider`, `providerStatus`, and `updatedAt`.
8. Handler returns a non-PII `202 Accepted` response.

Current state transition:

```text
RECEIVED -> provider accepted, providerStatus updated
```

Reserved lead statuses:

- `RECEIVED`
- `PROCESSING`
- `EMAILED`
- `CRM_SYNCED`
- `FOLLOW_UP`
- `CLOSED`

## Request Flow

Handlers only parse JSON, call services, and return standardized responses. Business rules live in
services and validation modules. DynamoDB logic lives only in `LeadRepository`. Provider-specific
delivery logic lives behind provider interfaces.

## DynamoDB Schema

Table: `LeadTable`

- Partition key: `leadId`
- Sort key: none
- Billing: `PAY_PER_REQUEST`
- Recovery: point-in-time recovery enabled
- Encryption: server-side encryption enabled
- GSI: `LeadEmailIndex` with `email` as the partition key for `findLeadByEmail()`

Allowed DynamoDB actions for lead functions are `GetItem`, `PutItem`, `UpdateItem`, and `Query`.

## Response Flow

Successful lead acceptance returns `202` with:

- `success`
- `message`
- `leadId`
- `status`
- request IDs
- correlation ID
- timestamp

PII and provider details are not returned.

Malformed JSON returns `400`. Field validation failures return `422`. Unknown exceptions return
`500`. Provider failures are logged and returned through standardized error responses.

## Provider Architecture

Provider folders:

- `src/providers/contact/mock-provider.js`
- `src/providers/contact/ses-provider.js`
- `src/providers/consultation/mock-provider.js`
- `src/providers/consultation/ses-provider.js`
- `src/providers/home-value/mock-provider.js`
- `src/providers/home-value/ses-provider.js`

All lead providers submit a persisted canonical lead. SES providers send branded lead emails. Mock
providers return `accepted` and do not send, enrich, or forward data.

Pure mapping functions in `src/integrations/crm/lead-mapper.js` produce canonical or proposed
BoldTrail-shaped exports. They never make network calls. Any future CRM delivery must run
server-side after durable lead persistence, with idempotency, retries, monitoring, and approved
vendor field identifiers.

## Observability

Structured logs include:

- request ID
- correlation ID
- endpoint
- method
- latency
- validation failures
- `lead_created`
- `lead_updated`
- `provider_started`
- `provider_completed`
- `repository_latency`
- `provider_latency`
- provider failures
- recursively redacted normalized lead object, including context and timeline
- success responses

## Future Production Integrations

Production SES delivery and CRM mapping contracts are implemented. Remaining integration work can
add:

- CRM delivery provider using the approved mapping contract
- AI enrichment provider

Those integrations should not require changes to handlers, request models, response models, or the
frontend route contract.
