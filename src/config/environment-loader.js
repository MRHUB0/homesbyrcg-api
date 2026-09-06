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
      leadProviderMode:
        env.LEAD_PROVIDER_MODE ?? (appEnvironment === 'production' ? 'ses' : 'mock'),
      propertyProviderMode: env.PROPERTY_PROVIDER_MODE ?? 'mock',
      franklinGisBaseUrl: env.FRANKLIN_GIS_BASE_URL,
      propertyProviderTimeoutMs: Number.parseInt(env.PROPERTY_PROVIDER_TIMEOUT_MS ?? '2500', 10),
      propertyProviderMaxAttempts: Number.parseInt(env.PROPERTY_PROVIDER_MAX_ATTEMPTS ?? '2', 10),
      propertyCacheTtlSeconds: Number.parseInt(env.PROPERTY_CACHE_TTL_SECONDS ?? '900', 10),
      propertyValueRequireLeadContext:
        (env.PROPERTY_VALUE_REQUIRE_LEAD_CONTEXT ?? 'true').toLowerCase() !== 'false',
      sesSender: env.SES_SENDER,
      sesRecipient: env.SES_RECIPIENT,
      awsRegion: env.SES_REGION ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
      leadTableName: env.LEAD_TABLE_NAME,
    };
  }
}

function parseCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
