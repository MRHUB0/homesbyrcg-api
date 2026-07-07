# Production Deployment

## Preflight

Run:

```bash
npm run validate
npm run build
sam validate
sam build
```

Verify:

- SES sender identity is verified.
- SES account is out of sandbox or recipient is verified.
- `CorsAllowedOrigins` includes `https://newhomesbyrcg.com`.
- `LeadProviderMode=ses`.
- `SesSender` and `SesRecipient` are correct.
- `LeadTableName` is present in stack outputs.
- CloudWatch log retention meets operational requirements.

## Deploy

```bash
sam deploy \
  --parameter-overrides \
    AppEnvironment=production \
    ServiceName=homesbyrcg-api \
    LogLevel=info \
    CorsAllowedOrigins=https://newhomesbyrcg.com,https://homesbyrcg.com \
    MaxRequestBytes=1048576 \
    LeadProviderMode=ses \
    SesSender=leads@homesbyrcg.com \
    SesRecipient=malik@homesbyrcg.com
```

## Post-Deploy Smoke Tests

Call:

- `GET /health`
- `POST /contact`
- `POST /consultation`
- `POST /home-value`

Confirm:

- Each lead endpoint returns `202`.
- Response body includes `success`, `message`, `leadId`, `status`, request IDs, and `timestamp`.
- Response body does not include PII or provider details.
- The lead exists in `LeadTable` before provider status is recorded.
- Email arrives with HTML and plain-text content.
- CloudWatch logs include request metadata and no raw name, email, phone, or message content.

## Frontend Compatibility

The frontend request bodies remain unchanged. To move `newhomesbyrcg` to production, update only the
API base URL and allowed origin configuration.
