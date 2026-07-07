import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError } from '../src/errors/index.js';
import {
  InMemoryLeadRepository,
  LeadRepository,
  fromDynamoItem,
  toDynamoItem,
} from '../src/repositories/lead-repository.js';

const lead = {
  leadId: 'lead-123',
  leadType: 'contact',
  timestamp: '2026-07-06T12:00:00.000Z',
  requestId: 'request-123',
  correlationId: 'correlation-123',
  status: 'RECEIVED',
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'riley@example.com',
  phone: '+1 555 123 4567',
  journeySource: 'contact-page',
  leadIntent: 'schedule-showing',
  leadScore: 85,
  campaign: 'spring-listings',
  referral: 'google',
  conversionType: 'contact',
  conversionEvent: 'contact_requested',
  decisionType: 'contact',
  recommendedFollowUp: 'Call tomorrow',
  metadata: {
    originalEndpoint: '/contact',
  },
  provider: null,
  providerStatus: null,
  createdAt: '2026-07-06T12:00:00.000Z',
  updatedAt: '2026-07-06T12:00:00.000Z',
};

test('in-memory lead repository persists, updates, and finds leads', async () => {
  const repository = new InMemoryLeadRepository();

  await repository.createLead(lead);
  const storedLead = await repository.getLead(lead.leadId);

  assert.deepEqual(storedLead, lead);

  const updatedLead = await repository.updateLead(lead.leadId, {
    provider: 'mock',
    providerStatus: 'accepted',
    updatedAt: '2026-07-06T12:01:00.000Z',
  });

  assert.equal(updatedLead.provider, 'mock');
  assert.equal(updatedLead.providerStatus, 'accepted');
  assert.equal(updatedLead.status, 'RECEIVED');

  const foundLead = await repository.findLeadByEmail('riley@example.com');
  assert.equal(foundLead.leadId, lead.leadId);
});

test('in-memory lead repository rejects duplicate lead ids', async () => {
  const repository = new InMemoryLeadRepository();

  await repository.createLead(lead);
  await assert.rejects(() => repository.createLead(lead), ConflictError);
});

test('lead repository sends DynamoDB commands for create, get, update, and email query', async () => {
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);

      if (command.constructor.name === 'GetItemCommand') {
        return { Item: toDynamoItem(lead) };
      }

      if (command.constructor.name === 'UpdateItemCommand') {
        return {
          Attributes: toDynamoItem({
            ...lead,
            provider: 'mock',
            providerStatus: 'accepted',
          }),
        };
      }

      if (command.constructor.name === 'QueryCommand') {
        return { Items: [toDynamoItem(lead)] };
      }

      return {};
    },
  };
  const repository = new LeadRepository({ tableName: 'LeadTable', client });

  await repository.createLead(lead);
  assert.deepEqual(await repository.getLead(lead.leadId), lead);

  const updatedLead = await repository.updateLead(lead.leadId, {
    provider: 'mock',
    providerStatus: 'accepted',
  });
  assert.equal(updatedLead.providerStatus, 'accepted');

  const foundLead = await repository.findLeadByEmail(lead.email);
  assert.equal(foundLead.email, lead.email);

  assert.deepEqual(
    commands.map((command) => command.constructor.name),
    ['PutItemCommand', 'GetItemCommand', 'UpdateItemCommand', 'QueryCommand'],
  );
  assert.equal(commands[0].input.ConditionExpression, 'attribute_not_exists(leadId)');
  assert.equal(commands[2].input.ReturnValues, 'ALL_NEW');
  assert.equal(commands[3].input.IndexName, 'LeadEmailIndex');
});

test('DynamoDB marshalling preserves nested lead data', () => {
  assert.deepEqual(fromDynamoItem(toDynamoItem(lead)), lead);
});
