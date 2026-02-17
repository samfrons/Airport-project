/**
 * Biodiversity Types - Disabled Stub
 *
 * This file provides stub types and functions to maintain compatibility.
 * The biodiversity feature has been removed from the dashboard.
 */

export type ImpactSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'minimal';

export interface BiodiversityLayerSettings {
  visible: boolean;
  opacity: number;
  showImpactZones: boolean;
  showSpeciesMarkers: boolean;
  showHabitatAreas: boolean;
  selectedSpeciesGroup: string;
}

/**
 * Get color for impact severity - stub that returns gray
 */
export function getImpactSeverityColor(severity: ImpactSeverity): string {
  switch (severity) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'moderate':
      return '#eab308';
    case 'low':
      return '#84cc16';
    case 'minimal':
      return '#22c55e';
    default:
      return '#71717a';
  }
}
