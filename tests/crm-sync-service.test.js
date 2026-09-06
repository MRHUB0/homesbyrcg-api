import assert from 'node:assert/strict';
import test from 'node:test';

import { CrmSyncService } from '../src/integrations/crm/crm-sync-service.js';
import { InMemoryCrmIdempotencyRepository } from '../src/repositories/crm/idempotency-repository.js';
import { InMemoryLeadRepository } from '../src/repositories/lead-repository.js';

const logger = {
  info() {},
  error() {},
};

test('CRM sync service skips duplicate lead sync delivery', async () => {
  const adapter = {
    name: 'mock',
    calls: 0,
    async upsertLead() {
      this.calls += 1;
      return { status: 'accepted', skipped: false, contactId: 'contact-1' };
    },
    async syncEvent() {
      return { status: 'accepted', skipped: false };
    },
  };

  const leadRepository = new InMemoryLeadRepository();
  const lead = {
    leadId: 'lead-1',
    leadType: 'lead',
    email: 'person@example.com',
    status: 'RECEIVED',
    timestamp: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    metadata: {},
  };
  await leadRepository.createLead(lead);

  const service = new CrmSyncService({
    adapter,
    leadRepository,
    idempotencyRepository: new InMemoryCrmIdempotencyRepository(),
    appEnvironment: 'test',
  });

  const first = await service.syncLead(lead, { context: {}, logger });
  const second = await service.syncLead(lead, { context: {}, logger });

  assert.equal(first.status, 'accepted');
  assert.equal(second.reason, 'duplicate_delivery');
  assert.equal(adapter.calls, 1);
});

test('CRM sync service resolves lead identity for event sync', async () => {
  const adapter = {
    name: 'mock',
    async upsertLead() {
      return { status: 'accepted', skipped: false };
    },
    async syncEvent(_event, { lead }) {
      assert.equal(lead.leadId, 'lead-event-1');
      return { status: 'accepted', skipped: false };
    },
  };

  const leadRepository = new InMemoryLeadRepository();
  await leadRepository.createLead({
    leadId: 'lead-event-1',
    leadType: 'lead',
    email: 'event@example.com',
    status: 'RECEIVED',
    timestamp: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    metadata: {},
  });

  const service = new CrmSyncService({
    adapter,
    leadRepository,
    idempotencyRepository: new InMemoryCrmIdempotencyRepository(),
    appEnvironment: 'test',
  });

  const result = await service.syncEvent(
    {
      eventId: 'evt-1',
      eventName: 'lead_updated',
      occurredAt: '2026-01-01T00:00:00.000Z',
      journeyId: 'journey-1',
      correlationId: 'corr-1',
      properties: { leadId: 'lead-event-1' },
    },
    { context: {}, logger },
  );

  assert.equal(result.status, 'accepted');
});
