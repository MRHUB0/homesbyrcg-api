# Deployment

The API is deployed with AWS SAM.

```bash
npm run sam-build
npm run sam-deploy
```

The template defines:

- Lambda globals
- API Gateway HTTP API
- environment variables
- CloudWatch access log group
- health function
- stack outputs

Deploy each environment with explicit parameter overrides for environment name, logging, CORS, and
request size limits.
