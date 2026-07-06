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

`POST /contact` uses these shared validators, then maps field-level contact validation failures to
`UnprocessableEntityError` (`422`). Required contact fields are:

- firstName
- lastName
- email
- phone
- message
- journeySource
- currentPage
- leadIntent
- leadScore
- referral
- campaign
