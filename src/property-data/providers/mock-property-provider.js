import { PropertyProvider } from '../property-provider.js';
import { PropertyResolutionStatus } from '../status.js';

const mockRecords = [
  {
    key: '123 MAIN ST|COLUMBUS|OH|43215',
    providerPropertyId: 'mock-1001',
    parcel: {
      apn: '010-123456',
      parcelId: '010123456',
    },
    jurisdiction: {
      county: 'FRANKLIN',
      municipality: 'COLUMBUS',
      state: 'OH',
    },
    address: {
      displayAddress: '123 Main St, Columbus, OH 43215',
    },
    characteristics: {
      propertyType: 'single-family',
      yearBuilt: 1988,
      bedrooms: 3,
      bathrooms: 2,
      livingAreaSqft: 1840,
      lotSizeSqft: 6534,
    },
    assessment: {
      assessedValue: 295000,
      landAssessedValue: 85000,
      improvementAssessedValue: 210000,
      taxYear: 2025,
    },
    valuations: {
      providerEstimate: null,
      homesByRcgEstimate: null,
      userVisibleValue: null,
      cmaValue: null,
    },
  },
  {
    key: '500 MARKET ST|COLUMBUS|OH|43215',
    providerPropertyId: 'mock-2001',
    parcel: {
      apn: '010-998877',
      parcelId: '010998877',
    },
    jurisdiction: {
      county: 'FRANKLIN',
      municipality: 'COLUMBUS',
      state: 'OH',
    },
    address: {
      displayAddress: '500 Market St, Columbus, OH 43215',
    },
    characteristics: {
      propertyType: 'multi-family',
      yearBuilt: 1974,
      bedrooms: null,
      bathrooms: null,
      livingAreaSqft: 4510,
      lotSizeSqft: 10890,
    },
    assessment: {
      assessedValue: 512000,
      landAssessedValue: 162000,
      improvementAssessedValue: 350000,
      taxYear: 2025,
    },
    valuations: {
      providerEstimate: null,
      homesByRcgEstimate: null,
      userVisibleValue: null,
      cmaValue: null,
    },
  },
  {
    key: '500 MARKET ST|COLUMBUS|OH|43215',
    providerPropertyId: 'mock-2002',
    parcel: {
      apn: '010-998878',
      parcelId: '010998878',
    },
    jurisdiction: {
      county: 'FRANKLIN',
      municipality: 'COLUMBUS',
      state: 'OH',
    },
    address: {
      displayAddress: '500 Market St Unit 2, Columbus, OH 43215',
    },
    characteristics: {
      propertyType: 'condo',
      yearBuilt: 1974,
      bedrooms: 2,
      bathrooms: 1,
      livingAreaSqft: 980,
      lotSizeSqft: null,
    },
    assessment: {
      assessedValue: 198000,
      landAssessedValue: null,
      improvementAssessedValue: null,
      taxYear: 2025,
    },
    valuations: {
      providerEstimate: null,
      homesByRcgEstimate: null,
      userVisibleValue: null,
      cmaValue: null,
    },
  },
];

function mockKey(normalizedAddress) {
  return [
    normalizedAddress.line1,
    normalizedAddress.city ?? '-',
    normalizedAddress.state ?? '-',
    normalizedAddress.postalCode ?? '-',
  ].join('|');
}

export class MockPropertyProvider extends PropertyProvider {
  constructor() {
    super({ name: 'mock' });
  }

  async resolveProperty({ normalizedAddress }) {
    const key = mockKey(normalizedAddress);
    const matches = mockRecords.filter((record) => record.key === key);

    if (matches.length === 0) {
      return {
        status: PropertyResolutionStatus.NOT_FOUND,
        provider: this.name,
        retrievedAt: new Date().toISOString(),
        matches: [],
      };
    }

    return {
      status:
        matches.length === 1
          ? PropertyResolutionStatus.FOUND
          : PropertyResolutionStatus.MULTIPLE_MATCHES,
      provider: this.name,
      retrievedAt: new Date().toISOString(),
      matches,
    };
  }
}
