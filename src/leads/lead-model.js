import { randomUUID } from 'node:crypto';

import { UnprocessableEntityError, ValidationError } from '../errors/index.js';
import { nowIso } from '../shared/time.js';
import { ValidationFramework, Validators } from '../validation/validators.js';

export const LeadTypes = Object.freeze({
  GENERIC: 'lead',
  CONTACT: 'contact',
  CONSULTATION: 'consultation',
  HOME_VALUE: 'home-value',
});

export const LeadStatuses = Object.freeze({
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  EMAILED: 'EMAILED',
  CRM_SYNCED: 'CRM_SYNCED',
  FOLLOW_UP: 'FOLLOW_UP',
  CLOSED: 'CLOSED',
});

export const LeadIntentValues = Object.freeze({
  CONTACT: [
    'general-inquiry',
    'schedule-showing',
    'buyer-question',
    'seller-question',
    'Get housing guidance',
    'Evaluate Homes by RCG',
    'Request professional guidance',
  ],
  CONSULTATION: [
    'buying-consultation',
    'selling-consultation',
    'investment-consultation',
    'Get housing guidance',
    'Choose a housing decision path',
    'Prepare to buy',
    'Evaluate investment opportunity',
    'Plan ownership decisions',
    'Compare housing paths during a life change',
    'Complete a housing roadmap',
    'Turn journey context into an action plan',
    'Measure buyer readiness',
    'Analyze investment fit',
    'Request professional guidance',
  ],
  HOME_VALUE: [
    'home-valuation',
    'sell-my-home',
    'market-analysis',
    'Understand home value',
    'Request property valuation',
  ],
});

export const JourneySourceValues = Object.freeze([
  'general',
  'decision-center',
  'buyer',
  'seller',
  'investor',
  'homeowner',
  'life-change',
  'journey',
  'resource',
  'tool',
  'market-report',
  'search',
  'trust',
  'consultation',
  'Contact',
  'Consultation',
  'Home Value',
  'Newsletter',
  'Guide',
  'Market Report',
  'Website',
  'integration-test',
  'qr-code',
  'contact-page',
  'consultation-page',
  'home-value-page',
  'home-page',
]);

export const ConversionTypeValues = Object.freeze([
  'consultation',
  'assessment',
  'home-value',
  'calculator',
  'resource',
  'tool',
  'search',
  'contact',
  'newsletter',
  'event-registration',
]);

export const ConversionEventValues = Object.freeze([
  'consultation_requested',
  'contact_requested',
  'assessment_started',
  'assessment_completed',
  'home_value_requested',
  'calculator_started',
  'calculator_completed',
  'resource_downloaded',
  'guide_download',
  'newsletter_subscribed',
  'search_started',
  'market_report_requested',
  'tool_opened',
  'guide_opened',
  'event_interest_registered',
]);

export const JourneyStageValues = Object.freeze([
  'landing',
  'education',
  'life-change',
  'tools',
  'search',
  'evaluation',
  'awareness',
  'exploration',
  'ready',
  'consultation',
  'client',
  'customer',
  'unknown',
]);

export const DecisionTypeValues = Object.freeze([
  'buyer',
  'seller',
  'investor',
  'life-changes',
  'decision-center',
  'home-value',
  'contact',
  'newsletter',
  'unknown',
]);

export const LeadScoreBandValues = Object.freeze(['Low', 'Medium', 'High', 'Very High']);

function isRecord(value) {
  return (
    value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value))
  );
}

function isTimeline(value) {
  return value === undefined || value === null || (Array.isArray(value) && value.length <= 50);
}

function isScoreReasons(value) {
  return value === undefined || value === null || (Array.isArray(value) && value.length <= 20);
}

function isConsent(value) {
  return isRecord(value);
}

function isAttribution(value) {
  return isRecord(value);
}

const commonLeadSchema = {
  firstName: [Validators.required(), Validators.length({ min: 1, max: 80 })],
  lastName: [Validators.length({ max: 80 })],
  email: [Validators.required(), Validators.email(), Validators.length({ max: 254 })],
  phone: [Validators.phone(), Validators.length({ max: 30 })],
  journeySource: [
    Validators.length({ max: 120 }),
    Validators.optionalEnum(JourneySourceValues, 'Journey source is not allowed.'),
  ],
  currentPage: [Validators.length({ max: 2048 })],
  referringPage: [Validators.length({ max: 2048 })],
  leadIntent: [Validators.length({ max: 2000 })],
  leadScore: [
    Validators.numeric(),
    Validators.custom(
      (value) =>
        value === undefined || value === null || (Number(value) >= 0 && Number(value) <= 100),
      'Value must be between 0 and 100.',
    ),
  ],
  campaign: [Validators.length({ max: 240 })],
  referral: [Validators.length({ max: 500 })],
  notes: [Validators.required(), Validators.length({ min: 1, max: 4000 })],
  recommendedFollowUp: [Validators.length({ max: 2000 })],
  conversionType: [
    Validators.length({ max: 120 }),
    Validators.optionalEnum(ConversionTypeValues, 'Conversion type is not allowed.'),
  ],
  conversionEvent: [
    Validators.length({ max: 120 }),
    Validators.optionalEnum(ConversionEventValues, 'Conversion event is not allowed.'),
  ],
  journeyStage: [
    Validators.length({ max: 120 }),
    Validators.optionalEnum(JourneyStageValues, 'Journey stage is not allowed.'),
  ],
  decisionType: [
    Validators.length({ max: 120 }),
    Validators.optionalEnum(DecisionTypeValues, 'Decision type is not allowed.'),
  ],
  leadScoreBand: [Validators.optionalEnum(LeadScoreBandValues, 'Lead score band is not allowed.')],
  leadContext: [Validators.custom(isRecord, 'Lead context must be an object.')],
  journeyTimeline: [
    Validators.custom(isTimeline, 'Journey timeline must contain no more than 50 events.'),
  ],
  leadScoreReasons: [
    Validators.custom(isScoreReasons, 'Lead score reasons must contain no more than 20 entries.'),
  ],
  visitorId: [Validators.length({ max: 120 })],
  sessionId: [Validators.length({ max: 120 })],
  journeyId: [Validators.length({ max: 120 })],
  propertyRef: [Validators.length({ max: 240 })],
  funnel: [Validators.length({ max: 120 })],
  landingPage: [Validators.length({ max: 2048 })],
  consent: [Validators.custom(isConsent, 'Consent must be an object.')],
  attribution: [Validators.custom(isAttribution, 'Attribution must be an object.')],
  metadata: [Validators.custom(isRecord, 'Metadata must be an object.')],
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
          ? [...commonLeadSchema.leadIntent, Validators.optionalEnum(intentValues)]
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
  const createdAt = timestamp;

  return {
    leadId,
    leadType,
    timestamp,
    requestId: context.requestId,
    correlationId: context.correlationId,
    status: LeadStatuses.RECEIVED,
    firstName: valueOrNull(normalizedRequest.firstName),
    lastName: valueOrNull(normalizedRequest.lastName),
    email: valueOrNull(normalizedRequest.email),
    phone: valueOrNull(normalizedRequest.phone),
    journeySource: valueOrNull(normalizedRequest.journeySource),
    currentPage: valueOrNull(normalizedRequest.currentPage),
    referringPage: valueOrNull(normalizedRequest.referringPage),
    leadIntent: valueOrNull(normalizedRequest.leadIntent),
    leadScore: valueOrNull(normalizedRequest.leadScore),
    leadScoreBand: valueOrNull(normalizedRequest.leadScoreBand),
    leadScoreReasons: normalizedRequest.leadScoreReasons || [],
    campaign: valueOrNull(normalizedRequest.campaign),
    referral: valueOrNull(normalizedRequest.referral),
    notes: valueOrNull(normalizedRequest.notes),
    recommendedFollowUp: valueOrNull(normalizedRequest.recommendedFollowUp),
    conversionType: valueOrNull(normalizedRequest.conversionType),
    conversionEvent: valueOrNull(normalizedRequest.conversionEvent),
    journeyStage: valueOrNull(normalizedRequest.journeyStage),
    decisionType: valueOrNull(normalizedRequest.decisionType),
    leadContext: normalizedRequest.leadContext || {},
    journeyTimeline: normalizedRequest.journeyTimeline || [],
    metadata: {
      ...metadata,
      recommendedFollowUp: valueOrNull(normalizedRequest.recommendedFollowUp),
      conversionType: valueOrNull(normalizedRequest.conversionType),
      conversionEvent: valueOrNull(normalizedRequest.conversionEvent),
      journeyStage: valueOrNull(normalizedRequest.journeyStage),
      decisionType: valueOrNull(normalizedRequest.decisionType),
      referringPage: valueOrNull(normalizedRequest.referringPage),
      leadContext: normalizedRequest.leadContext || {},
      journeyTimeline: normalizedRequest.journeyTimeline || [],
      leadScoreBand: valueOrNull(normalizedRequest.leadScoreBand),
      leadScoreReasons: normalizedRequest.leadScoreReasons || [],
      analyticsContext: buildAnalyticsContext(normalizedRequest),
    },
    idempotencyKey: valueOrNull(normalizedRequest.idempotencyKey ?? context.idempotencyKey),
    provider: null,
    providerStatus: null,
    createdAt,
    updatedAt: createdAt,
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
  const embeddedLead = payload?.lead && typeof payload.lead === 'object' ? payload.lead : {};
  const nameParts = splitName(payload?.name ?? embeddedLead.name);
  const firstName = payload?.firstName ?? embeddedLead.firstName ?? nameParts.firstName;
  const lastName = payload?.lastName ?? embeddedLead.lastName ?? nameParts.lastName;

  return {
    firstName: normalizeString(firstName),
    lastName: normalizeString(lastName),
    email: normalizeEmail(payload?.email ?? embeddedLead.email),
    phone: normalizeString(payload?.phone ?? embeddedLead.phone),
    journeySource: normalizeString(payload?.journeySource ?? embeddedLead.journeySource),
    currentPage: normalizeString(payload?.currentPage ?? embeddedLead.currentPage),
    referringPage: normalizeString(payload?.referringPage ?? embeddedLead.referringPage),
    leadIntent: normalizeString(payload?.leadIntent ?? embeddedLead.leadIntent),
    leadScore: normalizeLeadScore(payload?.leadScore ?? embeddedLead.leadScore),
    campaign: normalizeString(payload?.campaign ?? embeddedLead.campaign),
    referral: normalizeString(payload?.referral ?? payload?.referrer ?? embeddedLead.referral),
    notes: normalizeString(payload?.notes ?? payload?.message ?? embeddedLead.notes),
    recommendedFollowUp: normalizeString(
      payload?.recommendedFollowUp ?? embeddedLead.recommendedFollowUp,
    ),
    conversionType: normalizeString(payload?.conversionType ?? embeddedLead.conversionType),
    conversionEvent: normalizeString(payload?.conversionEvent ?? embeddedLead.conversionEvent),
    journeyStage: normalizeString(payload?.journeyStage ?? embeddedLead.journeyStage),
    decisionType: normalizeString(payload?.decisionType ?? embeddedLead.decisionType),
    leadScoreBand: normalizeString(payload?.leadScoreBand ?? embeddedLead.leadScoreBand),
    leadContext: normalizeStructured(payload?.leadContext ?? embeddedLead.leadContext, {}),
    journeyTimeline: normalizeStructured(
      payload?.journeyTimeline ?? embeddedLead.journeyTimeline,
      [],
    ),
    leadScoreReasons: normalizeStructured(
      payload?.leadScoreReasons ?? embeddedLead.leadScoreReasons,
      [],
    ),
    visitorId: normalizeString(payload?.visitorId ?? embeddedLead.visitorId),
    sessionId: normalizeString(payload?.sessionId ?? embeddedLead.sessionId),
    journeyId: normalizeString(payload?.journeyId ?? embeddedLead.journeyId),
    propertyRef: normalizeString(payload?.propertyRef ?? embeddedLead.propertyRef),
    funnel: normalizeString(payload?.funnel ?? embeddedLead.funnel),
    landingPage: normalizeString(
      payload?.landingPage ??
        embeddedLead.landingPage ??
        payload?.currentPage ??
        embeddedLead.currentPage,
    ),
    consent: normalizeStructured(payload?.consent ?? embeddedLead.consent, {}),
    attribution: normalizeStructured(
      {
        ...normalizeStructured(payload?.attribution ?? embeddedLead.attribution, {}),
        utm_source: normalizeString(
          payload?.utm_source ?? payload?.utm?.source ?? payload?.attribution?.utm_source,
        ),
        utm_medium: normalizeString(
          payload?.utm_medium ?? payload?.utm?.medium ?? payload?.attribution?.utm_medium,
        ),
        utm_campaign: normalizeString(
          payload?.utm_campaign ?? payload?.utm?.campaign ?? payload?.attribution?.utm_campaign,
        ),
        utm_term: normalizeString(
          payload?.utm_term ?? payload?.utm?.term ?? payload?.attribution?.utm_term,
        ),
        utm_content: normalizeString(
          payload?.utm_content ?? payload?.utm?.content ?? payload?.attribution?.utm_content,
        ),
        referrer: normalizeString(payload?.referrer ?? payload?.referral),
        landingPage: normalizeString(
          payload?.landingPage ?? payload?.currentPage ?? embeddedLead.currentPage,
        ),
      },
      {},
    ),
    idempotencyKey: normalizeString(payload?.idempotencyKey ?? embeddedLead.idempotencyKey),
    metadata: normalizeStructured(payload?.metadata ?? embeddedLead.metadata, {}),
  };
}

function buildAnalyticsContext(normalizedRequest) {
  return {
    visitorId: valueOrNull(normalizedRequest.visitorId),
    sessionId: valueOrNull(normalizedRequest.sessionId),
    journeyId: valueOrNull(normalizedRequest.journeyId ?? normalizedRequest.sessionId),
    propertyRef: valueOrNull(normalizedRequest.propertyRef),
    funnel: valueOrNull(normalizedRequest.funnel),
    landingPage: valueOrNull(normalizedRequest.landingPage ?? normalizedRequest.currentPage),
    consent: normalizedRequest.consent || {},
    attribution: normalizedRequest.attribution || {},
  };
}

function normalizeStructured(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function splitName(value) {
  const normalized = normalizeString(value);

  if (typeof normalized !== 'string' || normalized === '') {
    return { firstName: undefined, lastName: undefined };
  }

  const parts = normalized.split(/\s+/u);

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function formatLeadType(leadType) {
  return leadType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function valueOrNull(value) {
  return value === undefined ? null : value;
}
