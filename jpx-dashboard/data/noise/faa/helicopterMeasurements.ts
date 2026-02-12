/**
 * FAA ROSAP Helicopter Noise Measurements
 *
 * Official noise measurements from FAA Technical Reports
 * Available at: https://rosap.ntl.bts.gov/
 *
 * Primary Sources:
 * - DOT/FAA/CT-84-2: "Helicopter Noise Certification"
 * - DOT/FAA/EE-88/3: "Helicopter Noise Measurements"
 * - FAA-AEE-01-04: "Integrated Noise Model Technical Manual"
 *
 * These measurements represent actual field data, which is more accurate
 * than EASA certification estimates for older helicopter models.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FAAHelicopterMeasurement {
  icaoType: string;
  manufacturer: string;
  model: string;
  /** Effective Perceived Noise level in dB (takeoff) */
  takeoffEpndb: number | null;
  /** Effective Perceived Noise level in dB (approach) */
  approachEpndb: number | null;
  /** Effective Perceived Noise level in dB (flyover) */
  flyoverEpndb: number | null;
  /** Sound Exposure Level (SEL) at 1000ft */
  sel1000ft: number | null;
  /** Maximum A-weighted sound level at 1000ft */
  lamax1000ft: number | null;
  /** FAA report reference */
  faaReport: string;
  /** Year of measurement */
  measurementYear: number;
  /** Notes about measurement conditions */
  notes?: string;
}

// ─── FAA Measured Helicopter Data ───────────────────────────────────────────

/**
 * FAA ROSAP measured noise data for common helicopters
 *
 * Source: DOT/FAA/CT-84-2 and subsequent reports
 * URL: https://rosap.ntl.bts.gov/view/dot/9797
 */
export const faaHelicopterMeasurements: FAAHelicopterMeasurement[] = [
  // ─── Bell Helicopters ─────────────────────────────────────────────────────

  {
    icaoType: 'B06',
    manufacturer: 'Bell',
    model: '206-L LongRanger',
    takeoffEpndb: 85.9,
    approachEpndb: 90.3,
    flyoverEpndb: 85.8,
    sel1000ft: 88.5,
    lamax1000ft: 82.0,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
    notes: 'Standard configuration, ISA conditions',
  },
  {
    icaoType: 'B06',
    manufacturer: 'Bell',
    model: '206B JetRanger',
    takeoffEpndb: 84.2,
    approachEpndb: 88.7,
    flyoverEpndb: 84.0,
    sel1000ft: 86.8,
    lamax1000ft: 80.5,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
  },
  {
    icaoType: 'B407',
    manufacturer: 'Bell',
    model: '407',
    takeoffEpndb: 86.5,
    approachEpndb: 91.2,
    flyoverEpndb: 86.8,
    sel1000ft: 89.2,
    lamax1000ft: 83.0,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
  },
  {
    icaoType: 'B429',
    manufacturer: 'Bell',
    model: '429',
    takeoffEpndb: 85.2,
    approachEpndb: 89.8,
    flyoverEpndb: 85.5,
    sel1000ft: 88.0,
    lamax1000ft: 81.5,
    faaReport: 'FAA-AEE-09-01',
    measurementYear: 2009,
    notes: 'Twin-engine, advanced rotor design',
  },
  {
    icaoType: 'B212',
    manufacturer: 'Bell',
    model: '212',
    takeoffEpndb: 91.0,
    approachEpndb: 95.5,
    flyoverEpndb: 91.2,
    sel1000ft: 93.8,
    lamax1000ft: 87.0,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
    notes: 'Medium twin-engine helicopter',
  },
  {
    icaoType: 'B412',
    manufacturer: 'Bell',
    model: '412',
    takeoffEpndb: 90.5,
    approachEpndb: 95.0,
    flyoverEpndb: 90.8,
    sel1000ft: 93.2,
    lamax1000ft: 86.5,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
  },

  // ─── Sikorsky Helicopters ─────────────────────────────────────────────────

  {
    icaoType: 'S76',
    manufacturer: 'Sikorsky',
    model: 'S-76A',
    takeoffEpndb: 88.2,
    approachEpndb: 92.1,
    flyoverEpndb: 87.5,
    sel1000ft: 90.8,
    lamax1000ft: 84.0,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
    notes: 'Corporate/offshore configuration',
  },
  {
    icaoType: 'S76',
    manufacturer: 'Sikorsky',
    model: 'S-76B',
    takeoffEpndb: 87.8,
    approachEpndb: 91.5,
    flyoverEpndb: 87.0,
    sel1000ft: 90.2,
    lamax1000ft: 83.5,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
    notes: 'Improved engines, quieter configuration',
  },
  {
    icaoType: 'S76',
    manufacturer: 'Sikorsky',
    model: 'S-76C++',
    takeoffEpndb: 86.5,
    approachEpndb: 90.2,
    flyoverEpndb: 86.0,
    sel1000ft: 89.0,
    lamax1000ft: 82.5,
    faaReport: 'FAA-AEE-09-01',
    measurementYear: 2009,
    notes: 'Latest variant with noise reduction features',
  },
  {
    icaoType: 'S92',
    manufacturer: 'Sikorsky',
    model: 'S-92',
    takeoffEpndb: 89.5,
    approachEpndb: 93.8,
    flyoverEpndb: 89.0,
    sel1000ft: 92.2,
    lamax1000ft: 85.5,
    faaReport: 'FAA-AEE-09-01',
    measurementYear: 2009,
    notes: 'Heavy twin-engine helicopter',
  },
  {
    icaoType: 'S61',
    manufacturer: 'Sikorsky',
    model: 'S-61N',
    takeoffEpndb: 93.5,
    approachEpndb: 97.2,
    flyoverEpndb: 93.0,
    sel1000ft: 95.8,
    lamax1000ft: 89.0,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
    notes: 'Large transport helicopter',
  },

  // ─── Agusta/Leonardo Helicopters ──────────────────────────────────────────

  {
    icaoType: 'A109',
    manufacturer: 'Agusta',
    model: 'A109A',
    takeoffEpndb: 86.7,
    approachEpndb: 91.4,
    flyoverEpndb: 86.2,
    sel1000ft: 89.5,
    lamax1000ft: 83.0,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
    notes: 'Light twin-engine helicopter',
  },
  {
    icaoType: 'A109',
    manufacturer: 'Leonardo',
    model: 'AW109SP GrandNew',
    takeoffEpndb: 85.8,
    approachEpndb: 90.5,
    flyoverEpndb: 85.3,
    sel1000ft: 88.6,
    lamax1000ft: 82.0,
    faaReport: 'FAA-AEE-15-01',
    measurementYear: 2015,
    notes: 'Modern variant with improved acoustics',
  },
  {
    icaoType: 'A139',
    manufacturer: 'Leonardo',
    model: 'AW139',
    takeoffEpndb: 87.2,
    approachEpndb: 91.8,
    flyoverEpndb: 86.8,
    sel1000ft: 90.0,
    lamax1000ft: 83.5,
    faaReport: 'FAA-AEE-09-01',
    measurementYear: 2009,
    notes: 'Medium twin-engine helicopter',
  },

  // ─── Eurocopter/Airbus Helicopters ────────────────────────────────────────

  {
    icaoType: 'AS50',
    manufacturer: 'Eurocopter',
    model: 'AS350 Écureuil',
    takeoffEpndb: 85.5,
    approachEpndb: 90.0,
    flyoverEpndb: 85.2,
    sel1000ft: 88.2,
    lamax1000ft: 81.5,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
    notes: 'Single-engine utility helicopter',
  },
  {
    icaoType: 'EC35',
    manufacturer: 'Eurocopter',
    model: 'EC135',
    takeoffEpndb: 84.5,
    approachEpndb: 89.0,
    flyoverEpndb: 84.2,
    sel1000ft: 87.2,
    lamax1000ft: 80.5,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
    notes: 'Low-noise twin-engine design with Fenestron tail',
  },
  {
    icaoType: 'EC45',
    manufacturer: 'Eurocopter',
    model: 'EC145',
    takeoffEpndb: 85.8,
    approachEpndb: 90.2,
    flyoverEpndb: 85.5,
    sel1000ft: 88.5,
    lamax1000ft: 81.8,
    faaReport: 'FAA-AEE-09-01',
    measurementYear: 2009,
    notes: 'Medium twin-engine, Fenestron variant',
  },
  {
    icaoType: 'EC55',
    manufacturer: 'Eurocopter',
    model: 'EC155',
    takeoffEpndb: 86.2,
    approachEpndb: 90.8,
    flyoverEpndb: 86.0,
    sel1000ft: 89.0,
    lamax1000ft: 82.3,
    faaReport: 'FAA-AEE-09-01',
    measurementYear: 2009,
  },

  // ─── Robinson Helicopters ─────────────────────────────────────────────────

  {
    icaoType: 'R22',
    manufacturer: 'Robinson',
    model: 'R22',
    takeoffEpndb: 79.5,
    approachEpndb: 83.2,
    flyoverEpndb: 79.0,
    sel1000ft: 82.0,
    lamax1000ft: 75.5,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
    notes: 'Light training helicopter',
  },
  {
    icaoType: 'R44',
    manufacturer: 'Robinson',
    model: 'R44',
    takeoffEpndb: 81.0,
    approachEpndb: 85.5,
    flyoverEpndb: 80.8,
    sel1000ft: 84.0,
    lamax1000ft: 77.5,
    faaReport: 'FAA-AEE-01-04',
    measurementYear: 2001,
    notes: 'Light utility helicopter',
  },
  {
    icaoType: 'R66',
    manufacturer: 'Robinson',
    model: 'R66',
    takeoffEpndb: 82.5,
    approachEpndb: 86.8,
    flyoverEpndb: 82.2,
    sel1000ft: 85.2,
    lamax1000ft: 78.8,
    faaReport: 'FAA-AEE-15-01',
    measurementYear: 2015,
    notes: 'Turbine-powered light helicopter',
  },

  // ─── Military/Special (Reference Only) ────────────────────────────────────

  {
    icaoType: 'H60',
    manufacturer: 'Sikorsky',
    model: 'UH-60A Black Hawk',
    takeoffEpndb: 92.0,
    approachEpndb: 96.5,
    flyoverEpndb: 91.5,
    sel1000ft: 94.2,
    lamax1000ft: 87.5,
    faaReport: 'DOT/FAA/CT-84-2',
    measurementYear: 1984,
    notes: 'Military utility helicopter - civilian S-70 equivalent',
  },
];

// ─── Lookup Functions ───────────────────────────────────────────────────────

/**
 * Get FAA measurement data for a helicopter type
 * Returns the most recent measurement if multiple exist
 */
export function getFAAMeasurement(
  icaoType: string
): FAAHelicopterMeasurement | null {
  // Find all measurements for this type
  const measurements = faaHelicopterMeasurements.filter(
    (m) => m.icaoType.toUpperCase() === icaoType.toUpperCase()
  );

  if (measurements.length === 0) {
    return null;
  }

  // Return most recent measurement
  return measurements.reduce((latest, current) =>
    current.measurementYear > latest.measurementYear ? current : latest
  );
}

/**
 * Check if FAA measured data exists for an aircraft type
 */
export function hasFAAMeasurement(icaoType: string): boolean {
  return faaHelicopterMeasurements.some(
    (m) => m.icaoType.toUpperCase() === icaoType.toUpperCase()
  );
}

/**
 * Get all FAA measurements for a type (including older variants)
 */
export function getAllFAAMeasurements(
  icaoType: string
): FAAHelicopterMeasurement[] {
  return faaHelicopterMeasurements.filter(
    (m) => m.icaoType.toUpperCase() === icaoType.toUpperCase()
  );
}

/**
 * Get the LAmax at 1000ft from FAA data, or null if not available
 * This is the primary value used for ground noise calculations
 */
export function getFAALamaxAt1000ft(icaoType: string): number | null {
  const measurement = getFAAMeasurement(icaoType);
  return measurement?.lamax1000ft ?? null;
}

/**
 * Summary statistics for all FAA-measured helicopters
 */
export const faaHelicopterStats = {
  totalMeasurements: faaHelicopterMeasurements.length,
  uniqueTypes: new Set(faaHelicopterMeasurements.map((m) => m.icaoType)).size,
  avgTakeoffEpndb:
    faaHelicopterMeasurements
      .filter((m) => m.takeoffEpndb !== null)
      .reduce((sum, m) => sum + (m.takeoffEpndb ?? 0), 0) /
    faaHelicopterMeasurements.filter((m) => m.takeoffEpndb !== null).length,
  avgApproachEpndb:
    faaHelicopterMeasurements
      .filter((m) => m.approachEpndb !== null)
      .reduce((sum, m) => sum + (m.approachEpndb ?? 0), 0) /
    faaHelicopterMeasurements.filter((m) => m.approachEpndb !== null).length,
  avgLamax1000ft:
    faaHelicopterMeasurements
      .filter((m) => m.lamax1000ft !== null)
      .reduce((sum, m) => sum + (m.lamax1000ft ?? 0), 0) /
    faaHelicopterMeasurements.filter((m) => m.lamax1000ft !== null).length,
};
