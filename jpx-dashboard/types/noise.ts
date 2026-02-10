// Noise visualization types for airport noise impact monitoring

// ─── Noise Sensor Types ──────────────────────────────────────────────────────

export interface NoiseSensor {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'active' | 'offline' | 'maintenance';
  lastReading: NoiseReading | null;
  readings: NoiseReading[];
}

export interface NoiseReading {
  timestamp: string;
  dB: number;
  peakDb: number;
  sensorId: string;
}

export type NoiseSeverityLevel = 'low' | 'moderate' | 'high' | 'severe';

// ─── Aircraft Noise Types ────────────────────────────────────────────────────

export interface AircraftNoiseProfile {
  aircraftType: string;
  category: 'helicopter' | 'fixed_wing' | 'jet' | 'unknown';
  noiseCategory: 'quiet' | 'moderate' | 'loud' | 'very_loud';
  takeoffDb: number;
  approachDb: number;
}

// ─── Noise Complaint Types ───────────────────────────────────────────────────

export interface NoiseComplaint {
  id: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    neighborhood?: string;
  };
  severity: 1 | 2 | 3 | 4 | 5;
  category: ComplaintCategory;
  description?: string;
}

export type ComplaintCategory =
  | 'helicopter'
  | 'jet'
  | 'low_flying'
  | 'early_morning'
  | 'late_night'
  | 'frequency'
  | 'other';

// ─── Layer Display Settings ──────────────────────────────────────────────────

export interface NoiseLayerVisibility {
  sensors: boolean;
  aircraftNoise: boolean;
  complaints: boolean;
}

export interface NoiseLayerOpacity {
  sensors: number;
  aircraftNoise: number;
  complaints: number;
}

export type ComplaintsDisplayMode = 'markers' | 'heatmap' | 'clusters';

export interface NoiseLayerSettings {
  visibility: NoiseLayerVisibility;
  opacity: NoiseLayerOpacity;
  complaintsMode: ComplaintsDisplayMode;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getDbSeverityLevel(dB: number): NoiseSeverityLevel {
  if (dB < 55) return 'low';
  if (dB < 70) return 'moderate';
  if (dB < 85) return 'high';
  return 'severe';
}

export function getDbColor(dB: number): string {
  if (dB < 55) return '#22c55e';  // green
  if (dB < 65) return '#84cc16';  // lime
  if (dB < 75) return '#eab308';  // yellow
  if (dB < 85) return '#f97316';  // orange
  return '#ef4444';               // red
}
