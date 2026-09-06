import assert from 'node:assert/strict';
import test from 'node:test';

import { ConfigurationLoader } from '../src/config/configuration-loader.js';

test('configuration requires BoldTrail token when CRM provider is boldtrail', () => {
  assert.throws(
    () =>
      ConfigurationLoader.load({
        APP_ENV: 'local',
        SERVICE_NAME: 'homesbyrcg-api',
        LOG_LEVEL: 'info',
        CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
        MAX_REQUEST_BYTES: '1024',
        LEAD_PROVIDER_MODE: 'mock',
        CRM_PROVIDER_MODE: 'boldtrail',
        BOLDTRAIL_API_BASE_URL: 'https://api.kvcore.com',
        BOLDTRAIL_API_TOKEN: '',
        CRM_SYNC_TIMEOUT_MS: '1000',
        CRM_SYNC_MAX_RETRIES: '1',
        CRM_SYNC_BASE_DELAY_MS: '5',
        CRM_SYNC_MAX_DELAY_MS: '20',
      }),
    (error) =>
      error.name === 'ConfigurationError' &&
      error.details.includes(
        'BOLDTRAIL_API_TOKEN is required when CRM_PROVIDER_MODE is boldtrail.',
      ),
  );
});

test('configuration accepts disabled CRM provider without BoldTrail token', () => {
  const config = ConfigurationLoader.load({
    APP_ENV: 'local',
    SERVICE_NAME: 'homesbyrcg-api',
    LOG_LEVEL: 'info',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    MAX_REQUEST_BYTES: '1024',
    LEAD_PROVIDER_MODE: 'mock',
    CRM_PROVIDER_MODE: 'disabled',
    CRM_SYNC_TIMEOUT_MS: '1000',
    CRM_SYNC_MAX_RETRIES: '1',
    CRM_SYNC_BASE_DELAY_MS: '5',
    CRM_SYNC_MAX_DELAY_MS: '20',
  });

  assert.equal(config.crmProviderMode, 'disabled');
});
