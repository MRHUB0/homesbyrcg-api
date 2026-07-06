import assert from 'node:assert/strict';
import test from 'node:test';

import { ContactProvider, MockContactProvider } from '../src/contact/contact-provider.js';

test('base contact provider requires submitContact implementation', async () => {
  await assert.rejects(() => new ContactProvider().submitContact(), {
    message: 'ContactProvider.submitContact must be implemented.',
  });
});

test('mock contact provider accepts normalized contact requests', async () => {
  const contactRequest = {
    firstName: 'Riley',
    lastName: 'Carter',
    email: 'riley@example.com',
  };

  const result = await new MockContactProvider().submitContact(contactRequest, {
    context: { requestId: 'request-123' },
  });

  assert.equal(result.provider, 'mock');
  assert.equal(result.status, 'accepted');
  assert.equal(result.requestId, 'request-123');
  assert.equal(result.contact, contactRequest);
  assert.ok(result.submittedAt);
});
