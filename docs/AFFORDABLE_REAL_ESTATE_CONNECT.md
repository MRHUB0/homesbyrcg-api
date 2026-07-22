# Affordable Real Estate Connect Lead Capture

The QR-only booth campaign `affordable-real-estate-connect` reuses `POST /leads`, the canonical generic lead service, the existing DynamoDB LeadTable, and the existing SES operational notification. It adds no endpoint, Lambda, table, IAM permission, or infrastructure resource.

The campaign requires first name, last name, email, and phone. Its existing lead fields carry interest, notes, conversion type `event-lead-capture`, and conversion event `event_connection_captured`. The metadata allowlist preserves source, campaign, event slug, brokerage, landing page, redirect destination, page/referrer, UTM values, interest, timeframe, optional help message, follow-up consent, QR version, print batch, and campaign version.

This booth lead-capture campaign is separate from `affordable-real-estate-broker-event`. The original registration campaign retains its attendee confirmation email behavior; the booth campaign sends the established operational broker notification only.

Validate and deploy through `docs/PRODUCTION_DEPLOYMENT.md`. Post-deploy, submit one clearly marked synthetic booth lead, confirm the `202` response, verify the lead in the existing production LeadTable, and verify the operational SES outcome without exposing PII in logs.
