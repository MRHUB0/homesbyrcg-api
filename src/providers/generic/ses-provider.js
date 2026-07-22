import { SESLeadProvider } from '../ses/ses-lead-provider.js';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { renderEventConfirmationEmail } from '../ses/email-template.js';

export class SESGenericLeadProvider extends SESLeadProvider {
  constructor({ config, client }) {
    super({ config, client, title: 'New Website Lead' });
  }

  async submitLead(lead, options = {}) {
    const operationalResult = await super.submitLead(lead, options);
    if (lead.campaign !== 'affordable-real-estate-broker-event') return operationalResult;

    const email = renderEventConfirmationEmail({ lead });
    try {
      await this.client.send(
        new SendEmailCommand({
          Source: this.config.sesSender,
          Destination: { ToAddresses: [lead.email] },
          Message: {
            Subject: { Charset: 'UTF-8', Data: email.subject },
            Body: {
              Html: { Charset: 'UTF-8', Data: email.html },
              Text: { Charset: 'UTF-8', Data: email.text },
            },
          },
          ReplyToAddresses: [this.config.sesRecipient],
        }),
      );
      return { ...operationalResult, confirmationEmailSent: true };
    } catch (error) {
      options.logger?.error('attendee_confirmation_failed', {
        leadId: lead.leadId,
        leadType: lead.leadType,
        error: { name: error.name, message: 'Attendee confirmation delivery failed.' },
      });
      return { ...operationalResult, confirmationEmailSent: false };
    }
  }
}
