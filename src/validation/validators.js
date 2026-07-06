import { ValidationError } from '../errors/index.js';

export const Validators = {
  required(message = 'Value is required.') {
    return (value) => (value === undefined || value === null || value === '' ? message : null);
  },

  email(message = 'Value must be a valid email address.') {
    return (value) =>
      value === undefined || value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
        ? null
        : message;
  },

  phone(message = 'Value must be a valid phone number.') {
    return (value) =>
      value === undefined || value === null || /^\+?[0-9 .()-]{7,20}$/.test(String(value))
        ? null
        : message;
  },

  length({ min = 0, max = Number.MAX_SAFE_INTEGER }, message) {
    return (value) => {
      if (value === undefined || value === null) return null;
      const size = String(value).length;
      return size >= min && size <= max
        ? null
        : (message ?? `Value length must be between ${min} and ${max}.`);
    };
  },

  enum(allowed, message = 'Value is not allowed.') {
    return (value) =>
      value === undefined || value === null || allowed.includes(value) ? null : message;
  },

  boolean(message = 'Value must be a boolean.') {
    return (value) =>
      value === undefined || value === null || typeof value === 'boolean' ? null : message;
  },

  numeric(message = 'Value must be numeric.') {
    return (value) =>
      value === undefined || value === null || (Number.isFinite(Number(value)) && value !== '')
        ? null
        : message;
  },

  date(message = 'Value must be a valid date.') {
    return (value) =>
      value === undefined || value === null || !Number.isNaN(Date.parse(value)) ? null : message;
  },

  custom(predicate, message = 'Value is invalid.') {
    return (value, payload) => (predicate(value, payload) ? null : message);
  },
};

export class ValidationFramework {
  static validate(payload, schema) {
    const errors = [];

    for (const [field, validators] of Object.entries(schema)) {
      const value = payload?.[field];

      for (const validator of validators) {
        const message = validator(value, payload);

        if (message) {
          errors.push({ field, message });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed.', errors);
    }

    return payload;
  }
}
