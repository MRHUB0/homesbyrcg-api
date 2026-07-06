import assert from 'node:assert/strict';
import test from 'node:test';

import { UnprocessableEntityError } from '../src/errors/index.js';
import { normalizeContactRequest } from '../src/contact/contact-validation.js';

const validContactRequest = {
  firstName: 'Riley',
  lastName: 'Carter',
  email: 'RILEY@example.com',
  phone: '+1 555 123 4567',
  message: 'I would like to schedule a showing.',
  journeySource: 'contact-page',
  currentPage: '/contact',
  leadIntent: 'schedule-showing',
  leadScore: '85',
  referral: 'google',
  campaign: 'spring-listings',
};

test('contact validation normalizes accepted payloads', () => {
  const result = normalizeContactRequest({
    ...validContactRequest,
    firstName: ' Riley ',
    email: ' RILEY@example.com ',
  });

  assert.equal(result.firstName, 'Riley');
  assert.equal(result.email, 'riley@example.com');
  assert.equal(result.leadScore, 85);
});

test('contact validation reports missing required fields as 422', () => {
  assert.throws(
    () => normalizeContactRequest({ ...validContactRequest, email: undefined, message: '' }),
    (error) =>
      error instanceof UnprocessableEntityError &&
      error.statusCode === 422 &&
      error.details.some((detail) => detail.field === 'email') &&
      error.details.some((detail) => detail.field === 'message'),
  );
});

test('contact validation rejects invalid email and phone fields', () => {
  assert.throws(
    () => normalizeContactRequest({ ...validContactRequest, email: 'invalid', phone: '123' }),
    (error) =>
      error instanceof UnprocessableEntityError &&
      error.details.some((detail) => detail.field === 'email') &&
      error.details.some((detail) => detail.field === 'phone'),
  );
});
