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

This format is CloudWatch-friendly and can be extended for tracing and metric extraction.
