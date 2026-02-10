/**
 * Biodiversity Violation Detection Engine
 *
 * Evaluates each flight against the defined biodiversity thresholds
 * and produces a list of violations with affected species and habitats.
 */

import type { Flight } from '@/types/flight';
import type {
  BiodiversityThreshold,
  BiodiversityViolation,
  ViolatedThreshold,
  AffectedSpecies,
  AffectedHabitat,
  ViolationSummary,
  TopOffender,
} from '@/types/biodiversityThresholds';
import type { ImpactSeverity } from '@/types/biodiversity';
import { getHighestSeverity } from '@/types/biodiversityThresholds';
import { biodiversityThresholds as defaultThresholds } from '@/data/biodiversity/thresholds';
import { speciesImpacts, habitatAreas } from '@/data/biodiversity/speciesImpacts';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import type { AircraftCategory, FlightDirection } from '@/types/biodiversityThresholds';

/**
 * Evaluate a single flight against all active biodiversity thresholds.
 * Accepts an optional thresholds array — if not provided, uses the default set.
 */
export function evaluateFlight(
  flight: Flight,
  thresholds?: BiodiversityThreshold[],
): BiodiversityViolation | null {
  const activeThresholds = thresholds ?? defaultThresholds;
  const profile = getAircraftNoiseProfile(flight.aircraft_type);
  const estimatedDb = flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
  const operationMonth = new Date(flight.operation_date + 'T00:00:00').getMonth() + 1; // 1-12
  const operationHour = flight.operation_hour_et;
  const aircraftCategory = flight.aircraft_category as AircraftCategory;
  const flightDirection = flight.direction as FlightDirection;

  const violatedThresholds: ViolatedThreshold[] = [];

  for (const threshold of activeThresholds) {
    if (!threshold.enabled) continue;

    // Per-aircraft-category filtering
    if (
      threshold.applicableAircraftCategories &&
      threshold.applicableAircraftCategories.length > 0 &&
      !threshold.applicableAircraftCategories.includes(aircraftCategory)
    ) {
      continue;
    }

    // Per-direction filtering
    if (
      threshold.applicableDirections &&
      threshold.applicableDirections.length > 0 &&
      !threshold.applicableDirections.includes(flightDirection)
    ) {
      continue;
    }

    let violated = false;
    let exceedanceDb: number | undefined;
    let reason = '';

    switch (threshold.type) {
      case 'noise_level':
        if (threshold.noiseThresholdDb && estimatedDb >= threshold.noiseThresholdDb) {
          violated = true;
          exceedanceDb = Math.round(estimatedDb - threshold.noiseThresholdDb);
          reason = `${estimatedDb} dB exceeds ${threshold.noiseThresholdDb} dB threshold by +${exceedanceDb} dB`;
        }
        break;

      case 'time_of_day':
        if (threshold.activeHours) {
          const { start, end } = threshold.activeHours;
          const inWindow = start < end
            ? operationHour >= start && operationHour < end
            : operationHour >= start || operationHour < end; // wraps midnight
          if (inWindow) {
            violated = true;
            reason = `Operation at ${operationHour}:00 ET during protected ${threshold.label.toLowerCase()} (${start}:00-${end}:00)`;
          }
        }
        break;

      case 'seasonal':
        if (
          threshold.activeMonths?.includes(operationMonth) &&
          threshold.noiseThresholdDb &&
          estimatedDb >= threshold.noiseThresholdDb
        ) {
          violated = true;
          exceedanceDb = Math.round(estimatedDb - threshold.noiseThresholdDb);
          reason = `${estimatedDb} dB during ${threshold.label.toLowerCase()} (month ${operationMonth}) exceeds ${threshold.noiseThresholdDb} dB limit by +${exceedanceDb} dB`;
        }
        break;

      case 'habitat_proximity':
        // All flights at KJPX are near habitat areas — check if noise exceeds
        // the habitat-specific threshold
        if (threshold.noiseThresholdDb && estimatedDb >= threshold.noiseThresholdDb) {
          // Check if any protected habitat type exists in our area
          const relevantHabitats = habitatAreas.filter(
            (h) => threshold.protectedHabitatTypes?.includes(h.type)
          );
          if (relevantHabitats.length > 0) {
            violated = true;
            exceedanceDb = Math.round(estimatedDb - threshold.noiseThresholdDb);
            reason = `${estimatedDb} dB exceeds ${threshold.noiseThresholdDb} dB near ${relevantHabitats.length} ${threshold.protectedHabitatTypes?.join('/')} habitat(s)`;
          }
        }
        break;
    }

    if (violated) {
      violatedThresholds.push({
        thresholdId: threshold.id,
        thresholdLabel: threshold.label,
        severity: threshold.violationSeverity,
        exceedanceDb,
        reason,
      });
    }
  }

  // No violations — skip
  if (violatedThresholds.length === 0) return null;

  // Determine affected species (those whose sensitivity threshold is below our noise level)
  const speciesAffected: AffectedSpecies[] = speciesImpacts
    .filter((sp) => estimatedDb >= sp.sensitivityThresholdDb)
    .map((sp) => ({
      speciesId: sp.id,
      commonName: sp.commonName,
      sensitivityThresholdDb: sp.sensitivityThresholdDb,
      exceedanceDb: Math.round(estimatedDb - sp.sensitivityThresholdDb),
      severity: sp.severity,
      conservationStatus: sp.conservationStatus,
    }));

  // Determine affected habitats
  const habitatsAffected: AffectedHabitat[] = habitatAreas
    .filter((h) => estimatedDb >= h.estimatedNoiseExposure * 0.8) // within exposure range
    .map((h) => ({
      habitatId: h.id,
      habitatName: h.name,
      habitatType: h.type,
      estimatedNoiseAtHabitat: h.estimatedNoiseExposure,
      impactSeverity: h.impactSeverity,
    }));

  const overallSeverity = getHighestSeverity(violatedThresholds.map((t) => t.severity));

  return {
    id: `vio-${flight.fa_flight_id}`,
    flightId: flight.fa_flight_id,
    flightIdent: flight.ident,
    registration: flight.registration || flight.ident,
    operator: flight.operator || 'Private',
    aircraftType: flight.aircraft_type,
    aircraftCategory: flight.aircraft_category,
    direction: flight.direction,
    operationDate: flight.operation_date,
    operationHour: flight.operation_hour_et,
    estimatedNoiseDb: estimatedDb,
    violatedThresholds,
    overallSeverity,
    speciesAffected,
    habitatsAffected,
  };
}

/**
 * Evaluate all flights and return violations.
 * Accepts an optional thresholds array — if not provided, uses the default set.
 */
export function evaluateAllFlights(
  flights: Flight[],
  thresholds?: BiodiversityThreshold[],
): BiodiversityViolation[] {
  return flights
    .map((f) => evaluateFlight(f, thresholds))
    .filter((v): v is BiodiversityViolation => v !== null);
}

/**
 * Generate violation summary statistics
 */
export function generateViolationSummary(violations: BiodiversityViolation[]): ViolationSummary {
  const bySeverity: Record<ImpactSeverity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    minimal: 0,
  };

  const byThreshold: Record<string, number> = {};
  const byAircraftCategory: Record<string, number> = {};
  const offenderMap: Record<string, { registration: string; operator: string; aircraftType: string; count: number; worstSeverity: ImpactSeverity }> = {};

  let protectedSpeciesViolations = 0;
  let habitatViolations = 0;

  for (const violation of violations) {
    bySeverity[violation.overallSeverity]++;

    // By threshold
    for (const t of violation.violatedThresholds) {
      byThreshold[t.thresholdLabel] = (byThreshold[t.thresholdLabel] || 0) + 1;
    }

    // By aircraft category
    byAircraftCategory[violation.aircraftCategory] =
      (byAircraftCategory[violation.aircraftCategory] || 0) + 1;

    // Protected species
    if (violation.speciesAffected.some((s) => s.conservationStatus)) {
      protectedSpeciesViolations++;
    }

    // Habitats
    if (violation.habitatsAffected.length > 0) {
      habitatViolations++;
    }

    // Top offenders
    const key = violation.registration;
    if (!offenderMap[key]) {
      offenderMap[key] = {
        registration: violation.registration,
        operator: violation.operator,
        aircraftType: violation.aircraftType,
        count: 0,
        worstSeverity: 'minimal',
      };
    }
    offenderMap[key].count++;
    const existing = offenderMap[key];
    existing.worstSeverity = getHighestSeverity([existing.worstSeverity, violation.overallSeverity]);
  }

  const topOffenders: TopOffender[] = Object.values(offenderMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ count, ...rest }) => ({ ...rest, violationCount: count }));

  return {
    totalViolations: violations.length,
    totalFlightsWithViolations: new Set(violations.map((v) => v.flightId)).size,
    bySeverity,
    byThreshold,
    byAircraftCategory,
    topOffenders,
    protectedSpeciesViolations,
    habitatViolations,
  };
}
