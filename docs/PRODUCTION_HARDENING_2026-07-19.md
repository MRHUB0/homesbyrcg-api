# Production Hardening — 2026-07-19

The `homesbyrcg-api-production` stack was created without changing the public request or response
contracts and without modifying the lead table schema. The original development stack remains.

Implemented infrastructure:

- API Gateway `production` stage with exact `https://homesbyrcg.com` CORS.
- Six Node.js 22 ARM64 production Lambda functions.
- Separate encrypted, point-in-time-recoverable production DynamoDB lead table.
- SES provider mode using the verified `homesbyrcg.com` identity.
- CloudWatch alarms for Lambda errors/throttles, API 5XX/latency, and SES rejects.
- Thirty-day retention for all production and existing development API/Lambda log groups.

No authorization, CRM, analytics, UI, feature, or database-schema change is part of this release.
