# Lead Platform

## Architecture Diagram

```text
HomesByRCG.com
  -> API Gateway HTTP API
  -> Lambda Handler
  -> Endpoint Service
  -> Provider Interface
  -> SES Provider or Mock Provider
  -> ResponseBuilder
  -> Canonical API Response
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
  "requestId": "...",
  "correlationId": "...",
  "timestamp": "2026-07-06T00:00:00.000Z",
  "firstName": "Riley",
  "lastName": "Carter",
  "email": "riley@example.com",
  "phone": "+1 555 123 4567",
  "journeySource": "consultation-page",
  "currentPage": "/consultation",
  "leadIntent": "buying-consultation",
  "leadScore": 90,
  "campaign": "spring-listings",
  "referral": "google",
  "notes": "I want to buy this year.",
  "metadata": {}
}
```

Endpoint-specific data is stored in `metadata`. Examples include consultation preferences and home
valuation property details.

## Lead Lifecycle

1. Website submits a JSON payload.
2. API middleware creates request context, security headers, CORS headers, and logger context.
3. Handler parses JSON and delegates validation and normalization to the service.
4. Service builds the canonical lead object and submits it through the provider interface.
5. Provider sends the lead email through SES or accepts it in local mock mode.
6. Handler returns the canonical response envelope.

## Request Flow

Handlers only parse JSON, call services, and return standardized responses. Business rules live in
services and validation modules. Provider-specific delivery logic lives behind provider interfaces.

## Response Flow

Successful provider acceptance returns `202` with:

- `status`
- `provider`
- request IDs
- correlation ID
- timestamp

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

All lead providers submit a canonical lead. SES providers send branded lead emails. Mock providers
return `accepted` and do not persist, send, enrich, or forward data.

## Observability

Structured logs include:

- request ID
- correlation ID
- endpoint
- method
- latency
- validation failures
- provider failures
- redacted normalized lead object
- success responses

## Future Production Integrations

Production SES delivery is implemented. Remaining production integration work can add:

- CRM lead provider
- AI enrichment provider

Those integrations should not require changes to handlers, request models, response models, or the
frontend route contract.
