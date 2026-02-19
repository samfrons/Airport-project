/**
 * Altitude Compliance Checker
 *
 * Evaluates flights against the East Hampton Pilot's Pledge minimum altitudes:
 * - Helicopters: 3,500 ft AGL (except arrivals/departures within 3nm of airport)
 * - Piston/Turboprop (fixed_wing): 1,000 ft AGL
 * - Turbojets (jet): 1,500 ft AGL
 *
 * Uses FlightAware track data (altitude + position) to check each position
 * against the appropriate threshold for the aircraft category.
 *
 * Reference: easthamptonalliance.org/pilot-pledge
 */

// KJPX airport coordinates and field elevation
const KJPX_LAT = 40.9596;
const KJPX_LON = -72.2518;
const KJPX_ELEVATION_FT = 55; // field elevation in feet MSL

// Pilot's Pledge altitude thresholds (AGL)
export const ALTITUDE_THRESHOLDS: Record<string, number> = {
  helicopter: 3500,
  fixed_wing: 1000,
  jet: 1500,
  unknown: 1500, // conservative default
};

// Approach/departure exclusion zone: within 3 nautical miles and below 1,500 ft AGL
const APPROACH_RADIUS_NM = 3;
const APPROACH_ALT_CEILING_FT = 1500;

export interface TrackPosition {
  latitude: number;
  longitude: number;
  altitude?: number; // feet MSL from FlightAware
  timestamp?: string;
}

export interface AltitudeViolation {
  position: TrackPosition;
  altitudeAgl: number;
  threshold: number;
  deficit: number; // how far below threshold (positive = violation)
}

export interface AltitudeComplianceResult {
  flightId: string;
  category: string;
  threshold: number;
  totalPositions: number;
  checkedPositions: number; // positions outside approach/departure zone
  violatingPositions: number;
  complianceRate: number; // 0-100
  minAltitudeAgl: number;
  maxDeficit: number; // worst violation depth
  violations: AltitudeViolation[];
}

/**
 * Calculate horizontal distance in nautical miles using Haversine formula
 */
function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a position is in the approach/departure exclusion zone
 * (within 3nm of airport AND below 1,500 ft AGL)
 */
function isInApproachZone(pos: TrackPosition): boolean {
  if (pos.altitude == null) return true; // can't check, exclude from violations
  const dist = distanceNm(pos.latitude, pos.longitude, KJPX_LAT, KJPX_LON);
  const agl = pos.altitude - KJPX_ELEVATION_FT;
  return dist <= APPROACH_RADIUS_NM && agl <= APPROACH_ALT_CEILING_FT;
}

/**
 * Evaluate altitude compliance for a single flight track
 */
export function evaluateAltitudeCompliance(
  flightId: string,
  category: string,
  positions: TrackPosition[],
): AltitudeComplianceResult {
  const threshold = ALTITUDE_THRESHOLDS[category] || ALTITUDE_THRESHOLDS.unknown;
  const violations: AltitudeViolation[] = [];
  let checkedPositions = 0;
  let minAltitudeAgl = Infinity;
  let maxDeficit = 0;

  for (const pos of positions) {
    if (pos.altitude == null) continue;

    // Skip positions in approach/departure zone
    if (isInApproachZone(pos)) continue;

    checkedPositions++;
    const agl = pos.altitude - KJPX_ELEVATION_FT;
    minAltitudeAgl = Math.min(minAltitudeAgl, agl);

    if (agl < threshold) {
      const deficit = threshold - agl;
      maxDeficit = Math.max(maxDeficit, deficit);
      violations.push({
        position: pos,
        altitudeAgl: Math.round(agl),
        threshold,
        deficit: Math.round(deficit),
      });
    }
  }

  const complianceRate =
    checkedPositions > 0
      ? ((checkedPositions - violations.length) / checkedPositions) * 100
      : 100;

  return {
    flightId,
    category,
    threshold,
    totalPositions: positions.length,
    checkedPositions,
    violatingPositions: violations.length,
    complianceRate: Math.round(complianceRate * 10) / 10,
    minAltitudeAgl: minAltitudeAgl === Infinity ? 0 : Math.round(minAltitudeAgl),
    maxDeficit: Math.round(maxDeficit),
    violations,
  };
}
