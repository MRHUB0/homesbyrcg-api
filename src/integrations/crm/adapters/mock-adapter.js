import { CrmAdapter } from './crm-adapter.js';

export class MockCrmAdapter extends CrmAdapter {
  constructor() {
    super({ name: 'mock' });
  }

  async upsertLead(lead) {
    return {
      status: 'accepted',
      provider: this.name,
      contactId: `mock-${lead.leadId}`,
      created: true,
      updated: false,
      skipped: false,
    };
  }

  async syncEvent(event) {
    return {
      status: 'accepted',
      provider: this.name,
      eventKey: event.eventId ?? event.eventName,
      skipped: false,
    };
  }
}
