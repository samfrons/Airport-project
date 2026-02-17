/**
 * East Hampton area streets with real coordinates for mock complaint generation.
 * These are actual street names in the airport impact zone around KJPX.
 */

export interface StreetLocation {
  street: string;
  lat: number;
  lng: number;
  zipCode: string;
}

export interface MunicipalityData {
  name: string;
  streets: StreetLocation[];
  weight: number; // Relative complaint frequency weight
}

/**
 * Real street data for East Hampton area municipalities.
 * Coordinates are approximate center points for each street.
 */
export const EAST_HAMPTON_STREETS: Record<string, MunicipalityData> = {
  Wainscott: {
    name: 'Wainscott',
    weight: 0.25, // Closest to airport, most complaints
    streets: [
      { street: 'Wainscott Main Street', lat: 40.9381, lng: -72.2401, zipCode: '11975' },
      { street: 'Beach Lane', lat: 40.9320, lng: -72.2380, zipCode: '11975' },
      { street: 'Town Line Road', lat: 40.9450, lng: -72.2550, zipCode: '11975' },
      { street: 'Wainscott Stone Road', lat: 40.9365, lng: -72.2320, zipCode: '11975' },
      { street: 'Daniels Lane', lat: 40.9398, lng: -72.2445, zipCode: '11975' },
      { street: 'Montauk Highway', lat: 40.9340, lng: -72.2390, zipCode: '11975' },
      { street: 'Georgica Road', lat: 40.9420, lng: -72.2280, zipCode: '11975' },
      { street: 'Wainscott Northwest Road', lat: 40.9510, lng: -72.2520, zipCode: '11975' },
      { street: 'Sayres Path', lat: 40.9355, lng: -72.2360, zipCode: '11975' },
      { street: 'Kellis Pond Lane', lat: 40.9388, lng: -72.2480, zipCode: '11975' },
      { street: 'Hedges Lane', lat: 40.9295, lng: -72.2340, zipCode: '11975' },
      { street: 'Whalebone Landing Road', lat: 40.9445, lng: -72.2410, zipCode: '11975' },
    ],
  },
  Sagaponack: {
    name: 'Sagaponack',
    weight: 0.15, // Near departure path
    streets: [
      { street: 'Sagaponack Main Street', lat: 40.9251, lng: -72.2690, zipCode: '11962' },
      { street: 'Sagg Road', lat: 40.9280, lng: -72.2750, zipCode: '11962' },
      { street: 'Parsonage Lane', lat: 40.9220, lng: -72.2680, zipCode: '11962' },
      { street: 'Gibson Lane', lat: 40.9195, lng: -72.2720, zipCode: '11962' },
      { street: 'Daniels Lane', lat: 40.9310, lng: -72.2630, zipCode: '11962' },
      { street: "Peter's Pond Lane", lat: 40.9265, lng: -72.2800, zipCode: '11962' },
      { street: 'Town Line Road', lat: 40.9320, lng: -72.2580, zipCode: '11962' },
      { street: 'Bridge Lane', lat: 40.9185, lng: -72.2760, zipCode: '11962' },
      { street: 'Fairfield Pond Lane', lat: 40.9240, lng: -72.2610, zipCode: '11962' },
      { street: 'Potato Road', lat: 40.9298, lng: -72.2710, zipCode: '11962' },
    ],
  },
  Bridgehampton: {
    name: 'Bridgehampton',
    weight: 0.18, // Under flight path
    streets: [
      { street: 'Main Street', lat: 40.9379, lng: -72.2982, zipCode: '11932' },
      { street: 'Ocean Road', lat: 40.9250, lng: -72.3050, zipCode: '11932' },
      { street: 'Butter Lane', lat: 40.9420, lng: -72.2890, zipCode: '11932' },
      { street: 'Sagaponack Road', lat: 40.9355, lng: -72.2920, zipCode: '11932' },
      { street: 'Lumber Lane', lat: 40.9488, lng: -72.3020, zipCode: '11932' },
      { street: 'Scuttle Hole Road', lat: 40.9510, lng: -72.3090, zipCode: '11932' },
      { street: 'Halsey Lane', lat: 40.9290, lng: -72.3010, zipCode: '11932' },
      { street: "Paul's Lane", lat: 40.9340, lng: -72.3040, zipCode: '11932' },
      { street: 'Narrow Lane', lat: 40.9405, lng: -72.3065, zipCode: '11932' },
      { street: 'Brick Kiln Road', lat: 40.9465, lng: -72.2945, zipCode: '11932' },
      { street: 'Hildreth Lane', lat: 40.9315, lng: -72.2880, zipCode: '11932' },
    ],
  },
  'East Hampton Village': {
    name: 'East Hampton Village',
    weight: 0.12,
    streets: [
      { street: 'Main Street', lat: 40.9633, lng: -72.1848, zipCode: '11937' },
      { street: 'Newtown Lane', lat: 40.9645, lng: -72.1890, zipCode: '11937' },
      { street: 'Egypt Lane', lat: 40.9580, lng: -72.1920, zipCode: '11937' },
      { street: 'Lily Pond Lane', lat: 40.9520, lng: -72.1780, zipCode: '11937' },
      { street: 'Further Lane', lat: 40.9450, lng: -72.1850, zipCode: '11937' },
      { street: 'Georgica Road', lat: 40.9490, lng: -72.2050, zipCode: '11937' },
      { street: 'Dunemere Lane', lat: 40.9480, lng: -72.1750, zipCode: '11937' },
      { street: 'Middle Lane', lat: 40.9610, lng: -72.1830, zipCode: '11937' },
      { street: 'Huntting Lane', lat: 40.9625, lng: -72.1860, zipCode: '11937' },
      { street: 'Ocean Avenue', lat: 40.9540, lng: -72.1890, zipCode: '11937' },
    ],
  },
  'Northwest Woods': {
    name: 'Northwest Woods',
    weight: 0.08, // Further from flight paths
    streets: [
      { street: 'Northwest Road', lat: 40.9820, lng: -72.2150, zipCode: '11937' },
      { street: 'Springs Fireplace Road', lat: 40.9780, lng: -72.2050, zipCode: '11937' },
      { street: 'Northwest Landing Road', lat: 40.9890, lng: -72.2180, zipCode: '11937' },
      { street: 'Cedar Street', lat: 40.9760, lng: -72.2090, zipCode: '11937' },
      { street: 'Swamp Road', lat: 40.9845, lng: -72.2110, zipCode: '11937' },
      { street: 'Mile Hill Road', lat: 40.9810, lng: -72.2220, zipCode: '11937' },
      { street: 'Fresh Pond Road', lat: 40.9730, lng: -72.2180, zipCode: '11937' },
      { street: 'Two Mile Hollow Road', lat: 40.9705, lng: -72.2050, zipCode: '11937' },
    ],
  },
  Springs: {
    name: 'Springs',
    weight: 0.07,
    streets: [
      { street: 'Springs Fireplace Road', lat: 40.9710, lng: -72.1560, zipCode: '11937' },
      { street: 'Old Stone Highway', lat: 40.9650, lng: -72.1480, zipCode: '11937' },
      { street: 'Three Mile Harbor Road', lat: 40.9820, lng: -72.1680, zipCode: '11937' },
      { street: 'Gerard Drive', lat: 40.9745, lng: -72.1520, zipCode: '11937' },
      { street: 'Accabonac Road', lat: 40.9580, lng: -72.1390, zipCode: '11937' },
      { street: 'Neck Path', lat: 40.9690, lng: -72.1440, zipCode: '11937' },
      { street: 'Fireplace Road', lat: 40.9680, lng: -72.1580, zipCode: '11937' },
      { street: 'Fort Pond Boulevard', lat: 40.9755, lng: -72.1620, zipCode: '11937' },
    ],
  },
  Amagansett: {
    name: 'Amagansett',
    weight: 0.08,
    streets: [
      { street: 'Main Street', lat: 40.9736, lng: -72.1378, zipCode: '11930' },
      { street: 'Montauk Highway', lat: 40.9720, lng: -72.1420, zipCode: '11930' },
      { street: 'Bluff Road', lat: 40.9680, lng: -72.1250, zipCode: '11930' },
      { street: 'Indian Wells Highway', lat: 40.9750, lng: -72.1180, zipCode: '11930' },
      { street: 'Atlantic Avenue', lat: 40.9620, lng: -72.1340, zipCode: '11930' },
      { street: "Abraham's Path", lat: 40.9790, lng: -72.1290, zipCode: '11930' },
      { street: 'Napeague Lane', lat: 40.9810, lng: -72.1350, zipCode: '11930' },
      { street: 'Cross Highway', lat: 40.9770, lng: -72.1400, zipCode: '11930' },
    ],
  },
  'Sag Harbor': {
    name: 'Sag Harbor',
    weight: 0.07,
    streets: [
      { street: 'Main Street', lat: 40.9998, lng: -72.2928, zipCode: '11963' },
      { street: 'Division Street', lat: 40.9980, lng: -72.2950, zipCode: '11963' },
      { street: 'Madison Street', lat: 40.9965, lng: -72.2910, zipCode: '11963' },
      { street: 'Bay Street', lat: 41.0020, lng: -72.2980, zipCode: '11963' },
      { street: 'Long Island Avenue', lat: 40.9950, lng: -72.2890, zipCode: '11963' },
      { street: 'Hampton Street', lat: 40.9935, lng: -72.2960, zipCode: '11963' },
      { street: 'Bridge Street', lat: 41.0008, lng: -72.2940, zipCode: '11963' },
      { street: 'Jermain Avenue', lat: 40.9990, lng: -72.2870, zipCode: '11963' },
    ],
  },
};

/**
 * All municipalities in order of proximity to KJPX airport.
 */
export const MUNICIPALITIES = Object.keys(EAST_HAMPTON_STREETS);

/**
 * Get a weighted random municipality based on complaint frequency.
 */
export function getWeightedMunicipality(): string {
  const totalWeight = Object.values(EAST_HAMPTON_STREETS).reduce(
    (sum, m) => sum + m.weight,
    0
  );
  let random = Math.random() * totalWeight;

  for (const [key, data] of Object.entries(EAST_HAMPTON_STREETS)) {
    random -= data.weight;
    if (random <= 0) {
      return key;
    }
  }

  return 'Wainscott'; // Default fallback
}

/**
 * Get a random street from a municipality.
 */
export function getRandomStreet(municipality: string): StreetLocation {
  const data = EAST_HAMPTON_STREETS[municipality];
  if (!data) {
    return EAST_HAMPTON_STREETS.Wainscott.streets[0];
  }
  return data.streets[Math.floor(Math.random() * data.streets.length)];
}

/**
 * Get all streets across all municipalities.
 */
export function getAllStreets(): Array<StreetLocation & { municipality: string }> {
  const streets: Array<StreetLocation & { municipality: string }> = [];

  for (const [municipality, data] of Object.entries(EAST_HAMPTON_STREETS)) {
    for (const street of data.streets) {
      streets.push({ ...street, municipality });
    }
  }

  return streets;
}
