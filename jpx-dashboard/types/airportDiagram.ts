// ─── Airport Diagram Types ───────────────────────────────────────────────────

export type RunwayStatus = 'open' | 'closed' | 'restricted';
export type TaxiwayStatus = 'open' | 'closed' | 'restricted';

export interface Coordinates {
  x: number;
  y: number;
}

export interface RunwayThreshold {
  designator: string;       // e.g., "10", "28", "16", "34"
  elevation: number;        // feet MSL
  displaced?: number;       // displaced threshold in feet
  coordinates: Coordinates; // SVG coordinates
}

export interface Runway {
  id: string;
  name: string;             // e.g., "10-28"
  length: number;           // feet
  width: number;            // feet
  surface: string;          // e.g., "asphalt"
  heading: number;          // magnetic heading (0-360)
  thresholds: [RunwayThreshold, RunwayThreshold];
  status: RunwayStatus;
  notam?: string;           // active NOTAM text
  path: string;             // SVG path for the runway shape
}

export interface TaxiwaySegment {
  id: string;
  path: string;             // SVG path
}

export interface Taxiway {
  id: string;
  name: string;             // e.g., "TWA", "TWB"
  segments: TaxiwaySegment[];
  status: TaxiwayStatus;
  notam?: string;
}

export interface Terminal {
  id: string;
  name: string;
  type: 'terminal' | 'hangar' | 'fbo' | 'parking' | 'apron' | 'beacon' | 'windsock';
  path: string;             // SVG path or rect definition
  label?: string;
}

export interface AirportLayout {
  id: string;
  icao: string;
  name: string;
  elevation: number;        // field elevation in feet MSL
  magneticVariation: number; // degrees west
  viewBox: {
    width: number;
    height: number;
  };
  runways: Runway[];
  taxiways: Taxiway[];
  terminals: Terminal[];
  scaleBarLength: number;   // in feet, for the scale bar
}

export interface DiagramViewState {
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
}

export interface DiagramSelection {
  type: 'runway' | 'taxiway' | 'terminal' | null;
  id: string | null;
}

export interface DiagramTooltipData {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  details: string[];
}

export interface AirportDiagramState {
  layout: AirportLayout | null;
  view: DiagramViewState;
  selection: DiagramSelection;
  tooltip: DiagramTooltipData;
  showNOTAMs: boolean;
  showLegend: boolean;
  loading: boolean;
  error: string | null;
}
