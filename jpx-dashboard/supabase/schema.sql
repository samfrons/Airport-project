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
