import assert from 'node:assert/strict';
import test from 'node:test';

import { ContactService } from '../src/contact/contact-service.js';
import { LeadIntelligenceService } from '../src/lead-intelligence/lead-intelligence-service.js';
import {
  ConversionReadinessLevels,
  LeadEngagementLevels,
  LeadIntentTypes,
  LeadIntelligenceScoringVersion,
} from '../src/lead-intelligence/scoring-config.js';
import { MockLeadProvider } from '../src/providers/lead-provider.js';
import { InMemoryLeadIntelligenceRepository } from '../src/lead-intelligence/index.js';
import { LeadIntelligenceMetrics } from '../src/lead-intelligence/lead-intelligence-metrics.js';
import { InMemoryLeadRepository } from '../src/repositories/lead-repository.js';

const scoringService = new LeadIntelligenceService();

function createLead(overrides = {}) {
  return {
    leadId: overrides.leadId || 'lead-1',
    leadType: overrides.leadType || 'lead',
    timestamp: overrides.timestamp || '2026-09-01T12:00:00.000Z',
    requestId: 'request-1',
    correlationId: 'correlation-1',
    status: 'RECEIVED',
    firstName: 'Test',
    lastName: 'Lead',
    email: 'test@example.com',
    phone: '+1 555 000 0000',
    journeySource: overrides.journeySource || 'general',
    currentPage: overrides.currentPage || '/contact',
    referringPage: null,
    leadIntent: overrides.leadIntent || 'general-inquiry',
    leadScore: null,
    leadScoreBand: null,
    leadScoreReasons: [],
    engagementLevel: null,
    primaryIntent: null,
    secondaryIntent: null,
    conversionReadiness: null,
    lastScoredAt: null,
    scoringVersion: null,
    intelligenceSignals: [],
    campaign: null,
    referral: null,
    notes: overrides.notes || 'Need information.',
    recommendedFollowUp: null,
    conversionType: overrides.conversionType || null,
    conversionEvent: overrides.conversionEvent || null,
    journeyStage: null,
    decisionType: overrides.decisionType || null,
    leadContext: overrides.leadContext || {},
    journeyTimeline: overrides.journeyTimeline || [],
    metadata: overrides.metadata || {},
    provider: null,
    providerStatus: null,
    createdAt: overrides.timestamp || '2026-09-01T12:00:00.000Z',
    updatedAt: overrides.timestamp || '2026-09-01T12:00:00.000Z',
  };
}

test('cold lead remains low readiness and unknown intent', () => {
  const lead = createLead({
    leadId: 'cold-1',
    conversionEvent: 'newsletter_subscribed',
    conversionType: 'newsletter',
  });

  const intelligence = scoringService.calculate(lead, { asOf: '2026-09-01T12:00:00.000Z' });

  assert.equal(intelligence.engagementLevel, LeadEngagementLevels.COLD);
  assert.equal(intelligence.primaryIntent, LeadIntentTypes.UNKNOWN);
  assert.equal(intelligence.secondaryIntent, LeadIntentTypes.UNKNOWN);
  assert.equal(intelligence.conversionReadiness, ConversionReadinessLevels.LOW);
  assert.equal(intelligence.scoringVersion, LeadIntelligenceScoringVersion);
  assert.ok(intelligence.leadScore >= 0);
  assert.ok(intelligence.leadScore < 35);
});

test('warm buyer lead inferred from next-house and property behavior', () => {
  const lead = createLead({
    leadId: 'warm-buyer-1',
    leadType: 'consultation',
    leadIntent: 'buying-consultation',
    conversionEvent: 'consultation_requested',
    conversionType: 'consultation',
    decisionType: 'buyer',
    journeyTimeline: [
      { event: 'search_started', path: '/next-house/', occurredAt: '2026-09-01T10:00:00.000Z' },
      { event: 'property_viewed', path: '/listings/1', occurredAt: '2026-09-01T10:10:00.000Z' },
      { event: 'property_viewed', path: '/listings/2', occurredAt: '2026-09-01T10:12:00.000Z' },
    ],
  });

  const intelligence = scoringService.calculate(lead, { asOf: '2026-09-01T12:00:00.000Z' });

  assert.equal(intelligence.primaryIntent, LeadIntentTypes.BUYER);
  assert.ok(intelligence.leadScore >= 35);
  assert.ok(intelligence.signals.some((signal) => signal.signal === 'NEXT_HOUSE_SEARCH'));
});

test('hot sell-and-buy lead is explainable via seller + buyer signals', () => {
  const lead = createLead({
    leadId: 'hot-sell-buy-1',
    leadType: 'consultation',
    leadIntent: 'schedule-showing',
    conversionType: 'consultation',
    conversionEvent: 'consultation_requested',
    decisionType: 'seller',
    metadata: {
      propertyAddress: '123 Main Street',
    },
    leadContext: {
      contentViewed: ['next-house-search', 'valuation-dashboard'],
      assessmentCompleted: true,
      guidesDownloaded: ['seller-prep-guide'],
    },
    journeyTimeline: [
      {
        event: 'home_value_requested',
        path: '/home-value/',
        occurredAt: '2026-09-01T11:04:00.000Z',
      },
      { event: 'next_house_search', path: '/next-house/', occurredAt: '2026-09-01T11:05:00.000Z' },
      { event: 'valuation_viewed', path: '/home-value/', occurredAt: '2026-09-01T11:08:00.000Z' },
      {
        event: 'consultation_requested',
        path: '/strategy-session/',
        occurredAt: '2026-09-01T11:15:00.000Z',
      },
    ],
  });

  const intelligence = scoringService.calculate(lead, { asOf: '2026-09-01T12:00:00.000Z' });

  assert.equal(intelligence.engagementLevel, LeadEngagementLevels.HOT);
  assert.equal(intelligence.primaryIntent, LeadIntentTypes.SELL_AND_BUY);
  assert.ok(
    [ConversionReadinessLevels.HIGH, ConversionReadinessLevels.READY].includes(
      intelligence.conversionReadiness,
    ),
  );
  assert.ok(intelligence.signals[0].contribution >= intelligence.signals[1].contribution);
  assert.ok(
    intelligence.leadScoreReasons.some(
      (reason) => reason.id === 'VALUATION_REQUESTED' || reason.id === 'NEXT_HOUSE_SEARCH',
    ),
  );
});

test('investor/landlord intent inferred from rental-check activity', () => {
  const lead = createLead({
    leadId: 'investor-1',
    leadType: 'consultation',
    leadIntent: 'investment-consultation',
    decisionType: 'investor',
    leadContext: {
      contentViewed: ['rental-check', 'rental-check-cashflow'],
    },
    journeyTimeline: [
      {
        event: 'rental_check_started',
        path: '/rental-check/',
        occurredAt: '2026-09-01T11:20:00.000Z',
      },
    ],
  });

  const intelligence = scoringService.calculate(lead, { asOf: '2026-09-01T12:00:00.000Z' });

  assert.equal(intelligence.primaryIntent, LeadIntentTypes.INVESTOR);
  assert.ok(
    intelligence.signals.some(
      (signal) => signal.signal === 'RENTAL_CHECK_ACTIVITY' && signal.occurrences >= 1,
    ),
  );
});

test('duplicate events and repeated low-value actions are capped', () => {
  const lead = createLead({
    leadId: 'duplicate-1',
    journeyTimeline: [
      { event: 'tool_opened', path: '/tool', occurredAt: '2026-09-01T09:00:00.000Z' },
      { event: 'tool_opened', path: '/tool', occurredAt: '2026-09-01T09:01:00.000Z' },
      { event: 'tool_opened', path: '/tool-2', occurredAt: '2026-09-01T09:02:00.000Z' },
      { event: 'tool_opened', path: '/tool-3', occurredAt: '2026-09-01T09:03:00.000Z' },
      { event: 'tool_opened', path: '/tool-4', occurredAt: '2026-09-01T09:04:00.000Z' },
      { event: 'tool_opened', path: '/tool-5', occurredAt: '2026-09-01T09:05:00.000Z' },
    ],
  });

  const intelligence = scoringService.calculate(lead, { asOf: '2026-09-01T12:00:00.000Z' });
  const toolSignal = intelligence.signals.find((signal) => signal.signal === 'TOOL_OPENED');

  assert.ok(toolSignal);
  assert.ok(toolSignal.occurrences <= 4);
  assert.ok(intelligence.leadScore < 35);
});

test('recency decay reduces old lead scores deterministically', () => {
  const recentLead = createLead({
    leadId: 'recency-recent',
    conversionEvent: 'consultation_requested',
    conversionType: 'consultation',
    leadType: 'consultation',
    journeyTimeline: [
      {
        event: 'consultation_requested',
        path: '/strategy-session/',
        occurredAt: '2026-09-01T11:00:00.000Z',
      },
    ],
  });

  const oldLead = createLead({
    ...recentLead,
    leadId: 'recency-old',
    timestamp: '2026-04-01T11:00:00.000Z',
    createdAt: '2026-04-01T11:00:00.000Z',
    updatedAt: '2026-04-01T11:00:00.000Z',
    journeyTimeline: [
      {
        event: 'consultation_requested',
        path: '/strategy-session/',
        occurredAt: '2026-04-01T11:00:00.000Z',
      },
    ],
  });

  const recent = scoringService.calculate(recentLead, { asOf: '2026-09-01T12:00:00.000Z' });
  const old = scoringService.calculate(oldLead, { asOf: '2026-09-01T12:00:00.000Z' });

  assert.ok(recent.leadScore > old.leadScore);
});

test('recompute path is deterministic and keeps scoring version', () => {
  const lead = createLead({
    leadId: 'recompute-1',
    conversionEvent: 'home_value_requested',
    conversionType: 'home-value',
    leadType: 'home-value',
    metadata: { propertyAddress: '321 Main Street' },
  });

  const first = scoringService.recompute(lead, { asOf: '2026-09-01T12:00:00.000Z' });
  const second = scoringService.recompute(lead, { asOf: '2026-09-01T12:00:00.000Z' });

  assert.equal(first.leadScore, second.leadScore);
  assert.deepEqual(first.dimensionScores, second.dimensionScores);
  assert.equal(first.scoringVersion, LeadIntelligenceScoringVersion);
  assert.equal(first.sourceFingerprint, second.sourceFingerprint);
});

test('contact service persists calculated intelligence and explainability', async () => {
  const repository = new InMemoryLeadRepository();
  const intelligenceRepository = new InMemoryLeadIntelligenceRepository();
  const logRecords = [];
  const logger = {
    info(message, fields) {
      logRecords.push({ message, fields });
    },
    error(message, fields) {
      logRecords.push({ message, fields });
    },
  };

  const service = new ContactService({
    provider: new MockLeadProvider(),
    repository,
    leadIntelligenceService: new LeadIntelligenceService(),
    leadIntelligenceRepository: intelligenceRepository,
    leadIntelligenceMetrics: new LeadIntelligenceMetrics(),
  });

  const context = { requestId: 'req-100', correlationId: 'corr-100' };
  const lead = service.normalize(
    {
      name: 'Scored Lead',
      email: 'score@example.com',
      message: 'I want to schedule a showing.',
      leadIntent: 'schedule-showing',
      leadScore: 1,
      leadScoreBand: 'Low',
      conversionType: 'contact',
      conversionEvent: 'contact_requested',
      decisionType: 'buyer',
      leadContext: {
        contentViewed: ['next-house-search', 'listing-123'],
      },
      journeyTimeline: [
        { event: 'search_started', path: '/next-house/', occurredAt: '2026-09-01T11:00:00.000Z' },
        { event: 'property_viewed', path: '/listings/123', occurredAt: '2026-09-01T11:05:00.000Z' },
      ],
    },
    { context },
  );

  const result = await service.submitLead(lead, { context, logger });

  assert.ok(result.lead.leadScore >= 35);
  assert.notEqual(result.lead.leadScore, 1);
  assert.equal(result.lead.scoringVersion, LeadIntelligenceScoringVersion);
  assert.ok(Array.isArray(result.lead.intelligenceSignals));
  assert.ok(result.lead.intelligenceSignals.length > 0);
  assert.ok(result.lead.primaryIntent);
  assert.ok(result.lead.engagementLevel);

  const storedIntelligence = await intelligenceRepository.getByLeadId(result.lead.leadId);
  assert.equal(storedIntelligence.leadId, result.lead.leadId);
  assert.equal(storedIntelligence.scoringVersion, LeadIntelligenceScoringVersion);
  assert.ok(Array.isArray(storedIntelligence.signals));

  assert.ok(logRecords.some((record) => record.message === 'lead_intelligence_calculated'));
  assert.ok(
    logRecords.some(
      (record) =>
        record.message === 'lead_intelligence_metric' &&
        record.fields.metricName === 'LeadIntelligenceCalculated',
    ),
  );
});
