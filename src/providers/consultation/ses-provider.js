import { SESLeadProvider } from '../ses/ses-lead-provider.js';

export class SESConsultationProvider extends SESLeadProvider {
  constructor({ config, client }) {
    super({ config, client, title: 'New Consultation Lead' });
  }
}
