function canonicalFields(lead = {}) {
  return {
    externalLeadId: lead.leadId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    decisionJourney: lead.leadContext?.decisionJourney || lead.decisionType,
    primaryInterest: lead.leadContext?.primaryGoal || lead.leadIntent,
    score: lead.leadScore,
    scoreBand: lead.leadScoreBand,
    scoreReasons: lead.leadScoreReasons || [],
    referralSource: lead.leadContext?.referralSource || lead.referral,
    campaign: lead.leadContext?.campaign || lead.campaign,
    contentViewed: lead.leadContext?.contentViewed || [],
    assessments: lead.leadContext?.assessmentCompleted ? ['housing-decision-assessment'] : [],
    downloads: lead.leadContext?.guidesDownloaded || [],
    timeline: lead.journeyTimeline || [],
    intelligence: {
      leadScore: lead.leadScore,
      leadScoreBand: lead.leadScoreBand,
      engagementLevel: lead.engagementLevel,
      primaryIntent: lead.primaryIntent,
      secondaryIntent: lead.secondaryIntent,
      conversionReadiness: lead.conversionReadiness,
      scoringVersion: lead.scoringVersion,
      lastScoredAt: lead.lastScoredAt,
      reasons: lead.leadScoreReasons || [],
      signals: lead.intelligenceSignals || [],
    },
  };
}

export function mapLeadForCrm(lead, destination = 'canonical') {
  const fields = canonicalFields(lead);
  if (destination !== 'boldtrail') return fields;
  return {
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    phone: fields.phone,
    source: 'HomesByRCG',
    type: fields.decisionJourney || 'housing-decision',
    tags: [fields.scoreBand, fields.decisionJourney].filter(Boolean),
    notes: JSON.stringify({
      homesByRcgLeadId: fields.externalLeadId,
      primaryInterest: fields.primaryInterest,
      leadScore: fields.intelligence.leadScore,
      leadScoreBand: fields.intelligence.leadScoreBand,
      engagementLevel: fields.intelligence.engagementLevel,
      primaryIntent: fields.intelligence.primaryIntent,
      secondaryIntent: fields.intelligence.secondaryIntent,
      conversionReadiness: fields.intelligence.conversionReadiness,
      leadScoreReasons: fields.intelligence.reasons,
      intelligenceSignals: fields.intelligence.signals,
      scoringVersion: fields.intelligence.scoringVersion,
      lastScoredAt: fields.intelligence.lastScoredAt,
      referralSource: fields.referralSource,
      campaign: fields.campaign,
      contentViewed: fields.contentViewed,
      assessments: fields.assessments,
      downloads: fields.downloads,
      journeyTimeline: fields.timeline,
    }),
  };
}
