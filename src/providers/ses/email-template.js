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
    .map(([key, value]) => [formatLabel(key), value]);
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
