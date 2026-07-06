import { randomUUID } from 'node:crypto';

import { UnprocessableEntityError, ValidationError } from '../errors/index.js';
import { nowIso } from '../shared/time.js';
import { ValidationFramework, Validators } from '../validation/validators.js';

export const LeadTypes = Object.freeze({
  CONTACT: 'contact',
  CONSULTATION: 'consultation',
  HOME_VALUE: 'home-value',
});

export const LeadIntentValues = Object.freeze({
  CONTACT: ['general-inquiry', 'schedule-showing', 'buyer-question', 'seller-question'],
  CONSULTATION: ['buying-consultation', 'selling-consultation', 'investment-consultation'],
  HOME_VALUE: ['home-valuation', 'sell-my-home', 'market-analysis'],
});

const commonLeadSchema = {
  firstName: [Validators.required(), Validators.length({ min: 1, max: 80 })],
  lastName: [Validators.required(), Validators.length({ min: 1, max: 80 })],
  email: [Validators.required(), Validators.email(), Validators.length({ max: 254 })],
  phone: [Validators.required(), Validators.phone(), Validators.length({ max: 30 })],
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
  campaign: [Validators.required(), Validators.length({ min: 1, max: 240 })],
  referral: [Validators.required(), Validators.length({ min: 1, max: 240 })],
  notes: [Validators.required(), Validators.length({ min: 1, max: 4000 })],
};

export function normalizeLeadRequest(
  payload,
  { leadType, schema = {}, intentValues = [], additionalFields = {} },
) {
  const normalized = {
    ...normalizeCommonLeadFields(payload),
    ...additionalFields,
  };

  try {
    ValidationFramework.validate(normalized, {
      ...commonLeadSchema,
      leadIntent:
        intentValues.length > 0
          ? [...commonLeadSchema.leadIntent, Validators.enum(intentValues)]
          : commonLeadSchema.leadIntent,
      ...schema,
    });

    return normalized;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new UnprocessableEntityError(
        `${formatLeadType(leadType)} request validation failed.`,
        error.details,
      );
    }

    throw error;
  }
}

export function buildCanonicalLead({
  leadType,
  normalizedRequest,
  context,
  metadata = {},
  leadId = randomUUID(),
  timestamp = nowIso(),
}) {
  return {
    leadId,
    leadType,
    requestId: context.requestId,
    correlationId: context.correlationId,
    timestamp,
    firstName: normalizedRequest.firstName,
    lastName: normalizedRequest.lastName,
    email: normalizedRequest.email,
    phone: normalizedRequest.phone,
    journeySource: normalizedRequest.journeySource,
    currentPage: normalizedRequest.currentPage,
    leadIntent: normalizedRequest.leadIntent,
    leadScore: normalizedRequest.leadScore,
    campaign: normalizedRequest.campaign,
    referral: normalizedRequest.referral,
    notes: normalizedRequest.notes,
    metadata,
  };
}

export function normalizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.split('\0').join('').trim();
}

export function normalizeEmail(value) {
  const normalized = normalizeString(value);

  if (typeof normalized !== 'string') {
    return normalized;
  }

  return normalized.toLowerCase();
}

export function normalizeLeadScore(value) {
  const normalized = normalizeString(value);

  if (normalized === undefined || normalized === null || normalized === '') {
    return normalized;
  }

  return Number(normalized);
}

function normalizeCommonLeadFields(payload) {
  return {
    firstName: normalizeString(payload?.firstName),
    lastName: normalizeString(payload?.lastName),
    email: normalizeEmail(payload?.email),
    phone: normalizeString(payload?.phone),
    journeySource: normalizeString(payload?.journeySource),
    currentPage: normalizeString(payload?.currentPage),
    leadIntent: normalizeString(payload?.leadIntent),
    leadScore: normalizeLeadScore(payload?.leadScore),
    campaign: normalizeString(payload?.campaign),
    referral: normalizeString(payload?.referral),
    notes: normalizeString(payload?.notes ?? payload?.message),
  };
}

function formatLeadType(leadType) {
  return leadType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
