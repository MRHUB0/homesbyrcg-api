import { createApiHandler } from '../../middleware/api-handler.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';
import { createPropertyService } from '../../property-data/create-property-service.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const payload = parseJsonBody(event);
  const service = createPropertyService(config);
  const result = await service.resolve(payload);

  logger.info('property_record_resolve_completed', {
    status: result.status,
    provider: result.provider,
  });

  return ResponseBuilder.success({
    message: 'Property record resolution completed.',
    context,
    data: result,
  });
});
