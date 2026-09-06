export const LeadIntelligenceScoringVersion = '2026-09-05.v1';

export const LeadEngagementLevels = Object.freeze({
  COLD: 'COLD',
  WARM: 'WARM',
  HOT: 'HOT',
});

export const LeadIntentTypes = Object.freeze({
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  SELL_AND_BUY: 'SELL_AND_BUY',
  INVESTOR: 'INVESTOR',
  LANDLORD: 'LANDLORD',
  UNKNOWN: 'UNKNOWN',
});

export const ConversionReadinessLevels = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  READY: 'READY',
});

export const LeadIntelligenceDimensions = Object.freeze({
  BUYER_INTENT: 'BUYER_INTENT',
  SELLER_INTENT: 'SELLER_INTENT',
  SELL_AND_BUY_INTENT: 'SELL_AND_BUY_INTENT',
  INVESTOR_LANDLORD_INTENT: 'INVESTOR_LANDLORD_INTENT',
  ENGAGEMENT: 'ENGAGEMENT',
  CONVERSION_READINESS: 'CONVERSION_READINESS',
});

export const LeadIntelligenceConfig = Object.freeze({
  scoringVersion: LeadIntelligenceScoringVersion,
  scoreRange: Object.freeze({ min: 0, max: 100 }),
  dimensionCaps: Object.freeze({
    [LeadIntelligenceDimensions.BUYER_INTENT]: 100,
    [LeadIntelligenceDimensions.SELLER_INTENT]: 100,
    [LeadIntelligenceDimensions.SELL_AND_BUY_INTENT]: 100,
    [LeadIntelligenceDimensions.INVESTOR_LANDLORD_INTENT]: 100,
    [LeadIntelligenceDimensions.ENGAGEMENT]: 100,
    [LeadIntelligenceDimensions.CONVERSION_READINESS]: 100,
  }),
  dimensionWeights: Object.freeze({
    [LeadIntelligenceDimensions.BUYER_INTENT]: 0.17,
    [LeadIntelligenceDimensions.SELLER_INTENT]: 0.17,
    [LeadIntelligenceDimensions.SELL_AND_BUY_INTENT]: 0.11,
    [LeadIntelligenceDimensions.INVESTOR_LANDLORD_INTENT]: 0.1,
    [LeadIntelligenceDimensions.ENGAGEMENT]: 0.2,
    [LeadIntelligenceDimensions.CONVERSION_READINESS]: 0.25,
  }),
  scoreThresholds: Object.freeze({
    warm: 35,
    hot: 70,
  }),
  conversionReadinessThresholds: Object.freeze({
    medium: 10,
    high: 25,
    ready: 45,
  }),
  intentThresholds: Object.freeze({
    minimumIntentEvidence: 15,
    sellAndBuyIntentEvidence: 25,
  }),
  recencyBuckets: Object.freeze([
    Object.freeze({ maxAgeDays: 7, multiplier: 1, code: 'LAST_7_DAYS' }),
    Object.freeze({ maxAgeDays: 30, multiplier: 0.9, code: 'LAST_30_DAYS' }),
    Object.freeze({ maxAgeDays: 90, multiplier: 0.7, code: 'LAST_90_DAYS' }),
    Object.freeze({ maxAgeDays: Number.POSITIVE_INFINITY, multiplier: 0.45, code: 'OLDER' }),
  ]),
  signals: Object.freeze({
    LEAD_SUBMITTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({ [LeadIntelligenceDimensions.ENGAGEMENT]: 6 }),
    }),
    CONTACT_REQUESTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 10,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 18,
      }),
    }),
    CONSULTATION_REQUESTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.BUYER_INTENT]: 8,
        [LeadIntelligenceDimensions.SELLER_INTENT]: 8,
        [LeadIntelligenceDimensions.INVESTOR_LANDLORD_INTENT]: 6,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 16,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 28,
      }),
    }),
    SHOWING_REQUESTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.BUYER_INTENT]: 20,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 10,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 26,
      }),
    }),
    CMA_REQUESTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 20,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 10,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 24,
      }),
    }),
    HOME_VALUE_REQUESTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 18,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 12,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 24,
      }),
    }),
    PROPERTY_ADDRESS_CAPTURED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 12,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 8,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 12,
      }),
    }),
    PROPERTY_VIEWED: Object.freeze({
      maxOccurrences: 4,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.BUYER_INTENT]: 7,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 4,
      }),
    }),
    NEXT_HOUSE_SEARCH: Object.freeze({
      maxOccurrences: 3,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.BUYER_INTENT]: 14,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 9,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 10,
      }),
    }),
    VALUATION_VIEWED: Object.freeze({
      maxOccurrences: 2,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 12,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 7,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 10,
      }),
    }),
    VALUATION_REQUESTED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 16,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 10,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 18,
      }),
    }),
    EQUITY_ACTIVITY: Object.freeze({
      maxOccurrences: 2,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 9,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 6,
      }),
    }),
    DOWNSIZE_ACTIVITY: Object.freeze({
      maxOccurrences: 2,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 10,
        [LeadIntelligenceDimensions.BUYER_INTENT]: 8,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 6,
      }),
    }),
    MY_NUMBER_ACTIVITY: Object.freeze({
      maxOccurrences: 2,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.SELLER_INTENT]: 8,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 5,
      }),
    }),
    RENTAL_CHECK_ACTIVITY: Object.freeze({
      maxOccurrences: 3,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.INVESTOR_LANDLORD_INTENT]: 12,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 7,
      }),
    }),
    ASSESSMENT_COMPLETED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 8,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 12,
      }),
    }),
    GUIDE_DOWNLOADED: Object.freeze({
      maxOccurrences: 3,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 4,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 4,
      }),
    }),
    NEWSLETTER_SUBSCRIBED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 3,
      }),
    }),
    MARKET_REPORT_REQUESTED: Object.freeze({
      maxOccurrences: 2,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.BUYER_INTENT]: 5,
        [LeadIntelligenceDimensions.SELLER_INTENT]: 5,
        [LeadIntelligenceDimensions.ENGAGEMENT]: 4,
      }),
    }),
    TOOL_OPENED: Object.freeze({
      maxOccurrences: 4,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 3,
      }),
    }),
    EVENT_INTEREST_REGISTERED: Object.freeze({
      maxOccurrences: 1,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 4,
        [LeadIntelligenceDimensions.CONVERSION_READINESS]: 6,
      }),
    }),
    REPEAT_VISIT: Object.freeze({
      maxOccurrences: 3,
      dimensions: Object.freeze({
        [LeadIntelligenceDimensions.ENGAGEMENT]: 5,
      }),
    }),
  }),
});

export function getLeadScoreBand(score) {
  if (score >= 85) return 'Very High';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}
