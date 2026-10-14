import assert from 'node:assert/strict';
import test from 'node:test';
import { redactLead } from '../src/leads/redaction.js';
import { GenericLeadService } from '../src/leads/generic-lead-service.js';
import { InMemoryLeadRepository } from '../src/repositories/lead-repository.js';
import { SESGenericLeadProvider } from '../src/providers/generic/ses-provider.js';

const context = { requestId: 'arm-request', correlationId: 'arm-correlation' };
const logger = { info() {}, error() {} };
const payload = {
  firstName: 'Home',
  lastName: 'Owner',
  email: 'owner@example.com',
  phone: '',
  campaign: 'ARM_RESET_2026',
  funnel: 'arm-reset-playbook',
  notes: 'Playbook',
  consent: { contact: { agreed: true, textVersion: 'arm-reset-contact-v1' } },
  attribution: { lastTouch: { utm_source: 'newsletter' } },
  metadata: {
    requestPropertyReview: true,
    propertyAddress: '123 Main St, Columbus OH 43215',
    source: 'newsletter',
  },
  idempotencyKey: 'arm-reset-test',
};
function setup({ failEmail = false, failCrm = false } = {}) {
  const commands = [];
  const repository = new InMemoryLeadRepository();
  const service = new GenericLeadService({
    repository,
    provider: new SESGenericLeadProvider({
      config: {
        awsRegion: 'us-east-1',
        sesSender: 'site@homesbyrcg.com',
        sesRecipient: 'malik@homesbyrcg.com',
      },
      client: {
        async send(command) {
          commands.push(command);
          if (failEmail) throw new Error('SES unavailable');
          return { MessageId: 'email-1' };
        },
      },
    }),
    crmSyncService: {
      async syncLead() {
        if (failCrm) throw new Error('BoldTrail unavailable');
      },
    },
  });
  return { service, repository, commands };
}
test('ARM lead persists review, campaign, consent and attribution and notifies Malik', async () => {
  const { service, repository, commands } = setup();
  const lead = service.normalize(payload, { context });
  const result = await service.submitLead(lead, { context, logger });
  const saved = await repository.getLead(result.lead.leadId);
  assert.equal(saved.campaign, 'ARM_RESET_2026');
  assert.equal(saved.metadata.requestPropertyReview, true);
  assert.equal(redactLead(saved).metadata.propertyAddress, '[REDACTED]');
  assert.equal(saved.metadata.analyticsContext.funnel, 'arm-reset-playbook');
  assert.equal(saved.metadata.analyticsContext.consent.contact.agreed, true);
  assert.equal(saved.metadata.analyticsContext.attribution.lastTouch.utm_source, 'newsletter');
  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0].input.Destination.ToAddresses, ['malik@homesbyrcg.com']);
  const email = commands[0].input.Message.Body.Text.Data;
  for (const value of [
    'owner@example.com',
    'ARM_RESET_2026',
    'Home Value & Equity Review',
    payload.metadata.propertyAddress,
    lead.timestamp,
  ])
    assert.ok(email.includes(value));
});
test('ARM replay returns the saved lead without sending another notification', async () => {
  const { service, commands } = setup();
  const first = await service.submitLead(service.normalize(payload, { context }), {
    context,
    logger,
  });
  const second = await service.submitLead(service.normalize(payload, { context }), {
    context,
    logger,
  });
  assert.equal(second.lead.leadId, first.lead.leadId);
  assert.equal(second.duplicate, true);
  assert.equal(commands.length, 1);
});
test('ARM notification failure preserves the lead and permits a retry', async () => {
  const { service, repository } = setup({ failEmail: true });
  const lead = service.normalize(payload, { context });
  await assert.rejects(service.submitLead(lead, { context, logger }), /SES provider failed/);
  assert.equal((await repository.getLead(lead.leadId)).campaign, 'ARM_RESET_2026');
  service.provider.client.send = async () => ({ MessageId: 'retry' });
  const result = await service.submitLead(service.normalize(payload, { context }), {
    context,
    logger,
  });
  assert.equal(result.lead.leadId, lead.leadId);
  assert.equal(result.status, 'accepted');
});
test('ARM CRM failure leaves persistence and email successful', async () => {
  const { service, commands, repository } = setup({ failCrm: true });
  const result = await service.submitLead(service.normalize(payload, { context }), {
    context,
    logger,
  });
  assert.equal(result.status, 'accepted');
  assert.ok(await repository.getLead(result.lead.leadId));
  assert.equal(commands.length, 1);
});
test('ARM rejects missing consent or review address and does not require a phone', () => {
  const { service } = setup();
  assert.throws(
    () => service.normalize({ ...payload, consent: {} }, { context }),
    /ARM request validation/,
  );
  assert.throws(
    () => service.normalize({ ...payload, metadata: { requestPropertyReview: true } }, { context }),
    /ARM request validation/,
  );
  const lead = service.normalize(
    { ...payload, metadata: { requestPropertyReview: false } },
    { context },
  );
  assert.equal(lead.metadata.requestedService, 'ARM Reset Playbook');
});
