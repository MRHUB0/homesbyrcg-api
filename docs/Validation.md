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
