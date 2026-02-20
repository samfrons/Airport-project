// Flight data types matching the Python backend schema

// Noise profile attached by the API using EASA/FAA certification data
export interface FlightNoiseProfile {
  takeoff_db: number;
  approach_db: number;
  effective_db: number;  // Direction-appropriate dB (approach for arrivals, takeoff for departures)
  noise_category: 'quiet' | 'moderate' | 'loud' | 'very_loud';
  lateral_epnl?: number | null;
  flyover_epnl?: number | null;
  approach_epnl?: number | null;
  manufacturer?: string | null;
  model?: string | null;
  data_source?: 'EASA_CERTIFIED' | 'FAA_MEASURED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
  confidence?: 'high' | 'medium' | 'low';
  altitude_profile?: Array<{ altitude_ft: number; db: number }>;
}

export interface Flight {
  id: number;
  fa_flight_id: string;
  ident: string;
  registration: string;
  direction: 'arrival' | 'departure';
  aircraft_type: string;
  aircraft_category: 'helicopter' | 'fixed_wing' | 'jet' | 'unknown';
  operator: string;
  operator_iata: string;
  origin_code: string;
  origin_name: string;
  origin_city: string;
  destination_code: string;
  destination_name: string;
  destination_city: string;
  scheduled_off: string;
  actual_off: string;
  scheduled_on: string;
  actual_on: string;
  operation_date: string;
  operation_hour_et: number;
  is_curfew_period: boolean;
  is_weekend: boolean;
  fetched_at: string;
  // Noise profile from API (EASA/FAA data)
  noise_profile?: FlightNoiseProfile;
}

export interface DailySummary {
  operation_date: string;
  total_operations: number;
  arrivals: number;
  departures: number;
  helicopters: number;
  fixed_wing: number;
  jets: number;
  unknown_type: number;
  curfew_operations: number;
  unique_aircraft: number;
  day_of_week: string;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  flight_count: number;
}

export type MapViewMode = 'routes' | 'stats' | 'heatmap';

export interface DateRange {
  start: string;
  end: string;
}
