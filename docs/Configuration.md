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
- `SES_SENDER`
- `SES_RECIPIENT`
- `SES_REGION`

`LEAD_PROVIDER_MODE` supports:

- `mock`: local development mode, no email delivery
- `ses`: production email delivery mode

When `LEAD_PROVIDER_MODE=ses`, configuration validation requires a valid sender email, recipient
email, and AWS region. In Lambda, `SES_REGION` is set from the deployed stack region. Locally, set
`SES_REGION` explicitly.

No secrets, URLs, ARNs, tokens, or credentials should be committed. Future CRM and AI integrations
should add explicit environment variables for endpoint URLs, secret references, retry limits, and
timeout values.
