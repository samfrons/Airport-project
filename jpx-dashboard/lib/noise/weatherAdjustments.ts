/**
 * Weather-Adjusted Noise Propagation
 *
 * Wind and temperature conditions significantly affect sound propagation:
 * - Downwind: Sound carries better (+3-6 dB)
 * - Upwind: Sound attenuated (-2-4 dB)
 * - Temperature inversions: Sound trapped/amplified (+3-10 dB)
 *
 * References:
 * - ISO 9613-2: Acoustics — Attenuation of sound during propagation outdoors — Part 2
 * - ANSI S12.18: Methods for Outdoor Measurement of Sound Pressure Level
 * - SAE-AIR-1845: Procedure for the Calculation of Airplane Noise in the Vicinity of Airports
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WindConditions {
  direction: number;  // degrees (where wind is coming FROM, meteorological convention)
  speed: number;      // knots
  gusts?: number;     // knots
}

export interface TemperatureProfile {
  surfaceTemp: number;     // °C at ground level
  inversionPresent: boolean;
  inversionStrength: 'none' | 'weak' | 'moderate' | 'strong';
  inversionBaseAlt: number; // feet AGL where inversion starts
  inversionTopAlt: number;  // feet AGL where inversion ends
}

export interface WeatherNoiseAdjustment {
  windAdjustmentDb: number;
  inversionAdjustmentDb: number;
  totalAdjustmentDb: number;
  conditions: {
    windEffect: 'upwind' | 'crosswind' | 'downwind' | 'calm';
    inversionEffect: 'none' | 'minor' | 'significant' | 'severe';
  };
  description: string;
}

export interface PropagationConditions {
  level: 'normal' | 'elevated' | 'high';
  color: 'green' | 'yellow' | 'red';
  label: string;
  description: string;
  windAdjustment: number;
  inversionAdjustment: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Wind effect thresholds
 * Sound travels faster with the wind, slower against it
 */
const WIND_CALM_THRESHOLD = 3; // knots - below this, wind effect negligible
const WIND_MODERATE_THRESHOLD = 10; // knots - above this, full wind effect applies
const WIND_STRONG_THRESHOLD = 20; // knots - amplified effect

/**
 * Directional wind adjustment factors (dB)
 * Based on empirical measurements and ISO 9613-2
 */
const WIND_ADJUSTMENTS = {
  upwind: -2,      // Sound carries away from observer
  crosswind: 0,    // Neutral effect
  downwind_light: 2,  // Light wind carrying sound toward observer
  downwind_moderate: 4,  // Moderate downwind effect
  downwind_strong: 6,    // Strong wind, significant amplification
};

/**
 * Temperature inversion adjustments (dB)
 * Inversions create a "lid" trapping sound waves
 */
const INVERSION_ADJUSTMENTS = {
  none: 0,
  weak: 2,      // Slight trapping effect
  moderate: 5,  // Noticeable amplification
  strong: 8,    // Significant noise ducting
};

// ─── Wind Direction Calculations ────────────────────────────────────────────

/**
 * Calculate wind effect adjustment on noise propagation
 *
 * Sound propagates:
 * - Better downwind (observer is downwind of source = wind blows from source toward observer)
 * - Worse upwind (observer is upwind of source = wind blows from observer toward source)
 *
 * @param windDirection - Direction wind is coming FROM (meteorological convention, 0-360°)
 * @param windSpeed - Wind speed in knots
 * @param observerBearing - Bearing from aircraft to observer (0-360°)
 * @returns Adjustment in dB (positive = louder, negative = quieter)
 */
export function calculateWindAdjustment(
  windDirection: number,
  windSpeed: number,
  observerBearing: number
): number {
  // Calm wind - no adjustment
  if (windSpeed < WIND_CALM_THRESHOLD) {
    return 0;
  }

  // Calculate relative angle between wind direction and observer direction
  // Wind coming FROM 270° (west) means wind blows TOWARD east
  // If observer is to the east (bearing 90°), they're downwind
  // Wind direction + 180° = direction wind is blowing TO
  const windBlowingTo = (windDirection + 180) % 360;

  // Angle between wind direction (where it's going) and observer bearing
  let relativeAngle = Math.abs(windBlowingTo - observerBearing);
  if (relativeAngle > 180) {
    relativeAngle = 360 - relativeAngle;
  }

  // Normalize angle to 0-180° range
  const normalizedAngle = relativeAngle;

  // Determine wind effect category and adjustment
  let baseAdjustment: number;
  if (normalizedAngle < 45) {
    // Downwind - sound carries toward observer
    if (windSpeed > WIND_STRONG_THRESHOLD) {
      baseAdjustment = WIND_ADJUSTMENTS.downwind_strong;
    } else if (windSpeed > WIND_MODERATE_THRESHOLD) {
      baseAdjustment = WIND_ADJUSTMENTS.downwind_moderate;
    } else {
      baseAdjustment = WIND_ADJUSTMENTS.downwind_light;
    }
  } else if (normalizedAngle > 135) {
    // Upwind - sound carries away from observer
    baseAdjustment = WIND_ADJUSTMENTS.upwind;
    // Stronger upwind effect with higher wind speeds
    if (windSpeed > WIND_MODERATE_THRESHOLD) {
      baseAdjustment -= 1; // Additional -1 dB for strong upwind
    }
  } else {
    // Crosswind - minimal effect
    baseAdjustment = WIND_ADJUSTMENTS.crosswind;
  }

  return baseAdjustment;
}

/**
 * Determine wind effect category for display
 */
export function getWindEffectCategory(
  windDirection: number,
  windSpeed: number,
  observerBearing: number
): 'upwind' | 'crosswind' | 'downwind' | 'calm' {
  if (windSpeed < WIND_CALM_THRESHOLD) {
    return 'calm';
  }

  const windBlowingTo = (windDirection + 180) % 360;
  let relativeAngle = Math.abs(windBlowingTo - observerBearing);
  if (relativeAngle > 180) {
    relativeAngle = 360 - relativeAngle;
  }

  if (relativeAngle < 45) {
    return 'downwind';
  } else if (relativeAngle > 135) {
    return 'upwind';
  }
  return 'crosswind';
}

// ─── Temperature Inversion Calculations ─────────────────────────────────────

/**
 * Calculate temperature inversion effect on noise
 *
 * Temperature inversions occur when warm air sits above cooler surface air,
 * creating an acoustic "lid" that traps and amplifies sound.
 *
 * @param inversionProfile - Temperature profile with inversion data
 * @param aircraftAltitude - Aircraft altitude in feet AGL
 * @returns Adjustment in dB (always positive for inversions)
 */
export function calculateInversionAdjustment(
  inversionProfile: TemperatureProfile,
  aircraftAltitude: number
): number {
  if (!inversionProfile.inversionPresent) {
    return 0;
  }

  // Inversion effect is strongest when aircraft is within or above the inversion layer
  const isWithinInversion =
    aircraftAltitude >= inversionProfile.inversionBaseAlt &&
    aircraftAltitude <= inversionProfile.inversionTopAlt;

  const isAboveInversion = aircraftAltitude > inversionProfile.inversionTopAlt;

  // Maximum effect when aircraft is at or just above the inversion layer
  if (isWithinInversion || isAboveInversion) {
    return INVERSION_ADJUSTMENTS[inversionProfile.inversionStrength];
  }

  // Reduced effect if aircraft is below inversion but sound path crosses it
  // Use half the adjustment for aircraft below the inversion base
  return INVERSION_ADJUSTMENTS[inversionProfile.inversionStrength] * 0.5;
}

/**
 * Determine inversion effect category for display
 */
export function getInversionEffectCategory(
  inversionProfile: TemperatureProfile
): 'none' | 'minor' | 'significant' | 'severe' {
  if (!inversionProfile.inversionPresent) {
    return 'none';
  }

  switch (inversionProfile.inversionStrength) {
    case 'weak':
      return 'minor';
    case 'moderate':
      return 'significant';
    case 'strong':
      return 'severe';
    default:
      return 'none';
  }
}

// ─── Combined Weather Adjustment ────────────────────────────────────────────

/**
 * Calculate total weather adjustment combining wind and inversion effects
 *
 * @param wind - Current wind conditions
 * @param inversion - Temperature profile with inversion data
 * @param observerBearing - Bearing from aircraft to observer
 * @param aircraftAltitude - Aircraft altitude in feet AGL
 * @returns Complete weather adjustment with breakdown
 */
export function calculateWeatherNoiseAdjustment(
  wind: WindConditions,
  inversion: TemperatureProfile,
  observerBearing: number,
  aircraftAltitude: number
): WeatherNoiseAdjustment {
  const windAdjustment = calculateWindAdjustment(
    wind.direction,
    wind.speed,
    observerBearing
  );

  const inversionAdjustment = calculateInversionAdjustment(
    inversion,
    aircraftAltitude
  );

  const totalAdjustment = windAdjustment + inversionAdjustment;

  const windEffect = getWindEffectCategory(wind.direction, wind.speed, observerBearing);
  const inversionEffect = getInversionEffectCategory(inversion);

  // Generate human-readable description
  let description = '';
  if (totalAdjustment === 0) {
    description = 'Normal propagation conditions';
  } else {
    const parts: string[] = [];
    if (windAdjustment !== 0) {
      const windSign = windAdjustment > 0 ? '+' : '';
      parts.push(`${windEffect} wind effect (${windSign}${windAdjustment} dB)`);
    }
    if (inversionAdjustment > 0) {
      parts.push(`temperature inversion (+${inversionAdjustment} dB)`);
    }
    description = parts.join(', ');
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    windAdjustmentDb: windAdjustment,
    inversionAdjustmentDb: inversionAdjustment,
    totalAdjustmentDb: totalAdjustment,
    conditions: {
      windEffect,
      inversionEffect,
    },
    description,
  };
}

// ─── Propagation Conditions Widget ──────────────────────────────────────────

/**
 * Determine overall propagation conditions for dashboard display
 *
 * @param wind - Current wind conditions
 * @param inversion - Temperature profile with inversion data
 * @param primaryObserverBearing - Bearing to primary affected area (optional)
 * @returns Propagation conditions with color coding
 */
export function getPropagationConditions(
  wind: WindConditions,
  inversion: TemperatureProfile,
  primaryObserverBearing?: number
): PropagationConditions {
  // Use average bearing if not specified (general conditions)
  const bearing = primaryObserverBearing ?? 180; // Default: south (residential areas)

  const windAdj = calculateWindAdjustment(wind.direction, wind.speed, bearing);
  const inversionAdj = calculateInversionAdjustment(inversion, 1500); // Assume mid-altitude
  const totalAdj = windAdj + inversionAdj;

  if (totalAdj >= 6) {
    return {
      level: 'high',
      color: 'red',
      label: 'High Amplification',
      description: 'Strong temperature inversion and/or downwind conditions. Noise significantly amplified.',
      windAdjustment: windAdj,
      inversionAdjustment: inversionAdj,
    };
  } else if (totalAdj >= 3) {
    return {
      level: 'elevated',
      color: 'yellow',
      label: 'Moderate Amplification',
      description: 'Conditions favor sound propagation. Expect louder noise than usual.',
      windAdjustment: windAdj,
      inversionAdjustment: inversionAdj,
    };
  }

  return {
    level: 'normal',
    color: 'green',
    label: 'Normal Conditions',
    description: 'Standard propagation conditions. No unusual amplification expected.',
    windAdjustment: windAdj,
    inversionAdjustment: inversionAdj,
  };
}

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Create default (no-effect) weather conditions
 */
export function getDefaultWeatherConditions(): {
  wind: WindConditions;
  inversion: TemperatureProfile;
} {
  return {
    wind: {
      direction: 0,
      speed: 0,
    },
    inversion: {
      surfaceTemp: 20,
      inversionPresent: false,
      inversionStrength: 'none',
      inversionBaseAlt: 0,
      inversionTopAlt: 0,
    },
  };
}

/**
 * Parse wind direction from compass string
 */
export function parseWindDirection(compass: string): number {
  const directions: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  return directions[compass.toUpperCase()] ?? 0;
}

/**
 * Format wind direction as compass string
 */
export function formatWindDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}
