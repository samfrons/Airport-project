/**
 * Track-Based Noise Calculator
 *
 * Physics-based noise estimation using:
 * - EASA certification data for source noise levels
 * - FlightAware track data for actual altitude/position
 * - SAE-AIR-5662 lateral attenuation model
 * - Atmospheric absorption per ISO 9613-1
 *
 * References:
 * - EASA Certification Noise Levels: https://www.easa.europa.eu/en/domains/environment/easa-certification-noise-levels
 * - SAE-AIR-5662: Method for Predicting Lateral Attenuation of Airplane Noise
 * - ISO 9613-1: Acoustics - Attenuation of sound during propagation outdoors
 */

import {
  icaoToEasaMap,
  getEASANoiseProfile,
  CATEGORY_AVERAGES,
  type EASANoiseProfile,
} from '@/data/noise/easa/icaoToEasaMap';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrackPosition {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_ft: number;
  groundspeed_kts?: number;
  heading?: number;
}

export interface ObserverLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface NoiseEstimate {
  db: number;
  source: 'EASA_CERTIFIED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
  components?: {
    sourceDb: number;
    geometricAttenuation: number;
    atmosphericAttenuation: number;
    lateralAttenuation: number;
    slantDistanceFt: number;
    horizontalDistanceFt: number;
  };
}

export interface FlightNoiseImpact {
  flightId: string;
  aircraftType: string;
  noiseProfile: EASANoiseProfile;
  maxGroundDb: number;
  averageGroundDb: number;
  exposureDurationSeconds: number;
  trackPositions: Array<{
    position: TrackPosition;
    estimatedDb: NoiseEstimate;
  }>;
  observerImpacts: Array<{
    observer: ObserverLocation;
    maxDb: number;
    closestApproachFt: number;
    timeAboveThreshold: number; // seconds above 65 dB
  }>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** EASA certification reference distance (304.8 meters = 1000 feet) */
export const CERTIFICATION_REFERENCE_DISTANCE_FT = 1000;

/** Standard atmospheric absorption coefficient (dB per 1000 ft, A-weighted average) */
export const ATMOSPHERIC_ABSORPTION_COEFFICIENT = 0.5;

/** Earth radius in feet for Haversine calculations */
const EARTH_RADIUS_FT = 20902230.97; // 6371 km * 3280.84 ft/km

/** Feet per nautical mile */
const FT_PER_NM = 6076.12;

/** Default KJPX airport coordinates */
export const KJPX_COORDINATES = {
  latitude: 40.9590,
  longitude: -72.2516,
};

// ─── Observer Locations (KJPX Area) ─────────────────────────────────────────

export const KJPX_OBSERVER_LOCATIONS: ObserverLocation[] = [
  {
    id: 'wainscott-main',
    name: 'Wainscott Main Street',
    latitude: 40.9445,
    longitude: -72.2337,
    description: 'Central residential area',
  },
  {
    id: 'sagaponack-south',
    name: 'Sagaponack South',
    latitude: 40.9234,
    longitude: -72.2567,
    description: 'Beach community',
  },
  {
    id: 'runway-approach',
    name: 'Runway 28 Approach',
    latitude: 40.9589,
    longitude: -72.2312,
    description: 'Primary arrival path',
  },
  {
    id: 'runway-departure',
    name: 'Runway 10 Departure',
    latitude: 40.9591,
    longitude: -72.2720,
    description: 'Primary departure path',
  },
  {
    id: 'northwest-residential',
    name: 'Northwest Residential',
    latitude: 40.9678,
    longitude: -72.2612,
    description: 'North residential zone',
  },
  {
    id: 'georgica-pond',
    name: 'Georgica Pond Area',
    latitude: 40.9412,
    longitude: -72.2234,
    description: 'Protected natural area',
  },
  {
    id: 'daniels-hole-road',
    name: 'Daniels Hole Road',
    latitude: 40.9512,
    longitude: -72.2445,
    description: 'Residential corridor',
  },
  {
    id: 'beach-lane',
    name: 'Beach Lane',
    latitude: 40.9312,
    longitude: -72.2389,
    description: 'South beach access',
  },
];

// ─── Lateral Attenuation Table (SAE-AIR-5662) ───────────────────────────────

/**
 * Lateral attenuation values based on angle from flight path
 * Per SAE-AIR-5662 simplified model
 *
 * Angle is measured from directly beneath the aircraft (0°)
 * to perpendicular to flight path (90°)
 */
const LATERAL_ATTENUATION_TABLE: Array<{ angle: number; attenuation: number }> = [
  { angle: 0, attenuation: 0 },      // Directly below
  { angle: 10, attenuation: 0.5 },
  { angle: 20, attenuation: 1.2 },
  { angle: 30, attenuation: 2.5 },
  { angle: 40, attenuation: 4.0 },
  { angle: 50, attenuation: 5.5 },
  { angle: 60, attenuation: 7.0 },
  { angle: 70, attenuation: 8.5 },
  { angle: 80, attenuation: 9.5 },
  { angle: 90, attenuation: 10.0 },  // Perpendicular
];

/**
 * Get lateral attenuation for a given angle
 * Uses linear interpolation between table values
 */
export function getLateralAttenuation(angleDegrees: number): number {
  const angle = Math.min(90, Math.max(0, Math.abs(angleDegrees)));

  // Find surrounding values in table
  let lower = LATERAL_ATTENUATION_TABLE[0];
  let upper = LATERAL_ATTENUATION_TABLE[LATERAL_ATTENUATION_TABLE.length - 1];

  for (let i = 0; i < LATERAL_ATTENUATION_TABLE.length - 1; i++) {
    if (angle >= LATERAL_ATTENUATION_TABLE[i].angle &&
        angle <= LATERAL_ATTENUATION_TABLE[i + 1].angle) {
      lower = LATERAL_ATTENUATION_TABLE[i];
      upper = LATERAL_ATTENUATION_TABLE[i + 1];
      break;
    }
  }

  // Linear interpolation
  const ratio = (angle - lower.angle) / (upper.angle - lower.angle || 1);
  return lower.attenuation + ratio * (upper.attenuation - lower.attenuation);
}

// ─── Geometry Functions ─────────────────────────────────────────────────────

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in feet
 */
export function calculateHorizontalDistanceFt(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_FT * c;
}

/**
 * Calculate slant distance (actual acoustic path length)
 * @param altitude_ft Aircraft altitude above ground level
 * @param horizontal_ft Horizontal distance from observer to aircraft
 * @returns Slant distance in feet
 */
export function calculateSlantDistanceFt(
  altitude_ft: number,
  horizontal_ft: number
): number {
  return Math.sqrt(altitude_ft * altitude_ft + horizontal_ft * horizontal_ft);
}

/**
 * Calculate bearing between two points
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return (toDegrees(bearing) + 360) % 360;
}

/**
 * Calculate lateral angle from aircraft flight path to observer
 * @param observerLat Observer latitude
 * @param observerLon Observer longitude
 * @param aircraftLat Aircraft latitude
 * @param aircraftLon Aircraft longitude
 * @param heading Aircraft heading (degrees true)
 * @returns Angle in degrees (0-90)
 */
export function calculateLateralAngle(
  observerLat: number,
  observerLon: number,
  aircraftLat: number,
  aircraftLon: number,
  heading: number
): number {
  // Bearing from aircraft to observer
  const bearingToObserver = calculateBearing(
    aircraftLat, aircraftLon, observerLat, observerLon
  );

  // Angle difference from heading
  let angleDiff = Math.abs(bearingToObserver - heading);
  if (angleDiff > 180) {
    angleDiff = 360 - angleDiff;
  }

  // Return absolute angle from flight path (0-90)
  return Math.min(90, angleDiff);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// ─── Core Noise Calculations ────────────────────────────────────────────────

/**
 * Calculate ground-level noise estimate at an observer location
 *
 * Uses physics-based model:
 * 1. Slant distance (actual acoustic path)
 * 2. Geometric spreading (inverse square law)
 * 3. Atmospheric absorption (~0.5 dB per 1000 ft)
 * 4. Lateral attenuation (SAE-AIR-5662)
 *
 * @param sourceDb EASA certification dB (at 1000ft reference)
 * @param altitude_ft Aircraft altitude above ground
 * @param observerLat Observer latitude
 * @param observerLon Observer longitude
 * @param aircraftLat Aircraft latitude
 * @param aircraftLon Aircraft longitude
 * @param heading Aircraft heading (optional, for lateral attenuation)
 * @returns Estimated ground-level dB with calculation components
 */
export function calculateGroundNoise(
  sourceDb: number,
  altitude_ft: number,
  observerLat: number,
  observerLon: number,
  aircraftLat: number,
  aircraftLon: number,
  heading?: number
): {
  db: number;
  components: {
    sourceDb: number;
    geometricAttenuation: number;
    atmosphericAttenuation: number;
    lateralAttenuation: number;
    slantDistanceFt: number;
    horizontalDistanceFt: number;
  };
} {
  // 1. Calculate horizontal distance
  const horizontalDistanceFt = calculateHorizontalDistanceFt(
    observerLat, observerLon, aircraftLat, aircraftLon
  );

  // 2. Calculate slant distance (actual acoustic path)
  const slantDistanceFt = calculateSlantDistanceFt(altitude_ft, horizontalDistanceFt);

  // Minimum distance to prevent divide by zero or extreme values
  const effectiveSlantDistance = Math.max(slantDistanceFt, 100);

  // 3. Geometric spreading (inverse square law)
  // Reference distance is 1000 ft (EASA certification standard)
  const geometricAttenuation = 20 * Math.log10(
    effectiveSlantDistance / CERTIFICATION_REFERENCE_DISTANCE_FT
  );

  // 4. Atmospheric absorption (~0.5 dB per 1000 ft, A-weighted average)
  const atmosphericAttenuation =
    (effectiveSlantDistance / 1000) * ATMOSPHERIC_ABSORPTION_COEFFICIENT;

  // 5. Lateral attenuation (if heading is known)
  let lateralAttenuation = 0;
  if (heading !== undefined) {
    const lateralAngle = calculateLateralAngle(
      observerLat, observerLon, aircraftLat, aircraftLon, heading
    );
    lateralAttenuation = getLateralAttenuation(lateralAngle);
  }

  // Calculate final ground-level noise
  const groundDb = sourceDb - geometricAttenuation - atmosphericAttenuation - lateralAttenuation;

  // Round to one decimal place
  const roundedDb = Math.round(groundDb * 10) / 10;

  return {
    db: Math.max(0, roundedDb), // Noise can't be negative
    components: {
      sourceDb,
      geometricAttenuation: Math.round(geometricAttenuation * 10) / 10,
      atmosphericAttenuation: Math.round(atmosphericAttenuation * 10) / 10,
      lateralAttenuation: Math.round(lateralAttenuation * 10) / 10,
      slantDistanceFt: Math.round(slantDistanceFt),
      horizontalDistanceFt: Math.round(horizontalDistanceFt),
    },
  };
}

/**
 * Get noise estimate for a specific aircraft type at a track position
 *
 * @param icaoType Aircraft ICAO type code (e.g., "S76", "GLF5")
 * @param position Track position with altitude and coordinates
 * @param observer Observer location
 * @param direction Flight direction (affects which EASA metric to use)
 */
export function getNoiseEstimateAtPosition(
  icaoType: string,
  position: TrackPosition,
  observer: ObserverLocation,
  direction: 'arrival' | 'departure'
): NoiseEstimate {
  // Get EASA noise profile for this aircraft type
  const profile = getEASANoiseProfile(icaoType);

  // Select appropriate source dB based on direction
  const sourceDb = direction === 'arrival' ? profile.approachDb : profile.takeoffDb;

  // Calculate ground-level noise
  const result = calculateGroundNoise(
    sourceDb,
    position.altitude_ft,
    observer.latitude,
    observer.longitude,
    position.latitude,
    position.longitude,
    position.heading
  );

  // Build estimate with confidence indicator
  const estimate: NoiseEstimate = {
    db: result.db,
    source: profile.dataSource,
    confidence: profile.confidence,
    components: result.components,
  };

  // Add warning for unverified estimates
  if (profile.dataSource === 'UNVERIFIED' || profile.confidence === 'low') {
    estimate.warning = `No EASA certification data for ${icaoType}. Using ${profile.category} category average.`;
  }

  return estimate;
}

/**
 * Calculate noise impact for an entire flight track
 *
 * @param flightId Unique flight identifier
 * @param icaoType Aircraft ICAO type code
 * @param track Array of track positions
 * @param direction Flight direction
 * @param observers Optional custom observer locations (defaults to KJPX area)
 */
export function calculateFlightNoiseImpact(
  flightId: string,
  icaoType: string,
  track: TrackPosition[],
  direction: 'arrival' | 'departure',
  observers: ObserverLocation[] = KJPX_OBSERVER_LOCATIONS
): FlightNoiseImpact {
  const profile = getEASANoiseProfile(icaoType);

  // Calculate noise at each track position for each observer
  const trackWithNoise = track.map((position) => ({
    position,
    estimatedDb: getNoiseEstimateAtPosition(icaoType, position, observers[0], direction),
  }));

  // Find max and average noise
  const noiseValues = trackWithNoise.map((t) => t.estimatedDb.db);
  const maxGroundDb = Math.max(...noiseValues);
  const averageGroundDb =
    noiseValues.reduce((sum, db) => sum + db, 0) / noiseValues.length;

  // Calculate exposure duration (assuming ~5 second interval between positions)
  const positionIntervalSeconds = 5;
  const exposureDurationSeconds = track.length * positionIntervalSeconds;

  // Calculate impact at each observer location
  const observerImpacts = observers.map((observer) => {
    let maxDb = 0;
    let closestApproachFt = Infinity;
    let timeAboveThreshold = 0;

    for (const position of track) {
      const estimate = getNoiseEstimateAtPosition(icaoType, position, observer, direction);

      if (estimate.db > maxDb) {
        maxDb = estimate.db;
      }

      const horizontalDist = calculateHorizontalDistanceFt(
        observer.latitude, observer.longitude,
        position.latitude, position.longitude
      );
      const slantDist = calculateSlantDistanceFt(position.altitude_ft, horizontalDist);
      if (slantDist < closestApproachFt) {
        closestApproachFt = slantDist;
      }

      if (estimate.db >= 65) {
        timeAboveThreshold += positionIntervalSeconds;
      }
    }

    return {
      observer,
      maxDb: Math.round(maxDb * 10) / 10,
      closestApproachFt: Math.round(closestApproachFt),
      timeAboveThreshold,
    };
  });

  return {
    flightId,
    aircraftType: icaoType,
    noiseProfile: profile,
    maxGroundDb: Math.round(maxGroundDb * 10) / 10,
    averageGroundDb: Math.round(averageGroundDb * 10) / 10,
    exposureDurationSeconds,
    trackPositions: trackWithNoise,
    observerImpacts,
  };
}

/**
 * Generate a public-facing noise impact statement
 *
 * Example output:
 * "This S-76 helicopter passed over Wainscott at 800 feet AGL at 7:42 AM.
 *  Based on EASA certification data (88.2 EPNdB lateral) and measured altitude,
 *  estimated ground-level exposure was 85 dBA LAmax."
 */
export function generateNoiseStatement(
  impact: FlightNoiseImpact,
  observerIndex: number = 0
): string {
  const profile = impact.noiseProfile;
  const observer = impact.observerImpacts[observerIndex];

  if (!observer) {
    return 'No observer data available.';
  }

  // Find closest track position to this observer
  let closestPosition: TrackPosition | null = null;
  let closestDistance = Infinity;

  for (const tp of impact.trackPositions) {
    const dist = calculateHorizontalDistanceFt(
      observer.observer.latitude, observer.observer.longitude,
      tp.position.latitude, tp.position.longitude
    );
    if (dist < closestDistance) {
      closestDistance = dist;
      closestPosition = tp.position;
    }
  }

  if (!closestPosition) {
    return 'No track data available.';
  }

  // Format time
  const time = new Date(closestPosition.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Build statement
  const categoryName = profile.category === 'helicopter' ? 'helicopter' :
                       profile.category === 'jet' ? 'jet aircraft' : 'aircraft';

  let statement = `This ${profile.easaManufacturer || ''} ${profile.easaModel || profile.icaoType} ${categoryName} `;
  statement += `passed over ${observer.observer.name} at ${Math.round(closestPosition.altitude_ft)} feet AGL at ${time}. `;

  if (profile.dataSource === 'EASA_CERTIFIED') {
    const epnl = profile.flyoverEpnl || profile.lateralEpnl || profile.approachEpnl;
    statement += `Based on EASA certification data (${epnl?.toFixed(1)} EPNdB) and measured altitude, `;
    statement += `estimated ground-level exposure was **${observer.maxDb.toFixed(1)} dBA LAmax**.`;
  } else {
    statement += `Based on category average estimates, ground-level exposure was approximately **${observer.maxDb.toFixed(1)} dBA LAmax**. `;
    statement += `*(Note: No official EASA certification data available for this aircraft type.)*`;
  }

  return statement;
}

// ─── Simple Estimate (for backwards compatibility) ──────────────────────────

/**
 * Simple noise estimate when track data is not available
 * Uses altitude-only calculation (legacy method)
 */
export function getSimpleNoiseEstimate(
  icaoType: string,
  altitude_ft: number,
  direction: 'arrival' | 'departure'
): NoiseEstimate {
  const profile = getEASANoiseProfile(icaoType);
  const sourceDb = direction === 'arrival' ? profile.approachDb : profile.takeoffDb;

  // Simple inverse square law (altitude only, assumes directly overhead)
  const geometricAttenuation = 20 * Math.log10(
    Math.max(altitude_ft, 100) / CERTIFICATION_REFERENCE_DISTANCE_FT
  );

  const groundDb = sourceDb - geometricAttenuation;

  return {
    db: Math.max(0, Math.round(groundDb * 10) / 10),
    source: profile.dataSource,
    confidence: profile.confidence,
    warning: profile.dataSource !== 'EASA_CERTIFIED'
      ? `Using category estimate for ${icaoType}`
      : undefined,
  };
}
