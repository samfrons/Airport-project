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

// Legacy NoiseComplaint interface for mock data compatibility
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

// ─── Database Complaint Types (PlaneNoise Integration) ──────────────────────

/**
 * Full complaint record from database (PlaneNoise data).
 * PII has been stripped: no names, phone numbers, email, or house numbers.
 */
export interface Complaint {
  id: number;
  source_id: string | null;

  // Event timing
  event_date: string;                    // YYYY-MM-DD
  event_time: string | null;             // HH:MM (local ET)
  event_datetime_utc: string | null;     // ISO 8601 UTC
  event_hour_et: number | null;          // 0-23
  is_curfew_period: boolean;             // 9 PM - 7 AM ET (Pilot's Pledge)
  is_weekend: boolean;

  // Location (privacy-redacted)
  street_name: string | null;            // Street name only, no house number
  municipality: string | null;           // Wainscott, Bridgehampton, etc.
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;

  // Complaint details (from PlaneNoise form)
  airport: string;                       // JPX, MTP, or Other
  complaint_types: string | null;        // Comma-separated types
  aircraft_type: string | null;          // Jet, Prop, Helicopter, Seaplane, etc.
  aircraft_description: string | null;   // Free text description
  flight_direction: string | null;       // Arrival, Departure, N/S/E/W
  comments: string | null;

  // Flight correlation (populated by matching algorithm)
  matched_flight_id: string | null;      // FK to flights.fa_flight_id
  matched_confidence: 'high' | 'medium' | 'low' | 'unmatched' | null;
  matched_registration: string | null;   // Tail number
  matched_operator: string | null;

  // Metadata
  submission_date: string | null;        // When complaint was filed
  created_at: string;
  updated_at: string;
}

/**
 * Daily aggregated complaint summary.
 */
export interface ComplaintDailySummary {
  date: string;                          // YYYY-MM-DD
  total_complaints: number;
  helicopter_complaints: number;
  jet_complaints: number;
  prop_complaints: number;
  seaplane_complaints: number;
  unknown_complaints: number;
  curfew_complaints: number;             // During 9 PM - 7 AM
  excessive_noise: number;
  low_altitude: number;
  too_early_late: number;
  sleep_disturbance: number;
  unique_streets: number;
  unique_municipalities: number;
  created_at: string;
}

/**
 * Geographic complaint hotspot for heatmap visualization.
 */
export interface ComplaintHotspot {
  street_name: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  total_complaints: number;
  helicopter_complaints: number;
  curfew_complaints: number;
  date_first: string | null;             // Earliest complaint date
  date_last: string | null;              // Most recent complaint date
}

/**
 * Aggregated complaint statistics.
 */
export interface ComplaintStats {
  total_complaints: number;
  helicopter_complaints: number;
  jet_complaints: number;
  curfew_complaints: number;
  unique_locations: number;
  matched_to_flights: number;
  earliest_date: string | null;
  latest_date: string | null;
}

/**
 * PlaneNoise complaint type options (from their form).
 */
export type PlaneNoiseComplaintType =
  | 'Excessive Noise'
  | 'Low Altitude'
  | 'Hovering'
  | 'Frequency'
  | 'Excessive Vibration'
  | 'Too Early or Late'
  | 'Speech Disturbance'
  | 'Sleep Disturbance'
  | 'Other';

/**
 * PlaneNoise aircraft type options (from their form).
 */
export type PlaneNoiseAircraftType =
  | 'Jet'
  | 'Prop'
  | 'Helicopter'
  | 'Seaplane'
  | 'Unknown'
  | 'Multiple'
  | 'Other';

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
