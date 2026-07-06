# Errors

Reusable errors:

- `ValidationError`
- `UnprocessableEntityError`
- `ConfigurationError`
- `ProviderError`
- `IntegrationError`
- `AuthenticationError`
- `AuthorizationError`
- `NotFoundError`
- `ConflictError`
- `InternalServerError`

All thrown errors are normalized by `ErrorBuilder`. Unknown errors are returned as
`InternalServerError` without leaking internal details.

Contact request errors:

- `400 VALIDATION_ERROR` for malformed JSON, missing body, unsupported content type, or request
  size violations.
- `422 UNPROCESSABLE_ENTITY` for syntactically valid contact requests that fail field validation.
- `500 INTERNAL_SERVER_ERROR` for unexpected failures.
