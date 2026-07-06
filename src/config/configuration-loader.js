import { ConfigurationError } from '../errors/index.js';
import { EnvironmentLoader } from './environment-loader.js';

const logLevels = new Set(['debug', 'info', 'warn', 'error']);
const appEnvironments = new Set(['local', 'development', 'staging', 'production']);
const leadProviderModes = new Set(['mock', 'ses']);

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

    if (config.leadProviderMode === 'ses') {
      validateSesConfiguration(config, errors);
    }

    if (!Number.isFinite(config.maxRequestBytes) || config.maxRequestBytes <= 0) {
      errors.push('MAX_REQUEST_BYTES must be a positive integer.');
    }

    if (errors.length > 0) {
      throw new ConfigurationError('Invalid application configuration.', errors);
    }

    return Object.freeze(config);
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
