# API

## Routes

```http
GET /health
POST /contact
POST /consultation
POST /home-value
```

Error responses use the canonical error envelope. Successful lead submissions return a non-PII
acknowledgement.

## Lead Response

Successful lead submissions return `202`:

```json
{
  "success": true,
  "message": "Contact request received.",
  "leadId": "4ad2f3c7-1c8d-45bd-8dc6-5f5fb1f8e04b",
  "status": "RECEIVED",
  "requestId": "api-request-123",
  "correlationId": "correlation-123",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```

Malformed JSON returns `400`. Field validation failures return `422`. Unknown exceptions return
`500`. Provider failures are converted to standardized provider errors.

Provider details and PII are intentionally omitted from successful responses. The persisted lead is
created before provider execution, and the provider result is stored on the lead record.

## POST /contact

```json
{
  "firstName": "Riley",
  "lastName": "Carter",
  "email": "riley@example.com",
  "phone": "+1 555 123 4567",
  "message": "I would like to schedule a showing.",
  "journeySource": "contact-page",
  "currentPage": "/contact",
  "leadIntent": "schedule-showing",
  "leadScore": 85,
  "referral": "google",
  "campaign": "spring-listings"
}
```

Allowed contact `leadIntent` values:

- `general-inquiry`
- `schedule-showing`
- `buyer-question`
- `seller-question`

## POST /consultation

```json
{
  "firstName": "Riley",
  "lastName": "Carter",
  "email": "riley@example.com",
  "phone": "+1 555 123 4567",
  "journeySource": "consultation-page",
  "currentPage": "/consultation",
  "leadIntent": "buying-consultation",
  "leadScore": 90,
  "referral": "google",
  "campaign": "spring-listings",
  "notes": "I want to buy this year.",
  "consultationType": "buying",
  "preferredContactMethod": "phone",
  "timeframe": "60-days"
}
```

Allowed values:

- `leadIntent`: `buying-consultation`, `selling-consultation`, `investment-consultation`
- `consultationType`: `buying`, `selling`, `investment`, `relocation`
- `preferredContactMethod`: `phone`, `email`, `text`
- `timeframe`: `immediate`, `30-days`, `60-days`, `90-days`, `exploring`

## POST /home-value

```json
{
  "firstName": "Riley",
  "lastName": "Carter",
  "email": "riley@example.com",
  "phone": "+1 555 123 4567",
  "journeySource": "home-value-page",
  "currentPage": "/home-value",
  "leadIntent": "home-valuation",
  "leadScore": 92,
  "referral": "google",
  "campaign": "spring-listings",
  "notes": "I want a valuation.",
  "propertyAddress": "123 Main St",
  "city": "Charlotte",
  "state": "NC",
  "zipCode": "28202",
  "propertyType": "single-family"
}
```

Allowed values:

- `leadIntent`: `home-valuation`, `sell-my-home`, `market-analysis`
- `propertyType`: `single-family`, `condo`, `townhome`, `multi-family`, `land`
