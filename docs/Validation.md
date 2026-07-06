# Validation

`ValidationFramework` accepts a payload and a field schema. Validators return either `null` or an
error message.

Available validators:

- required
- email
- phone
- length
- enum
- boolean
- numeric
- date
- custom

Validation failures throw `ValidationError` and are converted into the canonical response envelope.

Lead endpoints use these shared validators, then map field-level validation failures to
`UnprocessableEntityError` (`422`).

Canonical lead fields:

- firstName
- lastName
- email
- phone
- journeySource
- currentPage
- leadIntent
- leadScore
- campaign
- referral
- notes

`POST /contact` accepts `message` and maps it to canonical `notes`.

Endpoint-specific required fields:

- `POST /consultation`: `consultationType`, `preferredContactMethod`, `timeframe`
- `POST /home-value`: `propertyAddress`, `city`, `state`, `zipCode`, `propertyType`

Enums are defined in the lead validation modules and cover lead intent, consultation options, and
property type.
