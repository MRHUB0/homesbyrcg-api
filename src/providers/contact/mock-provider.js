import { LeadProvider, MockLeadProvider } from '../lead-provider.js';

export class ContactProvider extends LeadProvider {
  async submitContact() {
    throw new Error('ContactProvider.submitContact must be implemented.');
  }
}

export class MockContactProvider extends MockLeadProvider {
  async submitContact(contactRequest, options = {}) {
    const result = await this.submitLead(contactRequest, options);

    return {
      ...result,
      contact: contactRequest,
    };
  }
}
