export function createHttpApiEvent(overrides = {}) {
  return {
    version: '2.0',
    routeKey: 'GET /health',
    rawPath: '/health',
    headers: {},
    requestContext: {
      requestId: 'local-request',
      http: {
        method: 'GET',
        path: '/health',
      },
    },
    isBase64Encoded: false,
    ...overrides,
  };
}
