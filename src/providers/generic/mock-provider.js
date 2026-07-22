import { MockLeadProvider } from '../lead-provider.js';

export class MockGenericLeadProvider extends MockLeadProvider {
  async submitLead(lead, options) {
    const result = await super.submitLead(lead, options);
    return lead.campaign === 'affordable-real-estate-broker-event'
      ? { ...result, confirmationEmailSent: true }
      : result;
  }
}
