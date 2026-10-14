import { UnprocessableEntityError } from '../errors/index.js';
import { LeadTypes, normalizeLeadRequest } from './lead-model.js';
import { Validators } from '../validation/validators.js';

export function normalizeGenericLeadRequest(payload) {
  const isRegistrationCampaign = payload?.campaign === 'affordable-real-estate-broker-event';
  const isConnectCampaign = payload?.campaign === 'affordable-real-estate-connect';
  const isArmCampaign = payload?.campaign === 'ARM_RESET_2026';
  const requiresLastName = isRegistrationCampaign || isConnectCampaign;
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
    const review = normalized.metadata.requestPropertyReview ?? false;
    normalized.metadata.requestPropertyReview = review;
    const errors = [];
    if (normalized.funnel !== 'arm-reset-playbook')
      errors.push({ field: 'funnel', message: 'ARM funnel identifier is required.' });
    if (payload.website)
      errors.push({ field: 'website', message: 'Request could not be accepted.' });
    if (normalized.consent?.privacy?.acknowledged !== true)
      errors.push({
        field: 'privacyAcknowledgment',
        message: 'Privacy acknowledgment is required.',
      });
    if (
      normalized.consent?.marketing?.agreed !== undefined &&
      typeof normalized.consent.marketing.agreed !== 'boolean'
    )
      errors.push({ field: 'marketingConsent', message: 'Marketing consent must be a boolean.' });
    if (typeof review !== 'boolean')
      errors.push({
        field: 'requestPropertyReview',
        message: 'Review preference must be a boolean.',
      });
    const address = normalized.metadata.propertyAddress;
    if (address != null && (typeof address !== 'string' || address.length > 500))
      errors.push({
        field: 'propertyAddress',
        message: 'Property address must be text of up to 500 characters.',
      });
    if (errors.length) throw new UnprocessableEntityError('ARM request validation failed.', errors);
    normalized.metadata.propertyAddress = address?.split('\0').join('').trim() || '';
    const timeframe = normalized.metadata.timeframe;
    if (
      timeframe != null &&
      (typeof timeframe !== 'string' ||
        (timeframe &&
          !['within-3-months', '3-6-months', '6-12-months', 'over-12-months', 'not-sure'].includes(
            timeframe,
          )))
    )
      throw new UnprocessableEntityError('ARM request validation failed.', [
        { field: 'timeframe', message: 'Choose a valid adjustment timeframe.' },
      ]);
    const timestamp = new Date().toISOString();
    const agreed = normalized.consent.marketing?.agreed === true;
    normalized.consent = {
      privacy: {
        acknowledged: true,
        textVersion: 'arm-reset-privacy-v2',
        acknowledgedAt: timestamp,
      },
      marketing: {
        agreed,
        textVersion: 'arm-reset-marketing-v2',
        agreedAt: agreed ? timestamp : null,
      },
    };
    normalized.metadata.requestedService = review
      ? 'Playbook and Home Value & Equity Review'
      : 'ARM Reset Playbook';
    normalized.conversionType = 'resource';
    normalized.conversionEvent = undefined;
    normalized.leadIntent = normalized.metadata.requestedService;
    normalized.notes = normalized.metadata.requestedService;
  }
  return normalized;
}
