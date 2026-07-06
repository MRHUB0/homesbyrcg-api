import { createApiHandler } from '../../middleware/api-handler.js';
import { ResponseBuilder } from '../../responses/response-builder.js';
import { HealthCheck } from '../../services/health-check.js';

export const handler = createApiHandler(async (_event, { config, context }) => {
  const data = HealthCheck.getStatus({ config, context });

  return ResponseBuilder.success({
    message: 'Service is healthy.',
    data,
    context,
  });
});
