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
  };
}

export function redactValidationErrors(errors = []) {
  return errors.map((error) => ({
    ...error,
    value: error.value === undefined ? undefined : redacted,
  }));
}

function redactMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (
        ['message', 'name', 'email', 'phone', 'notes'].some((field) =>
          key.toLowerCase().includes(field),
        )
      ) {
        return [key, redactValue(value)];
      }

      return [key, value];
    }),
  );
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
