export function createCorsHeaders(config, origin) {
  const allowedOrigins = config.corsAllowedOrigins;
  const allowAll = allowedOrigins.includes('*');
  const allowedOrigin =
    allowAll || allowedOrigins.includes(origin) ? origin || '*' : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'Content-Type,Authorization,X-Correlation-Id,X-Request-Id,Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    Vary: 'Origin',
  };
}
