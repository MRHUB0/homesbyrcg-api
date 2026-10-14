import { IntegrationError } from '../../../errors/index.js';

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function withTimeout(signal, timeoutMs) {
  const controller = new globalThis.AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timeout),
  };
}

function jitteredBackoff(attempt, baseDelayMs, maxDelayMs) {
  const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.random() * Math.max(25, delay * 0.3);
  return Math.min(maxDelayMs, Math.round(delay + jitter));
}

function parseJsonSafely(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toQueryString(params = {}) {
  const query = new globalThis.URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    query.set(key, String(value));
  }

  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function normalizeArrayResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of ['data', 'contacts', 'items', 'results']) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
}

export class BoldTrailClient {
  constructor({
    token,
    baseUrl,
    timeoutMs,
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    fetchImpl = globalThis.fetch,
  }) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/u, '');
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.fetch = fetchImpl;
  }

  async request(method, path, { body, signal } = {}) {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      attempt += 1;

      const timeout = withTimeout(signal, this.timeoutMs);

      try {
        const response = await this.fetch(`${this.baseUrl}${path}`, {
          method,
          signal: timeout.signal,
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });

        const text = await response.text();
        const payload = parseJsonSafely(text);

        if (response.ok) {
          return payload ?? {};
        }

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt <= this.maxRetries) {
          await sleep(jitteredBackoff(attempt, this.baseDelayMs, this.maxDelayMs));
          continue;
        }

        throw new IntegrationError('BoldTrail request failed.', [
          {
            provider: 'boldtrail',
            statusCode: response.status,
            retryable: RETRYABLE_STATUS_CODES.has(response.status),
            path,
            message:
              payload?.message || payload?.error || payload?.detail || `HTTP ${response.status}`,
          },
        ]);
      } catch (error) {
        timeout.clear();

        const isAbort = error?.name === 'AbortError' || error?.message === 'timeout';
        const retryable = isAbort || error instanceof TypeError;

        if (retryable && attempt <= this.maxRetries) {
          await sleep(jitteredBackoff(attempt, this.baseDelayMs, this.maxDelayMs));
          continue;
        }

        if (error instanceof IntegrationError) {
          throw error;
        }

        throw new IntegrationError('BoldTrail request failed.', [
          {
            provider: 'boldtrail',
            path,
            retryable,
            message: error.message,
          },
        ]);
      } finally {
        timeout.clear();
      }
    }

    throw new IntegrationError('BoldTrail retry budget exhausted.', [
      { provider: 'boldtrail', message: 'Retry budget exhausted.' },
    ]);
  }

  async findContacts({ email, phone }) {
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : null;

    const paths = [
      `/v2/public/contacts${toQueryString({ 'filter[email]': normalizedEmail, limit: 10 })}`,
      `/v2/public/contacts${toQueryString({ 'filter[phone]': phone, limit: 10 })}`,
    ];

    for (const path of paths) {
      if (path.endsWith('?') || path.endsWith('/contacts')) {
        continue;
      }

      try {
        const payload = await this.request('GET', path);
        const contacts = normalizeArrayResponse(payload);
        if (contacts.length > 0) {
          return contacts;
        }
      } catch (error) {
        if (error.details?.[0]?.statusCode === 404) {
          continue;
        }
        throw error;
      }
    }

    return [];
  }

  async createContact(payload) {
    return this.request('POST', '/v2/public/contact', { body: payload });
  }

  async updateContact(contactId, payload) {
    return this.request('PUT', `/v2/public/contact/${encodeURIComponent(contactId)}`, {
      body: payload,
    });
  }

  async addTags(contactId, tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return null;
    }

    const normalizedTags = tags
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .map((value) => ({ name: value.trim(), locked: 0 }));

    if (normalizedTags.length === 0) {
      return null;
    }

    return this.request('PUT', `/v2/public/contact/${encodeURIComponent(contactId)}/tags`, {
      body: { tags: normalizedTags },
    });
  }

  async addNote(contactId, noteDetails) {
    if (!noteDetails) {
      return null;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const details =
      typeof noteDetails === 'string'
        ? noteDetails
        : noteDetails.details || noteDetails.body || noteDetails.message;

    if (!details) {
      return null;
    }

    const title =
      typeof noteDetails === 'string'
        ? 'HomesByRCG Sync'
        : noteDetails.title || noteDetails.reason || 'HomesByRCG Sync';

    return this.request('PUT', `/v2/public/contact/${encodeURIComponent(contactId)}/action/note`, {
      body: {
        date: timestamp,
        title,
        details,
      },
    });
  }

  async healthCheck() {
    try {
      await this.request('GET', '/v2/public/contacts?limit=1');
      return { ok: true };
    } catch (error) {
      if (error.details?.[0]?.statusCode === 404) {
        return { ok: true, partial: true };
      }

      return {
        ok: false,
        reason: error.details?.[0]?.message || error.message,
      };
    }
  }
}
