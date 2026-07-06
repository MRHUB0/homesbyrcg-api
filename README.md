# Homes by RCG API

Enterprise serverless backend foundation for Homes by RCG.

This repository contains the shared backend foundation and the first production endpoint for the
Homes by RCG site.

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
```

All responses use the canonical API envelope:

```json
{
  "success": true,
  "message": "Service is healthy.",
  "data": {
    "status": "healthy",
    "service": "homesbyrcg-api",
    "version": "0.1.0",
    "environment": "local",
    "timestamp": "2026-07-06T00:00:00.000Z",
    "requestId": "..."
  },
  "errors": [],
  "requestId": "...",
  "correlationId": "...",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```

### POST /contact

Accepts contact page submissions and routes them through the `ContactProvider` abstraction. The
current provider is a mock implementation; Epic 03 will replace it with Amazon SES without changing
the frontend contract.

Request:

```json
{
  "firstName": "Riley",
  "lastName": "Carter",
  "email": "riley@example.com",
  "phone": "+1 555 123 4567",
  "message": "I would like to schedule a showing.",
  "journeySource": "contact-page",
  "currentPage": "/contact",
  "leadIntent": "schedule-showing",
  "leadScore": 85,
  "referral": "google",
  "campaign": "spring-listings"
}
```

Success response:

```json
{
  "success": true,
  "message": "Contact request received.",
  "data": {
    "status": "accepted",
    "provider": "mock"
  },
  "errors": [],
  "requestId": "...",
  "correlationId": "...",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```

## Documentation

See `docs/` for API, architecture, deployment, configuration, logging, validation, responses,
errors, and environment guidance.
