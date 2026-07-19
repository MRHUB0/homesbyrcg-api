# Deployment

The API is deployed with AWS SAM.

```bash
npm run sam-build
npm run sam-deploy
```

The template defines:

- Lambda globals
- API Gateway HTTP API
- DynamoDB `LeadTable`
- environment variables
- DynamoDB IAM permissions on lead functions
- SES IAM permissions on lead functions
- CloudWatch access log group
- health function
- contact function
- consultation function
- home value function
- stack outputs

`LeadTable` uses `PAY_PER_REQUEST`, server-side encryption, point-in-time recovery, `leadId` as
the partition key, and `LeadEmailIndex` for repository email lookups.

Deploy each environment with explicit parameter overrides for environment name, logging, CORS,
request size limits, provider mode, SES sender, and SES recipient.

The public route surface is limited to:

- `GET /health`
- `GET /openapi.yaml`
- `POST /contact`
- `POST /consultation`
- `POST /leads`
- `POST /home-value`

Production uses stack `homesbyrcg-api-production`. Do not update the development stack as a proxy
for a production deployment. Production CORS must be exactly `https://homesbyrcg.com`; local SAM
defaults permit `http://localhost:8080` and `http://localhost:3000` only.

Example production deploy parameters:

```bash
sam deploy \
  --stack-name homesbyrcg-api-production \
  --parameter-overrides \
    AppEnvironment=production \
    LogLevel=info \
    CorsAllowedOrigins=https://homesbyrcg.com \
    LeadProviderMode=ses \
    SesSender=leads@homesbyrcg.com \
    SesRecipient=malik@homesbyrcg.com
```

After the first invocation creates each Lambda log group, set its retention to 30 days with
`aws logs put-retention-policy`. The API access log group is created by CloudFormation with 30-day
retention. Do not delete or recreate existing log groups to change retention.

The stack outputs `LeadTableName`. SAM injects it into lead functions as `LEAD_TABLE_NAME`; when
that value is present, all submissions persist to DynamoDB before the provider executes.
