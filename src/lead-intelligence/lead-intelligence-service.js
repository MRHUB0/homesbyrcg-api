import { createHash } from 'node:crypto';

import { nowIso } from '../shared/time.js';
import { extractLeadSignals } from './signal-extractor.js';
import {
  ConversionReadinessLevels,
  LeadEngagementLevels,
  LeadIntentTypes,
  LeadIntelligenceConfig,
  LeadIntelligenceDimensions,
  getLeadScoreBand,
} from './scoring-config.js';

const signalToIntentHints = Object.freeze({
  BUYER: new Set(['NEXT_HOUSE_SEARCH', 'PROPERTY_VIEWED', 'SHOWING_REQUESTED']),
  SELLER: new Set([
    'HOME_VALUE_REQUESTED',
    'VALUATION_REQUESTED',
    'VALUATION_VIEWED',
    'PROPERTY_ADDRESS_CAPTURED',
    'CMA_REQUESTED',
  ]),
  INVESTOR: new Set(['RENTAL_CHECK_ACTIVITY']),
});

function createDimensionScoreMap() {
  return {
    [LeadIntelligenceDimensions.BUYER_INTENT]: 0,
    [LeadIntelligenceDimensions.SELLER_INTENT]: 0,
    [LeadIntelligenceDimensions.SELL_AND_BUY_INTENT]: 0,
    [LeadIntelligenceDimensions.INVESTOR_LANDLORD_INTENT]: 0,
    [LeadIntelligenceDimensions.ENGAGEMENT]: 0,
    [LeadIntelligenceDimensions.CONVERSION_READINESS]: 0,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function normalizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getRecencyBucket(ageDays, config) {
  return config.recencyBuckets.find((bucket) => ageDays <= bucket.maxAgeDays);
}

function getAgeDays(occurredAtDate, asOfDate) {
  const delta = asOfDate.getTime() - occurredAtDate.getTime();
  if (delta <= 0) return 0;
  return delta / (24 * 60 * 60 * 1000);
}

function getScoredSignalIdentity(signal) {
  return `${signal.signal}|${signal.uniqueValue ?? 'lead'}`;
}

function getSignalLabel(signalName) {
  return signalName
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildSourceFingerprint(lead) {
  const canonicalInput = {
    leadId: lead.leadId,
    leadType: lead.leadType,
    timestamp: lead.timestamp,
    leadIntent: lead.leadIntent,
    conversionType: lead.conversionType,
    conversionEvent: lead.conversionEvent,
    decisionType: lead.decisionType,
    journeySource: lead.journeySource,
    currentPage: lead.currentPage,
    metadata: lead.metadata || {},
    leadContext: lead.leadContext || {},
    journeyTimeline: lead.journeyTimeline || [],
  };
  return createHash('sha256').update(JSON.stringify(canonicalInput)).digest('hex');
}

export class LeadIntelligenceService {
  constructor({ config = LeadIntelligenceConfig } = {}) {
    this.config = config;
  }

  calculate(lead, { asOf = nowIso() } = {}) {
    return this.scoreLead(lead, { asOf, mode: 'calculated' });
  }

  recompute(lead, { asOf = nowIso() } = {}) {
    return this.scoreLead(lead, { asOf, mode: 'recalculated' });
  }

  scoreLead(lead, { asOf, mode }) {
    const asOfDate = normalizeDate(asOf) ?? new Date();
    const dimensionScores = createDimensionScoreMap();
    const rawSignals = extractLeadSignals(lead);
    const signalRules = this.config.signals;
    const seenIdentities = new Set();
    const signalOccurrenceCounts = new Map();
    const signalSummaries = new Map();
    const dimensionWeights = this.config.dimensionWeights;
    const scoreRange = this.config.scoreRange;

    rawSignals
      .slice()
      .sort((left, right) => {
        const leftDate = normalizeDate(left.occurredAt) ?? new Date(0);
        const rightDate = normalizeDate(right.occurredAt) ?? new Date(0);
        return leftDate.getTime() - rightDate.getTime();
      })
      .forEach((observed) => {
        const signalRule = signalRules[observed.signal];
        if (!signalRule) return;

        const identity = getScoredSignalIdentity(observed);
        if (seenIdentities.has(identity)) return;
        seenIdentities.add(identity);

        const currentCount = signalOccurrenceCounts.get(observed.signal) ?? 0;
        if (currentCount >= signalRule.maxOccurrences) return;
        signalOccurrenceCounts.set(observed.signal, currentCount + 1);

        const occurredAtDate =
          normalizeDate(observed.occurredAt) ?? normalizeDate(lead.timestamp) ?? asOfDate;
        const ageDays = getAgeDays(occurredAtDate, asOfDate);
        const recencyBucket = getRecencyBucket(ageDays, this.config);
        const recencyMultiplier = recencyBucket.multiplier;

        const dimensionContribution = {};
        let weightedContribution = 0;

        for (const [dimension, points] of Object.entries(signalRule.dimensions)) {
          const scoredPoints = round(points * recencyMultiplier);
          const nextDimensionValue = clamp(
            dimensionScores[dimension] + scoredPoints,
            scoreRange.min,
            this.config.dimensionCaps[dimension],
          );
          const appliedPoints = round(nextDimensionValue - dimensionScores[dimension]);
          dimensionScores[dimension] = nextDimensionValue;
          dimensionContribution[dimension] = appliedPoints;
          weightedContribution += appliedPoints * (dimensionWeights[dimension] ?? 0);
        }

        const existingSummary = signalSummaries.get(observed.signal) || {
          signal: observed.signal,
          label: getSignalLabel(observed.signal),
          occurrences: 0,
          contribution: 0,
          recencyBuckets: [],
          dimensions: createDimensionScoreMap(),
          sources: [],
        };

        existingSummary.occurrences += 1;
        existingSummary.contribution = round(existingSummary.contribution + weightedContribution);
        existingSummary.recencyBuckets.push(recencyBucket.code);
        existingSummary.sources.push(observed.source || 'lead');

        for (const [dimension, points] of Object.entries(dimensionContribution)) {
          existingSummary.dimensions[dimension] = round(
            (existingSummary.dimensions[dimension] ?? 0) + points,
          );
        }

        signalSummaries.set(observed.signal, existingSummary);
      });

    const buyerEvidence = dimensionScores[LeadIntelligenceDimensions.BUYER_INTENT];
    const sellerEvidence = dimensionScores[LeadIntelligenceDimensions.SELLER_INTENT];
    const conversionEvidence = dimensionScores[LeadIntelligenceDimensions.CONVERSION_READINESS];

    const hasStrongBuyerSignal = hasStrongSignal(signalSummaries, signalToIntentHints.BUYER);
    const hasStrongSellerSignal = hasStrongSignal(signalSummaries, signalToIntentHints.SELLER);

    if (hasStrongBuyerSignal && hasStrongSellerSignal) {
      const sellAndBuyPoints = Math.min(buyerEvidence, sellerEvidence);
      dimensionScores[LeadIntelligenceDimensions.SELL_AND_BUY_INTENT] = clamp(
        sellAndBuyPoints,
        scoreRange.min,
        this.config.dimensionCaps[LeadIntelligenceDimensions.SELL_AND_BUY_INTENT],
      );
    }

    const leadScore = clamp(
      round(
        Object.entries(dimensionScores).reduce(
          (total, [dimension, value]) => total + value * (dimensionWeights[dimension] ?? 0),
          0,
        ),
      ),
      scoreRange.min,
      scoreRange.max,
    );

    const engagementLevel = classifyEngagement(leadScore, this.config);
    const conversionReadiness = classifyConversionReadiness(conversionEvidence, this.config);
    const { primaryIntent, secondaryIntent } = classifyIntent(dimensionScores, this.config);

    const orderedSignals = Array.from(signalSummaries.values())
      .sort((left, right) => right.contribution - left.contribution)
      .map((signal) => ({
        signal: signal.signal,
        label: signal.label,
        occurrences: signal.occurrences,
        contribution: signal.contribution,
        dimensions: signal.dimensions,
        recencyBuckets: [...new Set(signal.recencyBuckets)],
        sources: [...new Set(signal.sources)],
      }));

    const topReasons = orderedSignals.slice(0, 5).map((signal) => ({
      id: signal.signal,
      label: signal.label,
      points: signal.contribution,
    }));

    return {
      mode,
      leadId: lead.leadId,
      scoringVersion: this.config.scoringVersion,
      sourceFingerprint: buildSourceFingerprint(lead),
      scoreRange: this.config.scoreRange,
      leadScore,
      leadScoreBand: getLeadScoreBand(leadScore),
      engagementLevel,
      primaryIntent,
      secondaryIntent,
      conversionReadiness,
      dimensionScores,
      signals: orderedSignals,
      lastScoredAt: asOfDate.toISOString(),
      leadScoreReasons: topReasons,
    };
  }
}

function hasStrongSignal(signalSummaries, signalSet) {
  for (const signalName of signalSet) {
    const summary = signalSummaries.get(signalName);
    if (summary && summary.occurrences > 0) {
      return true;
    }
  }
  return false;
}

function classifyEngagement(leadScore, config) {
  if (leadScore >= config.scoreThresholds.hot) return LeadEngagementLevels.HOT;
  if (leadScore >= config.scoreThresholds.warm) return LeadEngagementLevels.WARM;
  return LeadEngagementLevels.COLD;
}

function classifyConversionReadiness(conversionEvidence, config) {
  if (conversionEvidence >= config.conversionReadinessThresholds.ready) {
    return ConversionReadinessLevels.READY;
  }
  if (conversionEvidence >= config.conversionReadinessThresholds.high) {
    return ConversionReadinessLevels.HIGH;
  }
  if (conversionEvidence >= config.conversionReadinessThresholds.medium) {
    return ConversionReadinessLevels.MEDIUM;
  }
  return ConversionReadinessLevels.LOW;
}

function classifyIntent(dimensionScores, config) {
  const buyer = dimensionScores[LeadIntelligenceDimensions.BUYER_INTENT];
  const seller = dimensionScores[LeadIntelligenceDimensions.SELLER_INTENT];
  const sellAndBuy = dimensionScores[LeadIntelligenceDimensions.SELL_AND_BUY_INTENT];
  const investor = dimensionScores[LeadIntelligenceDimensions.INVESTOR_LANDLORD_INTENT];

  if (
    sellAndBuy >= config.intentThresholds.sellAndBuyIntentEvidence &&
    buyer >= config.intentThresholds.sellAndBuyIntentEvidence &&
    seller >= config.intentThresholds.sellAndBuyIntentEvidence
  ) {
    return {
      primaryIntent: LeadIntentTypes.SELL_AND_BUY,
      secondaryIntent:
        investor >= config.intentThresholds.minimumIntentEvidence
          ? LeadIntentTypes.INVESTOR
          : LeadIntentTypes.UNKNOWN,
    };
  }

  const ranked = [
    { intent: LeadIntentTypes.BUYER, value: buyer },
    { intent: LeadIntentTypes.SELLER, value: seller },
    { intent: LeadIntentTypes.INVESTOR, value: investor },
    { intent: LeadIntentTypes.LANDLORD, value: investor },
  ].sort((left, right) => right.value - left.value);

  const primary =
    ranked[0].value >= config.intentThresholds.minimumIntentEvidence
      ? ranked[0].intent
      : LeadIntentTypes.UNKNOWN;
  const secondary =
    ranked[1].value >= config.intentThresholds.minimumIntentEvidence
      ? ranked[1].intent
      : LeadIntentTypes.UNKNOWN;

  return {
    primaryIntent: primary,
    secondaryIntent: primary === secondary ? LeadIntentTypes.UNKNOWN : secondary,
  };
}
