import { MockConsultationProvider } from './consultation/mock-provider.js';
import { MockContactProvider } from './contact/mock-provider.js';
import { MockHomeValueProvider } from './home-value/mock-provider.js';
import { SESConsultationProvider } from './consultation/ses-provider.js';
import { SESContactProvider } from './contact/ses-provider.js';
import { SESHomeValueProvider } from './home-value/ses-provider.js';
import { MockGenericLeadProvider } from './generic/mock-provider.js';
import { SESGenericLeadProvider } from './generic/ses-provider.js';

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
