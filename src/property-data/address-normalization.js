import { ValidationError } from '../errors/index.js';

const directionalMap = new Map([
  ['NORTH', 'N'],
  ['SOUTH', 'S'],
  ['EAST', 'E'],
  ['WEST', 'W'],
  ['NORTHEAST', 'NE'],
  ['NORTHWEST', 'NW'],
  ['SOUTHEAST', 'SE'],
  ['SOUTHWEST', 'SW'],
]);

const suffixMap = new Map([
  ['STREET', 'ST'],
  ['ST', 'ST'],
  ['AVENUE', 'AVE'],
  ['AVE', 'AVE'],
  ['ROAD', 'RD'],
  ['RD', 'RD'],
  ['DRIVE', 'DR'],
  ['DR', 'DR'],
  ['COURT', 'CT'],
  ['CT', 'CT'],
  ['LANE', 'LN'],
  ['LN', 'LN'],
  ['BOULEVARD', 'BLVD'],
  ['BLVD', 'BLVD'],
  ['PLACE', 'PL'],
  ['PL', 'PL'],
  ['CIRCLE', 'CIR'],
  ['CIR', 'CIR'],
  ['WAY', 'WAY'],
  ['PARKWAY', 'PKWY'],
  ['PKWY', 'PKWY'],
  ['TERRACE', 'TER'],
  ['TER', 'TER'],
]);

function normalizeString(value) {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .trim()
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .replace(/\s+/gu, ' ');
  return cleaned || undefined;
}

function normalizeZipCode(value) {
  const normalized = normalizeString(value);

  if (!normalized) return undefined;

  const digits = normalized.replace(/[^0-9]/gu, '');

  if (digits.length < 5) {
    return normalized.toUpperCase();
  }

  if (digits.length >= 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  }

  return digits.slice(0, 5);
}

function normalizeState(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toUpperCase() : undefined;
}

function normalizeAddressLine(value) {
  const normalized = normalizeString(value);

  if (!normalized) return undefined;

  const tokens = normalized
    .replace(/[.,]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toUpperCase()
    .split(' ')
    .filter(Boolean)
    .map((token, index, all) => {
      const directional = directionalMap.get(token);
      if (directional) return directional;

      if (index === all.length - 1 && suffixMap.has(token)) {
        return suffixMap.get(token);
      }

      return token;
    });

  return tokens.join(' ');
}

function splitUnit(addressLine1, addressLine2) {
  const line1 = normalizeAddressLine(addressLine1);
  const line2 = normalizeAddressLine(addressLine2);

  if (!line1) return { line1: undefined, unit: line2 };

  const unitMatch = line1.match(/\b(APT|UNIT|STE|SUITE|#)\s*([A-Z0-9-]+)$/u);
  if (!unitMatch) {
    return { line1, unit: line2 };
  }

  const withoutUnit = line1.slice(0, unitMatch.index).trim();
  const derivedUnit = `${unitMatch[1]} ${unitMatch[2]}`.trim();

  return {
    line1: withoutUnit,
    unit: line2 ?? derivedUnit,
  };
}

export function normalizeAddressInput(payload) {
  const addressLine1 =
    normalizeString(payload?.addressLine1) ?? normalizeString(payload?.propertyAddress);
  const addressLine2 = normalizeString(payload?.addressLine2);
  const city = normalizeString(payload?.city)?.toUpperCase();
  const state = normalizeState(payload?.state);
  const postalCode = normalizeZipCode(payload?.postalCode ?? payload?.zipCode);
  const county = normalizeString(payload?.county)?.toUpperCase();

  const split = splitUnit(addressLine1, addressLine2);

  if (!split.line1) {
    throw new ValidationError('Property address is required.', [
      {
        field: 'addressLine1',
        message: 'addressLine1 or propertyAddress is required.',
      },
    ]);
  }

  const normalized = {
    line1: split.line1,
    line2: split.unit,
    city,
    state,
    postalCode,
    county,
  };

  return {
    ...normalized,
    normalizedAddressLine: [normalized.line1, normalized.line2].filter(Boolean).join(', '),
    normalizedAddressKey: [
      normalized.line1,
      normalized.line2 ?? '-',
      normalized.city ?? '-',
      normalized.state ?? '-',
      normalized.postalCode ?? '-',
    ].join('|'),
    displayAddress: [
      [addressLine1, addressLine2].filter(Boolean).join(' '),
      [normalizeString(payload?.city), normalizeState(payload?.state)].filter(Boolean).join(', '),
      normalizeZipCode(payload?.postalCode ?? payload?.zipCode),
    ]
      .filter(Boolean)
      .join(' '),
  };
}
