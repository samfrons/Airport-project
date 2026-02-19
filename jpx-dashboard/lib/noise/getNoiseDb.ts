/**
 * Canonical noise dB functions for the JPX Dashboard.
 *
 * Every component that displays or calculates noise values MUST use these
 * functions. This ensures consistency across the Noise Index card, Compliance
 * Dashboard, Flight Replay, Operator Scorecards, and all tables/charts.
 *
 * Methodology: Noise estimates are derived from FAA aircraft type certification
 * data (EASA Certification Noise Levels database). For arrivals, the approach
 * certification value is used; for departures, the takeoff value. These are
 * fixed per aircraft model at the 1,000 ft reference distance — they do not
 * reflect actual per-flight measurements. Ground-level noise varies with
 * altitude, distance, flight path, and atmospheric conditions.
 *
 * No physical noise monitoring equipment is currently installed at JPX.
 */

import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import type { Flight } from '@/types/flight';

/** Threshold for "loud" aircraft in the Noise Index calculation. */
export const LOUD_THRESHOLD_DB = 85;

/**
 * Get the estimated noise dB for a single flight.
 *
 * Uses direction-appropriate certification value:
 * - Arrivals → approach dB
 * - Departures → takeoff dB
 */
export function getNoiseDb(flight: Flight): number {
  const profile = getAircraftNoiseProfile(flight.aircraft_type);
  return flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
}

/**
 * Get the noise category for a dB value.
 */
export function getNoiseCategory(db: number): string {
  if (db >= 88) return 'very_loud';
  if (db >= 82) return 'loud';
  if (db >= 75) return 'moderate';
  return 'quiet';
}

/**
 * Compute the Noise Index: count of "loud" operations.
 *
 * Definition: all helicopter operations + jets where estimated noise ≥ 85 dB.
 * The same function is used by the card face, subtitle, and detail panel.
 */
export function getNoiseIndex(flights: Flight[]): number {
  let count = 0;
  for (const f of flights) {
    if (f.aircraft_category === 'helicopter') {
      count++;
    } else if (f.aircraft_category === 'jet') {
      const db = getNoiseDb(f);
      if (db >= LOUD_THRESHOLD_DB) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Get breakdown of the Noise Index for display.
 */
export function getNoiseIndexBreakdown(flights: Flight[]): {
  total: number;
  helicopters: number;
  loudJets: number;
} {
  let helicopters = 0;
  let loudJets = 0;
  for (const f of flights) {
    if (f.aircraft_category === 'helicopter') {
      helicopters++;
    } else if (f.aircraft_category === 'jet') {
      if (getNoiseDb(f) >= LOUD_THRESHOLD_DB) {
        loudJets++;
      }
    }
  }
  return { total: helicopters + loudJets, helicopters, loudJets };
}
