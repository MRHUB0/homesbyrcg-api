const redacted = '[REDACTED]';

export function redactLead(lead) {
  if (!lead) {
    return lead;
  }

  return {
    ...lead,
    firstName: redactValue(lead.firstName),
    lastName: redactValue(lead.lastName),
    email: redactEmail(lead.email),
    phone: redactValue(lead.phone),
    notes: redactValue(lead.notes),
    metadata: redactMetadata(lead.metadata),
    leadContext: redactMetadata(lead.leadContext),
    journeyTimeline: Array.isArray(lead.journeyTimeline)
      ? lead.journeyTimeline.map((event) => redactMetadata(event))
      : lead.journeyTimeline,
  };
}

export function redactValidationErrors(errors = []) {
  return errors.map((error) => ({
    ...error,
    value: error.value === undefined ? undefined : redacted,
  }));
}

function redactMetadata(metadata = {}) {
  if (Array.isArray(metadata)) {
    return metadata.map((value) => redactNestedValue(value));
  }

  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (
        ['message', 'name', 'email', 'phone', 'notes'].some((field) =>
          key.toLowerCase().includes(field),
        )
      ) {
        return [key, redactValue(value)];
      }

      return [key, redactNestedValue(value)];
    }),
  );
}

function redactNestedValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactNestedValue(item));
  }

  if (value && typeof value === 'object') {
    return redactMetadata(value);
  }

  return value;
}

function redactEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return redactValue(email);
  }

  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

function redactValue(value) {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  return redacted;
}
