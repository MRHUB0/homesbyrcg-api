import assert from 'node:assert/strict';
import test from 'node:test';

import { ContactService } from '../src/contact/contact-service.js';
import { ConsultationService } from '../src/consultation/consultation-service.js';
import { UnprocessableEntityError } from '../src/errors/index.js';
import { HomeValueService } from '../src/home-value/home-value-service.js';
import { LeadProvider, MockLeadProvider } from '../src/providers/lead-provider.js';

const context = {
  requestId: 'request-123',
  correlationId: 'correlation-123',
};

const baseLeadPayload = {
  firstName: ' Riley ',
  lastName: ' Carter ',
  email: ' RILEY@example.com ',
  phone: '+1 555 123 4567',
  journeySource: 'home-page',
  currentPage: '/lead',
  leadScore: '88',
  campaign: 'spring-listings',
  referral: 'google',
  notes: 'I would like help.',
};

test('contact service normalizes into canonical lead model', () => {
  const service = new ContactService({ provider: new MockLeadProvider() });
  const lead = service.normalize(
    {
      ...baseLeadPayload,
      leadIntent: 'schedule-showing',
      message: 'Please contact me.',
      notes: undefined,
    },
    { context },
  );

  assert.equal(lead.leadType, 'contact');
  assert.equal(lead.requestId, 'request-123');
  assert.equal(lead.correlationId, 'correlation-123');
  assert.equal(lead.firstName, 'Riley');
  assert.equal(lead.email, 'riley@example.com');
  assert.equal(lead.leadScore, 88);
  assert.equal(lead.notes, 'Please contact me.');
  assert.ok(lead.leadId);
  assert.ok(lead.timestamp);
  assert.deepEqual(Object.keys(lead), [
    'leadId',
    'leadType',
    'requestId',
    'correlationId',
    'timestamp',
    'firstName',
    'lastName',
    'email',
    'phone',
    'journeySource',
    'currentPage',
    'leadIntent',
    'leadScore',
    'campaign',
    'referral',
    'notes',
    'metadata',
  ]);
});

test('consultation service normalizes endpoint metadata', () => {
  const service = new ConsultationService({ provider: new MockLeadProvider() });
  const lead = service.normalize(
    {
      ...baseLeadPayload,
      leadIntent: 'buying-consultation',
      consultationType: 'buying',
      preferredContactMethod: 'phone',
      timeframe: '30-days',
    },
    { context },
  );

  assert.equal(lead.leadType, 'consultation');
  assert.equal(lead.metadata.consultationType, 'buying');
  assert.equal(lead.metadata.preferredContactMethod, 'phone');
  assert.equal(lead.metadata.timeframe, '30-days');
});

test('home value service normalizes endpoint metadata', () => {
  const service = new HomeValueService({ provider: new MockLeadProvider() });
  const lead = service.normalize(
    {
      ...baseLeadPayload,
      leadIntent: 'home-valuation',
      propertyAddress: '123 Main St',
      city: 'Charlotte',
      state: 'nc',
      zipCode: '28202',
      propertyType: 'single-family',
    },
    { context },
  );

  assert.equal(lead.leadType, 'home-value');
  assert.equal(lead.metadata.propertyAddress, '123 Main St');
  assert.equal(lead.metadata.state, 'NC');
});

test('lead services submit normalized leads through providers', async () => {
  const logRecords = [];
  const captureLogger = {
    info(message, fields) {
      logRecords.push({ message, fields });
    },
    error() {},
  };
  const service = new ConsultationService({ provider: new MockLeadProvider() });
  const lead = service.normalize(
    {
      ...baseLeadPayload,
      leadIntent: 'selling-consultation',
      consultationType: 'selling',
      preferredContactMethod: 'email',
      timeframe: 'exploring',
    },
    { context },
  );

  const result = await service.submitLead(lead, { context, logger: captureLogger });

  assert.equal(result.provider, 'mock');
  assert.equal(result.status, 'accepted');
  assert.equal(result.requestId, 'request-123');
  assert.equal(result.lead, lead);

  const normalizedLog = logRecords.find((record) => record.message === 'lead_normalized');
  assert.equal(normalizedLog.fields.lead.firstName, '[REDACTED]');
  assert.equal(normalizedLog.fields.lead.lastName, '[REDACTED]');
  assert.equal(normalizedLog.fields.lead.email, 'r***@example.com');
  assert.equal(normalizedLog.fields.lead.phone, '[REDACTED]');
  assert.equal(normalizedLog.fields.lead.notes, '[REDACTED]');
  assert.equal(normalizedLog.fields.lead.requestId, 'request-123');
});

test('lead validation rejects enum failures', () => {
  const service = new HomeValueService({ provider: new MockLeadProvider() });

  assert.throws(
    () =>
      service.normalize(
        {
          ...baseLeadPayload,
          leadIntent: 'unsupported',
          propertyAddress: '123 Main St',
          city: 'Charlotte',
          state: 'NC',
          zipCode: '28202',
          propertyType: 'castle',
        },
        { context },
      ),
    (error) =>
      error instanceof UnprocessableEntityError &&
      error.details.some((detail) => detail.field === 'leadIntent') &&
      error.details.some((detail) => detail.field === 'propertyType'),
  );
});

test('base lead provider requires submitLead implementation', async () => {
  await assert.rejects(() => new LeadProvider().submitLead(), {
    message: 'LeadProvider.submitLead must be implemented.',
  });
});
