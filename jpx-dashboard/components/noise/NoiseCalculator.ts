// Altitude-based noise calculations using inverse square law
// Reference: Sound decreases ~6dB per doubling of distance

export const REFERENCE_ALTITUDE = 1000; // feet AGL
export const STANDARD_ALTITUDES = [500, 1000, 2000, 3000] as const;

/**
 * Calculate noise level at a given altitude using inverse square law
 * @param baseDb - Reference dB level (at 1000ft)
 * @param altitude - Target altitude in feet
 * @param referenceAlt - Reference altitude (default 1000ft)
 * @returns Adjusted dB level
 */
export function calculateDbAtAltitude(
  baseDb: number,
  altitude: number,
  referenceAlt: number = REFERENCE_ALTITUDE
): number {
  if (altitude <= 0) return baseDb + 20; // Very loud at ground level

  // Inverse square law: 20 * log10(r1/r2)
  const ratio = referenceAlt / altitude;
  const attenuation = 20 * Math.log10(ratio);

  return Math.round((baseDb + attenuation) * 10) / 10;
}

/**
 * Generate altitude profile showing dB at standard altitudes
 */
export function generateAltitudeProfile(
  baseDb: number,
  altitudes: readonly number[] = STANDARD_ALTITUDES
): { altitude: number; db: number }[] {
  return altitudes.map((alt) => ({
    altitude: alt,
    db: calculateDbAtAltitude(baseDb, alt),
  }));
}

/**
 * Typical altitude patterns for arrivals and departures
 */
export const ALTITUDE_PATTERNS = {
  departure: [
    { t: 0.0, altitude: 100, phase: 'takeoff' as const },
    { t: 0.1, altitude: 500, phase: 'climb' as const },
    { t: 0.2, altitude: 1000, phase: 'climb' as const },
    { t: 0.3, altitude: 1800, phase: 'climb' as const },
    { t: 0.4, altitude: 2500, phase: 'climb' as const },
    { t: 0.6, altitude: 3500, phase: 'cruise' as const },
    { t: 0.8, altitude: 5000, phase: 'cruise' as const },
    { t: 1.0, altitude: 6000, phase: 'cruise' as const },
  ],
  arrival: [
    { t: 0.0, altitude: 6000, phase: 'cruise' as const },
    { t: 0.2, altitude: 5000, phase: 'descent' as const },
    { t: 0.4, altitude: 3500, phase: 'descent' as const },
    { t: 0.6, altitude: 2500, phase: 'approach' as const },
    { t: 0.7, altitude: 1800, phase: 'approach' as const },
    { t: 0.8, altitude: 1200, phase: 'approach' as const },
    { t: 0.9, altitude: 600, phase: 'approach' as const },
    { t: 1.0, altitude: 100, phase: 'approach' as const },
  ],
};

export type FlightPhase = 'takeoff' | 'climb' | 'cruise' | 'descent' | 'approach';

/**
 * Get altitude and phase for a position along the flight path
 * @param t - Position along path (0 = origin, 1 = destination)
 * @param direction - Flight direction
 */
export function getAltitudeAtPosition(
  t: number,
  direction: 'arrival' | 'departure'
): { altitude: number; phase: FlightPhase } {
  const pattern = ALTITUDE_PATTERNS[direction];

  // Find the two points to interpolate between
  let lower = pattern[0];
  let upper = pattern[pattern.length - 1];

  for (let i = 0; i < pattern.length - 1; i++) {
    if (t >= pattern[i].t && t <= pattern[i + 1].t) {
      lower = pattern[i];
      upper = pattern[i + 1];
      break;
    }
  }

  // Linear interpolation
  const ratio = (t - lower.t) / (upper.t - lower.t || 1);
  const altitude = Math.round(lower.altitude + ratio * (upper.altitude - lower.altitude));

  return {
    altitude,
    phase: upper.phase,
  };
}

/**
 * Format altitude for display
 */
export function formatAltitude(altitude: number): string {
  if (altitude >= 1000) {
    return `${(altitude / 1000).toFixed(1)}k'`;
  }
  return `${altitude}'`;
}

/**
 * Get color for dB level
 */
export function getDbLevelColor(db: number): string {
  if (db < 65) return '#22c55e'; // green
  if (db < 75) return '#84cc16'; // lime
  if (db < 82) return '#eab308'; // yellow
  if (db < 88) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get noise category label
 */
export function getNoiseLabel(db: number): string {
  if (db < 65) return 'Quiet';
  if (db < 75) return 'Moderate';
  if (db < 85) return 'Loud';
  return 'Very Loud';
}
