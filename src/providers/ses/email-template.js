const brand = {
  company: 'Homes by RCG',
  realtor: 'Malik Roberts, REALTOR®',
  brokerage: 'Brokered by Affordable Real Estate Company',
};

export function renderLeadEmail({ lead, title }) {
  const rows = [
    ['Lead Type', lead.leadType],
    ['Name', `${lead.firstName} ${lead.lastName}`],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Journey Source', lead.journeySource],
    ['Current Page', lead.currentPage],
    ['Lead Intent', lead.leadIntent],
    ['Lead Score', lead.leadScore],
    ['Lead Score Band', lead.leadScoreBand],
    ['Decision Journey', lead.leadContext?.decisionJourney],
    ['Primary Goal', lead.leadContext?.primaryGoal],
    ['Campaign', lead.campaign],
    ['Referral', lead.referral],
    ['Message', lead.notes],
    ['Timestamp', lead.timestamp],
    ['Request ID', lead.requestId],
    ['Correlation ID', lead.correlationId],
    ...metadataRows(lead.metadata),
  ];

  return {
    subject: `${brand.company} ${title}: ${lead.firstName} ${lead.lastName}`,
    html: renderHtml(rows, title),
    text: renderText(rows, title),
  };
}

export function renderEventConfirmationEmail({ lead }) {
  const title = 'Affordable Real Estate Company Event';
  const firstName = escapeHtml(lead.firstName || 'there');
  return {
    subject: `${title}: we received your interest`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial,sans-serif;color:#14241f"><div style="max-width:620px;margin:auto;padding:24px"><h1 style="font-size:24px">Thank you, ${firstName}.</h1><p>Thank you for registering your interest in the upcoming Affordable Real Estate Company event.</p><p>We received your information. Full event details, including the confirmed date, time, and location, will be provided when available.</p><p>Affordable Real Estate Company<br><span style="font-size:13px">Powered by HomesByRCG</span></p></div></body></html>`,
    text: `Thank you, ${lead.firstName || 'there'}.\n\nThank you for registering your interest in the upcoming Affordable Real Estate Company event.\n\nWe received your information. Full event details, including the confirmed date, time, and location, will be provided when available.\n\nAffordable Real Estate Company\nPowered by HomesByRCG`,
  };
}

function renderHtml(rows, title) {
  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <th style="text-align:left;padding:10px 12px;background:#f6f7f8;border-bottom:1px solid #e5e7eb;width:180px;font-family:Arial,sans-serif;font-size:14px;color:#111827;">${escapeHtml(label)}</th>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;color:#111827;">${escapeHtml(String(value ?? ''))}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#111827;color:#ffffff;padding:20px 24px;">
          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;">${brand.company}</div>
          <div style="font-family:Arial,sans-serif;font-size:14px;margin-top:6px;">${brand.realtor}</div>
          <div style="font-family:Arial,sans-serif;font-size:13px;margin-top:2px;color:#d1d5db;">${brand.brokerage}</div>
        </div>
        <div style="padding:24px;">
          <h1 style="font-family:Arial,sans-serif;font-size:20px;color:#111827;margin:0 0 16px;">${escapeHtml(title)}</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
            ${rowHtml}
          </table>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function renderText(rows, title) {
  return [
    brand.company,
    brand.realtor,
    brand.brokerage,
    '',
    title,
    '',
    ...rows.map(([label, value]) => `${label}: ${value ?? ''}`),
  ].join('\n');
}

function metadataRows(metadata = {}) {
  return Object.entries(metadata)
    .filter(([key]) => key !== 'originalEndpoint')
    .map(([key, value]) => [formatLabel(key), formatValue(value)]);
}

function formatValue(value) {
  return value && typeof value === 'object' ? JSON.stringify(value) : value;
}

function formatLabel(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
