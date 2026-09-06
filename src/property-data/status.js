export const PropertyResolutionStatus = Object.freeze({
  FOUND: 'FOUND',
  MULTIPLE_MATCHES: 'MULTIPLE_MATCHES',
  NOT_FOUND: 'NOT_FOUND',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INVALID_INPUT: 'INVALID_INPUT',
});

export function isPropertyResolutionStatus(value) {
  return Object.values(PropertyResolutionStatus).includes(value);
}
