-- JPX Dashboard Noise Tables Migration
-- Adds aircraft noise profiles and flight track data for accurate noise estimation
-- Run this in your Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- Aircraft Noise Profiles Table
-- Stores EASA certification data and category estimates for noise calculations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS aircraft_noise_profiles (
  icao_type TEXT PRIMARY KEY,
  manufacturer TEXT,
  model TEXT,
  engine_type TEXT,
  mtom_kg INTEGER,                    -- Max takeoff mass in kg
  category TEXT CHECK (category IN ('helicopter', 'jet', 'fixed_wing', 'unknown')),

  -- EASA EPNL certification values (dB)
  lateral_epnl DECIMAL(5,1),          -- Lateral (sideline) noise
  flyover_epnl DECIMAL(5,1),          -- Flyover noise
  approach_epnl DECIMAL(5,1),         -- Approach noise

  -- Converted LAmax values at 1000ft reference (dB)
  takeoff_db DECIMAL(5,1),            -- For departures
  approach_db DECIMAL(5,1),           -- For arrivals

  -- Noise category classification
  noise_category TEXT CHECK (noise_category IN ('quiet', 'moderate', 'loud', 'very_loud')),
  noise_chapter TEXT,                 -- ICAO Noise Chapter (e.g., 'Chapter 14')

  -- Data source tracking
  data_source TEXT DEFAULT 'EASA' CHECK (data_source IN ('EASA', 'FAA', 'CATEGORY_ESTIMATE', 'MANUAL')),
  confidence TEXT DEFAULT 'high' CHECK (confidence IN ('high', 'medium', 'low')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_noise_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_aircraft_noise_profiles_timestamp
  BEFORE UPDATE ON aircraft_noise_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_noise_profile_timestamp();

-- Index for category queries
CREATE INDEX IF NOT EXISTS idx_noise_profiles_category ON aircraft_noise_profiles(category);
CREATE INDEX IF NOT EXISTS idx_noise_profiles_data_source ON aircraft_noise_profiles(data_source);

-- ─────────────────────────────────────────────────────────────────────────────
-- Flight Tracks Table
-- Stores FlightAware track positions for noise analysis
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flight_tracks (
  id BIGSERIAL PRIMARY KEY,
  fa_flight_id TEXT REFERENCES flights(fa_flight_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  altitude_ft INTEGER,
  groundspeed_kts INTEGER,
  heading INTEGER,                    -- Degrees true north

  -- Calculated noise estimates at standard observer location
  estimated_ground_db DECIMAL(5,1),   -- At nearest sensor/observer
  noise_source TEXT,                  -- 'EASA_CERTIFIED', 'CATEGORY_ESTIMATE', 'UNVERIFIED'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for track queries
CREATE INDEX IF NOT EXISTS idx_tracks_flight_id ON flight_tracks(fa_flight_id);
CREATE INDEX IF NOT EXISTS idx_tracks_timestamp ON flight_tracks(timestamp);
CREATE INDEX IF NOT EXISTS idx_tracks_location ON flight_tracks USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Observer Locations Table
-- Configurable noise monitoring points around the airport
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS noise_observer_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  location_type TEXT DEFAULT 'residential' CHECK (
    location_type IN ('residential', 'commercial', 'school', 'hospital', 'natural_area', 'runway')
  ),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default KJPX observer locations
INSERT INTO noise_observer_locations (id, name, description, latitude, longitude, location_type)
VALUES
  ('wainscott-main', 'Wainscott Main Street', 'Central residential area', 40.9445, -72.2337, 'residential'),
  ('sagaponack-south', 'Sagaponack South', 'Beach community', 40.9234, -72.2567, 'residential'),
  ('runway-approach', 'Runway 28 Approach', 'Primary arrival path', 40.9589, -72.2312, 'runway'),
  ('runway-departure', 'Runway 10 Departure', 'Primary departure path', 40.9591, -72.2720, 'runway'),
  ('northwest-residential', 'Northwest Residential', 'North residential zone', 40.9678, -72.2612, 'residential'),
  ('georgica-pond', 'Georgica Pond Area', 'Protected natural area', 40.9412, -72.2234, 'natural_area'),
  ('daniels-hole-road', 'Daniels Hole Road', 'Residential corridor', 40.9512, -72.2445, 'residential'),
  ('beach-lane', 'Beach Lane', 'South beach access', 40.9312, -72.2389, 'residential')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Flight Noise Impacts Table
-- Aggregated noise impact data per flight per observer location
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flight_noise_impacts (
  id BIGSERIAL PRIMARY KEY,
  fa_flight_id TEXT REFERENCES flights(fa_flight_id) ON DELETE CASCADE,
  observer_id TEXT REFERENCES noise_observer_locations(id) ON DELETE CASCADE,

  -- Noise metrics
  max_db DECIMAL(5,1),                -- Maximum ground-level noise
  avg_db DECIMAL(5,1),                -- Average during exposure
  exposure_seconds INTEGER,           -- Duration above 55 dB threshold
  time_above_65db INTEGER,            -- Seconds above 65 dB (significant)
  time_above_75db INTEGER,            -- Seconds above 75 dB (loud)

  -- Closest approach
  closest_approach_ft INTEGER,        -- Minimum slant distance
  closest_approach_alt_ft INTEGER,    -- Altitude at closest approach

  -- Data quality
  data_source TEXT,                   -- 'EASA_CERTIFIED', 'CATEGORY_ESTIMATE', 'UNVERIFIED'
  confidence TEXT,                    -- 'high', 'medium', 'low'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(fa_flight_id, observer_id)
);

-- Indexes for impact queries
CREATE INDEX IF NOT EXISTS idx_impacts_flight_id ON flight_noise_impacts(fa_flight_id);
CREATE INDEX IF NOT EXISTS idx_impacts_observer_id ON flight_noise_impacts(observer_id);
CREATE INDEX IF NOT EXISTS idx_impacts_max_db ON flight_noise_impacts(max_db DESC);
CREATE INDEX IF NOT EXISTS idx_impacts_created_at ON flight_noise_impacts(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Noise Summary Table
-- Aggregated noise statistics per day per observer location
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_noise_summary (
  id BIGSERIAL PRIMARY KEY,
  operation_date DATE NOT NULL,
  observer_id TEXT REFERENCES noise_observer_locations(id) ON DELETE CASCADE,

  -- Daily aggregates
  total_events INTEGER DEFAULT 0,     -- Total flights with measurable noise
  max_single_db DECIMAL(5,1),         -- Loudest single event
  avg_peak_db DECIMAL(5,1),           -- Average of all peak values
  total_exposure_seconds INTEGER,     -- Total exposure time above threshold

  -- Category breakdowns
  helicopter_events INTEGER DEFAULT 0,
  jet_events INTEGER DEFAULT 0,
  fixed_wing_events INTEGER DEFAULT 0,

  -- Loudest events tracking
  loudest_flight_id TEXT,             -- Flight ID of loudest event
  loudest_aircraft_type TEXT,         -- ICAO type of loudest aircraft

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(operation_date, observer_id)
);

-- Index for daily queries
CREATE INDEX IF NOT EXISTS idx_daily_noise_date ON daily_noise_summary(operation_date);
CREATE INDEX IF NOT EXISTS idx_daily_noise_observer ON daily_noise_summary(observer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Views for Common Queries
-- ─────────────────────────────────────────────────────────────────────────────

-- View: Flights with noise profile data
CREATE OR REPLACE VIEW flights_with_noise AS
SELECT
  f.*,
  np.takeoff_db,
  np.approach_db,
  np.lateral_epnl,
  np.flyover_epnl,
  np.approach_epnl,
  np.noise_category,
  np.data_source AS noise_data_source,
  np.confidence AS noise_confidence,
  np.manufacturer AS aircraft_manufacturer,
  np.model AS aircraft_model
FROM flights f
LEFT JOIN aircraft_noise_profiles np ON f.aircraft_type = np.icao_type;

-- View: Loudest flights today
CREATE OR REPLACE VIEW loudest_flights_today AS
SELECT
  f.fa_flight_id,
  f.ident,
  f.registration,
  f.aircraft_type,
  f.direction,
  f.operation_date,
  fni.max_db,
  fni.closest_approach_ft,
  fni.data_source,
  fni.confidence,
  ol.name AS observer_name
FROM flight_noise_impacts fni
JOIN flights f ON fni.fa_flight_id = f.fa_flight_id
JOIN noise_observer_locations ol ON fni.observer_id = ol.id
WHERE f.operation_date = CURRENT_DATE
ORDER BY fni.max_db DESC
LIMIT 20;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE aircraft_noise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE noise_observer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_noise_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_noise_summary ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read on aircraft_noise_profiles"
  ON aircraft_noise_profiles FOR SELECT USING (true);

CREATE POLICY "Allow public read on flight_tracks"
  ON flight_tracks FOR SELECT USING (true);

CREATE POLICY "Allow public read on noise_observer_locations"
  ON noise_observer_locations FOR SELECT USING (true);

CREATE POLICY "Allow public read on flight_noise_impacts"
  ON flight_noise_impacts FOR SELECT USING (true);

CREATE POLICY "Allow public read on daily_noise_summary"
  ON daily_noise_summary FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments for Documentation
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE aircraft_noise_profiles IS 'EASA certification noise data for aircraft types. Used for ground-level noise estimation.';
COMMENT ON TABLE flight_tracks IS 'FlightAware track positions with calculated noise estimates.';
COMMENT ON TABLE noise_observer_locations IS 'Configurable monitoring points for noise impact calculation.';
COMMENT ON TABLE flight_noise_impacts IS 'Aggregated noise impact metrics per flight per observer location.';
COMMENT ON TABLE daily_noise_summary IS 'Daily aggregated noise statistics per observer location.';

COMMENT ON COLUMN aircraft_noise_profiles.lateral_epnl IS 'EASA Lateral (sideline) certification noise level in EPNdB';
COMMENT ON COLUMN aircraft_noise_profiles.flyover_epnl IS 'EASA Flyover certification noise level in EPNdB';
COMMENT ON COLUMN aircraft_noise_profiles.approach_epnl IS 'EASA Approach certification noise level in EPNdB';
COMMENT ON COLUMN aircraft_noise_profiles.takeoff_db IS 'Estimated LAmax at 1000ft for takeoff operations';
COMMENT ON COLUMN aircraft_noise_profiles.approach_db IS 'Estimated LAmax at 1000ft for approach operations';

COMMENT ON COLUMN flight_tracks.estimated_ground_db IS 'Calculated ground-level noise at nearest observer using physics model';
COMMENT ON COLUMN flight_noise_impacts.max_db IS 'Maximum ground-level noise during this flight at this observer';
COMMENT ON COLUMN flight_noise_impacts.time_above_65db IS 'Duration in seconds where noise exceeded 65 dB (significant impact)';
