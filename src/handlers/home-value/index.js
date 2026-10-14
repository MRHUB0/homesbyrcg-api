import { AnalyticsService } from '../../analytics/analytics-service.js';
import { HomeValueService } from '../../home-value/home-value-service.js';
import {
  createLeadIntelligenceRepository,
  LeadIntelligenceMetrics,
  LeadIntelligenceService,
} from '../../lead-intelligence/index.js';
import { createCrmSyncService } from '../../integrations/crm/crm-factory.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createHomeValueProvider } from '../../providers/provider-factory.js';
import { createAnalyticsEventRepository } from '../../repositories/analytics-event-repository.js';
import { createLeadRepository } from '../../repositories/lead-repository.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const analyticsService = new AnalyticsService({
    repository: createAnalyticsEventRepository(config),
  });
  const homeValueService = new HomeValueService({
    provider: createHomeValueProvider(config),
    repository: createLeadRepository(config),
    analyticsService,
    leadIntelligenceService: new LeadIntelligenceService(),
    leadIntelligenceRepository: createLeadIntelligenceRepository(config),
    leadIntelligenceMetrics: new LeadIntelligenceMetrics(),
    crmSyncService: createCrmSyncService(config),
  });
  const payload = parseJsonBody(event);
  let lead;

  try {
    lead = homeValueService.normalize(payload, { context });
  } catch (error) {
    logger.warn('home_value_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  const result = await homeValueService.submitLead(lead, { context, logger });

  logger.info('home_value_request_success', {
    leadId: result.lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.leadAccepted({
    message: 'Home value request received.',
    lead: result.lead,
    context,
  });
});
