# ARM Reset Playbook — review notes

Status: implemented for review; not ready for production until the complete four-page PDF is supplied and browser checks run. No deployment was performed.

## Audit and reuse

- `arm-reset/index.html` extends the static directory/index route pattern. It reuses `assets/css/funnels/rent-vs-buy.css`, the existing logo, branded header/navigation, form/fieldset/button components, and brokerage/copyright/footer disclosures. Other funnels are unchanged.
- `assets/js/services/arm-reset-service.js` uses `createLead`, existing validation, and `apiGatewayService.post("leads", ...)` with the configured endpoint, health check, timeout, retry, and error handling. It deliberately bypasses `apiClient.submitLead`'s second normalization, which drops top-level consent, attribution and idempotency fields.
- `createFunnelJourneyContext`, `createFunnelAnalyticsService`, and `trackEvent` preserve first/last-touch attribution and visitor/session/journey conventions. Canonical events are `landing_page_viewed`, `lead_submitted`, `home_value_requested` (only after a review request is saved), and `guide_download` (download link click, not proof of completed file transfer). No contact data is sent in events.
- Backend `POST /leads`, `GenericLeadService`, canonical `buildCanonicalLead`, `LeadRepository`/existing DynamoDB table, `SESGenericLeadProvider`, and optional `CrmSyncService` are reused. The API branch adds campaign-specific validation and three allowed metadata fields. No schema migration, new endpoint, or AWS infrastructure is needed.
- The existing GitHub main-branch deploy workflow serves static pages/assets through the existing S3/CloudFront setup. A feature branch does not trigger that production push workflow. Confirm deployed directory-index handling for `/arm-reset` and `/arm-reset/` before launch.

## Lead contract

Campaign `ARM_RESET_2026`; funnel `arm-reset-playbook`. First/last name and email required; phone optional. Explicit, versioned contact consent is required. A review checkbox controls required property address. Review intent and property address persist in lead metadata; consent and attribution persist in canonical `metadata.analyticsContext`. The API derives the requested-service text rather than trusting the submitted label. Property addresses are redacted in backend lead logs.

The browser retains one idempotency key for retries of unchanged form values. Existing repository replay avoids sending another email after a completed submission. This is existing sequential replay behavior, not a new atomic cross-request uniqueness guarantee. Reloads or changed requests use a new key; email alone is not a uniqueness key.

SES sends the operational notification after database persistence. Repository config/docs specify `malik@homesbyrcg.com`; live Lambda configuration was not inspected. The existing AWS SDK handles transport retries. A notification error returns an error while retaining the lead; retrying unchanged input retries notification on that saved record. No new background delivery queue was introduced. CRM runtime errors remain caught by the existing service and do not prevent accepted registration or document access. Frontend code contains no notification credentials.

## Required document and release checks

The exact `HomesByRCG_ARM_Reset_Playbook_With_Cover_2026.pdf` was not found in either repository or the local project/home search. It has been requested. No substitute or generated PDF was created.

Once supplied, verify all four pages and the HomesByRCG branding/Roberts Capital Group LLC copyright visually, then copy the original bytes into `assets/downloads/HomesByRCG_ARM_Reset_Playbook_With_Cover_2026.pdf`. Existing asset sync will serve it; verify HTTP content type `application/pdf`. The controller exposes its link only after accepted registration and a successful PDF HEAD response. If delivery is unavailable, it acknowledges the saved request and shows an honest unavailable message without a broken link. This availability check does not verify page count; the original document must be reviewed before committing it.

Before release: verify live SES recipient/provider/table configuration, run browser tests, confirm the page and PDF on preview, and obtain production deployment approval.

## Validation

- ARM frontend unit tests: 5 cases pass; existing analytics transport and landing funnel test files pass.
- Full frontend build/lint passes in `/tmp/arm-web-validation`, containing tracked files plus this feature, without unrelated local files. The working-directory build stops on the pre-existing untracked nested checkout `homesbyrcg-web-rent-vs-buy-integration/` and generated `tests/e2e/playwright-report/index.html` in the AWS integration scanner.
- `tests/e2e/specs/arm-reset.spec.js` adds successful review/delivery/event and unavailable-document browser scenarios, run across existing desktop/tablet/mobile projects. Attempted with Playwright, but sandbox socket restrictions prevented the local server starting; browser execution remains pending. PDF responses in those tests are transport fixtures, not a substitute playbook.
- Backend `npm test` passes 31 test files in the working directory and 30 tracked test files in an isolated committed-tree copy, including five ARM cases. Backend lint/build pass in both. Full format check reports six pre-existing untracked audit documents in the working directory and pre-existing formatting in `tests/franklin-county-provider.test.js` in the isolated committed tree; changed API files are formatted.
- Runtime: local Node is v20.20.2; backend declares Node >=22. Repeat API validation on its deployment Node version before release.

## Pull request

Branch in both repositories: `feat/arm-reset-playbook`. GitHub CLI reports invalid saved authentication. The GitHub connector can access the API repository but returns 404 for the configured frontend repository. The intended API draft PR targets `fix/rental-check-commercial-ui`, the existing branch that contains the audited backend infrastructure; targeting main would include substantial unrelated existing work. The frontend PR requires repository access. Publishing the API tree through the connector was rejected because write tools require approval and this session has approval policy `never`; no remote branch or PR was created. Local commits exclude all pre-existing changes. Keep PRs as drafts until the required document and browser validation are complete; use the matching API branch before previewing frontend submissions.
