import { SESLeadProvider } from '../ses/ses-lead-provider.js';

export class SESHomeValueProvider extends SESLeadProvider {
  constructor({ config, client }) {
    super({ config, client, title: 'New Home Value Lead' });
  }
}
