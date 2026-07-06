import { SESLeadProvider } from '../ses/ses-lead-provider.js';

export class SESContactProvider extends SESLeadProvider {
  constructor({ config, client }) {
    super({ config, client, title: 'New Contact Lead' });
  }
}
