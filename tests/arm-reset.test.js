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
  consent: { privacy: { acknowledged: true }, marketing: { agreed: false } },
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
  assert.equal(saved.metadata.analyticsContext.consent.privacy.acknowledged, true);
  assert.equal(saved.metadata.analyticsContext.attribution.lastTouch.utm_source, 'newsletter');
  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0].input.Destination.ToAddresses, ['malik@homesbyrcg.com']);
  assert.equal(commands[0].input.Message.Subject.Data, 'New HomesByRCG Lead — ARM Reset Playbook');
  assert.equal(saved.metadata.analyticsContext.consent.marketing.agreed, false);
  assert.ok(saved.metadata.analyticsContext.consent.privacy.acknowledgedAt);
  const email = commands[0].input.Message.Body.Text.Data;
  assert.ok(email.includes('Not opted in'));
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
  const pending = await service.submitLead(lead, { context, logger });
  assert.equal(pending.status, 'notification_pending');
  assert.equal(pending.lead.notificationStatus, 'pending');
  assert.equal((await repository.getLead(lead.leadId)).campaign, 'ARM_RESET_2026');
  service.provider.client.send = async () => ({ MessageId: 'retry' });
  const result = await service.submitLead(service.normalize(payload, { context }), {
    context,
    logger,
  });
  assert.equal(result.lead.leadId, lead.leadId);
  assert.equal(result.status, 'accepted');
  assert.equal(result.lead.notificationStatus, 'sent');
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
test('ARM rejects missing privacy acknowledgment and accepts optional address/marketing/phone', () => {
  const { service } = setup();
  assert.throws(
    () => service.normalize({ ...payload, consent: {} }, { context }),
    /ARM request validation/,
  );
  assert.doesNotThrow(() =>
    service.normalize({ ...payload, metadata: { requestPropertyReview: true } }, { context }),
  );
  const lead = service.normalize(
    { ...payload, metadata: { requestPropertyReview: false } },
    { context },
  );
  assert.equal(lead.metadata.requestedService, 'ARM Reset Playbook');
});

test('ARM sanitizes names and records server consent timestamps without requiring surname', () => {
  const { service } = setup();
  const lead = service.normalize(
    {
      ...payload,
      firstName: '  Home\0 ',
      lastName: '',
      consent: {
        privacy: { acknowledged: true, acknowledgedAt: 'forged' },
        marketing: { agreed: true, agreedAt: 'forged' },
      },
    },
    { context },
  );
  assert.equal(lead.firstName, 'Home');
  assert.equal(lead.metadata.analyticsContext.consent.marketing.agreed, true);
  assert.notEqual(lead.metadata.analyticsContext.consent.marketing.agreedAt, 'forged');
});
test('ARM rejects honeypot spam and invalid optional timeframe', () => {
  const { service } = setup();
  assert.throws(
    () => service.normalize({ ...payload, website: 'spam' }, { context }),
    /ARM request validation/,
  );
  assert.throws(
    () =>
      service.normalize(
        { ...payload, metadata: { ...payload.metadata, timeframe: 'invalid' } },
        { context },
      ),
    /ARM request validation/,
  );
});

test('POST /leads accepts ARM privacy-only registration through existing handler', async () => {
  const { handler } = await import('../src/handlers/leads/index.js');
  const { createHttpApiEvent } = await import('../src/events/http-api-event.js');
  process.env.APP_ENV = 'local';
  process.env.LEAD_PROVIDER_MODE = 'mock';
  process.env.LOG_LEVEL = 'error';
  process.env.CRM_PROVIDER_MODE = 'disabled';
  delete process.env.LEAD_TABLE_NAME;
  const request = {
    ...payload,
    name: 'Home Owner',
    idempotencyKey: 'arm-http-test',
    metadata: { requestPropertyReview: false },
  };
  const event = createHttpApiEvent({
    routeKey: 'POST /leads',
    rawPath: '/leads',
    headers: { 'content-type': 'application/json' },
    requestContext: { requestId: 'arm-http-test', http: { method: 'POST', path: '/leads' } },
    body: JSON.stringify(request),
  });
  const response = await handler(event, { awsRequestId: 'arm-test' });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 202);
  assert.equal(body.success, true);
  const repository = globalThis.__homesByRcgInMemoryLeadRepository;
  const saved = await repository.getLead(body.leadId);
  assert.equal(saved.campaign, 'ARM_RESET_2026');
  assert.equal(saved.metadata.analyticsContext.consent.marketing.agreed, false);
  assert.equal(saved.metadata.analyticsContext.funnel, 'arm-reset-playbook');
  const duplicate = JSON.parse((await handler(event, { awsRequestId: 'arm-test' })).body);
  assert.equal(duplicate.leadId, body.leadId);
  const rejected = await handler(
    { ...event, body: JSON.stringify({ ...request, consent: {} }) },
    { awsRequestId: 'arm-test' },
  );
  assert.equal(rejected.statusCode, 422);
});

test('ARM database errors do not acknowledge a lead or trigger notification', async () => {
  const { service, commands } = setup();
  service.repository.createLead = async () => {
    throw new Error('database unavailable');
  };
  await assert.rejects(
    service.submitLead(service.normalize(payload, { context }), { context, logger }),
    /database unavailable/,
  );
  assert.equal(commands.length, 0);
});

test('existing generic campaigns retain their notification error behavior', async () => {
  const { service } = setup({ failEmail: true });
  const lead = service.normalize(
    {
      firstName: 'Existing',
      email: 'existing@example.com',
      campaign: 'buyer-guide',
      notes: 'Existing request',
    },
    { context },
  );
  await assert.rejects(service.submitLead(lead, { context, logger }), /SES provider failed/);
});

test('POST /leads returns accepted and retains the lead when SES is unavailable', async () => {
  const { handler } = await import('../src/handlers/leads/index.js');
  const { createHttpApiEvent } = await import('../src/events/http-api-event.js');
  const { ProviderError } = await import('../src/errors/index.js');
  const original = SESGenericLeadProvider.prototype.submitLead;
  const environment = { ...process.env };
  Object.assign(process.env, {
    APP_ENV: 'local',
    LOG_LEVEL: 'error',
    LEAD_PROVIDER_MODE: 'ses',
    SES_SENDER: 'leads@homesbyrcg.com',
    SES_RECIPIENT: 'malik@homesbyrcg.com',
    SES_REGION: 'us-east-1',
    CRM_PROVIDER_MODE: 'disabled',
  });
  delete process.env.LEAD_TABLE_NAME;
  SESGenericLeadProvider.prototype.submitLead = async () => {
    throw new ProviderError('SES provider failed.');
  };
  try {
    const event = createHttpApiEvent({
      routeKey: 'POST /leads',
      rawPath: '/leads',
      headers: { 'content-type': 'application/json' },
      requestContext: { requestId: 'arm-ses-failure', http: { method: 'POST', path: '/leads' } },
      body: JSON.stringify({ ...payload, idempotencyKey: 'arm-ses-http-failure' }),
    });
    const response = await handler(event, { awsRequestId: 'arm-ses-test' });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 202);
    assert.equal(body.success, true);
    assert.equal(
      (await globalThis.__homesByRcgInMemoryLeadRepository.getLead(body.leadId)).notificationStatus,
      'pending',
    );
    assert.ok(!response.body.includes(payload.email));
  } finally {
    SESGenericLeadProvider.prototype.submitLead = original;
    for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
  }
});
