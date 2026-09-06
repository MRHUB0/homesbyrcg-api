import { MockConsultationProvider } from './consultation/mock-provider.js';
import { MockContactProvider } from './contact/mock-provider.js';
import { MockHomeValueProvider } from './home-value/mock-provider.js';
import { SESConsultationProvider } from './consultation/ses-provider.js';
import { SESContactProvider } from './contact/ses-provider.js';
import { SESHomeValueProvider } from './home-value/ses-provider.js';
import { MockGenericLeadProvider } from './generic/mock-provider.js';
import { SESGenericLeadProvider } from './generic/ses-provider.js';
import { FranklinGisPropertySearchProvider } from './property-search/franklin-gis-provider.js';
import { FranklinCountyAuditorPropertyRecordProvider } from './property-record/franklin-county-auditor-provider.js';
import { BoldTrailCrmAdapter } from '../integrations/crm/boldtrail/adapter.js';
import { BoldTrailClient } from '../integrations/crm/boldtrail/client.js';
import { DisabledCrmAdapter } from '../integrations/crm/adapters/disabled-adapter.js';
import { MockCrmAdapter } from '../integrations/crm/adapters/mock-adapter.js';

export function createGenericLeadProvider(config) {
  return config.leadProviderMode === 'ses'
    ? new SESGenericLeadProvider({ config })
    : new MockGenericLeadProvider();
}

export function createContactProvider(config) {
  return config.leadProviderMode === 'ses'
    ? new SESContactProvider({ config })
    : new MockContactProvider();
}

export function createConsultationProvider(config) {
  return config.leadProviderMode === 'ses'
    ? new SESConsultationProvider({ config })
    : new MockConsultationProvider();
}

export function createHomeValueProvider(config) {
  return config.leadProviderMode === 'ses'
    ? new SESHomeValueProvider({ config })
    : new MockHomeValueProvider();
}

export function createPropertySearchProvider() {
  return new FranklinGisPropertySearchProvider();
}

export function createPropertyRecordProvider() {
  return new FranklinCountyAuditorPropertyRecordProvider();
}

export function createCrmAdapter(config) {
  if (config.crmProviderMode === 'disabled') {
    return new DisabledCrmAdapter();
  }

  if (config.crmProviderMode === 'mock') {
    return new MockCrmAdapter();
  }

  const client = new BoldTrailClient({
    token: config.boldTrailApiToken,
    baseUrl: config.boldTrailApiBaseUrl,
    timeoutMs: config.crmSyncTimeoutMs,
    maxRetries: config.crmSyncMaxRetries,
    baseDelayMs: config.crmSyncBaseDelayMs,
    maxDelayMs: config.crmSyncMaxDelayMs,
  });

  return new BoldTrailCrmAdapter({ client });
}
