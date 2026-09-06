import assert from 'node:assert/strict';
import test from 'node:test';

import { IntegrationError } from '../src/errors/index.js';
import { GenericLeadService } from '../src/leads/generic-lead-service.js';
import { createCorsHeaders } from '../src/middleware/cors.js';
import { MockLeadProvider } from '../src/providers/lead-provider.js';
import { InMemoryLeadRepository } from '../src/repositories/lead-repository.js';
import { ResponseBuilder } from '../src/responses/response-builder.js';

test('error responses do not expose internal details for 5xx errors', () => {
  const response = ResponseBuilder.error({
    error: new IntegrationError('Lead repository operation failed.', [
      { message: 'ConditionalCheckFailedException: internal detail' },
    ]),
    context: {
      requestId: 'request-123',
      correlationId: 'correlation-123',
    },
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 502);
  assert.equal(body.message, 'Lead repository operation failed.');
  assert.deepEqual(body.errors, [
    {
      code: 'INTEGRATION_ERROR',
      message: 'Lead repository operation failed.',
    },
  ]);
});

test('CORS does not reflect untrusted origins', () => {
  const headers = createCorsHeaders(
    {
      corsAllowedOrigins: ['https://homesbyrcg.com'],
    },
    'https://attacker.example',
  );

  assert.equal(headers['Access-Control-Allow-Origin'], 'null');
});

test('structured lead metadata removes prototype-pollution keys', () => {
  const service = new GenericLeadService({
    provider: new MockLeadProvider(),
    repository: new InMemoryLeadRepository(),
  });
  const lead = service.normalize(
    {
      email: 'security@example.com',
      metadata: JSON.parse('{"source":"web","constructor":{"danger":true}}'),
      leadContext: JSON.parse('{"decisionJourney":"buyer","prototype":"drop"}'),
      journeyTimeline: [JSON.parse('{"step":"one","constructor":{"danger":true}}')],
    },
    {
      context: {
        requestId: 'request-123',
        correlationId: 'correlation-123',
      },
    },
  );

  assert.equal(lead.metadata.source, 'web');
  assert.equal(Object.hasOwn(lead.metadata, 'constructor'), false);
  assert.equal(lead.leadContext.prototype, undefined);
  assert.equal(lead.leadContext.decisionJourney, 'buyer');
  assert.equal(Object.hasOwn(lead.journeyTimeline[0], 'constructor'), false);
  assert.equal(lead.journeyTimeline[0].step, 'one');
  assert.equal(Object.prototype.polluted, undefined);
});
