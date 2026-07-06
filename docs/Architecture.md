# Architecture

This backend is a serverless foundation built on AWS Lambda and API Gateway through AWS SAM.

The first production capability is shared infrastructure:

- canonical responses
- reusable errors
- request context propagation
- structured logging
- environment-driven configuration
- validation helpers
- HTTP middleware
- health endpoint

Business workflows, persistence, authentication, AI, email, and CRM integrations are intentionally
absent. Future endpoints should compose the shared middleware and return the canonical response
model.
