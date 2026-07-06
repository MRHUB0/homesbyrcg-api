import { AppError, ProviderError } from '../errors/index.js';
import { redactLead } from '../leads/redaction.js';

export class LeadService {
  constructor({ provider, leadType }) {
    this.provider = provider;
    this.leadType = leadType;
  }

  async submitLead(lead, { context, logger }) {
    logger.info('lead_normalized', {
      lead: redactLead(lead),
    });

    try {
      const result = await this.provider.submitLead(lead, { context, logger });

      logger.info('lead_provider_submitted', {
        leadId: lead.leadId,
        leadType: this.leadType,
        provider: result.provider,
        providerStatus: result.status,
      });

      return result;
    } catch (error) {
      logger.error('lead_provider_failed', {
        leadId: lead.leadId,
        leadType: this.leadType,
        error: {
          name: error.name,
          message: error.message,
        },
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ProviderError('Lead provider failed.', [
        {
          provider: this.provider.name ?? 'unknown',
          message: 'Unable to submit lead.',
        },
      ]);
    }
  }
}
