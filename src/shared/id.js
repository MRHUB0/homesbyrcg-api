import { randomUUID } from 'node:crypto';

export class RequestId {
  static create() {
    return randomUUID();
  }
}

export class CorrelationId {
  static create() {
    return randomUUID();
  }
}

export function getHeader(headers = {}, name) {
  const expected = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === expected);
  return entry?.[1];
}
