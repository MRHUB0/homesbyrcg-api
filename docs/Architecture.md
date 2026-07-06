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
- provider abstraction for outbound contact delivery

`POST /contact` is the first production endpoint. It validates and normalizes the contact request,
logs the normalized payload, and submits it through `ContactProvider`. The current implementation
uses `MockContactProvider` and intentionally does not send email. Epic 03 can replace the provider
with Amazon SES without changing the API contract.

Persistence, authentication, AI, email delivery, and CRM integrations are intentionally absent.
Future endpoints should compose the shared middleware and return the canonical response model.
