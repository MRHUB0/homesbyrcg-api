import { CrmAdapter } from './crm-adapter.js';

export class DisabledCrmAdapter extends CrmAdapter {
  constructor() {
    super({ name: 'disabled' });
  }

  async upsertLead() {
    return { status: 'skipped', reason: 'crm_disabled', provider: this.name };
  }

  async syncEvent() {
    return { status: 'skipped', reason: 'crm_disabled', provider: this.name };
  }
}
