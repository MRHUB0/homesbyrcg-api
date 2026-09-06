import { createApiHandler } from '../../middleware/api-handler.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';
import { createPropertyService } from '../../property-data/create-property-service.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const payload = parseJsonBody(event);
  const service = createPropertyService(config);
  const result = await service.resolve(payload);

  logger.info('property_search_completed', {
    status: result.status,
    provider: result.provider,
    matchCount: result.matches?.length ?? 0,
  });

  return ResponseBuilder.success({
    message: 'Property search completed.',
    context,
    data: result,
  });
});
