import { createHash } from 'node:crypto';

import { nowIso } from '../shared/time.js';
import { emitAnalyticsMetric } from './emf-metrics.js';
import { CanonicalEventNames } from './event-taxonomy.js';
import { normalizeAnalyticsEventSafe, sanitizeMetadata } from './analytics-validation.js';

export class AnalyticsService {
  constructor({ repository }) {
    this.repository = repository;
  }

  async acceptEvent(payload, { context, logger }) {
    const event = normalizeAnalyticsEventSafe(payload, {
      context,
      idempotencyKey: context.idempotencyKey,
    });
    const withAttribution = await this.applyAttributionContext(event);
    const outcome = await this.repository.createEvent(withAttribution);

    emitMetricForEvent({ event: outcome.event, duplicate: outcome.duplicate, context });

    logger.info(outcome.duplicate ? 'analytics_event_duplicate' : 'analytics_event_accepted', {
      eventId: outcome.event?.eventId ?? withAttribution.eventId,
      eventName: withAttribution.eventName,
      eventFamily: withAttribution.family,
      journeyId: withAttribution.journeyId,
      leadId: withAttribution.leadId,
      funnel: withAttribution.funnel,
      duplicate: outcome.duplicate,
    });

    return outcome;
  }

  async trackLeadLifecycle({ lead, context, logger }) {
    const analyticsContext = lead.metadata?.analyticsContext ?? {};
    const eventName = deriveLeadEventName(lead);

    const payload = {
      eventId: deterministicEventId([
        context.idempotencyKey,
        lead.leadId,
        eventName,
        analyticsContext.journeyId,
      ]),
      eventName,
      occurredAt: lead.createdAt ?? nowIso(),
      visitorId: analyticsContext.visitorId,
      sessionId: analyticsContext.sessionId,
      journeyId: analyticsContext.journeyId,
      leadId: lead.leadId,
      funnel: analyticsContext.funnel ?? lead.leadType,
      landingPage: analyticsContext.landingPage ?? lead.currentPage,
      propertyRef: analyticsContext.propertyRef,
      attribution: analyticsContext.attribution,
      consent: analyticsContext.consent,
      metadata: sanitizeMetadata({
        leadType: lead.leadType,
        conversionEvent: lead.conversionEvent,
      }),
    };

    try {
      await this.acceptEvent(payload, { context, logger });
    } catch (error) {
      logger.warn('analytics_tracking_failed', {
        leadId: lead.leadId,
        error: {
          name: error.name,
          message: error.message,
        },
      });
    }
  }

  async applyAttributionContext(event) {
    if (!event.journeyId) {
      return {
        ...event,
        attribution: {
          firstTouch: sanitizeAttribution(event.attribution),
          lastTouch: sanitizeAttribution(event.attribution),
        },
      };
    }

    const earliest = await this.repository.findJourneyEvents(event.journeyId, {
      scanIndexForward: true,
      limit: 1,
    });
    const latest = await this.repository.findJourneyEvents(event.journeyId, {
      scanIndexForward: false,
      limit: 1,
    });

    const currentTouch = sanitizeAttribution(event.attribution);
    const firstTouch =
      earliest[0]?.attribution?.firstTouch ?? earliest[0]?.attribution?.lastTouch ?? currentTouch;
    const lastTouch = hasAttribution(currentTouch)
      ? currentTouch
      : (latest[0]?.attribution?.lastTouch ?? {});

    return {
      ...event,
      attribution: {
        firstTouch,
        lastTouch,
      },
    };
  }
}

function deriveLeadEventName(lead) {
  if (lead.conversionEvent) {
    return lead.conversionEvent;
  }

  if (lead.leadType === 'home-value') {
    return CanonicalEventNames.HOME_VALUE_REQUESTED;
  }

  return CanonicalEventNames.LEAD_SUBMITTED;
}

function deterministicEventId(parts) {
  const seed = parts.filter(Boolean).join('|');

  if (!seed) {
    return undefined;
  }

  return createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

function emitMetricForEvent({ event, duplicate, context }) {
  emitAnalyticsMetric({
    metricName: duplicate ? 'EventDuplicate' : 'EventAccepted',
    environment: context.environment,
    serviceName: context.serviceName,
    family: event.family,
  });

  if (event.eventName === CanonicalEventNames.FUNNEL_STARTED) {
    emitAnalyticsMetric({
      metricName: 'FunnelStarted',
      environment: context.environment,
      serviceName: context.serviceName,
      family: event.family,
    });
  }

  if (event.eventName === CanonicalEventNames.CONVERSION_RECORDED) {
    emitAnalyticsMetric({
      metricName: 'FunnelCompleted',
      environment: context.environment,
      serviceName: context.serviceName,
      family: event.family,
    });
  }

  if (event.eventName === CanonicalEventNames.PROPERTY_RESOLVED) {
    emitAnalyticsMetric({
      metricName: 'PropertyResolved',
      environment: context.environment,
      serviceName: context.serviceName,
      family: event.family,
    });
  }

  if (event.eventName === CanonicalEventNames.LEAD_SUBMITTED) {
    emitAnalyticsMetric({
      metricName: 'LeadCreated',
      environment: context.environment,
      serviceName: context.serviceName,
      family: event.family,
    });
  }

  if (event.eventName === CanonicalEventNames.VALUATION_REVEALED) {
    emitAnalyticsMetric({
      metricName: 'ValuationViewed',
      environment: context.environment,
      serviceName: context.serviceName,
      family: event.family,
    });
  }

  if (
    [
      CanonicalEventNames.CONTACT_REQUESTED,
      CanonicalEventNames.CONSULTATION_REQUESTED,
      CanonicalEventNames.CMA_REQUESTED,
      CanonicalEventNames.SHOWING_REQUESTED,
    ].includes(event.eventName)
  ) {
    emitAnalyticsMetric({
      metricName: 'HighIntentAction',
      environment: context.environment,
      serviceName: context.serviceName,
      family: event.family,
    });
  }
}

function sanitizeAttribution(attribution = {}) {
  if (!attribution || typeof attribution !== 'object') {
    return {};
  }

  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_term: attribution.utm_term,
    utm_content: attribution.utm_content,
    referrer: attribution.referrer,
    landingPage: attribution.landingPage,
  };
}

function hasAttribution(attribution = {}) {
  return Object.values(attribution).some((value) => Boolean(value));
}
