import { randomUUID } from 'node:crypto';

import { UnprocessableEntityError, ValidationError } from '../errors/index.js';
import { nowIso } from '../shared/time.js';
import { ValidationFramework, Validators } from '../validation/validators.js';
import { SupportedEventNames, eventDefinition, eventFamily } from './event-taxonomy.js';
import { classifyConversion, deriveFunnelStage } from './funnel-classification.js';

const forbiddenMetadataPatterns = [
  /email/i,
  /phone/i,
  /first.?name/i,
  /last.?name/i,
  /full.?name/i,
];

function isRecord(value) {
  return (
    value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value))
  );
}

const eventSchema = {
  eventId: [Validators.length({ min: 1, max: 120 })],
  eventName: [Validators.required(), Validators.optionalEnum(SupportedEventNames)],
  eventVersion: [Validators.length({ min: 1, max: 30 })],
  occurredAt: [Validators.date()],
  visitorId: [Validators.length({ max: 120 })],
  sessionId: [Validators.length({ max: 120 })],
  journeyId: [Validators.length({ max: 120 })],
  leadId: [Validators.length({ max: 120 })],
  funnel: [Validators.length({ max: 120 })],
  landingPage: [Validators.length({ max: 2048 })],
  propertyRef: [Validators.length({ max: 240 })],
  attribution: [Validators.custom(isRecord, 'Attribution must be an object.')],
  consent: [Validators.custom(isRecord, 'Consent must be an object.')],
  metadata: [Validators.custom(isRecord, 'Metadata must be an object.')],
};

export function normalizeAnalyticsEvent(payload = {}, { context = {}, idempotencyKey } = {}) {
  const eventName = normalizeString(payload.eventName);
  const normalized = {
    eventId: normalizeString(payload.eventId) ?? idempotencyKey ?? randomUUID(),
    eventName,
    eventVersion: normalizeString(payload.eventVersion) ?? '1.0',
    occurredAt: normalizeString(payload.occurredAt) ?? nowIso(),
    receivedAt: nowIso(),
    visitorId: normalizeString(payload.visitorId),
    sessionId: normalizeString(payload.sessionId),
    journeyId: normalizeString(payload.journeyId),
    leadId: normalizeString(payload.leadId),
    funnel: normalizeString(payload.funnel),
    landingPage: normalizeString(payload.landingPage),
    propertyRef: normalizeString(payload.propertyRef),
    attribution: normalizeAttribution(payload.attribution),
    consent: sanitizeMetadata(payload.consent ?? {}),
    metadata: sanitizeMetadata(payload.metadata ?? {}),
    requestId: context.requestId,
    correlationId: context.correlationId,
  };

  if (!normalized.journeyId && normalized.sessionId) {
    normalized.journeyId = normalized.sessionId;
  }

  ValidationFramework.validate(normalized, eventSchema);
  validateRequiredFields(normalized);

  const family = eventFamily(normalized.eventName);
  const funnelStage = deriveFunnelStage(normalized.eventName);
  const conversionClass = classifyConversion(normalized.eventName);

  return {
    ...normalized,
    family,
    funnelStage,
    conversionClass,
  };
}

export function sanitizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !forbiddenMetadataPatterns.some((pattern) => pattern.test(key)))
      .map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    return sanitizeMetadata(value);
  }

  return value;
}

function normalizeAttribution(attribution = {}) {
  if (!attribution || typeof attribution !== 'object') {
    return {};
  }

  return {
    utm_source: normalizeString(attribution.utm_source),
    utm_medium: normalizeString(attribution.utm_medium),
    utm_campaign: normalizeString(attribution.utm_campaign),
    utm_term: normalizeString(attribution.utm_term),
    utm_content: normalizeString(attribution.utm_content),
    referrer: normalizeString(attribution.referrer),
    landingPage: normalizeString(attribution.landingPage),
  };
}

function validateRequiredFields(event) {
  const requiredFields = requiredByEvent(event.eventName);
  const missing = requiredFields.filter((field) => !event[field]);

  if (missing.length === 0) {
    return;
  }

  throw new UnprocessableEntityError(
    'Analytics event validation failed.',
    missing.map((field) => ({ field, message: 'Field is required for this event.' })),
  );
}

function requiredByEvent(eventName) {
  return eventDefinition(eventName)?.requiredFields ?? [];
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.split('\0').join('').trim();
}

export function normalizeAnalyticsEventSafe(payload, options) {
  try {
    return normalizeAnalyticsEvent(payload, options);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new UnprocessableEntityError('Analytics event validation failed.', error.details);
    }

    throw error;
  }
}
