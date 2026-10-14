import { CanonicalEventNames, eventConversionSignificance } from './event-taxonomy.js';

export const FunnelStages = Object.freeze({
  VISITOR: 'VISITOR',
  ENGAGED: 'ENGAGED',
  PROPERTY_IDENTIFIED: 'PROPERTY_IDENTIFIED',
  LEAD: 'LEAD',
  VALUE_VIEWED: 'VALUE_VIEWED',
  HIGH_INTENT_ACTION: 'HIGH_INTENT_ACTION',
  CONVERTED: 'CONVERTED',
});

const stageByEvent = Object.freeze({
  [CanonicalEventNames.VISITOR_ARRIVED]: FunnelStages.VISITOR,
  [CanonicalEventNames.LANDING_PAGE_VIEWED]: FunnelStages.ENGAGED,
  [CanonicalEventNames.FUNNEL_STARTED]: FunnelStages.ENGAGED,
  [CanonicalEventNames.ADDRESS_ENTERED]: FunnelStages.ENGAGED,
  [CanonicalEventNames.PROPERTY_RESOLVED]: FunnelStages.PROPERTY_IDENTIFIED,
  [CanonicalEventNames.PROPERTY_VIEWED]: FunnelStages.PROPERTY_IDENTIFIED,
  [CanonicalEventNames.DECISION_QUESTION_ANSWERED]: FunnelStages.ENGAGED,
  [CanonicalEventNames.LEAD_SUBMITTED]: FunnelStages.LEAD,
  [CanonicalEventNames.VALUATION_REVEALED]: FunnelStages.VALUE_VIEWED,
  [CanonicalEventNames.HOME_VALUE_REQUESTED]: FunnelStages.LEAD,
  [CanonicalEventNames.SEARCH_STARTED]: FunnelStages.ENGAGED,
  [CanonicalEventNames.CONTACT_REQUESTED]: FunnelStages.HIGH_INTENT_ACTION,
  [CanonicalEventNames.CONSULTATION_REQUESTED]: FunnelStages.HIGH_INTENT_ACTION,
  [CanonicalEventNames.CMA_REQUESTED]: FunnelStages.HIGH_INTENT_ACTION,
  [CanonicalEventNames.SHOWING_REQUESTED]: FunnelStages.HIGH_INTENT_ACTION,
  [CanonicalEventNames.CONVERSION_RECORDED]: FunnelStages.CONVERTED,
});

export function deriveFunnelStage(eventName) {
  return stageByEvent[eventName] ?? FunnelStages.ENGAGED;
}

export function classifyConversion(eventName) {
  const significance = eventConversionSignificance(eventName);

  if (significance === 'micro') {
    return 'MICRO';
  }

  if (significance === 'lead') {
    return 'LEAD';
  }

  if (significance === 'high-intent') {
    return 'HIGH_INTENT';
  }

  if (significance === 'business') {
    return 'BUSINESS';
  }

  return 'NONE';
}
