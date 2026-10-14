import { normalizeEmail } from '../../../leads/lead-model.js';

const LEAD_EVENT_TO_TAG = Object.freeze({
  'lead.created': 'lead_created',
  'lead.updated': 'lead_updated',
  'lead.qualified': 'lead_qualified',
  lead_created: 'lead_created',
  lead_updated: 'lead_updated',
  lead_qualified: 'lead_qualified',
  property_search: 'property_search',
  property_search_started: 'property_search_started',
  property_search_succeeded: 'property_search_succeeded',
  property_search_failed: 'property_search_failed',
  property_search_viewed: 'property_viewed',
  property_viewed: 'property_viewed',
  property_revisited: 'property_revisited',
  property_resolved: 'property_resolved',
  valuation_requested: 'valuation_requested',
  valuation_viewed: 'valuation_viewed',
  funnel_started: 'funnel_started',
  funnel_step_completed: 'funnel_step_completed',
  funnel_completed: 'funnel_completed',
  cma_requested: 'cma_requested',
  showing_requested: 'showing_requested',
  consultation_requested: 'consultation_requested',
  listing_started: 'listing_started',
  offer_submitted: 'offer_submitted',
  deal_under_contract: 'deal_under_contract',
  deal_closed: 'deal_closed',
  owner_record_viewed: 'owner_record_viewed',
  value_reveal_started: 'value_reveal_started',
  value_revealed: 'value_revealed',
  value_reveal_failed: 'value_reveal_failed',
});

function getIntent(lead = {}) {
  return lead.leadContext?.decisionJourney || lead.decisionType || lead.leadIntent || null;
}

function toDealType(lead = {}) {
  const intent = String(getIntent(lead) || '').toLowerCase();
  if (intent.includes('seller') || intent.includes('sell') || intent.includes('listing')) {
    return 'seller';
  }

  if (intent.includes('buyer') || intent.includes('buy')) {
    return 'buyer';
  }

  return null;
}

function buildContactSource(lead = {}) {
  return lead.journeySource || lead.referral || lead.utmSource || 'HomesByRCG';
}

function normalizePhone(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/[^0-9+]/gu, '');
  return cleaned.length > 0 ? cleaned : null;
}

function compactRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    ),
  );
}

export function toBoldTrailContactPayload(lead = {}) {
  const funnel = lead.funnel || lead.leadContext?.decisionJourney || null;
  const tags = [
    'HomesByRCG',
    lead.leadType,
    funnel,
    lead.leadScoreBand,
    LEAD_EVENT_TO_TAG['lead.created'],
  ].filter(Boolean);

  return compactRecord({
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: normalizeEmail(lead.email),
    cell_phone_1: normalizePhone(lead.phone),
    source: buildContactSource(lead),
    deal_type: toDealType(lead),
    tags,
  });
}

export function buildLeadNote(lead = {}, { reason = 'lead_sync' } = {}) {
  const summary = compactRecord({
    reason,
    leadId: lead.leadId,
    leadType: lead.leadType,
    leadStatus: lead.status,
    leadIntent: lead.leadIntent,
    leadScore: lead.leadScore,
    leadScoreBand: lead.leadScoreBand,
    visitorId: lead.visitorId,
    sessionId: lead.sessionId,
    journeyId: lead.journeyId,
    funnel: lead.funnel,
    journeySource: lead.journeySource,
    landingPage: lead.landingPage,
    propertyRef: lead.property?.propertyRef,
    attribution: compactRecord({
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      fbclid: lead.fbclid,
      gclid: lead.gclid,
      msclkid: lead.msclkid,
    }),
    consent: lead.consent || null,
  });

  return JSON.stringify(summary);
}

export function toBoldTrailEventTags(event = {}) {
  const normalized = String(event.eventName || event.event || '')
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/gu, '_');

  const dotted = normalized.replace(/_/gu, '.');

  const mapped = LEAD_EVENT_TO_TAG[dotted] || LEAD_EVENT_TO_TAG[normalized] || normalized;

  return ['HomesByRCG', 'event_sync', mapped].filter(Boolean);
}

export function buildEventNote(event = {}, { lead } = {}) {
  const payload = compactRecord({
    reason: 'event_sync',
    eventId: event.eventId,
    event: event.eventName || event.event,
    occurredAt: event.occurredAt || event.timestamp,
    visitorId: event.visitorId,
    sessionId: event.sessionId,
    journeyId: event.journeyId,
    correlationId: event.correlationId,
    funnel: event.funnel,
    landingPage: event.landingPage,
    propertyRef: event.properties?.propertyRef,
    leadId: lead?.leadId || event.properties?.leadId,
    attribution: event.attribution || null,
    properties: event.properties || null,
  });

  return JSON.stringify(payload);
}

export function findEventLeadIdentifier(event = {}) {
  if (typeof event.properties?.leadId === 'string' && event.properties.leadId.trim()) {
    return event.properties.leadId.trim();
  }

  return null;
}
