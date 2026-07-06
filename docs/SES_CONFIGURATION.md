# SES Configuration

## Required Settings

Set these values for production lead delivery:

- `LEAD_PROVIDER_MODE=ses`
- `SES_SENDER`
- `SES_RECIPIENT`
- `SES_REGION`

`SES_SENDER` must be a verified Amazon SES identity in the target region. `SES_RECIPIENT` must be
deliverable. If the AWS account is still in the SES sandbox, the recipient must also be verified.

## Email Content

Each lead email includes:

- Homes by RCG branding
- Malik Roberts, REALTOR®
- Brokered by Affordable Real Estate Company
- lead type
- name
- email
- phone
- journey source
- current page
- lead intent
- lead score
- campaign
- referral
- message
- timestamp
- request ID
- correlation ID

Both HTML and plain-text alternatives are sent.

## IAM

Lead Lambda functions require:

- `ses:SendEmail`
- `ses:SendRawEmail`

The current SAM template grants these permissions to `ContactFunction`, `ConsultationFunction`, and
`HomeValueFunction`, scoped to the configured `SesSender` identity ARN.

## Local Development

Use mock mode locally:

```bash
LEAD_PROVIDER_MODE=mock sam local start-api
```

Use SES mode locally only with valid AWS credentials and verified SES identities:

```bash
LEAD_PROVIDER_MODE=ses \
SES_SENDER=leads@homesbyrcg.com \
SES_RECIPIENT=malik@homesbyrcg.com \
SES_REGION=us-east-1 \
sam local start-api
```
