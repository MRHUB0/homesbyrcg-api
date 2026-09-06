export const EventFamilies = Object.freeze({
  SESSION: 'SESSION',
  FUNNEL: 'FUNNEL',
  PROPERTY: 'PROPERTY',
  LEAD: 'LEAD',
  VALUATION: 'VALUATION',
  SEARCH: 'SEARCH',
  ENGAGEMENT: 'ENGAGEMENT',
  CONSULTATION: 'CONSULTATION',
  CMA: 'CMA',
  SHOWING: 'SHOWING',
  CONVERSION: 'CONVERSION',
});

export const CanonicalEventNames = Object.freeze({
  VISITOR_ARRIVED: 'visitor_arrived',
  LANDING_PAGE_VIEWED: 'landing_page_viewed',
  FUNNEL_STARTED: 'funnel_started',
  ADDRESS_ENTERED: 'address_entered',
  PROPERTY_RESOLVED: 'property_resolved',
  PROPERTY_VIEWED: 'property_viewed',
  DECISION_QUESTION_ANSWERED: 'decision_question_answered',
  LEAD_SUBMITTED: 'lead_submitted',
  VALUATION_REVEALED: 'valuation_revealed',
  SEARCH_STARTED: 'search_started',
  CONTACT_REQUESTED: 'contact_requested',
  CONSULTATION_REQUESTED: 'consultation_requested',
  CMA_REQUESTED: 'cma_requested',
  SHOWING_REQUESTED: 'showing_requested',
  CONVERSION_RECORDED: 'conversion_recorded',
  GUIDE_DOWNLOADED: 'guide_download',
  NEWSLETTER_SUBSCRIBED: 'newsletter_subscribed',
  TOOL_OPENED: 'tool_opened',
  EVENT_INTEREST_REGISTERED: 'event_interest_registered',
  HOME_VALUE_REQUESTED: 'home_value_requested',
  MARKET_REPORT_REQUESTED: 'market_report_requested',
});

const taxonomy = Object.freeze({
  [CanonicalEventNames.VISITOR_ARRIVED]: {
    family: EventFamilies.SESSION,
    requiredFields: ['visitorId'],
    conversionSignificance: 'none',
  },
  [CanonicalEventNames.LANDING_PAGE_VIEWED]: {
    family: EventFamilies.ENGAGEMENT,
    requiredFields: ['landingPage'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.FUNNEL_STARTED]: {
    family: EventFamilies.FUNNEL,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.ADDRESS_ENTERED]: {
    family: EventFamilies.PROPERTY,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.PROPERTY_RESOLVED]: {
    family: EventFamilies.PROPERTY,
    requiredFields: ['propertyRef'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.PROPERTY_VIEWED]: {
    family: EventFamilies.PROPERTY,
    requiredFields: ['propertyRef'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.DECISION_QUESTION_ANSWERED]: {
    family: EventFamilies.FUNNEL,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.LEAD_SUBMITTED]: {
    family: EventFamilies.LEAD,
    requiredFields: ['leadId'],
    conversionSignificance: 'lead',
  },
  [CanonicalEventNames.VALUATION_REVEALED]: {
    family: EventFamilies.VALUATION,
    requiredFields: ['leadId'],
    conversionSignificance: 'lead',
  },
  [CanonicalEventNames.SEARCH_STARTED]: {
    family: EventFamilies.SEARCH,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.CONTACT_REQUESTED]: {
    family: EventFamilies.CONSULTATION,
    requiredFields: ['leadId'],
    conversionSignificance: 'high-intent',
  },
  [CanonicalEventNames.CONSULTATION_REQUESTED]: {
    family: EventFamilies.CONSULTATION,
    requiredFields: ['leadId'],
    conversionSignificance: 'high-intent',
  },
  [CanonicalEventNames.CMA_REQUESTED]: {
    family: EventFamilies.CMA,
    requiredFields: ['leadId'],
    conversionSignificance: 'high-intent',
  },
  [CanonicalEventNames.SHOWING_REQUESTED]: {
    family: EventFamilies.SHOWING,
    requiredFields: ['leadId'],
    conversionSignificance: 'high-intent',
  },
  [CanonicalEventNames.CONVERSION_RECORDED]: {
    family: EventFamilies.CONVERSION,
    requiredFields: ['leadId'],
    conversionSignificance: 'business',
  },
  [CanonicalEventNames.GUIDE_DOWNLOADED]: {
    family: EventFamilies.ENGAGEMENT,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.NEWSLETTER_SUBSCRIBED]: {
    family: EventFamilies.ENGAGEMENT,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.TOOL_OPENED]: {
    family: EventFamilies.ENGAGEMENT,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
  [CanonicalEventNames.EVENT_INTEREST_REGISTERED]: {
    family: EventFamilies.ENGAGEMENT,
    requiredFields: ['leadId'],
    conversionSignificance: 'lead',
  },
  [CanonicalEventNames.HOME_VALUE_REQUESTED]: {
    family: EventFamilies.VALUATION,
    requiredFields: ['leadId'],
    conversionSignificance: 'lead',
  },
  [CanonicalEventNames.MARKET_REPORT_REQUESTED]: {
    family: EventFamilies.ENGAGEMENT,
    requiredFields: ['funnel'],
    conversionSignificance: 'micro',
  },
});

export const SupportedEventNames = Object.freeze(Object.keys(taxonomy));

export function eventDefinition(eventName) {
  return taxonomy[eventName] ?? null;
}

export function eventFamily(eventName) {
  return eventDefinition(eventName)?.family ?? EventFamilies.ENGAGEMENT;
}

export function eventConversionSignificance(eventName) {
  return eventDefinition(eventName)?.conversionSignificance ?? 'none';
}
