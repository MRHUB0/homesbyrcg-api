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
- provider abstraction for lead delivery

Lead endpoints follow the same architecture:

```text
API Gateway
  -> Lambda Handler
  -> Business Service
  -> Provider Interface
  -> SES Provider or Mock Provider
  -> Response Builder
```

Each lead endpoint validates the request, normalizes it into the canonical lead model, logs a
redacted copy of the normalized object, submits it through a provider abstraction, and returns the
canonical response envelope.

Production provider mode uses Amazon SES to send professional HTML and plain-text lead emails.
Local provider mode uses mocks and intentionally does not send email, write to CRM, call AI
services, or persist data. Future CRM and AI integrations should replace or compose provider
implementations without changing handlers, services, request models, response models, or frontend
routes.

Persistence, authentication, AI, and CRM integrations are intentionally absent. Future endpoints
should compose the shared middleware and return the canonical response model.
