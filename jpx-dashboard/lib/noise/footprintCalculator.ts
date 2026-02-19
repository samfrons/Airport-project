/**
 * Flight Noise Footprint Calculator
 *
 * Given a flight track (positions with lat/lon/altitude), compute estimated
 * ground-level noise at a grid of points around the flight path. Returns
 * GeoJSON features for rendering noise contour corridors on the map.
 *
 * Uses the same physics model as trackNoiseCalculator.ts:
 * - EASA certification data for source noise levels
 * - Inverse square law (geometric attenuation)
 * - Atmospheric absorption
 */

import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FootprintPosition {
  latitude: number;
  longitude: number;
  altitude: number; // feet MSL
}

export interface FootprintResult {
  contours: GeoJSON.Feature[];  // polygon features for each dB band
  points: GeoJSON.Feature[];    // point features with dB values along track
  peakDb: number;
  peakLocation: [number, number]; // [lng, lat]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REFERENCE_DISTANCE_FT = 1000;
const ATMOSPHERIC_ABSORPTION_PER_1000FT = 0.5; // dB
const EARTH_RADIUS_FT = 20902231;
const KJPX_ELEVATION_FT = 55;

// Noise contour bands (dB at ground level)
const CONTOUR_BANDS = [
  { minDb: 80, color: '#ef4444', label: '>80 dB', widthM: 200 },
  { minDb: 70, color: '#f97316', label: '70-80 dB', widthM: 500 },
  { minDb: 60, color: '#eab308', label: '60-70 dB', widthM: 1000 },
  { minDb: 50, color: '#22c55e', label: '50-60 dB', widthM: 1800 },
];

// ─── Geometry Helpers ───────────────────────────────────────────────────────

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Haversine distance in feet */
function distanceFt(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_FT * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Offset a point by distance in meters at a bearing (degrees) */
function offsetPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  distanceMeters: number,
): [number, number] {
  const distanceFeet = distanceMeters * 3.28084;
  const R = EARTH_RADIUS_FT;
  const d = distanceFeet / R;
  const brng = toRadians(bearingDeg);
  const lat1 = toRadians(lat);
  const lon1 = toRadians(lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [toDegrees(lon2), toDegrees(lat2)]; // [lng, lat] for GeoJSON
}

/** Calculate bearing from point 1 to point 2 in degrees */
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

// ─── Noise Calculation ──────────────────────────────────────────────────────

/**
 * Estimate ground-level noise at a given distance from an aircraft.
 *
 * Uses inverse square law: dB drops ~6 dB per doubling of distance.
 * Reference: EASA certification noise is measured at 1,000 ft.
 */
function estimateGroundDb(sourceDb: number, altitudeAgl: number, horizontalDistFt: number): number {
  if (altitudeAgl <= 0) return sourceDb;

  const slantDist = Math.sqrt(altitudeAgl ** 2 + horizontalDistFt ** 2);
  if (slantDist <= 0) return sourceDb;

  // Geometric spreading (inverse square law)
  const geometricLoss = 20 * Math.log10(slantDist / REFERENCE_DISTANCE_FT);

  // Atmospheric absorption
  const atmosphericLoss = (slantDist / 1000) * ATMOSPHERIC_ABSORPTION_PER_1000FT;

  return sourceDb - geometricLoss - atmosphericLoss;
}

/**
 * For a given source dB and altitude, find the horizontal distance (ft)
 * at which ground noise drops to a target dB level.
 */
function horizontalDistForDb(sourceDb: number, altitudeAgl: number, targetDb: number): number {
  if (altitudeAgl <= 0) return 0;

  // Binary search for the distance
  let lo = 0;
  let hi = 50000; // 50,000 ft (~15 km) max
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const db = estimateGroundDb(sourceDb, altitudeAgl, mid);
    if (db > targetDb) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// ─── Footprint Generator ────────────────────────────────────────────────────

/**
 * Generate noise footprint for a flight track.
 *
 * For each contour band, generates a corridor polygon by computing the
 * horizontal distance at which noise drops to that level, then offsetting
 * the track left/right by that distance.
 */
export function calculateFlightFootprint(
  aircraftType: string,
  direction: 'arrival' | 'departure',
  positions: FootprintPosition[],
): FootprintResult {
  if (positions.length < 2) {
    return { contours: [], points: [], peakDb: 0, peakLocation: [0, 0] };
  }

  const profile = getAircraftNoiseProfile(aircraftType);
  const sourceDb = direction === 'arrival' ? profile.approachDb : profile.takeoffDb;

  // Sample every Nth position to avoid too many points (target ~30 points)
  const step = Math.max(1, Math.floor(positions.length / 30));
  const sampled = positions.filter((_, i) => i % step === 0 || i === positions.length - 1);

  // Generate dB point features along the track
  let peakDb = 0;
  let peakLocation: [number, number] = [positions[0].longitude, positions[0].latitude];

  const pointFeatures: GeoJSON.Feature[] = sampled.map((pos, i) => {
    const altAgl = Math.max(0, pos.altitude - KJPX_ELEVATION_FT);
    const groundDb = estimateGroundDb(sourceDb, altAgl, 0); // directly below aircraft

    if (groundDb > peakDb) {
      peakDb = groundDb;
      peakLocation = [pos.longitude, pos.latitude];
    }

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pos.longitude, pos.latitude] },
      properties: {
        db: Math.round(groundDb),
        altitude: Math.round(altAgl),
        index: i,
      },
    };
  });

  // Generate contour corridor polygons
  const contourFeatures: GeoJSON.Feature[] = CONTOUR_BANDS.map((band) => {
    const leftSide: [number, number][] = [];
    const rightSide: [number, number][] = [];

    for (let i = 0; i < sampled.length; i++) {
      const pos = sampled[i];
      const altAgl = Math.max(100, pos.altitude - KJPX_ELEVATION_FT); // min 100ft to avoid divide by 0

      // Find horizontal distance at which noise drops to this band's minimum
      const corridorDistFt = horizontalDistForDb(sourceDb, altAgl, band.minDb);
      const corridorDistM = corridorDistFt / 3.28084;

      // Calculate bearing of the track at this point
      let brng: number;
      if (i < sampled.length - 1) {
        brng = bearing(pos.latitude, pos.longitude, sampled[i + 1].latitude, sampled[i + 1].longitude);
      } else {
        brng = bearing(sampled[i - 1].latitude, sampled[i - 1].longitude, pos.latitude, pos.longitude);
      }

      // Perpendicular bearings
      const leftBrng = (brng - 90 + 360) % 360;
      const rightBrng = (brng + 90) % 360;

      // Cap corridor width for visual clarity
      const cappedDist = Math.min(corridorDistM, band.widthM);

      leftSide.push(offsetPoint(pos.latitude, pos.longitude, leftBrng, cappedDist));
      rightSide.push(offsetPoint(pos.latitude, pos.longitude, rightBrng, cappedDist));
    }

    // Close the polygon: left side forward, right side reversed
    const ring = [...leftSide, ...rightSide.reverse(), leftSide[0]];

    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {
        minDb: band.minDb,
        color: band.color,
        label: band.label,
      },
    };
  });

  return {
    contours: contourFeatures,
    points: pointFeatures,
    peakDb: Math.round(peakDb),
    peakLocation,
  };
}
