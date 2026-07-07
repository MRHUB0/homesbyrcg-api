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
