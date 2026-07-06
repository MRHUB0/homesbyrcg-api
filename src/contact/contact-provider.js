export class ContactProvider {
  async submitContact() {
    throw new Error('ContactProvider.submitContact must be implemented.');
  }
}

export class MockContactProvider extends ContactProvider {
  async submitContact(contactRequest, { context } = {}) {
    return {
      provider: 'mock',
      status: 'accepted',
      requestId: context?.requestId,
      submittedAt: new Date().toISOString(),
      contact: contactRequest,
    };
  }
}
