import { AnalyticsService } from '../../analytics/analytics-service.js';
import { createApiHandler } from '../../middleware/api-handler.js';
import { createAnalyticsEventRepository } from '../../repositories/analytics-event-repository.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const analyticsService = new AnalyticsService({
    repository: createAnalyticsEventRepository(config),
  });

  const payload = parseJsonBody(event);
  const outcome = await analyticsService.acceptEvent(payload, { context, logger });

  return ResponseBuilder.success({
    statusCode: 202,
    message: outcome.duplicate
      ? 'Duplicate analytics event acknowledged.'
      : 'Analytics event accepted.',
    data: {
      eventId: outcome.event.eventId,
      eventName: outcome.event.eventName,
      eventVersion: outcome.event.eventVersion,
      duplicate: outcome.duplicate,
      family: outcome.event.family,
      funnelStage: outcome.event.funnelStage,
      conversionClass: outcome.event.conversionClass,
      occurredAt: outcome.event.occurredAt,
    },
    context,
  });
});
