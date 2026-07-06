export class LeadProvider {
  async submitLead() {
    throw new Error('LeadProvider.submitLead must be implemented.');
  }
}

export class MockLeadProvider extends LeadProvider {
  constructor({ name = 'mock' } = {}) {
    super();
    this.name = name;
  }

  async submitLead(lead, { context } = {}) {
    return {
      provider: this.name,
      status: 'accepted',
      requestId: context?.requestId,
      submittedAt: new Date().toISOString(),
      lead,
    };
  }
}
