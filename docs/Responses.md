# Responses

All endpoints must use `ResponseBuilder`.

Canonical response:

```json
{
  "success": true,
  "message": "",
  "data": {},
  "errors": [],
  "requestId": "",
  "correlationId": "",
  "timestamp": ""
}
```

This stable envelope keeps frontend handling, logs, and future integrations consistent.
