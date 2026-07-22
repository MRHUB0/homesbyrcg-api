# Affordable Real Estate Event Lead Extension

The Affordable Real Estate Company QR campaign reuses `POST /leads`, the canonical lead model/service, the existing DynamoDB LeadTable, and the existing SES provider. No endpoint, table, Lambda, IAM permission, or infrastructure resource was added.

For exact campaign `affordable-real-estate-broker-event`, generic validation also requires last name and accepts `qr-code`, `event-registration`, and `event_interest_registered`. Only an allowlist of campaign metadata is persisted. The canonical `timestamp` and `createdAt` remain server-generated.

After persistence, the provider sends the established operational notification. It then sends an attendee confirmation through the same SES client. Secondary confirmation failure does not undo persistence or fail the request; it logs a redacted operational error and returns `confirmationEmailSent=false`, allowing the frontend to avoid a false delivery claim. Existing generic/contact/consultation/home-value flows are unchanged.

Run `npm run validate`, `npm run build`, `sam validate`, and `sam build`. Deploy only through `docs/PRODUCTION_DEPLOYMENT.md` after confirming production SES sender/recipient parameters. Post-deploy, submit a clearly labeled synthetic campaign lead and verify one LeadTable item, metadata attribution, server timestamps, both email outcomes, redacted logs, and the boolean response. Remove synthetic data only under the established data-retention/admin process.
