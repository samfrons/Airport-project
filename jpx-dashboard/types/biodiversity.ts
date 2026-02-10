// Biodiversity impact types for wildlife and ecosystem analysis
// Based on research from CAA CAP 2517, Royal Society B, PNAS, and other studies

// ─── Impact Zone Types ──────────────────────────────────────────────────────

export type ImpactSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'minimal';

export interface BiodiversityImpactZone {
  id: string;
  label: string;
  /** Distance from airport in meters */
  radiusMeters: number;
  /** Estimated noise level at this distance in dB(A) */
  estimatedDbRange: [number, number];
  severity: ImpactSeverity;
  /** Color for map rendering */
  color: string;
  /** Fill opacity for map */
  fillOpacity: number;
  /** Summary of ecological impact at this zone */
  description: string;
  /** Percentage decline in species richness (from research) */
  speciesRichnessDecline: number;
  /** Percentage decline in bird abundance */
  birdAbundanceDecline: number;
}

// ─── Species Impact Types ───────────────────────────────────────────────────

export type TaxonomicGroup =
  | 'birds'
  | 'mammals'
  | 'amphibians'
  | 'insects'
  | 'reptiles'
  | 'marine';

export type ImpactType =
  | 'behavioral'
  | 'physiological'
  | 'reproductive'
  | 'population'
  | 'communication'
  | 'foraging'
  | 'predation';

export interface SpeciesImpact {
  id: string;
  commonName: string;
  scientificName: string;
  taxonomicGroup: TaxonomicGroup;
  /** Whether this species is found near East Hampton / Long Island */
  locallyRelevant: boolean;
  /** Noise threshold in dB where impacts begin */
  sensitivityThresholdDb: number;
  /** Types of impact experienced */
  impactTypes: ImpactType[];
  /** Severity of overall impact */
  severity: ImpactSeverity;
  /** Brief research-backed description */
  description: string;
  /** Source reference */
  source: string;
  /** Conservation status if applicable */
  conservationStatus?: string;
}

// ─── Ecological Indicator Types ─────────────────────────────────────────────

export interface EcologicalIndicator {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: 'declining' | 'stable' | 'unknown';
  description: string;
  source: string;
}

// ─── Research Finding Types ─────────────────────────────────────────────────

export interface ResearchFinding {
  id: string;
  title: string;
  finding: string;
  source: string;
  year: number;
  /** Relevant noise level or range */
  noiseLevel?: string;
  /** Quantitative impact metric */
  impactMetric?: string;
  taxonomicGroup?: TaxonomicGroup;
}

// ─── Layer Settings ─────────────────────────────────────────────────────────

export interface BiodiversityLayerSettings {
  visible: boolean;
  opacity: number;
  showImpactZones: boolean;
  showSpeciesMarkers: boolean;
  showHabitatAreas: boolean;
  selectedSpeciesGroup: TaxonomicGroup | 'all';
}

// ─── Habitat Area Types ─────────────────────────────────────────────────────

export type HabitatType =
  | 'wetland'
  | 'forest'
  | 'grassland'
  | 'coastal'
  | 'freshwater';

export interface HabitatArea {
  id: string;
  name: string;
  type: HabitatType;
  coordinates: [number, number];
  /** Approximate area radius in meters for display */
  radiusMeters: number;
  /** Key species found in this habitat */
  keySpecies: string[];
  /** Estimated noise exposure in dB */
  estimatedNoiseExposure: number;
  /** Impact severity based on noise exposure */
  impactSeverity: ImpactSeverity;
  description: string;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

export function getImpactSeverityColor(severity: ImpactSeverity): string {
  switch (severity) {
    case 'critical': return '#dc2626'; // red-600
    case 'high': return '#ea580c';     // orange-600
    case 'moderate': return '#d97706'; // amber-600
    case 'low': return '#65a30d';      // lime-600
    case 'minimal': return '#16a34a';  // green-600
  }
}

export function getImpactSeverityLabel(severity: ImpactSeverity): string {
  switch (severity) {
    case 'critical': return 'Critical Impact';
    case 'high': return 'High Impact';
    case 'moderate': return 'Moderate Impact';
    case 'low': return 'Low Impact';
    case 'minimal': return 'Minimal Impact';
  }
}

export function getTaxonomicGroupIcon(group: TaxonomicGroup): string {
  switch (group) {
    case 'birds': return 'bird';
    case 'mammals': return 'squirrel';
    case 'amphibians': return 'fish';
    case 'insects': return 'bug';
    case 'reptiles': return 'turtle';
    case 'marine': return 'waves';
  }
}
