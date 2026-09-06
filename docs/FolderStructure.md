# Folder Structure

- `src/config` - environment and configuration loading.
- `src/analytics` - canonical event taxonomy, validation, funnel classification, and metrics.
- `src/errors` - reusable operational error classes and error formatting.
- `src/events` - event factories and future event contracts.
- `src/handlers` - Lambda entrypoints.
- `src/health` - reserved for future health-specific modules.
- `src/logging` - structured JSON logger.
- `src/middleware` - reusable HTTP middleware.
- `src/providers` - future external provider adapters.
- `src/repositories` - DynamoDB repository abstractions for leads and analytics events.
- `src/responses` - canonical API response builder.
- `src/schemas` - JSON schemas and future API contracts.
- `src/services` - shared service-level utilities.
- `src/shared` - cross-cutting primitives.
- `src/validation` - validation framework and validators.
- `tests` - Node.js test suite.
- `docs` - architecture and operations documentation.
