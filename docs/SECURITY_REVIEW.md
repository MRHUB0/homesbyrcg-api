# HomesByRCG API Security Review

Date: 2026-09-05  
Branch: `feature/security-hardening`

## Executive Summary

This review covered repository-level defensive hardening across API handlers, middleware, validation, persistence, IAM, and SAM infrastructure. No active exploit testing was performed and no production systems were modified.

The highest-impact risks identified in repository evidence were:

- client-visible internal error detail exposure in 5xx responses,
- permissive CORS fallback behavior for untrusted origins,
- prototype-pollution key acceptance in user-supplied structured fields,
- unnecessary SES IAM action scope,
- missing table retention safeguards for accidental stack delete/replace scenarios.

These were mitigated in this branch with regression tests where applicable.

## Architecture / Trust Boundaries

Current trust boundary flow:

1. Browser client sends public JSON requests.
2. CloudFront/static frontend (external repository) calls API Gateway HTTP API.
3. API Gateway routes to Lambda handlers (`/health`, `/openapi.yaml`, `/contact`, `/leads`, `/consultation`, `/home-value`).
4. Lambda middleware enforces request size/content-type, request context, CORS, and security headers.
5. Service layer normalizes payloads and persists canonical leads to DynamoDB (`LeadTable`) through `LeadRepository`.
6. Provider layer submits notifications through SES (`LEAD_PROVIDER_MODE=ses`) or mock providers in local/test.
7. CRM mapping exists as pure mapping code (`src/integrations/crm/lead-mapper.js`) but no active outbound CRM transport is implemented in this repository.

Public boundary: all POST lead routes are unauthenticated public intake endpoints by design.

## Secrets

### Assessment

- Reviewed tracked code, docs, config, templates, and tests for hardcoded secrets patterns.
- No confirmed committed AWS access keys, private keys, bearer tokens, or connection-string credentials were found in tracked content.
- `.env` is ignored by Git and `.env.example` contains sample/non-secret configuration values.

### Secret handling model

- Current mechanism: SAM parameters + Lambda environment variables.
- `SesSender` and `SesRecipient` are `NoEcho` parameters; runtime values are injected to Lambda env.
- Existing docs already recommend Secrets Manager/SSM for future sensitive integrations.

### Recommendation

For future production provider credentials beyond SES identity/sender/recipient metadata, prefer AWS Secrets Manager or SSM Parameter Store references in Lambda configuration. Keep the current mechanism for non-secret operational config.

## IAM

### Reviewed

- Function IAM policy blocks in `template.yaml` for all Lambda functions.
- DynamoDB and SES permissions by handler.

### Findings

- Removed unused `ses:SendRawEmail` from contact/leads/consultation/home-value functions.
- Retained required `ses:SendEmail` and DynamoDB operations currently used by code paths.

## Input Validation

### Current state

- Shared framework validates required fields, format, length, enums, numerics.
- Malformed JSON and oversized request handling present.
- Endpoint-specific validation for consultation and home-value fields exists.

### Hardening added

- Structured payload sanitization now strips `__proto__`, `constructor`, and `prototype` keys from user-controlled object fields (`metadata`, `leadContext`, timeline entries), reducing prototype-pollution risk.

## PII

### Current state

- Canonical lead persistence includes PII by design (name/email/phone/notes) in DynamoDB.
- Response envelopes intentionally exclude lead PII.
- Logging path redacts lead fields before emission.

### Review result

- No evidence of intentional PII leakage in success responses.
- Internal 5xx error detail leakage pathway was present and is now mitigated (see Logging/Errors).

## Logging / Errors

### Current state

- Structured JSON logs with request/correlation IDs and operational event names.
- Redaction helpers applied to normalized lead logs.

### Hardening added

- 5xx API responses now return sanitized error arrays (code + top-level message only), preventing internal integration/provider detail disclosure in client-visible error payloads.

## CORS

### Current state

- API Gateway and Lambda both enforce CORS with configured origin list.
- Allowed methods and headers are explicit.

### Hardening added

- Middleware CORS origin logic no longer falls back to a configured trusted origin for untrusted incoming origins. Untrusted origins now receive `Access-Control-Allow-Origin: null`.

## Abuse Protection

### Current state

- Request body size limit (`MAX_REQUEST_BYTES`) and schema validation are in place.
- No explicit API Gateway route throttling settings are configured in SAM.
- No application-level idempotency or duplicate suppression for public lead spam beyond canonical validation.

### Recommendation

Implement API Gateway stage/route throttling for public POST endpoints and evaluate lightweight duplicate suppression (for example email + campaign + short window) using existing DynamoDB model.

## External Providers / SSRF

### Current state

- No generic outbound HTTP client usage based on user-provided URLs.
- Outbound calls are limited to AWS SDK clients for SES and DynamoDB.

### Result

- No SSRF path was identified in repository code.

## DynamoDB

### Current state

- `PutItem` uses conditional create by `leadId`.
- `UpdateItem` uses expression attribute names/values and `attribute_exists(leadId)` condition.
- Query path uses GSI (`LeadEmailIndex`) with limit.
- Table has PITR and SSE enabled.

### Hardening added

- Added `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` to lead table resource to reduce accidental destructive replacement/delete impact.

## Dependencies

- Node dependencies are minimal (`@aws-sdk/client-dynamodb`, `@aws-sdk/client-ses`, ESLint, Prettier).
- `npm audit` executed as part of this review run (see test/build section results).

## Infrastructure

### Reviewed

- SAM/CloudFormation resources: HttpApi, Lambda functions, DynamoDB table, alarms, API access logs.

### Findings

- Lead table lacked explicit retain policies before this branch (mitigated).
- API access log retention is set (30 days); Lambda log retention management remains operationally controlled outside this template.

## Security Headers / Frontend Coordination

Current Lambda headers include:

- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';`
- `Referrer-Policy: no-referrer`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`

Frontend coordination items (external repo / CloudFront layer):

- Any site-wide CSP for frontend assets must be derived from actual script/style/connect source inventory before enforcement.
- Confirm CloudFront/S3 header behavior remains consistent with API headers and browser embedding expectations.

## Findings

| ID      | Severity | Component                        | Finding                                                                                                 | Evidence                                                                                               | Remediation                                                                         | Status                     |
| ------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------- |
| SEC-001 | HIGH     | API error envelope               | 5xx responses could include internal provider/repository detail entries                                 | `src/errors/index.js`, `src/repositories/lead-repository.js`, `src/providers/ses/ses-lead-provider.js` | Sanitize 5xx response errors to code + top-level message only                       | MITIGATED IN THIS BRANCH   |
| SEC-002 | MEDIUM   | CORS middleware                  | Untrusted origins could receive fallback trusted allow-origin value                                     | `src/middleware/cors.js`                                                                               | Return `null` for untrusted origins instead of fallback allowlist origin            | MITIGATED IN THIS BRANCH   |
| SEC-003 | MEDIUM   | Input normalization              | Structured fields accepted prototype-pollution keys                                                     | `src/leads/lead-model.js`                                                                              | Strip `__proto__`, `constructor`, `prototype` recursively from structured payloads  | MITIGATED IN THIS BRANCH   |
| SEC-004 | LOW      | IAM (SES)                        | `ses:SendRawEmail` granted though code uses `SendEmail` only                                            | `template.yaml`, SES provider implementations                                                          | Remove unnecessary action from Lambda IAM policies                                  | MITIGATED IN THIS BRANCH   |
| SEC-005 | MEDIUM   | Infrastructure / DynamoDB safety | Lead table had no explicit retain policy on delete/replace                                              | `template.yaml`                                                                                        | Add `DeletionPolicy` and `UpdateReplacePolicy` retain controls                      | MITIGATED IN THIS BRANCH   |
| SEC-006 | MEDIUM   | Abuse/rate protection            | No explicit API Gateway throttling controls in template for public lead intake routes                   | `template.yaml`                                                                                        | Add stage/route throttling and monitor rejection alarms                             | REQUIRES PRODUCTION CHANGE |
| SEC-007 | INFO     | Secrets hygiene                  | No confirmed hardcoded credentials in tracked repo content                                              | Repository-wide scan, `.env` ignored, `.env.example` reviewed                                          | Maintain current hygiene; use Secrets Manager/SSM for future sensitive integrations | CONFIRMED                  |
| SEC-008 | LOW      | Configuration safety             | Localhost CORS defaults are present in template parameter defaults and must be overridden in production | `template.yaml`, deployment docs                                                                       | Continue production override discipline and change-set review                       | RECOMMENDED                |
| SEC-009 | INFO     | CRM integration boundary         | CRM mapper exists but outbound CRM sync path is not implemented in this repo                            | `src/integrations/crm/lead-mapper.js`                                                                  | Coordinate with BoldTrail integration branch before enabling transport              | NOT VERIFIED               |

## Remediation Summary

Implemented in branch:

- Sanitized 5xx error envelope behavior.
- Hardened CORS behavior for untrusted origins.
- Added structured payload prototype-pollution key stripping.
- Removed unused SES IAM action (`ses:SendRawEmail`).
- Added DynamoDB table retain policies.
- Added regression tests for new controls.

Requires production change-set review (not deployed here):

- API Gateway throttling settings.
