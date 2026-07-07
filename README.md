# Homes by RCG API

Enterprise serverless backend foundation and lead intake platform for Homes by RCG.

## Runtime

- Node.js 22 LTS
- AWS SAM
- AWS Lambda
- API Gateway HTTP API
- ES Modules

## Commands

```bash
npm install
npm run validate
npm run sam-build
npm run sam-local
```

## Endpoints

```http
GET /health
POST /contact
POST /consultation
POST /home-value
```

Lead submission responses return `success`, `message`, `leadId`, `status`, `requestId`,
`correlationId`, and `timestamp`. PII and provider details are not returned.

Lead endpoints follow one flow:

```text
API Gateway -> Lambda Handler -> Business Service -> LeadRepository -> DynamoDB LeadTable -> Provider Interface -> Response Builder
```

Lead delivery is configuration-driven. Use `LEAD_PROVIDER_MODE=mock` for local development and
`LEAD_PROVIDER_MODE=ses` for production email delivery through Amazon SES. Deployed environments
persist every lead to DynamoDB before any provider executes.

## Local Curl Examples

Start the API:

```bash
LEAD_PROVIDER_MODE=mock \
sam local start-api
```

Health:

```bash
curl http://127.0.0.1:3000/health
```

Contact:

```bash
curl -X POST http://127.0.0.1:3000/contact \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Riley","lastName":"Carter","email":"riley@example.com","phone":"+1 555 123 4567","message":"I would like to schedule a showing.","journeySource":"contact-page","currentPage":"/contact","leadIntent":"schedule-showing","leadScore":85,"referral":"google","campaign":"spring-listings"}'
```

Consultation:

```bash
curl -X POST http://127.0.0.1:3000/consultation \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Riley","lastName":"Carter","email":"riley@example.com","phone":"+1 555 123 4567","journeySource":"consultation-page","currentPage":"/consultation","leadIntent":"buying-consultation","leadScore":90,"referral":"google","campaign":"spring-listings","notes":"I want to buy this year.","consultationType":"buying","preferredContactMethod":"phone","timeframe":"60-days"}'
```

Home Value:

```bash
curl -X POST http://127.0.0.1:3000/home-value \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Riley","lastName":"Carter","email":"riley@example.com","phone":"+1 555 123 4567","journeySource":"home-value-page","currentPage":"/home-value","leadIntent":"home-valuation","leadScore":92,"referral":"google","campaign":"spring-listings","notes":"I want a valuation.","propertyAddress":"123 Main St","city":"Charlotte","state":"NC","zipCode":"28202","propertyType":"single-family"}'
```

## Documentation

See `docs/` for API, architecture, deployment, configuration, logging, validation, responses,
errors, environment guidance, lead platform design, SES setup, and production deployment.
