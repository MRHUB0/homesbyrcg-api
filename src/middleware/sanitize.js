export function sanitizeInput(value) {
  if (typeof value === 'string') {
    return value.split('\0').join('').trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInput(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeInput(item)]),
    );
  }

  return value;
}

export function sanitizeEvent(event) {
  return {
    ...event,
    queryStringParameters: sanitizeInput(event.queryStringParameters),
    pathParameters: sanitizeInput(event.pathParameters),
  };
}
