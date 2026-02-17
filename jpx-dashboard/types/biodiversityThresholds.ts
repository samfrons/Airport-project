/**
 * Biodiversity Thresholds Types - Disabled Stub
 *
 * This file provides stub types to maintain compatibility.
 * The biodiversity feature has been removed from the dashboard.
 */

export interface BiodiversityThreshold {
  id: string;
  name: string;
  enabled: boolean;
}

export interface BiodiversityViolation {
  id: string;
  flightId: string;
  flightIdent: string;
  registration?: string;
  aircraftType: string;
  aircraftCategory: string;
  direction?: 'arrival' | 'departure';
  estimatedNoiseDb: number;
  overallSeverity: 'critical' | 'high' | 'moderate' | 'low' | 'minimal';
  speciesAffected: Array<{ speciesId: string; commonName: string; conservationStatus?: string }>;
  habitatsAffected: Array<{ habitatId: string; name: string; habitatName?: string; habitatType?: string }>;
  violatedThresholds: Array<{
    thresholdId: string;
    severity: 'critical' | 'high' | 'moderate' | 'low' | 'minimal';
    thresholdLabel?: string;
    exceedanceDb?: number;
  }>;
  operationDate: string;
  operationHour: number;
  operator: string;
}

export const biodiversityThresholds: BiodiversityThreshold[] = [];

export function getHighestSeverity(
  severities: Array<'critical' | 'high' | 'moderate' | 'low' | 'minimal'>
): 'critical' | 'high' | 'moderate' | 'low' | 'minimal' {
  const priority = ['critical', 'high', 'moderate', 'low', 'minimal'];
  for (const p of priority) {
    if (severities.includes(p as any)) return p as any;
  }
  return 'minimal';
}
