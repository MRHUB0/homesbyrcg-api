export class CrmAdapter {
  constructor({ name }) {
    this.name = name;
  }

  async upsertLead() {
    throw new Error('CrmAdapter.upsertLead must be implemented.');
  }

  async syncEvent() {
    throw new Error('CrmAdapter.syncEvent must be implemented.');
  }
}
