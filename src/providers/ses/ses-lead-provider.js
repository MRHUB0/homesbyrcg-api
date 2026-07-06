import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { ProviderError } from '../../errors/index.js';
import { LeadProvider } from '../lead-provider.js';
import { renderLeadEmail } from './email-template.js';

export class SESLeadProvider extends LeadProvider {
  constructor({ config, title, client = new SESClient({ region: config.awsRegion }) }) {
    super();
    this.name = 'ses';
    this.config = config;
    this.title = title;
    this.client = client;
  }

  async submitLead(lead) {
    const email = renderLeadEmail({ lead, title: this.title });

    try {
      const result = await this.client.send(
        new SendEmailCommand({
          Source: this.config.sesSender,
          Destination: {
            ToAddresses: [this.config.sesRecipient],
          },
          Message: {
            Subject: {
              Charset: 'UTF-8',
              Data: email.subject,
            },
            Body: {
              Html: {
                Charset: 'UTF-8',
                Data: email.html,
              },
              Text: {
                Charset: 'UTF-8',
                Data: email.text,
              },
            },
          },
          ReplyToAddresses: [lead.email],
        }),
      );

      return {
        provider: this.name,
        status: 'accepted',
        requestId: lead.requestId,
        submittedAt: new Date().toISOString(),
        messageId: result.MessageId,
      };
    } catch (error) {
      throw new ProviderError('SES provider failed.', [
        {
          provider: this.name,
          message: error.message,
        },
      ]);
    }
  }
}
