import { ConfigurationLoader } from '../config/configuration-loader.js';
import { ResponseBuilder } from '../responses/response-builder.js';
import { Logger } from '../logging/logger.js';
import { RequestContext } from '../shared/request-context.js';
import { createCorsHeaders } from './cors.js';
import { enforceJsonContentType } from './content-type.js';
import { enforceRequestSize } from './request-size.js';
import { sanitizeEvent } from './sanitize.js';
import { securityHeaders } from './security-headers.js';

export function createApiHandler(routeHandler) {
  return async function handler(event, lambdaContext) {
    const startedAt = Date.now();
    const config = ConfigurationLoader.load();
    const requestContext = RequestContext.from(event, lambdaContext, config);
    const headers = {
      ...createCorsHeaders(config, event.headers?.origin ?? event.headers?.Origin),
      ...securityHeaders(),
      'X-Request-Id': requestContext.requestId,
      'X-Correlation-Id': requestContext.correlationId,
    };
    const logger = new Logger({
      level: config.logLevel,
      serviceName: config.serviceName,
      environment: config.appEnvironment,
    }).child({
      requestId: requestContext.requestId,
      correlationId: requestContext.correlationId,
      endpoint: requestContext.endpoint,
      method: requestContext.method,
    });

    if (requestContext.method === 'OPTIONS') {
      return ResponseBuilder.noContent({ headers });
    }

    try {
      enforceRequestSize(event, config.maxRequestBytes);
      enforceJsonContentType(event);

      const response = await routeHandler(sanitizeEvent(event), {
        config,
        context: requestContext,
        logger,
      });

      const latency = Date.now() - startedAt;
      logger.info('request_completed', {
        latency,
        status: response.statusCode,
        errors: [],
      });

      return {
        ...response,
        headers: {
          ...headers,
          ...response.headers,
        },
      };
    } catch (error) {
      const response = ResponseBuilder.error({ error, context: requestContext, headers });
      const latency = Date.now() - startedAt;
      logger.error('request_failed', {
        latency,
        status: response.statusCode,
        errors: [{ name: error.name, message: error.message }],
      });

      return response;
    }
  };
}
