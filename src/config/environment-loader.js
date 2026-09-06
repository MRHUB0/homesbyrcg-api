export class EnvironmentLoader {
  static load(env = process.env) {
    const appEnvironment = env.APP_ENV ?? env.NODE_ENV ?? 'local';

    return {
      appEnvironment,
      serviceName: env.SERVICE_NAME ?? 'homesbyrcg-api',
      logLevel: env.LOG_LEVEL ?? 'info',
      corsAllowedOrigins: parseCsv(env.CORS_ALLOWED_ORIGINS ?? '*'),
      maxRequestBytes: Number.parseInt(env.MAX_REQUEST_BYTES ?? '1048576', 10),
      version: env.npm_package_version ?? '0.1.0',
      propertyRefSigningSecret: env.PROPERTY_REF_SIGNING_SECRET,
      leadProviderMode:
        env.LEAD_PROVIDER_MODE ?? (appEnvironment === 'production' ? 'ses' : 'mock'),
      sesSender: env.SES_SENDER,
      sesRecipient: env.SES_RECIPIENT,
      awsRegion: env.SES_REGION ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
      leadTableName: env.LEAD_TABLE_NAME,
      eventTableName: env.EVENT_TABLE_NAME,
      crmProviderMode: env.CRM_PROVIDER_MODE ?? 'disabled',
      crmSyncTimeoutMs: Number.parseInt(env.CRM_SYNC_TIMEOUT_MS ?? '6000', 10),
      crmSyncMaxRetries: Number.parseInt(env.CRM_SYNC_MAX_RETRIES ?? '3', 10),
      crmSyncBaseDelayMs: Number.parseInt(env.CRM_SYNC_BASE_DELAY_MS ?? '150', 10),
      crmSyncMaxDelayMs: Number.parseInt(env.CRM_SYNC_MAX_DELAY_MS ?? '2000', 10),
      boldTrailApiBaseUrl: env.BOLDTRAIL_API_BASE_URL ?? 'https://api.kvcore.com',
      boldTrailApiToken: env.BOLDTRAIL_API_TOKEN,
      crmIdempotencyTableName: env.CRM_IDEMPOTENCY_TABLE_NAME,
    };
  }
}

function parseCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
