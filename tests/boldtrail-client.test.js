import assert from 'node:assert/strict';
import test from 'node:test';

import { IntegrationError } from '../src/errors/index.js';
import { BoldTrailClient } from '../src/integrations/crm/boldtrail/client.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}

test('BoldTrail client sends bearer authorization header', async () => {
  let captured;
  const client = new BoldTrailClient({
    token: 'test-token',
    baseUrl: 'https://api.kvcore.com',
    timeoutMs: 100,
    maxRetries: 0,
    baseDelayMs: 1,
    maxDelayMs: 1,
    fetchImpl: async (_url, options) => {
      captured = options;
      return jsonResponse({ ok: true });
    },
  });

  await client.request('GET', '/v2/public/contact');

  assert.equal(captured.headers.Authorization, 'Bearer test-token');
  assert.equal(captured.headers['X-API-Token'], undefined);
});

test('BoldTrail client retries on rate limits and succeeds', async () => {
  let calls = 0;
  const client = new BoldTrailClient({
    token: 'test-token',
    baseUrl: 'https://api.kvcore.com',
    timeoutMs: 100,
    maxRetries: 2,
    baseDelayMs: 1,
    maxDelayMs: 1,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({ message: 'rate limit' }, 429);
      }

      return jsonResponse({ data: [{ id: '123' }] }, 200);
    },
  });

  const response = await client.findContacts({ email: 'person@example.com' });

  assert.equal(calls, 2);
  assert.equal(response[0].id, '123');
});

test('BoldTrail client uses documented contacts list filters for lookup', async () => {
  const urls = [];
  const client = new BoldTrailClient({
    token: 'test-token',
    baseUrl: 'https://api.kvcore.com',
    timeoutMs: 100,
    maxRetries: 0,
    baseDelayMs: 1,
    maxDelayMs: 1,
    fetchImpl: async (url) => {
      urls.push(url);
      return jsonResponse({ data: [] });
    },
  });

  await client.findContacts({ email: 'Person@Example.com', phone: '6145551212' });

  assert.deepEqual(urls, [
    'https://api.kvcore.com/v2/public/contacts?filter%5Bemail%5D=person%40example.com&limit=10',
    'https://api.kvcore.com/v2/public/contacts?filter%5Bphone%5D=6145551212&limit=10',
  ]);
});

test('BoldTrail client formats tags and notes for documented payloads', async () => {
  const requests = [];
  const client = new BoldTrailClient({
    token: 'test-token',
    baseUrl: 'https://api.kvcore.com',
    timeoutMs: 100,
    maxRetries: 0,
    baseDelayMs: 1,
    maxDelayMs: 1,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return jsonResponse({ ok: true });
    },
  });

  await client.addTags('123', [' HomesByRCG ', '', 'lead_created']);
  await client.addNote('123', { title: 'HomesByRCG Lead Sync', details: '{"leadId":"abc"}' });

  const tagsPayload = JSON.parse(requests[0].options.body);
  assert.deepEqual(tagsPayload, {
    tags: [
      { name: 'HomesByRCG', locked: 0 },
      { name: 'lead_created', locked: 0 },
    ],
  });

  const notePayload = JSON.parse(requests[1].options.body);
  assert.equal(notePayload.title, 'HomesByRCG Lead Sync');
  assert.equal(notePayload.details, '{"leadId":"abc"}');
  assert.match(notePayload.date, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('BoldTrail client throws on permanent client errors without retries', async () => {
  const client = new BoldTrailClient({
    token: 'test-token',
    baseUrl: 'https://api.kvcore.com',
    timeoutMs: 100,
    maxRetries: 2,
    baseDelayMs: 1,
    maxDelayMs: 1,
    fetchImpl: async () => jsonResponse({ message: 'bad request' }, 400),
  });

  await assert.rejects(
    () => client.request('POST', '/v2/public/contact', { body: {} }),
    (error) => error instanceof IntegrationError && error.details[0].statusCode === 400,
  );
});

test('BoldTrail client retries on 5xx and fails after retry budget', async () => {
  let calls = 0;
  const client = new BoldTrailClient({
    token: 'test-token',
    baseUrl: 'https://api.kvcore.com',
    timeoutMs: 100,
    maxRetries: 1,
    baseDelayMs: 1,
    maxDelayMs: 1,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ message: 'server down' }, 503);
    },
  });

  await assert.rejects(() => client.request('GET', '/v2/public/contact'));
  assert.equal(calls, 2);
});
