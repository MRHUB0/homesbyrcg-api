export class LeadIntelligenceMetrics {
  recordCalculated({ logger, engagementLevel, primaryIntent, conversionReadiness }) {
    this.emit({
      logger,
      metricName: 'LeadIntelligenceCalculated',
      dimensions: { engagementLevel, primaryIntent, conversionReadiness },
    });
  }

  recordRecalculated({ logger, engagementLevel, primaryIntent, conversionReadiness }) {
    this.emit({
      logger,
      metricName: 'LeadIntelligenceRecalculated',
      dimensions: { engagementLevel, primaryIntent, conversionReadiness },
    });
  }

  recordFailed({ logger, reason }) {
    this.emit({
      logger,
      metricName: 'LeadIntelligenceFailed',
      dimensions: { reason },
    });
  }

  emit({ logger, metricName, dimensions }) {
    logger.info('lead_intelligence_metric', {
      metricName,
      metricValue: 1,
      dimensions,
    });
  }
}
