import { UnprocessableEntityError } from '../errors/index.js';
import { LeadTypes, normalizeLeadRequest } from './lead-model.js';
import { Validators } from '../validation/validators.js';

export function normalizeGenericLeadRequest(payload) {
  const isRegistrationCampaign = payload?.campaign === 'affordable-real-estate-broker-event';
  const isConnectCampaign = payload?.campaign === 'affordable-real-estate-connect';
  const isArmCampaign = payload?.campaign === 'ARM_RESET_2026';
  const requiresLastName = isRegistrationCampaign || isConnectCampaign || isArmCampaign;
  const armPayload =
    isArmCampaign &&
    (payload.phone == null || (typeof payload.phone === 'string' && !payload.phone.trim()))
      ? { ...payload, phone: undefined }
      : payload;
  const normalized = normalizeLeadRequest(armPayload, {
    leadType: LeadTypes.GENERIC,
    schema: {
      firstName: isArmCampaign
        ? [Validators.required(), Validators.length({ min: 1, max: 80 })]
        : [Validators.length({ max: 80 })],
      lastName: requiresLastName
        ? [Validators.required(), Validators.length({ min: 1, max: 80 })]
        : [Validators.length({ max: 80 })],
      phone: isConnectCampaign
        ? [Validators.required(), Validators.phone(), Validators.length({ min: 7, max: 30 })]
        : [Validators.phone(), Validators.length({ max: 30 })],
      notes: [Validators.length({ max: 4000 })],
    },
  });

  if (isArmCampaign) {
    const review = normalized.metadata.requestPropertyReview;
    const errors = [];
    if (normalized.funnel !== 'arm-reset-playbook')
      errors.push({ field: 'funnel', message: 'ARM funnel identifier is required.' });
    if (normalized.consent?.contact?.agreed !== true)
      errors.push({ field: 'consent', message: 'Contact consent is required.' });
    if (typeof review !== 'boolean')
      errors.push({
        field: 'requestPropertyReview',
        message: 'Review preference must be a boolean.',
      });
    const address = normalized.metadata.propertyAddress;
    if (review && (typeof address !== 'string' || !address.trim() || address.length > 500))
      errors.push({
        field: 'propertyAddress',
        message: 'A property address is required for the review (up to 500 characters).',
      });
    if (errors.length) throw new UnprocessableEntityError('ARM request validation failed.', errors);
    normalized.metadata.propertyAddress = review ? address.trim() : '';
    normalized.metadata.requestedService = review
      ? 'Playbook and Home Value & Equity Review'
      : 'ARM Reset Playbook';
    normalized.leadIntent = normalized.metadata.requestedService;
    normalized.notes = normalized.metadata.requestedService;
  }
  return normalized;
}
