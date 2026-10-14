import { IntegrationError } from '../../../errors/index.js';
import { CrmAdapter } from '../adapters/crm-adapter.js';
import {
  buildEventNote,
  buildLeadNote,
  findEventLeadIdentifier,
  toBoldTrailContactPayload,
  toBoldTrailEventTags,
} from './mapper.js';

function firstValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return null;
}

function readContactId(payload = {}) {
  return firstValue(
    payload.contactId,
    payload.id,
    payload?.data?.contactId,
    payload?.data?.id,
    payload?.contact?.contactId,
    payload?.contact?.id,
  );
}

export class BoldTrailCrmAdapter extends CrmAdapter {
  constructor({ client }) {
    super({ name: 'boldtrail' });
    this.client = client;
  }

  async upsertLead(lead) {
    const payload = toBoldTrailContactPayload(lead);
    const existingContactId = lead?.metadata?.crm?.boldtrailContactId || null;

    let contactId = existingContactId;
    let created = false;
    let updated = false;

    if (!contactId && (payload.email || payload.phone)) {
      const matches = await this.client.findContacts({
        email: payload.email,
        phone: payload.phone,
      });

      contactId = readContactId(matches[0]);
    }

    if (contactId) {
      const update = await this.client.updateContact(contactId, payload);
      contactId = firstValue(contactId, readContactId(update));
      updated = true;
    } else {
      const createdPayload = await this.client.createContact(payload);
      contactId = readContactId(createdPayload);
      created = true;
    }

    if (!contactId) {
      throw new IntegrationError('BoldTrail did not return a contact identifier.', [
        { provider: 'boldtrail', operation: 'upsertLead' },
      ]);
    }

    await this.client.addTags(contactId, payload.tags || []);
    await this.client.addNote(contactId, {
      title: 'HomesByRCG Lead Sync',
      details: buildLeadNote(lead),
      reason: 'lead_sync',
    });

    return {
      provider: this.name,
      status: 'accepted',
      contactId,
      created,
      updated,
      skipped: false,
    };
  }

  async syncEvent(event, { lead = null } = {}) {
    const leadIdentifier = findEventLeadIdentifier(event);
    const resolvedLead = lead && lead.leadId ? lead : null;

    const email = resolvedLead?.email ?? null;
    const phone = resolvedLead?.phone ?? null;

    if (!email && !phone && !resolvedLead?.metadata?.crm?.boldtrailContactId) {
      return {
        provider: this.name,
        status: 'skipped',
        reason: leadIdentifier ? 'lead_missing_identity' : 'event_missing_lead_identity',
        skipped: true,
      };
    }

    let contactId = resolvedLead?.metadata?.crm?.boldtrailContactId || null;

    if (!contactId) {
      const matches = await this.client.findContacts({ email, phone });
      contactId = readContactId(matches[0]);
    }

    if (!contactId) {
      return {
        provider: this.name,
        status: 'skipped',
        reason: 'contact_not_found',
        skipped: true,
      };
    }

    const tags = toBoldTrailEventTags(event);
    await this.client.addTags(contactId, tags);
    await this.client.addNote(contactId, {
      title: 'HomesByRCG Event Sync',
      details: buildEventNote(event, { lead: resolvedLead }),
      reason: 'event_sync',
    });

    return {
      provider: this.name,
      status: 'accepted',
      contactId,
      skipped: false,
    };
  }
}
