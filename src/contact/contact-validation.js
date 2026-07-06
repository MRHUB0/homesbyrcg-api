import { UnprocessableEntityError, ValidationError } from '../errors/index.js';
import { ValidationFramework, Validators } from '../validation/validators.js';

const contactSchema = {
  firstName: [Validators.required(), Validators.length({ min: 1, max: 80 })],
  lastName: [Validators.required(), Validators.length({ min: 1, max: 80 })],
  email: [Validators.required(), Validators.email(), Validators.length({ max: 254 })],
  phone: [Validators.required(), Validators.phone(), Validators.length({ max: 30 })],
  message: [Validators.required(), Validators.length({ min: 1, max: 4000 })],
  journeySource: [Validators.required(), Validators.length({ min: 1, max: 120 })],
  currentPage: [Validators.required(), Validators.length({ min: 1, max: 2048 })],
  leadIntent: [Validators.required(), Validators.length({ min: 1, max: 120 })],
  leadScore: [
    Validators.required(),
    Validators.numeric(),
    Validators.custom(
      (value) => Number(value) >= 0 && Number(value) <= 100,
      'Value must be between 0 and 100.',
    ),
  ],
  referral: [Validators.required(), Validators.length({ min: 1, max: 240 })],
  campaign: [Validators.required(), Validators.length({ min: 1, max: 240 })],
};

export function normalizeContactRequest(payload) {
  const normalized = {
    firstName: normalizeString(payload?.firstName),
    lastName: normalizeString(payload?.lastName),
    email: normalizeEmail(payload?.email),
    phone: normalizeString(payload?.phone),
    message: normalizeString(payload?.message),
    journeySource: normalizeString(payload?.journeySource),
    currentPage: normalizeString(payload?.currentPage),
    leadIntent: normalizeString(payload?.leadIntent),
    leadScore: normalizeLeadScore(payload?.leadScore),
    referral: normalizeString(payload?.referral),
    campaign: normalizeString(payload?.campaign),
  };

  try {
    return ValidationFramework.validate(normalized, contactSchema);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new UnprocessableEntityError('Contact request validation failed.', error.details);
    }

    throw error;
  }
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.split('\0').join('').trim();
}

function normalizeEmail(value) {
  const normalized = normalizeString(value);

  if (typeof normalized !== 'string') {
    return normalized;
  }

  return normalized.toLowerCase();
}

function normalizeLeadScore(value) {
  const normalized = normalizeString(value);

  if (normalized === undefined || normalized === null || normalized === '') {
    return normalized;
  }

  return Number(normalized);
}
