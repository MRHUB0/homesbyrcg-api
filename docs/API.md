# API

## POST /contact

Submits a Homes by RCG contact request. The endpoint validates and normalizes the payload, logs the
normalized request, and submits it to the contact provider abstraction. The current provider is
`MockContactProvider`; no email is sent yet.

Required JSON request:

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

Success response (`202`):

```json
{
  "success": true,
  "message": "Contact request received.",
  "data": {
    "status": "accepted",
    "provider": "mock"
  },
  "errors": [],
  "requestId": "api-request-123",
  "correlationId": "correlation-123",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```

Malformed request example (`400`):

```json
{
  "success": false,
  "message": "Malformed JSON request body.",
  "data": {},
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "body",
      "message": "Request body must be valid JSON."
    }
  ],
  "requestId": "api-request-123",
  "correlationId": "api-request-123",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```

Field validation example (`422`):

```json
{
  "success": false,
  "message": "Contact request validation failed.",
  "data": {},
  "errors": [
    {
      "code": "UNPROCESSABLE_ENTITY",
      "field": "email",
      "message": "Value must be a valid email address."
    }
  ],
  "requestId": "api-request-123",
  "correlationId": "api-request-123",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```

Unexpected failure example (`500`):

```json
{
  "success": false,
  "message": "Internal server error.",
  "data": {},
  "errors": [
    {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Internal server error."
    }
  ],
  "requestId": "api-request-123",
  "correlationId": "api-request-123",
  "timestamp": "2026-07-06T00:00:00.000Z"
}
```
