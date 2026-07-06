import assert from 'node:assert/strict';
import test from 'node:test';

import { ValidationError } from '../src/errors/index.js';
import { ValidationFramework, Validators } from '../src/validation/validators.js';

test('validation framework accepts valid payloads', () => {
  const payload = { email: 'test@example.com', age: '42', subscribed: true };

  const result = ValidationFramework.validate(payload, {
    email: [Validators.required(), Validators.email()],
    age: [Validators.numeric()],
    subscribed: [Validators.boolean()],
  });

  assert.equal(result, payload);
});

test('validation framework reports field errors', () => {
  assert.throws(
    () =>
      ValidationFramework.validate(
        { email: 'invalid' },
        {
          email: [Validators.email()],
          name: [Validators.required()],
        },
      ),
    ValidationError,
  );
});
