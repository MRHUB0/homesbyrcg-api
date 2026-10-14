import assert from 'node:assert/strict';
import test from 'node:test';

import { createHttpApiEvent } from '../src/events/http-api-event.js';
import { handler as propertySearchHandler } from '../src/handlers/property-search/index.js';
import { handler as propertyRecordResolveHandler } from '../src/handlers/property-record-resolve/index.js';
import { handler as propertyRecordValueHandler } from '../src/handlers/property-record-value/index.js';
import { handler as propertyValueHandler } from '../src/handlers/property-value/index.js';

function configurePropertyEnv({ requireLeadContext = false } = {}) {
  process.env.APP_ENV = 'local';
  process.env.SERVICE_NAME = 'homesbyrcg-api';
  process.env.LOG_LEVEL = 'error';
  process.env.PROPERTY_PROVIDER_MODE = 'mock';
  process.env.PROPERTY_VALUE_REQUIRE_LEAD_CONTEXT = requireLeadContext ? 'true' : 'false';
}

function eventFor(path, payload) {
  return createHttpApiEvent({
    routeKey: `POST ${path}`,
    rawPath: path,
    headers: {
      'content-type': 'application/json',
      'x-correlation-id': 'property-correlation-1',
    },
    requestContext: {
      requestId: 'property-request-1',
      http: {
        method: 'POST',
        path,
      },
    },
    body: JSON.stringify(payload),
  });
}

test('POST /property-search returns FOUND for a valid address', async () => {
  configurePropertyEnv();

  const response = await propertySearchHandler(
    eventFor('/property-search', {
      propertyAddress: '123 Main St',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43215',
    }),
    { awsRequestId: 'aws-request-1' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'FOUND');
  assert.ok(body.data.propertyRef.startsWith('hbrcg_prop_'));
  assert.equal(body.data.propertyRecord.owner.displayName, 'MAIN STREET HOLDINGS LLC');
  assert.equal(body.data.matches[0].ownerDisplayName, 'MAIN STREET HOLDINGS LLC');
});

test('POST /property-record/resolve returns MULTIPLE_MATCHES for ambiguous address', async () => {
  configurePropertyEnv();

  const response = await propertyRecordResolveHandler(
    eventFor('/property-record/resolve', {
      propertyAddress: '500 Market St',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43215',
    }),
    { awsRequestId: 'aws-request-1' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.data.status, 'MULTIPLE_MATCHES');
  assert.equal(body.data.matches.length, 2);
  assert.equal(body.data.matches[0].ownerDisplayName, 'MARKET STREET INVESTMENTS LLC');
});

test('POST /property-record/resolve returns NOT_FOUND for no matches', async () => {
  configurePropertyEnv();

  const response = await propertyRecordResolveHandler(
    eventFor('/property-record/resolve', {
      propertyAddress: '999 Unknown Ave',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43215',
    }),
    { awsRequestId: 'aws-request-1' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.data.status, 'NOT_FOUND');
});

test('POST /property-search returns 400 for missing request body', async () => {
  configurePropertyEnv();

  const response = await propertySearchHandler(
    createHttpApiEvent({
      routeKey: 'POST /property-search',
      rawPath: '/property-search',
      headers: {
        'content-type': 'application/json',
      },
      requestContext: {
        requestId: 'property-request-1',
        http: {
          method: 'POST',
          path: '/property-search',
        },
      },
    }),
    { awsRequestId: 'aws-request-1' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.errors[0].code, 'VALIDATION_ERROR');
});

test('POST /property-value enforces lead gating when enabled', async () => {
  configurePropertyEnv({ requireLeadContext: true });

  const response = await propertyValueHandler(
    eventFor('/property-value', {
      propertyAddress: '123 Main St',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43215',
    }),
    { awsRequestId: 'aws-request-1' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.errors[0].field, 'leadId');
});

test('POST /property-record/value returns value payload when lead gating disabled', async () => {
  configurePropertyEnv({ requireLeadContext: false });

  const response = await propertyRecordValueHandler(
    eventFor('/property-record/value', {
      propertyAddress: '123 Main St',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43215',
      leadId: 'lead-optional-for-local',
    }),
    { awsRequestId: 'aws-request-1' },
  );

  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.data.status, 'FOUND');
  assert.equal(body.data.value.values[0].valueType, 'assessed_value');
});
