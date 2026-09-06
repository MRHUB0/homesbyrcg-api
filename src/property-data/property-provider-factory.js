import { FranklinCountyPropertyProvider } from './providers/franklin-county-provider.js';
import { MockPropertyProvider } from './providers/mock-property-provider.js';

export function createPropertyProvider(config) {
  if (config.propertyProviderMode === 'franklin') {
    return new FranklinCountyPropertyProvider({
      baseUrl: config.franklinGisBaseUrl,
      timeoutMs: config.propertyProviderTimeoutMs,
      maxAttempts: config.propertyProviderMaxAttempts,
    });
  }

  return new MockPropertyProvider();
}
