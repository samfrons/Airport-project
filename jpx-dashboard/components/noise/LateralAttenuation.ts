/**
 * Lateral Attenuation Model
 *
 * Implementation of SAE-AIR-5662 simplified lateral attenuation model
 * for aircraft noise calculations.
 *
 * Lateral attenuation accounts for the reduction in noise when an observer
 * is not directly beneath the aircraft's flight path. This is caused by:
 * - Ground reflection interference
 * - Atmospheric refraction
 * - Engine/airframe directivity patterns
 *
 * Reference: SAE-AIR-5662 - Method for Predicting Lateral Attenuation of Airplane Noise
 */

export interface LateralAttenuationData {
  /** Angle from directly beneath aircraft (0°) to perpendicular (90°) */
  angleDegrees: number;
  /** Attenuation in dB */
  attenuationDb: number;
  /** Category descriptor */
  description: string;
}

/**
 * SAE-AIR-5662 Simplified Lateral Attenuation Table
 *
 * These values represent typical attenuation for a mix of aircraft types.
 * Actual attenuation varies by:
 * - Aircraft type (jets vs propeller vs helicopter)
 * - Engine mounting (under-wing vs fuselage vs tail)
 * - Ground surface (hard vs soft)
 * - Atmospheric conditions
 */
export const LATERAL_ATTENUATION_TABLE: LateralAttenuationData[] = [
  { angleDegrees: 0, attenuationDb: 0, description: 'Directly below flight path' },
  { angleDegrees: 10, attenuationDb: 0.5, description: 'Nearly overhead' },
  { angleDegrees: 20, attenuationDb: 1.2, description: 'Slight offset' },
  { angleDegrees: 30, attenuationDb: 2.5, description: 'Moderate offset' },
  { angleDegrees: 40, attenuationDb: 4.0, description: 'Significant offset' },
  { angleDegrees: 50, attenuationDb: 5.5, description: 'Diagonal' },
  { angleDegrees: 60, attenuationDb: 7.0, description: 'Wide angle' },
  { angleDegrees: 70, attenuationDb: 8.5, description: 'Very wide angle' },
  { angleDegrees: 80, attenuationDb: 9.5, description: 'Nearly perpendicular' },
  { angleDegrees: 90, attenuationDb: 10.0, description: 'Perpendicular to flight path' },
];

/**
 * Aircraft-specific lateral attenuation factors
 *
 * Different aircraft categories have different directivity patterns
 * due to engine placement and fuselage design.
 */
export const AIRCRAFT_LATERAL_FACTORS: Record<string, number> = {
  /** Helicopters have more uniform radiation pattern */
  helicopter: 0.7,
  /** Jets have moderate directivity (under-wing engines) */
  jet: 1.0,
  /** Propeller aircraft vary by engine position */
  fixed_wing: 0.85,
  /** Use standard values for unknown */
  unknown: 1.0,
};

/**
 * Ground surface attenuation factors
 *
 * Soft ground (grass, vegetation) absorbs more sound than hard surfaces.
 */
export const GROUND_SURFACE_FACTORS: Record<string, number> = {
  /** Concrete, asphalt, water */
  hard: 0,
  /** Mixed surfaces typical of suburban areas */
  mixed: 1.5,
  /** Grass, soil, vegetation */
  soft: 3.0,
  /** Dense vegetation, forest */
  absorptive: 4.5,
};

/**
 * Calculate lateral attenuation with interpolation
 *
 * @param angleDegrees Angle from directly below aircraft (0-90)
 * @param aircraftCategory Aircraft category for directivity factor
 * @param groundSurface Ground surface type for additional attenuation
 * @returns Total lateral attenuation in dB
 */
export function calculateLateralAttenuation(
  angleDegrees: number,
  aircraftCategory: 'helicopter' | 'jet' | 'fixed_wing' | 'unknown' = 'unknown',
  groundSurface: 'hard' | 'mixed' | 'soft' | 'absorptive' = 'mixed'
): number {
  // Clamp angle to valid range
  const angle = Math.min(90, Math.max(0, Math.abs(angleDegrees)));

  // Find surrounding values in table
  let lower = LATERAL_ATTENUATION_TABLE[0];
  let upper = LATERAL_ATTENUATION_TABLE[LATERAL_ATTENUATION_TABLE.length - 1];

  for (let i = 0; i < LATERAL_ATTENUATION_TABLE.length - 1; i++) {
    if (angle >= LATERAL_ATTENUATION_TABLE[i].angleDegrees &&
        angle <= LATERAL_ATTENUATION_TABLE[i + 1].angleDegrees) {
      lower = LATERAL_ATTENUATION_TABLE[i];
      upper = LATERAL_ATTENUATION_TABLE[i + 1];
      break;
    }
  }

  // Linear interpolation
  const ratio = (angle - lower.angleDegrees) / (upper.angleDegrees - lower.angleDegrees || 1);
  const baseAttenuation = lower.attenuationDb + ratio * (upper.attenuationDb - lower.attenuationDb);

  // Apply aircraft-specific factor
  const aircraftFactor = AIRCRAFT_LATERAL_FACTORS[aircraftCategory];
  const attenuationWithAircraft = baseAttenuation * aircraftFactor;

  // Add ground surface attenuation (only significant at larger angles)
  const groundFactor = angle > 30 ? GROUND_SURFACE_FACTORS[groundSurface] * (angle / 90) : 0;

  return attenuationWithAircraft + groundFactor;
}

/**
 * Get lateral attenuation description for UI display
 */
export function getLateralAttenuationDescription(angleDegrees: number): string {
  const angle = Math.min(90, Math.max(0, Math.abs(angleDegrees)));

  for (let i = LATERAL_ATTENUATION_TABLE.length - 1; i >= 0; i--) {
    if (angle >= LATERAL_ATTENUATION_TABLE[i].angleDegrees) {
      return LATERAL_ATTENUATION_TABLE[i].description;
    }
  }

  return LATERAL_ATTENUATION_TABLE[0].description;
}

/**
 * Calculate angle from flight path for display purposes
 *
 * @param observerLat Observer latitude
 * @param observerLon Observer longitude
 * @param aircraftLat Aircraft latitude
 * @param aircraftLon Aircraft longitude
 * @param heading Aircraft heading (degrees true north)
 * @returns Object with angle info and description
 */
export function calculateObserverAngle(
  observerLat: number,
  observerLon: number,
  aircraftLat: number,
  aircraftLon: number,
  heading: number
): {
  angle: number;
  description: string;
  attenuation: number;
} {
  // Calculate bearing from aircraft to observer
  const dLon = (observerLon - aircraftLon) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(observerLat * Math.PI / 180);
  const x = Math.cos(aircraftLat * Math.PI / 180) * Math.sin(observerLat * Math.PI / 180) -
            Math.sin(aircraftLat * Math.PI / 180) * Math.cos(observerLat * Math.PI / 180) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  // Calculate angle difference from heading
  let angleDiff = Math.abs(bearing - heading);
  if (angleDiff > 180) {
    angleDiff = 360 - angleDiff;
  }

  // Convert to lateral angle (0-90)
  const lateralAngle = Math.min(90, angleDiff);

  return {
    angle: Math.round(lateralAngle),
    description: getLateralAttenuationDescription(lateralAngle),
    attenuation: Math.round(calculateLateralAttenuation(lateralAngle) * 10) / 10,
  };
}

/**
 * Format lateral attenuation for display
 */
export function formatLateralAttenuation(db: number): string {
  if (db < 1) return 'Minimal';
  if (db < 3) return 'Low';
  if (db < 6) return 'Moderate';
  if (db < 8) return 'Significant';
  return 'High';
}
