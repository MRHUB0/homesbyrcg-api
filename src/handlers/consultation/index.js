import { AnalyticsService } from '../../analytics/analytics-service.js';
import { ConsultationService } from '../../consultation/consultation-service.js';
import {
  createLeadIntelligenceRepository,
  LeadIntelligenceMetrics,
  LeadIntelligenceService,
} from '../../lead-intelligence/index.js';
import { createCrmSyncService } from '../../integrations/crm/crm-factory.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createConsultationProvider } from '../../providers/provider-factory.js';
import { createAnalyticsEventRepository } from '../../repositories/analytics-event-repository.js';
import { createLeadRepository } from '../../repositories/lead-repository.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const analyticsService = new AnalyticsService({
    repository: createAnalyticsEventRepository(config),
  });
  const consultationService = new ConsultationService({
    provider: createConsultationProvider(config),
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
    lead = consultationService.normalize(payload, { context });
  } catch (error) {
    logger.warn('consultation_validation_failed', {
      errors: error.details ?? [{ message: error.message }],
    });
    throw error;
  }

  const result = await consultationService.submitLead(lead, { context, logger });

  logger.info('consultation_request_success', {
    leadId: result.lead.leadId,
    provider: result.provider,
    providerStatus: result.status,
  });

  return ResponseBuilder.leadAccepted({
    message: 'Consultation request received.',
    lead: result.lead,
    context,
  });
});
