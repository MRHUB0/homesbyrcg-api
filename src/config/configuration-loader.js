import { ConfigurationError } from '../errors/index.js';
import { EnvironmentLoader } from './environment-loader.js';

const logLevels = new Set(['debug', 'info', 'warn', 'error']);

export class ConfigurationLoader {
  static load(env = process.env) {
    const config = EnvironmentLoader.load(env);
    const errors = [];

    if (!config.serviceName) {
      errors.push('SERVICE_NAME is required.');
    }

    if (!logLevels.has(config.logLevel)) {
      errors.push('LOG_LEVEL must be one of debug, info, warn, or error.');
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
