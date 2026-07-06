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

No secrets, URLs, ARNs, tokens, or credentials should be committed. Future integrations should add
configuration through environment variables and managed AWS secret stores.
