# Architecture

This backend is a serverless foundation built on AWS Lambda and API Gateway through AWS SAM.

The foundation provides:

- canonical responses
- reusable errors
- request context propagation
- structured logging
- environment-driven configuration
- validation helpers
- HTTP middleware
- health endpoint
- contact endpoint
- consultation endpoint
- home value endpoint
- DynamoDB lead persistence
- repository abstraction for lead storage
- provider abstraction for lead delivery

Lead endpoints follow the same architecture:

```text
API Gateway
  -> Lambda Handler
  -> Business Service
  -> LeadRepository
  -> DynamoDB LeadTable
  -> Provider Interface
  -> SES Provider or Mock Provider
  -> Response Builder
```

Each lead endpoint validates the request, normalizes it into the canonical lead model, logs a
redacted copy of the normalized object, persists it through `LeadRepository`, submits the persisted
lead through a provider abstraction, records provider status back to the table, and returns a
non-PII accepted response.

Production provider mode uses Amazon SES to send professional HTML and plain-text lead emails.
Local provider mode uses mocks and intentionally does not send email, write to CRM, or call AI
services. Future CRM and AI integrations should replace or compose provider
implementations without changing handlers, services, request models, response models, or frontend
routes.

The lead table uses `leadId` as its partition key, on-demand billing, point-in-time recovery, and
server-side encryption. An email GSI supports `LeadRepository.findLeadByEmail()` with `Query`
instead of `Scan`.

The live production environment is isolated in the `homesbyrcg-api-production` stack and uses the
`production` API Gateway stage, production Lambda functions, and `homesbyrcg-api-production-leads`
table. Five CloudWatch alarms cover aggregate Lambda errors, Lambda throttles, API 5XX responses,
API latency, and SES rejects. API Gateway and Lambda log groups retain logs for 30 days.

Authentication, AI, and CRM integrations are intentionally absent. Future endpoints should compose
the shared middleware and return the canonical response model.
