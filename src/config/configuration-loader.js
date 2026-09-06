import { ConfigurationError } from '../errors/index.js';
import { EnvironmentLoader } from './environment-loader.js';

const logLevels = new Set(['debug', 'info', 'warn', 'error']);
const appEnvironments = new Set(['local', 'development', 'staging', 'production']);
const leadProviderModes = new Set(['mock', 'ses']);
const propertyProviderModes = new Set(['mock', 'franklin']);
const crmProviderModes = new Set(['disabled', 'mock', 'boldtrail']);

export class ConfigurationLoader {
  static load(env = process.env) {
    const config = EnvironmentLoader.load(env);
    const errors = [];

    if (!config.serviceName) {
      errors.push('SERVICE_NAME is required.');
    }

    if (!appEnvironments.has(config.appEnvironment)) {
      errors.push('APP_ENV must be one of local, development, staging, or production.');
    }

    if (!logLevels.has(config.logLevel)) {
      errors.push('LOG_LEVEL must be one of debug, info, warn, or error.');
    }

    if (!leadProviderModes.has(config.leadProviderMode)) {
      errors.push('LEAD_PROVIDER_MODE must be one of mock or ses.');
    }

    if (!propertyProviderModes.has(config.propertyProviderMode)) {
      errors.push('PROPERTY_PROVIDER_MODE must be one of mock or franklin.');

    if (!crmProviderModes.has(config.crmProviderMode)) {
      errors.push('CRM_PROVIDER_MODE must be one of disabled, mock, or boldtrail.');
    }

    if (config.leadProviderMode === 'ses') {
      validateSesConfiguration(config, errors);
    }

    if (!Number.isFinite(config.maxRequestBytes) || config.maxRequestBytes <= 0) {
      errors.push('MAX_REQUEST_BYTES must be a positive integer.');
    }

    if (
      !Number.isFinite(config.propertyProviderTimeoutMs) ||
      config.propertyProviderTimeoutMs <= 0
    ) {
      errors.push('PROPERTY_PROVIDER_TIMEOUT_MS must be a positive integer.');
    }

    if (
      !Number.isFinite(config.propertyProviderMaxAttempts) ||
      config.propertyProviderMaxAttempts < 1
    ) {
      errors.push('PROPERTY_PROVIDER_MAX_ATTEMPTS must be at least 1.');
    }

    if (!Number.isFinite(config.propertyCacheTtlSeconds) || config.propertyCacheTtlSeconds < 1) {
      errors.push('PROPERTY_CACHE_TTL_SECONDS must be at least 1.');
    }

    validateCrmConfiguration(config, errors);

    if (errors.length > 0) {
      throw new ConfigurationError('Invalid application configuration.', errors);
    }

    return Object.freeze(config);
  }
}

function validateCrmConfiguration(config, errors) {
  for (const [key, value] of [
    ['CRM_SYNC_TIMEOUT_MS', config.crmSyncTimeoutMs],
    ['CRM_SYNC_BASE_DELAY_MS', config.crmSyncBaseDelayMs],
    ['CRM_SYNC_MAX_DELAY_MS', config.crmSyncMaxDelayMs],
  ]) {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`${key} must be a positive integer.`);
    }
  }

  if (!Number.isFinite(config.crmSyncMaxRetries) || config.crmSyncMaxRetries < 0) {
    errors.push('CRM_SYNC_MAX_RETRIES must be zero or a positive integer.');
  }

  if (
    Number.isFinite(config.crmSyncBaseDelayMs) &&
    Number.isFinite(config.crmSyncMaxDelayMs) &&
    config.crmSyncBaseDelayMs > config.crmSyncMaxDelayMs
  ) {
    errors.push('CRM_SYNC_BASE_DELAY_MS must be less than or equal to CRM_SYNC_MAX_DELAY_MS.');
  }

  if (config.crmProviderMode === 'boldtrail') {
    if (!config.boldTrailApiToken) {
      errors.push('BOLDTRAIL_API_TOKEN is required when CRM_PROVIDER_MODE is boldtrail.');
    }

    if (!isHttpUrl(config.boldTrailApiBaseUrl)) {
      errors.push('BOLDTRAIL_API_BASE_URL must be a valid HTTP or HTTPS URL.');
    }
  }
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateSesConfiguration(config, errors) {
  if (!isEmail(config.sesSender)) {
    errors.push('SES_SENDER must be a valid email address when LEAD_PROVIDER_MODE is ses.');
  }

  if (!isEmail(config.sesRecipient)) {
    errors.push('SES_RECIPIENT must be a valid email address when LEAD_PROVIDER_MODE is ses.');
  }

  if (!config.awsRegion || !/^[a-z]{2}-[a-z]+-\d$/.test(config.awsRegion)) {
    errors.push(
      'SES_REGION or AWS_REGION must be a valid AWS region when LEAD_PROVIDER_MODE is ses.',
    );
  }
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
