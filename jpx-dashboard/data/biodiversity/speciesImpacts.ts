/**
 * Species Impacts Data - Disabled Stub
 *
 * The biodiversity feature has been removed from the dashboard.
 */

export interface HabitatArea {
  id: string;
  name: string;
  type: string;
  coordinates: [number, number];
  radiusMeters: number;
  estimatedNoiseExposure: number;
  impactSeverity: 'critical' | 'high' | 'moderate' | 'low' | 'minimal';
  description: string;
  keySpecies: string[];
}

export const habitatAreas: HabitatArea[] = [];
