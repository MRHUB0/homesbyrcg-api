import { CorrelationId, RequestId, getHeader } from './id.js';
import { nowIso } from './time.js';

export class RequestContext {
  static from(event, lambdaContext, config) {
    const headers = event.headers ?? {};
    const requestId =
      getHeader(headers, 'x-request-id') ??
      event.requestContext?.requestId ??
      lambdaContext?.awsRequestId ??
      RequestId.create();
    const correlationId =
      getHeader(headers, 'x-correlation-id') ?? getHeader(headers, 'correlation-id') ?? requestId;

    return Object.freeze({
      requestId,
      correlationId: correlationId || CorrelationId.create(),
      timestamp: nowIso(),
      environment: config.appEnvironment,
      serviceName: config.serviceName,
      endpoint: event.rawPath ?? event.path ?? 'unknown',
      method: event.requestContext?.http?.method ?? event.httpMethod ?? 'UNKNOWN',
      awsRequestId: lambdaContext?.awsRequestId,
    });
  }
}
