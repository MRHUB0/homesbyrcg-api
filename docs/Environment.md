# Environment

Environment values are provided by SAM parameters and Lambda environment variables.

Local development can use `.env.example` as a reference, but `.env` files are ignored by Git.

Recommended environment strategy:

- `local` - developer machine and SAM local runs.
- `development` - shared non-production integration environment.
- `staging` - production-like release validation.
- `production` - live backend.

Future secrets should be loaded from AWS Secrets Manager or SSM Parameter Store and never committed.
