import { createApiHandler } from '../../middleware/api-handler.js';
import {
  createValueAccessDependencies,
  createPropertyService,
} from '../../property-data/create-property-service.js';
import { enforcePropertyValueAccess } from '../../property-data/value-access.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { parseJsonBody } from '../../shared/http-body.js';

export const handler = createApiHandler(async (event, { config, context, logger }) => {
  const payload = parseJsonBody(event);
  const service = createPropertyService(config);
  const access = createValueAccessDependencies(config);

  await enforcePropertyValueAccess({
    payload,
    leadRepository: access.leadRepository,
    requireLeadContext: access.requireLeadContext,
  });

  const result = await service.getPropertyValue(payload);

  logger.info('property_record_value_completed', {
    status: result.status,
    provider: result.provider,
    hasValue: Boolean(result.value),
  });

  return ResponseBuilder.success({
    message: 'Property value record completed.',
    context,
    data: result,
  });
});
