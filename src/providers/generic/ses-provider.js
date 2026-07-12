import { SESLeadProvider } from '../ses/ses-lead-provider.js';

export class SESGenericLeadProvider extends SESLeadProvider {
  constructor({ config, client }) {
    super({ config, client, title: 'New Website Lead' });
  }
}
