/**
 * Biodiversity Impact Zones Data - Disabled Stub
 *
 * The biodiversity feature has been removed from the dashboard.
 */

export interface ImpactZone {
  id: string;
  label: string;
  severity: string;
  radiusMeters: number;
  color: string;
  fillOpacity: number;
  estimatedDbRange: [number, number];
  speciesRichnessDecline: number;
  birdAbundanceDecline: number;
  description: string;
}

export const biodiversityImpactZones: ImpactZone[] = [];

export function generateZoneCircle(
  _center: [number, number],
  _radiusMeters: number,
  _numPoints: number = 64
): [number, number][] {
  return [];
}
