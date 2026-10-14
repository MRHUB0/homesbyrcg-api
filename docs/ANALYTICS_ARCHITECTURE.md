# Analytics Architecture

## Scope and Principles

HomesByRCG analytics is canonical in this backend and remains vendor-neutral. CRM projection is an
optional downstream consumer and is not a source of truth.

- Canonical event intake: `POST /events`
- Canonical lead intake: `POST /leads`, `POST /contact`, `POST /consultation`, `POST /home-value`
- Durable event persistence: `AnalyticsEventTable`
- Durable lead persistence: `LeadTable`
- Analytics does not require BoldTrail to function

## Current Architecture (Discovered)

Before this phase, the system had canonical lead normalization and persistence, but no dedicated
analytics event endpoint or event table. Lead flow already included redacted logging, DynamoDB
persistence, and provider abstraction.

Implemented analytics additions:

- `src/handlers/events/index.js` for canonical event ingestion.
- `src/analytics/analytics-service.js` for normalization, attribution, idempotency outcomes,
  classification, and metrics.
- `src/repositories/analytics-event-repository.js` for durable event writes and journey queries.
- Lead pipeline now emits canonical analytics events from server-side lead lifecycle transitions.

## Canonical Event Schema

Every analytics event persists as one canonical object:

- `eventId`
- `eventName`
- `eventVersion`
- `occurredAt`
- `receivedAt`
- `family`
- `funnelStage`
- `conversionClass`
- `visitorId` (optional)
- `sessionId` (optional)
- `journeyId` (optional)
- `leadId` (optional)
- `funnel` (optional)
- `landingPage` (optional)
- `propertyRef` (optional)
- `attribution.firstTouch`
- `attribution.lastTouch`
- `consent`
- `metadata` (PII-sanitized)
- `requestId`
- `correlationId`

## Event Taxonomy

Families:

- `SESSION`
- `FUNNEL`
- `PROPERTY`
- `LEAD`
- `VALUATION`
- `SEARCH`
- `ENGAGEMENT`
- `CONSULTATION`
- `CMA`
- `SHOWING`
- `CONVERSION`

Canonical events and conversion significance:

- `visitor_arrived` → `SESSION` → none
- `landing_page_viewed` → `ENGAGEMENT` → micro
- `funnel_started` → `FUNNEL` → micro
- `address_entered` → `PROPERTY` → micro
- `property_resolved` → `PROPERTY` → micro
- `property_viewed` → `PROPERTY` → micro
- `decision_question_answered` → `FUNNEL` → micro
- `lead_submitted` → `LEAD` → lead
- `home_value_requested` → `VALUATION` → lead
- `valuation_revealed` → `VALUATION` → lead
- `search_started` → `SEARCH` → micro
- `contact_requested` → `CONSULTATION` → high-intent
- `consultation_requested` → `CONSULTATION` → high-intent
- `cma_requested` → `CMA` → high-intent
- `showing_requested` → `SHOWING` → high-intent
- `conversion_recorded` → `CONVERSION` → business

Backward compatibility:

- Existing production-facing conversion names such as `contact_requested`,
  `consultation_requested`, `home_value_requested`, `guide_download`, and
  `event_interest_registered` remain supported.

## Identity and Correlation Model

Correlation chain:

- `visitorId` → anonymous actor
- `sessionId` → browser session
- `journeyId` → multi-step funnel thread (defaults to `sessionId` when omitted)
- `leadId` → canonical lead record
- `propertyRef` → canonical property identifier (non-PII identifier)

Lead submissions preserve analytics context in `lead.metadata.analyticsContext`, allowing
journey-to-lead reconciliation without deleting anonymous pre-lead events.

No fingerprinting, no cross-site tracking, and no invasive identity mechanisms are introduced.

## Attribution Model

Supported attribution fields:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `referrer`
- `landingPage`

Attribution behavior:

- First touch is preserved per `journeyId` from earliest known journey event.
- Last touch is updated from the current event’s attribution when present.
- First touch is never overwritten by later requests.

## Funnel Stages

Deterministic stage derivation:

- `VISITOR`
- `ENGAGED`
- `PROPERTY_IDENTIFIED`
- `LEAD`
- `VALUE_VIEWED`
- `HIGH_INTENT_ACTION`
- `CONVERTED`

No AI scoring is used for stage derivation.

## Conversion Definitions

- Micro conversion: engagement/tool/search steps
- Lead conversion: `lead_submitted`, `home_value_requested`, `valuation_revealed`,
  `event_interest_registered`
- High-intent conversion: `contact_requested`, `consultation_requested`, `cma_requested`,
  `showing_requested`
- Business conversion: `conversion_recorded`

`conversion_recorded` is explicitly for business outcome events only when the platform can actually
observe that transition.

## Idempotency and Duplicate Protection

- Event-level duplicate protection uses deterministic `eventId` with conditional writes in
  `AnalyticsEventTable`.
- Lead-level duplicate protection uses `LeadTable` `LeadIdempotencyIndex` on `idempotencyKey`.
- Replay handling returns accepted responses while preventing duplicate analytics inflation.

## Privacy and Data Hygiene

Analytics metadata sanitization removes keys matching common PII names:

- `email`
- `phone`
- `firstName`
- `lastName`
- `fullName`

Operational property identifiers are allowed (`propertyRef`) while personal contact fields are not
needed in analytics events.

## Metrics and Observability

EMF metrics emitted under `HomesByRCG/Analytics`:

- `EventAccepted`
- `EventDuplicate`
- `FunnelStarted`
- `FunnelCompleted`
- `PropertyResolved`
- `LeadCreated`
- `ValuationViewed`
- `HighIntentAction`

Metric dimensions are intentionally low-cardinality:

- `Service`
- `Environment`
- `Family`

No email, phone, IDs, or addresses are used as metric dimensions.

## DynamoDB and Queryability

`AnalyticsEventTable` indexes support core funnel and attribution queries:

- `VisitorOccurredAtIndex` (`visitorId`, `occurredAt`)
- `SessionOccurredAtIndex` (`sessionId`, `occurredAt`)
- `JourneyOccurredAtIndex` (`journeyId`, `occurredAt`)
- `LeadOccurredAtIndex` (`leadId`, `occurredAt`)
- `FunnelOccurredAtIndex` (`funnel`, `occurredAt`)
- `CampaignOccurredAtIndex` (`attributionCampaign`, `occurredAt`)
- `LandingOccurredAtIndex` (`landingPage`, `occurredAt`)
- `PropertyOccurredAtIndex` (`propertyRef`, `occurredAt`)

This supports efficient reads for:

- funnel starts
- property identification
- lead progression
- valuation visibility
- funnel conversion comparisons
- landing-page performance
- campaign performance
- repeat property engagement
- visitor-to-lead progression
- abandonment by stage

## CRM Compatibility Boundary

Canonical flow remains:

HomesByRCG canonical events → analytics intelligence → optional CRM projection

BoldTrail remains a downstream adapter target and is not required for canonical analytics.
