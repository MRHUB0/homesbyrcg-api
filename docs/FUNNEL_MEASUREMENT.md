# Funnel Measurement

This document defines deterministic, backend-derived funnel KPIs for HomesByRCG.

## Stage Definitions

- `VISITOR`: `visitor_arrived`
- `ENGAGED`: `landing_page_viewed`, `funnel_started`, `address_entered`, `decision_question_answered`,
  `search_started`, `tool_opened`, `guide_download`, `newsletter_subscribed`
- `PROPERTY_IDENTIFIED`: `property_resolved`, `property_viewed`
- `LEAD`: `lead_submitted`, `home_value_requested`
- `VALUE_VIEWED`: `valuation_revealed`
- `HIGH_INTENT_ACTION`: `contact_requested`, `consultation_requested`, `cma_requested`,
  `showing_requested`
- `CONVERTED`: `conversion_recorded`

## Measurement Formulas

All rates are computed for the same time window and same funnel scope.

### Funnel Start Rate

- Numerator: count of journeys with `funnel_started`
- Denominator: count of journeys with `visitor_arrived`

### Property Identification Rate

- Numerator: count of journeys with `PROPERTY_IDENTIFIED` stage
- Denominator: count of journeys with `funnel_started`

### Lead Conversion Rate

- Numerator: count of journeys with `LEAD` stage
- Denominator: count of journeys with `funnel_started`

### Valuation View Rate

- Numerator: count of journeys with `valuation_revealed`
- Denominator: count of journeys with `LEAD` stage

### High-Intent Conversion Rate

- Numerator: count of journeys with `HIGH_INTENT_ACTION` stage
- Denominator: count of journeys with `LEAD` stage

### Overall Conversion Rate

- Numerator: count of journeys with `CONVERTED` stage
- Denominator: count of journeys with `visitor_arrived`

## Funnel Abandonment

For each stage boundary:

- Abandonment count = journeys reaching prior stage but not current stage
- Abandonment rate = abandonment count / journeys reaching prior stage

Example:

- `LEAD` abandonment = journeys with `PROPERTY_IDENTIFIED` but without `LEAD`

## Attribution Views

For campaign and landing-page conversion views:

- Use journey first-touch and last-touch attribution snapshots attached to canonical events.
- First-touch reporting attributes a conversion to the earliest known attribution in journey.
- Last-touch reporting attributes a conversion to the attribution on or nearest before conversion.

## Query Surfaces

Use `AnalyticsEventTable` GSIs to aggregate by:

- `funnel`
- `journeyId`
- `visitorId`
- `leadId`
- `landingPage`
- `attributionCampaign`
- `propertyRef`

## Deduplication Rule

Analytics and KPI calculations must count unique `eventId` only. Duplicate-retry requests that
return `EventDuplicate` must not increment conversion counts.
