import assert from 'node:assert/strict';
import test from 'node:test';

import { GenericLeadService } from '../src/leads/generic-lead-service.js';
import { MockLeadProvider } from '../src/providers/lead-provider.js';
import { InMemoryLeadRepository } from '../src/repositories/lead-repository.js';

const context = {
  requestId: 'req-1',
  correlationId: 'corr-1',
};

const logger = {
  info() {},
  error() {},
};

test('lead submission remains successful when CRM sync fails', async () => {
  const service = new GenericLeadService({
    provider: new MockLeadProvider(),
    repository: new InMemoryLeadRepository(),
    crmSyncService: {
      adapter: { name: 'boldtrail' },
      async syncLead() {
        throw new Error('crm unavailable');
      },
    },
  });

  const lead = service.normalize(
    {
      firstName: 'Riley',
      lastName: 'Carter',
      email: 'riley@example.com',
      notes: 'Please contact me.',
      leadIntent: 'Request professional guidance',
      journeySource: 'home-page',
      currentPage: '/lead',
    },
    { context },
  );

  const result = await service.submitLead(lead, { context, logger });

  assert.equal(result.status, 'accepted');
  assert.equal(result.lead.leadId, lead.leadId);
});
