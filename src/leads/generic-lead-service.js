import { buildCanonicalLead, LeadTypes } from './lead-model.js';
import { LeadService } from '../services/lead-service.js';
import { normalizeGenericLeadRequest } from './generic-lead-validation.js';

const campaignMetadataFields = Object.freeze([
  'source',
  'campaign',
  'eventSlug',
  'brokerage',
  'landingPage',
  'redirectDestination',
  'pageUrl',
  'referrer',
  'utm',
  'housingInterest',
  'preferredContactMethod',
  'interest',
  'timeframe',
  'helpMessage',
  'consentFollowUp',
  'qrVersion',
  'printBatch',
  'campaignVersion',
]);

function allowedMetadata(metadata = {}) {
  return Object.fromEntries(
    campaignMetadataFields
      .filter((key) => metadata[key] !== undefined)
      .map((key) => [key, metadata[key]]),
  );
}

export class GenericLeadService extends LeadService {
  constructor({ provider, repository }) {
    super({ provider, repository, leadType: LeadTypes.GENERIC });
  }

  normalize(payload, { context }) {
    const normalizedRequest = normalizeGenericLeadRequest(payload);

    return buildCanonicalLead({
      leadType: LeadTypes.GENERIC,
      normalizedRequest,
      context,
      metadata: {
        originalEndpoint: '/leads',
        ...allowedMetadata(normalizedRequest.metadata),
      },
    });
  }
}
