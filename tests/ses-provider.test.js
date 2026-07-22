import assert from 'node:assert/strict';
import test from 'node:test';

import { ConfigurationError } from '../src/errors/index.js';
import { renderLeadEmail } from '../src/providers/ses/email-template.js';
import { SESContactProvider } from '../src/providers/contact/ses-provider.js';
import { SESGenericLeadProvider } from '../src/providers/generic/ses-provider.js';
import { ConfigurationLoader } from '../src/config/configuration-loader.js';

const config = {
  sesSender: 'leads@homesbyrcg.com',
  sesRecipient: 'malik@homesbyrcg.com',
  awsRegion: 'us-east-1',
};

const lead = {
  leadId: 'lead-123',
  leadType: 'contact',
  requestId: 'request-123',
  correlationId: 'correlation-123',
  timestamp: '2026-07-06T00:00:00.000Z',
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'riley@example.com',
  phone: '+1 555 123 4567',
  journeySource: 'contact-page',
  currentPage: '/contact',
  leadIntent: 'schedule-showing',
  leadScore: 85,
  campaign: 'spring-listings',
  referral: 'google',
  notes: 'I would like to schedule a showing.',
  metadata: {
    originalEndpoint: '/contact',
  },
};

test('SES email template renders branded HTML and plain text', () => {
  const email = renderLeadEmail({ lead, title: 'New Contact Lead' });

  assert.equal(email.subject, 'Homes by RCG New Contact Lead: Riley Carter');
  assert.match(email.html, /Homes by RCG/);
  assert.match(email.html, /Malik Roberts, REALTOR®/);
  assert.match(email.html, /Brokered by Affordable Real Estate Company/);
  assert.match(email.html, /Lead Type/);
  assert.match(email.text, /Correlation ID: correlation-123/);
  assert.match(email.text, /Message: I would like to schedule a showing./);
});

test('SES contact provider sends professional lead email through injected client', async () => {
  const sentCommands = [];
  const client = {
    async send(command) {
      sentCommands.push(command);
      return { MessageId: 'ses-message-123' };
    },
  };
  const provider = new SESContactProvider({ config, client });

  const result = await provider.submitLead(lead);

  assert.equal(result.provider, 'ses');
  assert.equal(result.status, 'accepted');
  assert.equal(result.messageId, 'ses-message-123');
  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0].input.Source, 'leads@homesbyrcg.com');
  assert.deepEqual(sentCommands[0].input.Destination.ToAddresses, ['malik@homesbyrcg.com']);
  assert.deepEqual(sentCommands[0].input.ReplyToAddresses, ['riley@example.com']);
  assert.match(sentCommands[0].input.Message.Body.Html.Data, /Homes by RCG/);
  assert.match(sentCommands[0].input.Message.Body.Text.Data, /Phone: \+1 555 123 4567/);
});

test('configuration fails fast for invalid SES production settings', () => {
  assert.throws(
    () =>
      ConfigurationLoader.load({
        APP_ENV: 'production',
        SERVICE_NAME: 'homesbyrcg-api',
        LOG_LEVEL: 'info',
        MAX_REQUEST_BYTES: '1048576',
        LEAD_PROVIDER_MODE: 'ses',
        SES_SENDER: 'invalid',
        SES_RECIPIENT: '',
        SES_REGION: 'bad-region',
      }),
    (error) =>
      error instanceof ConfigurationError &&
      error.details.some((detail) => detail.includes('SES_SENDER')) &&
      error.details.some((detail) => detail.includes('SES_RECIPIENT')) &&
      error.details.some((detail) => detail.includes('SES_REGION')),
  );
});

test('SES event provider sends operational and attendee email', async () => {
  const sentCommands = [];
  const client = {
    async send(command) {
      sentCommands.push(command);
      return { MessageId: `message-${sentCommands.length}` };
    },
  };
  const provider = new SESGenericLeadProvider({ config, client });
  const result = await provider.submitLead(
    { ...lead, campaign: 'affordable-real-estate-broker-event' },
    { logger: { error() {} } },
  );

  assert.equal(sentCommands.length, 2);
  assert.deepEqual(sentCommands[0].input.Destination.ToAddresses, ['malik@homesbyrcg.com']);
  assert.deepEqual(sentCommands[1].input.Destination.ToAddresses, ['riley@example.com']);
  assert.match(sentCommands[1].input.Message.Body.Text.Data, /Full event details/);
  assert.equal(result.confirmationEmailSent, true);
});

test('attendee email failure is non-fatal after operational notification', async () => {
  let calls = 0;
  const client = {
    async send() {
      calls += 1;
      if (calls === 2) throw new Error('secondary failed');
      return { MessageId: 'operational' };
    },
  };
  const errors = [];
  const provider = new SESGenericLeadProvider({ config, client });
  const result = await provider.submitLead(
    { ...lead, campaign: 'affordable-real-estate-broker-event' },
    {
      logger: {
        error(message, fields) {
          errors.push({ message, fields });
        },
      },
    },
  );

  assert.equal(result.confirmationEmailSent, false);
  assert.equal(errors[0].message, 'attendee_confirmation_failed');
  assert.doesNotMatch(JSON.stringify(errors), /riley@example.com/);
});
