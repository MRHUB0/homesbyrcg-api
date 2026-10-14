# ARM Reset implementation and release notes

Implementation is complete locally, including the original four-page PDF. Production readiness is **NO** until live development SES/database checks, deployable SAM packaging, and preview route/browser checks are completed. No production deployment or merge has occurred. Unrelated working-tree changes are preserved.

## Architecture and reuse

- Route: `/arm-reset` and directory shell `arm-reset/index.html`; canonical URL `/arm-reset/`. Reuses the Rent vs. Buy funnel stylesheet, logo, navigation, footer, form controls, validation service, and static directory routing. `arm-reset.css` adds scoped checkbox/FAQ/accessibility rules and visible mobile navigation. No JavaScript package was added.
- `arm-reset-service.js` uses `createLead` and `apiGatewayService.post("leads", ...)`, retaining existing configured endpoints, health checks, timeouts, retries, and errors. Direct gateway transport avoids the existing API client's second normalization dropping consent, funnel, attribution, and idempotency fields.
- API: existing `POST /leads`, `GenericLeadService`, canonical `buildCanonicalLead`, `LeadService`, DynamoDB `LeadRepository`/LeadTable, SES provider, and optional CRM synchronization. No new endpoint, table, bucket, Lambda, migration, or hosting infrastructure.
- Lead contact/campaign data remains in the existing canonical model. Review intent, property address, source, requested service, and adjustment timeframe are metadata. Funnel, consent, and attribution persist in `metadata.analyticsContext`. Notification status is an optional DynamoDB attribute; no schema migration is needed. Existing repository `getLead` supports lead retrieval.
- Campaign: `ARM_RESET_2026`; funnel: `arm-reset-playbook`.

## Registration, privacy, and security

Full name/email are required; surname, phone, property address, adjustment timeframe, and property-review interest are optional. A single-part name is supported. Required privacy acknowledgment explains request fulfillment. Optional email marketing consent is unchecked by default and never gates the PDF. Server receipt timestamps and fixed text versions (`arm-reset-privacy-v2`, `arm-reset-marketing-v2`) replace client-supplied consent timestamps; declined marketing has `agreed: false`, `agreedAt: null`. No SMS marketing consent is implied.

The API validates names/email, optional field lengths/types/timeframe, campaign/funnel, and privacy acknowledgment, derives requested service, strips null bytes from contact/address fields, and rejects a populated honeypot. Existing prototype-key sanitization, request-size/JSON controls, CORS, security headers, escaped notification HTML, and redacted lead logs are retained. Contact/address data is excluded from analytics. The public JSON API does not rely on authenticated cookies; no new cookie-based CSRF mechanism is introduced.

The existing HttpApi now configures `POST /leads` route throttling at 10 requests/second with a burst of 20, using [SAM RouteSettings](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html). This covers the shared lead endpoint, not only ARM, and is aggregate rather than per-IP bot protection. The setting takes effect only after API deployment. No CAPTCHA or new WAF infrastructure was added. Verify production CORS and throttles before launch.

Unchanged form retries retain one browser idempotency key; existing sequential repository replay returns the saved lead and suppresses an already successful notification. This does not add atomic cross-request uniqueness or deduplicate all visits by email. Browser reloads create a new key. Concurrent idempotency requests remain subject to the existing repository's eventually consistent index behavior.

## Notification and CRM behavior

The intended `malik@homesbyrcg.com` matches `.env.example`, SES tests, and deployment documentation. AWS returned successful verification for the `homesbyrcg.com` SES domain. Live development Lambda recipient/sender/provider/table settings could not be retrieved because the Lambda endpoint was inaccessible; the configured live recipient is therefore **not yet verified**.

The configured SES sender and existing SDK retries are reused. ARM subject is exactly `New HomesByRCG Lead — ARM Reset Playbook`. Both HTML/plain text include name, email, optional phone/address, campaign/source, requested service, optional timeframe, server submission timestamp, and separate privacy/marketing status. Other campaigns retain their existing email subjects and failure behavior.

Persistence precedes notification. A campaign-specific recovery hook uses the actual persisted lead, avoiding another eventually consistent lookup when SES fails. ARM SES failure records `notificationStatus: pending`/attempt time, logs `arm_notification_pending` with only lead ID/reason, and returns accepted registration so PDF access remains available. A successful SES attempt records `sent`; mock mode records `mocked`. Successful provider status prevents duplicate notification replay. Pending leads can be retried with the same request/idempotency key; existing SDK retry and explicit replay are used, with no new durable background delivery queue. Operations must monitor pending notifications and replay them through the existing service when SES recovers. Database failures still reject registration.

Optional BoldTrail runtime failures remain caught by the existing service. No CRM API call is needed for registration, notification, document access, analytics, or repository retrieval. A failed SES attempt does not start optional CRM synchronization. No new marketing automation was introduced.

## Original PDF

Source found: `/mnt/c/Users/mrob5/Downloads/HomesByRCG_ARM_Reset_Playbook_With_Cover_2026.pdf`.

Committed asset: `assets/downloads/HomesByRCG_ARM_Reset_Playbook_With_Cover_2026.pdf`.

Stable URL: `/assets/downloads/HomesByRCG_ARM_Reset_Playbook_With_Cover_2026.pdf`.

SHA-256: `e95d01b92f2c28cde37b407c4cc4175f3599f748d03b0536376cbdc97254590f`.

PyMuPDF opened the unencrypted original and confirmed exactly four pages; all four rendered pages were visually inspected. Source and destination hashes match. HomesByRCG branding and `© 2026 Roberts Capital Group LLC. All rights reserved.` are preserved byte-for-byte. The existing asset deployment includes this directory and infers PDF MIME type; no additional storage is required. The link is revealed only after accepted registration and a successful PDF HEAD response. A missing/non-PDF response acknowledges the saved request without displaying a broken link. Native PDF viewing/download is used; actual desktop/mobile browser PDF viewing remains pending.

## Analytics

Existing journey/attribution and analytics transport preserve supported UTM parameters and visitor/session/journey conventions. Events:

- `landing_page_viewed`: page load.
- `decision_question_answered`, `action: cta_clicked`: playbook/review CTA, with service label only.
- `funnel_started`: first form input.
- `decision_question_answered`, `action: validation_error`: native/service validation; field identifier only.
- `lead_submitted`: accepted registration; backend lifecycle also records the saved lead using existing conventions.
- `home_value_requested`: accepted registration with review interest.
- `guide_download`: download-link click, not proof of a completed file transfer.
- `decision_question_answered`, `action: submission_failed`: failed registration, without raw errors/contact values.

Registration no longer incorrectly records a `guide_download` backend lifecycle event. Third-party analytics IDs remain deployment configuration; native events resolve through existing API routes even when an explicit events endpoint is blank.

## Configuration

Reuse `APP_ENV`, `LEAD_PROVIDER_MODE`, `LEAD_TABLE_NAME`, `SES_SENDER`, `SES_RECIPIENT`, `SES_REGION`/`AWS_REGION`, `CORS_ALLOWED_ORIGINS`, `MAX_REQUEST_BYTES`, analytics/event table settings, and optional `CRM_PROVIDER_MODE`/existing CRM configuration. Production must use `LEAD_PROVIDER_MODE=ses`, its existing lead table, the verified sender, intended verified recipient, and exact allowed website origin. Frontend production endpoint/base URL and analytics settings remain in existing config modules. No credentials are embedded in frontend files or this document.

## Validation results and limitations

- Seven ARM JavaScript unit cases and two static HTTP component cases pass. The HTTP tests run the standard static handler in memory without sockets: `/arm-reset` redirects to `/arm-reset/`, the page returns 200, PDF HEAD returns `application/pdf`, and PDF GET returns every original byte. This does not validate live S3/CloudFront behavior.
- Existing analytics transport, landing/property/missing-property/next-house regression test files pass (six relevant frontend test files including ARM).
- Full frontend build/lint passes in an isolated tracked-file copy with feature changes. The canonical working-directory build remains blocked by the unrelated untracked nested checkout and generated Playwright report flagged by the existing AWS integration scanner.
- Eleven ARM backend cases cover persistence/retrieval, subject/body/recipient, attribution, optional marketing, server consent timestamps, optional name/address/phone, bot rejection, HTTP handler validation, duplicate replay, SES failure acceptance/retry, CRM isolation, database failure, and unchanged existing campaign errors. All 30 tracked API test files pass in an isolated feature copy; all 31 working-directory test files passed earlier in this execution. Backend lint and JS build pass; changed API files are formatted. Full format check has existing unrelated audit document failures (and an existing baseline test-format failure in the clean tracked copy).
- SAM template lint/validation passes, including throttling on the existing API. SAM emits a non-fatal warning because `/home/mrai/.aws-sam/metadata.json` is read-only. Packaging initially stalled with the unwritable default npm cache; using a writable task cache advanced to NpmInstall, where a bounded attempt timed out in this network-restricted environment. Full deployable SAM packaging remains unverified.
- Local Node is 20.20.2; Lambda/backend declares Node 22. Run API checks and packaging on Node 22 before release.
- Playwright desktop/tablet/mobile scenarios are updated for privacy-only registration, review selection, the real PDF fixture, events, invalid inputs, no analytics PII, and document failure. Browser execution is blocked: the Python web server fails with `PermissionError: [Errno 1] Operation not permitted` opening a socket. No browser validation is claimed.
- AWS identity/domain verification reads succeeded. Lambda config, SES quota, and API Gateway stage reads failed to connect. No real notification was sent, no production lead/customer data was read or changed, and no live DynamoDB submission was attempted. Live development notification/persistence verification remains required.
- GitHub CLI reports authenticated, but Git network calls fail with `Could not resolve host: github.com`. Branch publishing/PR creation is pending; do not use an approval-restricted connector to bypass this restriction.

## Publishing

Both local branches: `feat/arm-reset-playbook`. These extend existing feature infrastructure not yet on main. Use stacked review bases to avoid unrelated changes: frontend `feature/rent-vs-buy-decision-engine`; API `fix/rental-check-commercial-ui`. Verify those bases are published before opening PRs. In a network-enabled environment:

```bash
cd ~/projects/homesbyrcg-web
git push -u origin feat/arm-reset-playbook
gh pr create --draft --base feature/rent-vs-buy-decision-engine --head feat/arm-reset-playbook --title "Complete ARM Reset homeowner funnel and playbook delivery" --body-file docs/ARM_RESET_PR.md
cd ~/projects/homesbyrcg-api
git push -u origin feat/arm-reset-playbook
gh pr create --draft --base fix/rental-check-commercial-ui --head feat/arm-reset-playbook --title "Complete ARM Reset consent and notification handling" --body-file docs/ARM_RESET_PR.md
```

## Deployment — approval required; commands prepared, not executed

Use clean reviewed checkouts, not the canonical dirty working trees. Complete existing base-branch integration before production release. Verify live development recipient/provider/table configuration and send only a clearly marked development test notification to the broker, never a customer. Verify the development lead with repository/DynamoDB reads; do not modify production customer data.

Preflight in frontend: `npm ci --ignore-scripts`, `npm run build`, `npm run arm-reset:test`, then `npx playwright test -c tests/e2e/playwright.config.js tests/e2e/specs/arm-reset.spec.js --reporter=line` in an environment permitting local sockets.

Preflight in API on Node 22: `npm ci --ignore-scripts`, `npm run validate`, `npm run build`, `sam validate --lint`, `sam build`. Resolve existing baseline formatting separately rather than folding unrelated changes into ARM.

Capture the currently deployed frontend ref and API release artifact before deployment. Read existing production parameters/outputs; ensure sender/recipient, CRM/property settings, signing configuration, and table names are retained. Review the changeset for resource replacement/deletion; no such operation is needed for ARM.

After approval, prepare the existing production stack changeset using the verified sender (`ARM_SES_SENDER` is a task variable, not a credential):

```bash
sam deploy --config-env production --stack-name homesbyrcg-api-production --region us-east-1 --template-file .aws-sam/build/template.yaml --capabilities CAPABILITY_IAM --s3-bucket "$ARM_EXISTING_SAM_ARTIFACT_BUCKET" --no-execute-changeset --parameter-overrides AppEnvironment=production ServiceName=homesbyrcg-api LogLevel=info CorsAllowedOrigins=https://homesbyrcg.com LeadProviderMode=ses SesSender="$ARM_SES_SENDER" SesRecipient=malik@homesbyrcg.com SesIdentity=homesbyrcg.com
```

Use the existing SAM artifact capability (no new hosting/download bucket). Confirm existing stack parameters are preserved before executing the reviewed changeset. Execute only with explicit production approval:

```bash
aws cloudformation execute-change-set --stack-name homesbyrcg-api-production --change-set-name "$ARM_REVIEWED_CHANGESET" --region us-east-1
gh workflow run deploy.yml --repo MRHUB0/homesbyrcg-web --ref feat/arm-reset-playbook
```

The existing frontend workflow gates on build, assumes its existing OIDC role, syncs runtime/assets to the existing S3 bucket, and invalidates CloudFront. It includes the PDF. Main-branch merges also trigger production deployment, so do not merge without approval. Confirm workflow ref/base availability and deploy the matched reviewed backend before enabling the frontend.

Post-deployment read checks: `curl -I https://homesbyrcg.com/arm-reset`, `curl -I https://homesbyrcg.com/arm-reset/`, and `curl -I https://homesbyrcg.com/assets/downloads/HomesByRCG_ARM_Reset_Playbook_With_Cover_2026.pdf`. Confirm existing CDN directory-index behavior and PDF MIME/hash on preview before approving production. Browser-test accepted registration without marketing, PDF delivery, and optional review; monitor pending SES notifications.

## Rollback

Retain prior release refs/artifacts and current stack parameters. After rollback approval, rerun the existing frontend workflow with the prior approved ref: `gh workflow run deploy.yml --repo MRHUB0/homesbyrcg-web --ref "$ARM_FRONTEND_ROLLBACK_REF"`. Redeploy the prior backend release artifact through the same reviewed SAM/CloudFormation changeset process with retained production parameters. Do not delete tables, reset lead data, or revoke existing SES identities. No data migration reversal is required; captured leads remain in the existing table. Review PDF retention explicitly because the current asset upload does not delete old asset objects automatically.
