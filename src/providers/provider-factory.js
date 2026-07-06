import { MockConsultationProvider } from './consultation/mock-provider.js';
import { MockContactProvider } from './contact/mock-provider.js';
import { MockHomeValueProvider } from './home-value/mock-provider.js';
import { SESConsultationProvider } from './consultation/ses-provider.js';
import { SESContactProvider } from './contact/ses-provider.js';
import { SESHomeValueProvider } from './home-value/ses-provider.js';

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
