# Homes by RCG API

Enterprise serverless backend foundation for Homes by RCG.

This repository intentionally implements only shared backend infrastructure and a single
`GET /health` endpoint. Business endpoints, integrations, authentication, persistence, and AI
features are intentionally out of scope for this foundation.

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

## Endpoint

```http
GET /health
```

The response uses the canonical API envelope:

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

## Documentation

See `docs/` for architecture, deployment, configuration, logging, validation, responses, errors,
and environment guidance.
