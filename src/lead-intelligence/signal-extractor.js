function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeSignalName(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '');
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pushSignal(signals, signal, { uniqueValue, occurredAt, source, payload } = {}) {
  signals.push({ signal, uniqueValue, occurredAt, source, payload });
}

function hasAnyTerm(value, terms) {
  return terms.some((term) => value.includes(term));
}

export function extractLeadSignals(lead) {
  const signals = [];
  const leadType = normalizeText(lead.leadType);
  const leadIntent = normalizeText(lead.leadIntent);
  const conversionEvent = normalizeText(lead.conversionEvent);
  const conversionType = normalizeText(lead.conversionType);
  const decisionType = normalizeText(lead.decisionType);
  const consultationType = normalizeText(lead.metadata?.consultationType);

  pushSignal(signals, 'LEAD_SUBMITTED', {
    uniqueValue: lead.leadId,
    occurredAt: lead.timestamp,
    source: 'lead',
  });

  if (leadType === 'contact' || conversionEvent === 'contact_requested') {
    pushSignal(signals, 'CONTACT_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (leadType === 'consultation' || conversionEvent === 'consultation_requested') {
    pushSignal(signals, 'CONSULTATION_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (leadType === 'home-value' || conversionEvent === 'home_value_requested') {
    pushSignal(signals, 'HOME_VALUE_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
    pushSignal(signals, 'VALUATION_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (lead.metadata?.propertyAddress) {
    pushSignal(signals, 'PROPERTY_ADDRESS_CAPTURED', {
      uniqueValue: normalizeText(lead.metadata.propertyAddress),
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (leadIntent === 'schedule-showing') {
    pushSignal(signals, 'SHOWING_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (leadIntent === 'market-analysis') {
    pushSignal(signals, 'CMA_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (conversionEvent === 'newsletter_subscribed') {
    pushSignal(signals, 'NEWSLETTER_SUBSCRIBED', {
      uniqueValue: lead.email,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (conversionEvent === 'event_interest_registered') {
    pushSignal(signals, 'EVENT_INTEREST_REGISTERED', {
      uniqueValue: lead.metadata?.eventSlug || lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (
    ['guide_download', 'resource_downloaded'].includes(conversionEvent) ||
    ['resource', 'guide'].includes(conversionType)
  ) {
    pushSignal(signals, 'GUIDE_DOWNLOADED', {
      uniqueValue: conversionEvent || conversionType || lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (conversionEvent === 'market_report_requested') {
    pushSignal(signals, 'MARKET_REPORT_REQUESTED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  if (conversionEvent === 'tool_opened') {
    pushSignal(signals, 'TOOL_OPENED', {
      uniqueValue: lead.currentPage || lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  const buyerHints = [leadIntent, consultationType, decisionType].join(' ');
  if (hasAnyTerm(buyerHints, ['buy', 'buyer', 'showing'])) {
    pushSignal(signals, 'NEXT_HOUSE_SEARCH', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  const sellerHints = [
    leadIntent,
    consultationType,
    decisionType,
    normalizeText(lead.journeySource),
  ].join(' ');
  if (hasAnyTerm(sellerHints, ['sell', 'seller', 'valuation', 'homeowner'])) {
    pushSignal(signals, 'VALUATION_VIEWED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  const investorHints = [leadIntent, consultationType, decisionType].join(' ');
  if (hasAnyTerm(investorHints, ['invest', 'landlord', 'rental'])) {
    pushSignal(signals, 'RENTAL_CHECK_ACTIVITY', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'lead',
    });
  }

  const leadContext = isObject(lead.leadContext) ? lead.leadContext : {};

  if (leadContext.assessmentCompleted === true) {
    pushSignal(signals, 'ASSESSMENT_COMPLETED', {
      uniqueValue: lead.leadId,
      occurredAt: lead.timestamp,
      source: 'leadContext',
    });
  }

  if (Array.isArray(leadContext.guidesDownloaded)) {
    for (const guideSlug of leadContext.guidesDownloaded) {
      pushSignal(signals, 'GUIDE_DOWNLOADED', {
        uniqueValue: normalizeText(String(guideSlug)),
        occurredAt: lead.timestamp,
        source: 'leadContext',
      });
    }
  }

  if (Array.isArray(leadContext.contentViewed)) {
    for (const contentKey of leadContext.contentViewed) {
      const normalized = normalizeText(String(contentKey));

      if (hasAnyTerm(normalized, ['next-house', 'next_house', 'next home'])) {
        pushSignal(signals, 'NEXT_HOUSE_SEARCH', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }

      if (hasAnyTerm(normalized, ['valuation', 'home-value', 'home_value'])) {
        pushSignal(signals, 'VALUATION_VIEWED', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }

      if (hasAnyTerm(normalized, ['rental-check', 'rental_check'])) {
        pushSignal(signals, 'RENTAL_CHECK_ACTIVITY', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }

      if (hasAnyTerm(normalized, ['equity'])) {
        pushSignal(signals, 'EQUITY_ACTIVITY', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }

      if (hasAnyTerm(normalized, ['downsize'])) {
        pushSignal(signals, 'DOWNSIZE_ACTIVITY', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }

      if (hasAnyTerm(normalized, ['my-number', 'my_number'])) {
        pushSignal(signals, 'MY_NUMBER_ACTIVITY', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }

      if (hasAnyTerm(normalized, ['property', 'listing', 'mls'])) {
        pushSignal(signals, 'PROPERTY_VIEWED', {
          uniqueValue: normalized,
          occurredAt: lead.timestamp,
          source: 'leadContext',
        });
      }
    }
  }

  if (Array.isArray(lead.journeyTimeline)) {
    for (const timelineEvent of lead.journeyTimeline) {
      if (!isObject(timelineEvent)) continue;

      const eventName = normalizeText(timelineEvent.event);
      const path = normalizeText(timelineEvent.path);
      const normalizedOccurredAt = timelineEvent.occurredAt || lead.timestamp;
      const uniqueValue = `${eventName}:${path}`;

      if (eventName === 'assessment_completed') {
        pushSignal(signals, 'ASSESSMENT_COMPLETED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'consultation_requested') {
        pushSignal(signals, 'CONSULTATION_REQUESTED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'home_value_requested') {
        pushSignal(signals, 'HOME_VALUE_REQUESTED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'contact_requested') {
        pushSignal(signals, 'CONTACT_REQUESTED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'search_started' || eventName === 'next_house_search') {
        pushSignal(signals, 'NEXT_HOUSE_SEARCH', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'property_viewed') {
        pushSignal(signals, 'PROPERTY_VIEWED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'valuation_viewed') {
        pushSignal(signals, 'VALUATION_VIEWED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'rental_check_started') {
        pushSignal(signals, 'RENTAL_CHECK_ACTIVITY', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'equity_tool_opened') {
        pushSignal(signals, 'EQUITY_ACTIVITY', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'downsize_tool_opened') {
        pushSignal(signals, 'DOWNSIZE_ACTIVITY', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'my_number_tool_opened') {
        pushSignal(signals, 'MY_NUMBER_ACTIVITY', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'guide_download') {
        pushSignal(signals, 'GUIDE_DOWNLOADED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'market_report_requested') {
        pushSignal(signals, 'MARKET_REPORT_REQUESTED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (eventName === 'tool_opened') {
        pushSignal(signals, 'TOOL_OPENED', {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }

      if (
        eventName.startsWith('funnel_') ||
        eventName.includes('inherited_home') ||
        eventName.includes('renovate_or_move') ||
        eventName.includes('more_space')
      ) {
        const extensionSignal = `EXTENSION_${normalizeSignalName(eventName)}`;
        pushSignal(signals, extensionSignal, {
          uniqueValue,
          occurredAt: normalizedOccurredAt,
          source: 'journeyTimeline',
          payload: timelineEvent,
        });
      }
    }
  }

  const uniqueJourneyPages = new Set(
    (lead.journeyTimeline || [])
      .map((item) => normalizeText(item?.path))
      .filter((value) => value.length > 0),
  );

  if (uniqueJourneyPages.size > 1) {
    for (const page of uniqueJourneyPages) {
      pushSignal(signals, 'REPEAT_VISIT', {
        uniqueValue: page,
        occurredAt: lead.timestamp,
        source: 'journeyTimeline',
      });
    }
  }

  return signals;
}
