import { ConfigurationLoader } from '../config/configuration-loader.js';
import { createLeadRepository } from '../repositories/lead-repository.js';
import { createPropertyCacheRepository } from './cache/property-cache-repository.js';
import { PropertyMetrics } from './metrics.js';
import { createPropertyProvider } from './property-provider-factory.js';
import { PropertyService } from './property-service.js';

export function createPropertyService(config = ConfigurationLoader.load()) {
  return new PropertyService({
    provider: createPropertyProvider(config),
    cache: createPropertyCacheRepository(config),
    metrics: new PropertyMetrics({
      serviceName: config.serviceName,
      environment: config.appEnvironment,
    }),
  });
}

export function createValueAccessDependencies(config = ConfigurationLoader.load()) {
  return {
    requireLeadContext: config.propertyValueRequireLeadContext,
    leadRepository: createLeadRepository(config),
  };
}
