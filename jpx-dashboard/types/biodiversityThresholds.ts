// Biodiversity threshold and violation types

import type { ImpactSeverity, TaxonomicGroup, HabitatType } from './biodiversity';

// ─── Aircraft Category Type ─────────────────────────────────────────────────

export type AircraftCategory = 'helicopter' | 'jet' | 'fixed_wing' | 'unknown';
export type FlightDirection = 'arrival' | 'departure';

// ─── Threshold Configuration ────────────────────────────────────────────────

export interface BiodiversityThreshold {
  id: string;
  label: string;
  description: string;
  /** Whether this threshold is currently active/enforced */
  enabled: boolean;
  /** Threshold type */
  type: 'noise_level' | 'time_of_day' | 'seasonal' | 'habitat_proximity';
  /** Noise level in dB that triggers this threshold */
  noiseThresholdDb?: number;
  /** Hours during which this threshold applies (24h format) */
  activeHours?: { start: number; end: number };
  /** Months during which this threshold applies (1-12) */
  activeMonths?: number[];
  /** Habitat types this threshold protects */
  protectedHabitatTypes?: HabitatType[];
  /** Species groups this threshold protects */
  protectedGroups?: TaxonomicGroup[];
  /** Severity when threshold is violated */
  violationSeverity: ImpactSeverity;
  /** Aircraft categories this threshold applies to (empty/undefined = all) */
  applicableAircraftCategories?: AircraftCategory[];
  /** Flight directions this threshold applies to (empty/undefined = all) */
  applicableDirections?: FlightDirection[];
  /** Whether this threshold was created by an admin (vs. built-in) */
  isCustom?: boolean;
  /** When this threshold was created (ISO string) */
  createdAt?: string;
}

// ─── Violation Types ────────────────────────────────────────────────────────

export interface BiodiversityViolation {
  id: string;
  /** The flight that caused the violation */
  flightId: string;
  flightIdent: string;
  registration: string;
  operator: string;
  aircraftType: string;
  aircraftCategory: string;
  direction: 'arrival' | 'departure';
  /** Operation time details */
  operationDate: string;
  operationHour: number;
  /** Noise profile of this aircraft */
  estimatedNoiseDb: number;
  /** Which thresholds were violated */
  violatedThresholds: ViolatedThreshold[];
  /** Overall severity (highest among violated thresholds) */
  overallSeverity: ImpactSeverity;
  /** Species potentially affected */
  speciesAffected: AffectedSpecies[];
  /** Habitats potentially affected */
  habitatsAffected: AffectedHabitat[];
}

export interface ViolatedThreshold {
  thresholdId: string;
  thresholdLabel: string;
  severity: ImpactSeverity;
  /** How much the threshold was exceeded (e.g., +12 dB) */
  exceedanceDb?: number;
  reason: string;
}

export interface AffectedSpecies {
  speciesId: string;
  commonName: string;
  sensitivityThresholdDb: number;
  /** How much the aircraft noise exceeds this species' threshold */
  exceedanceDb: number;
  severity: ImpactSeverity;
  conservationStatus?: string;
}

export interface AffectedHabitat {
  habitatId: string;
  habitatName: string;
  habitatType: HabitatType;
  estimatedNoiseAtHabitat: number;
  impactSeverity: ImpactSeverity;
}

// ─── Summary Types ──────────────────────────────────────────────────────────

export interface ViolationSummary {
  totalViolations: number;
  totalFlightsWithViolations: number;
  bySeverity: Record<ImpactSeverity, number>;
  byThreshold: Record<string, number>;
  byAircraftCategory: Record<string, number>;
  topOffenders: TopOffender[];
  protectedSpeciesViolations: number;
  habitatViolations: number;
}

export interface TopOffender {
  registration: string;
  operator: string;
  aircraftType: string;
  violationCount: number;
  worstSeverity: ImpactSeverity;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const severityOrder: Record<ImpactSeverity, number> = {
  minimal: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export function getHighestSeverity(severities: ImpactSeverity[]): ImpactSeverity {
  if (severities.length === 0) return 'minimal';
  return severities.reduce((highest, current) =>
    severityOrder[current] > severityOrder[highest] ? current : highest
  );
}

export function severityIsAtLeast(severity: ImpactSeverity, minimum: ImpactSeverity): boolean {
  return severityOrder[severity] >= severityOrder[minimum];
}
