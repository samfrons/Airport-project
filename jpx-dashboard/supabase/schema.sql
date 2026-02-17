-- JPX Dashboard Supabase Schema
-- Run this in your Supabase SQL Editor

-- Flights table
CREATE TABLE IF NOT EXISTS flights (
  id BIGSERIAL PRIMARY KEY,
  fa_flight_id TEXT UNIQUE NOT NULL,
  ident TEXT,
  registration TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('arrival', 'departure')),
  aircraft_type TEXT,
  aircraft_category TEXT,
  operator TEXT,
  operator_iata TEXT,
  origin_code TEXT,
  origin_name TEXT,
  origin_city TEXT,
  destination_code TEXT,
  destination_name TEXT,
  destination_city TEXT,
  scheduled_off TIMESTAMPTZ,
  actual_off TIMESTAMPTZ,
  scheduled_on TIMESTAMPTZ,
  actual_on TIMESTAMPTZ,
  operation_date DATE,
  operation_hour_et INTEGER,
  is_curfew_period BOOLEAN DEFAULT FALSE,
  is_weekend BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  raw_json JSONB
);

-- Daily summary table
CREATE TABLE IF NOT EXISTS daily_summary (
  operation_date DATE PRIMARY KEY,
  total_operations INTEGER DEFAULT 0,
  arrivals INTEGER DEFAULT 0,
  departures INTEGER DEFAULT 0,
  helicopters INTEGER DEFAULT 0,
  fixed_wing INTEGER DEFAULT 0,
  jets INTEGER DEFAULT 0,
  unknown_type INTEGER DEFAULT 0,
  curfew_operations INTEGER DEFAULT 0,
  unique_aircraft INTEGER DEFAULT 0,
  day_of_week TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flights_operation_date ON flights(operation_date);
CREATE INDEX IF NOT EXISTS idx_flights_direction ON flights(direction);
CREATE INDEX IF NOT EXISTS idx_flights_registration ON flights(registration);
CREATE INDEX IF NOT EXISTS idx_flights_aircraft_type ON flights(aircraft_type);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed)
CREATE POLICY "Allow public read access on flights"
  ON flights FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on daily_summary"
  ON daily_summary FOR SELECT
  USING (true);

-- ============================================================
-- Noise Complaint Tables
-- Based on PlaneNoise complaint form fields (planenoise.com/khto/)
-- ============================================================

-- Raw complaints table (PII stripped: no names, phone, email, house numbers)
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT,                              -- PlaneNoise's internal complaint ID

  -- Event timing
  event_date DATE NOT NULL,                    -- Date of noise event
  event_time TIME,                             -- Time of noise event (local ET)
  event_datetime_utc TIMESTAMPTZ,              -- Combined and converted to UTC
  event_hour_et INTEGER,                       -- Hour in Eastern Time (0-23)
  is_curfew_period BOOLEAN DEFAULT FALSE,      -- During 9 PM - 7 AM ET (Pilot's Pledge)
  is_weekend BOOLEAN DEFAULT FALSE,

  -- Location (privacy-redacted: street name only, no house number)
  street_name TEXT,
  municipality TEXT,                           -- e.g., Wainscott, Bridgehampton, Sag Harbor
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Complaint details (maps to PlaneNoise form fields)
  airport TEXT DEFAULT 'JPX',                  -- JPX, MTP (Montauk), or Other
  complaint_types TEXT,                        -- Comma-separated complaint types
  aircraft_type TEXT,                          -- Jet, Prop, Helicopter, Seaplane, Unknown
  aircraft_description TEXT,                   -- Free text description
  flight_direction TEXT,                       -- Arrival, Departure, North, South, East, West
  comments TEXT,

  -- Flight correlation fields
  matched_flight_id TEXT REFERENCES flights(fa_flight_id),
  matched_confidence TEXT,                     -- high, medium, low, unmatched
  matched_registration TEXT,
  matched_operator TEXT,

  -- Metadata
  submission_date DATE,                        -- When complaint was filed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_complaints_event_date ON complaints(event_date);
CREATE INDEX IF NOT EXISTS idx_complaints_event_hour ON complaints(event_hour_et);
CREATE INDEX IF NOT EXISTS idx_complaints_municipality ON complaints(municipality);
CREATE INDEX IF NOT EXISTS idx_complaints_aircraft_type ON complaints(aircraft_type);
CREATE INDEX IF NOT EXISTS idx_complaints_curfew ON complaints(is_curfew_period);
CREATE INDEX IF NOT EXISTS idx_complaints_matched_flight ON complaints(matched_flight_id);
CREATE INDEX IF NOT EXISTS idx_complaints_date_municipality ON complaints(event_date, municipality);

-- Complaint daily summary (pre-aggregated for fast dashboard queries)
CREATE TABLE IF NOT EXISTS complaint_daily_summary (
  date DATE PRIMARY KEY,
  total_complaints INTEGER DEFAULT 0,
  helicopter_complaints INTEGER DEFAULT 0,
  jet_complaints INTEGER DEFAULT 0,
  prop_complaints INTEGER DEFAULT 0,
  seaplane_complaints INTEGER DEFAULT 0,
  unknown_complaints INTEGER DEFAULT 0,
  curfew_complaints INTEGER DEFAULT 0,
  excessive_noise INTEGER DEFAULT 0,
  low_altitude INTEGER DEFAULT 0,
  too_early_late INTEGER DEFAULT 0,
  sleep_disturbance INTEGER DEFAULT 0,
  unique_streets INTEGER DEFAULT 0,
  unique_municipalities INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaint hotspot summary (for geographic heatmap)
CREATE TABLE IF NOT EXISTS complaint_hotspots (
  street_name TEXT,
  municipality TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  total_complaints INTEGER DEFAULT 0,
  helicopter_complaints INTEGER DEFAULT 0,
  curfew_complaints INTEGER DEFAULT 0,
  date_first DATE,
  date_last DATE,
  PRIMARY KEY (street_name, municipality)
);

-- Geocoding cache
CREATE TABLE IF NOT EXISTS geocode_cache (
  street_name TEXT,
  municipality TEXT,
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoder TEXT,
  geocoded_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (street_name, municipality)
);

-- Enable RLS on complaint tables
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_hotspots ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on complaints"
  ON complaints FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on complaint_daily_summary"
  ON complaint_daily_summary FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on complaint_hotspots"
  ON complaint_hotspots FOR SELECT
  USING (true);
