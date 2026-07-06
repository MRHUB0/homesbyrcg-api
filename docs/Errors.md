# Errors

Reusable errors:

- `ValidationError`
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
