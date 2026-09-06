# Lead Intelligence

## Purpose

The HomesByRCG lead-intelligence engine produces deterministic, explainable behavioral scoring from canonical HomesByRCG lead data.

It does **not** depend on BoldTrail. It is designed as:

```text
HomesByRCG canonical lead/event data
  -> Lead Intelligence (deterministic rules)
  -> derived score/classification/explanation
  -> optional CRM projection adapter
```

## Service Boundary

- Canonical lead ingestion remains in endpoint services (`contact`, `consultation`, `home-value`, `leads`).
- Intelligence logic lives in `src/lead-intelligence/`.
- Persistence of derived intelligence snapshots is handled by `LeadIntelligenceRepository`.
- CRM projection consumes the derived contract; CRM-specific writes are out of scope in this branch.

## Inputs

Lead intelligence consumes observable canonical fields already persisted by HomesByRCG:

- `leadType`
- `timestamp`
- `leadIntent`
- `conversionType`
- `conversionEvent`
- `decisionType`
- `journeySource`
- `currentPage`
- `metadata`
- `leadContext`
- `journeyTimeline`

No demographic, protected-class, or third-party enrichment data is used.

## Observable Signals

Signals are inferred only from current platform-observable payload/timeline fields.

### Directly observable today

- `LEAD_SUBMITTED`
- `CONTACT_REQUESTED`
- `CONSULTATION_REQUESTED`
- `HOME_VALUE_REQUESTED`
- `PROPERTY_ADDRESS_CAPTURED`
- `SHOWING_REQUESTED`
- `CMA_REQUESTED`
- `VALUATION_REQUESTED`
- `VALUATION_VIEWED`
- `NEXT_HOUSE_SEARCH`
- `PROPERTY_VIEWED`
- `RENTAL_CHECK_ACTIVITY`
- `EQUITY_ACTIVITY`
- `DOWNSIZE_ACTIVITY`
- `MY_NUMBER_ACTIVITY`
- `ASSESSMENT_COMPLETED`
- `GUIDE_DOWNLOADED`
- `NEWSLETTER_SUBSCRIBED`
- `MARKET_REPORT_REQUESTED`
- `TOOL_OPENED`
- `EVENT_INTEREST_REGISTERED`
- `REPEAT_VISIT`

### Extension points for future funnel routes

Timeline events beginning with `funnel_` (or containing `inherited_home`, `renovate_or_move`, `more_space`) are captured as extension signals (`EXTENSION_*`).

This enables future scoring expansion without replacing current architecture.

## Scoring Dimensions

Internal dimensions are scored separately before summary score rollup:

- `BUYER_INTENT`
- `SELLER_INTENT`
- `SELL_AND_BUY_INTENT`
- `INVESTOR_LANDLORD_INTENT`
- `ENGAGEMENT`
- `CONVERSION_READINESS`

Each dimension is capped at 100.

## Weights and Thresholds

Config is centralized in `src/lead-intelligence/scoring-config.js`.

- Score range: `0..100`
- Dimension weights:
  - buyer intent: `0.17`
  - seller intent: `0.17`
  - sell-and-buy intent: `0.11`
  - investor/landlord intent: `0.10`
  - engagement: `0.20`
  - conversion readiness: `0.25`

### Engagement thresholds

- `COLD`: `< 35`
- `WARM`: `35..69`
- `HOT`: `>= 70`

### Conversion readiness thresholds

- `LOW`: `< 10`
- `MEDIUM`: `10..24`
- `HIGH`: `25..44`
- `READY`: `>= 45`

## Intent Classification

Intent is behavior-derived only.

Possible values:

- `BUYER`
- `SELLER`
- `SELL_AND_BUY`
- `INVESTOR`
- `LANDLORD`
- `UNKNOWN`

Rules:

- `SELL_AND_BUY` requires strong buyer + seller evidence.
- Buyer evidence is driven by next-house/property/showing behaviors.
- Seller evidence is driven by valuation/home-value/CMA/property-address behaviors.
- Investor/landlord evidence is driven by rental-check/investment behaviors.
- If evidence is weak, intent remains `UNKNOWN`.

## Recency

Each signal contribution is multiplied by deterministic recency buckets:

- `LAST_7_DAYS`: `1.00`
- `LAST_30_DAYS`: `0.90`
- `LAST_90_DAYS`: `0.70`
- `OLDER`: `0.45`

Older activity still counts, but decays.

## Duplicate and Gaming Protection

- Each signal uses an identity key (`signal + uniqueValue`) to ignore duplicates.
- Each signal has a `maxOccurrences` cap.
- Repeated low-value actions (e.g., repeated tool opens) cannot inflate score indefinitely.
- Weighted dimension values are capped and final score is clamped to `0..100`.

## Explainability Model

Machine-readable explanation is persisted and attached to canonical leads:

- `leadScore`
- `leadScoreBand`
- `engagementLevel`
- `primaryIntent`
- `secondaryIntent`
- `conversionReadiness`
- `scoringVersion`
- `lastScoredAt`
- `intelligenceSignals[]` (signal-level contributions, dimensions, recency buckets, source)
- `leadScoreReasons[]` (top reasons)

### Worked example (synthetic)

```json
{
  "leadScore": 82,
  "engagementLevel": "HOT",
  "primaryIntent": "SELL_AND_BUY",
  "conversionReadiness": "READY",
  "leadScoreReasons": [
    { "id": "CONSULTATION_REQUESTED", "label": "Consultation Requested", "points": 22.4 },
    { "id": "VALUATION_REQUESTED", "label": "Valuation Requested", "points": 13.56 },
    { "id": "NEXT_HOUSE_SEARCH", "label": "Next House Search", "points": 11.58 }
  ]
}
```

## Recomputation and Versioning

- Scoring version is explicit: `LeadIntelligenceScoringVersion`.
- Source fingerprint is derived from canonical lead evidence.
- The engine supports deterministic `calculate()` and `recompute()` paths.
- Rule changes can be applied by re-running recomputation without mutating raw historical evidence.

## Persistence Model

Derived intelligence is stored separately from raw canonical history.

- Canonical lead record (`LeadTable`) stores current intelligence summary fields for convenient read access.
- Derived snapshot (`LeadIntelligenceTable`) stores explainability payload, dimensions, reasons, and versioning metadata.

No destructive redesign of canonical lead history is introduced.

## CRM Projection Contract

`src/integrations/crm/lead-mapper.js` exposes a vendor-neutral intelligence payload:

- score and score band
- engagement
- intent
- conversion readiness
- scoring version and timestamp
- reasons and signals

BoldTrail API transport remains out of scope for this branch.

## Metrics

Low-cardinality operational metrics are emitted via structured logs:

- `LeadIntelligenceCalculated`
- `LeadIntelligenceRecalculated`
- `LeadIntelligenceFailed`

Allowed dimensions are bounded enums only:

- engagement level
- primary intent
- conversion readiness
- bounded failure reason

No high-cardinality IDs or PII are used as dimensions.

## Privacy and Fairness Boundaries

Scoring is behavior-only. It does not use or infer protected/sensitive classes, including:

- race, ethnicity, religion
- sex, gender, sexual orientation
- disability or medical status
- family status, national origin, age
- creditworthiness

No demographic enrichment or location-proxy modeling is used.
