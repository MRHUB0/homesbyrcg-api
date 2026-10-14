export class InMemoryPropertyCacheRepository {
  constructor({ ttlSeconds = 900 } = {}) {
    this.ttlSeconds = ttlSeconds;
    this.store = new Map();
  }

  async get(cacheKey) {
    const entry = this.store.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (entry.expiresAtEpochMs <= Date.now()) {
      this.store.delete(cacheKey);
      return null;
    }

    return JSON.parse(JSON.stringify(entry.value));
  }

  async set(cacheKey, value) {
    this.store.set(cacheKey, {
      value: JSON.parse(JSON.stringify(value)),
      expiresAtEpochMs: Date.now() + this.ttlSeconds * 1000,
    });
  }
}

export function createPropertyCacheRepository(config) {
  return new InMemoryPropertyCacheRepository({ ttlSeconds: config.propertyCacheTtlSeconds });
}
