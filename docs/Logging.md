# Logging

Logs are emitted as JSON records. Each request log includes:

- `timestamp`
- `level`
- `message`
- `requestId`
- `correlationId`
- `endpoint`
- `method`
- `latency`
- `status`
- `errors`
- `environment`
- `service`

Lead logs include operational metadata and a redacted canonical lead object. Raw name, email, phone,
and message content are not written to logs.

This format is CloudWatch-friendly and can be extended for tracing and metric extraction.
