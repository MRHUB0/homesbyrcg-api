# Configuration

Configuration is loaded from environment variables by `ConfigurationLoader`.

Supported environments:

- `local`
- `development`
- `staging`
- `production`

Variables:

- `APP_ENV`
- `SERVICE_NAME`
- `LOG_LEVEL`
- `CORS_ALLOWED_ORIGINS`
- `MAX_REQUEST_BYTES`
- `LEAD_PROVIDER_MODE`
- `CRM_PROVIDER_MODE`
- `CRM_SYNC_TIMEOUT_MS`
- `CRM_SYNC_MAX_RETRIES`
- `CRM_SYNC_BASE_DELAY_MS`
- `CRM_SYNC_MAX_DELAY_MS`
- `BOLDTRAIL_API_BASE_URL`
- `BOLDTRAIL_API_TOKEN`
- `CRM_IDEMPOTENCY_TABLE_NAME`
- `LEAD_TABLE_NAME`
- `SES_SENDER`
- `SES_RECIPIENT`
- `SES_REGION`

`LEAD_PROVIDER_MODE` supports:

- `mock`: local development mode, no email delivery
- `ses`: production email delivery mode

`CRM_PROVIDER_MODE` supports:

- `disabled`: CRM sync disabled
- `mock`: CRM sync stubbed for local testing
- `boldtrail`: enable BoldTrail V2 API synchronization

When `LEAD_PROVIDER_MODE=ses`, configuration validation requires a valid sender email, recipient
email, and AWS region. In Lambda, `SES_REGION` is set from the deployed stack region. Locally, set
`SES_REGION` explicitly.

`LEAD_TABLE_NAME` is injected by SAM from the `LeadTable` resource. When present, lead handlers use
DynamoDB through `LeadRepository`. If absent in local unit tests, the repository factory uses an
in-memory repository so tests do not require AWS credentials.

No secrets, URLs, ARNs, tokens, or credentials should be committed. Future CRM and AI integrations
should add explicit environment variables for endpoint URLs, secret references, retry limits, and
timeout values.

BoldTrail token handling requirements:

- Load from `BOLDTRAIL_API_TOKEN` at runtime only.
- Do not log, echo, or expose token values in API responses.
- In AWS, store the token in a managed secret and inject it into this variable at deploy/runtime.
