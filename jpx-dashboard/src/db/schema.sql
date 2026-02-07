-- JPX Dashboard — Database Schema
-- SQLite (upgradeable to PostgreSQL)

CREATE TABLE IF NOT EXISTS flights (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- FlightAware identifiers
    fa_flight_id        TEXT UNIQUE NOT NULL,
    ident               TEXT,                       -- flight ident or tail number
    registration        TEXT,                       -- aircraft registration (N-number)

    -- Direction: 'arrival' or 'departure'
    direction           TEXT NOT NULL CHECK (direction IN ('arrival', 'departure')),

    -- Aircraft info
    aircraft_type       TEXT,                       -- ICAO type code (e.g., C172, R44, GLF5)
    aircraft_category   TEXT,                       -- derived: 'helicopter', 'fixed_wing', 'jet', 'unknown'
    operator            TEXT,                       -- ICAO operator code
    operator_iata       TEXT,

    -- Origin / Destination
    origin_code         TEXT,
    origin_name         TEXT,
    origin_city         TEXT,
    destination_code    TEXT,
    destination_name    TEXT,
    destination_city    TEXT,

    -- Times (all stored as ISO 8601 UTC strings)
    scheduled_off       TEXT,                       -- scheduled runway departure
    actual_off          TEXT,                       -- actual runway departure
    scheduled_on        TEXT,                       -- scheduled runway arrival
    actual_on           TEXT,                       -- actual runway arrival

    -- Derived fields for analysis
    operation_date      TEXT,                       -- YYYY-MM-DD in Eastern Time
    operation_hour_et   INTEGER,                    -- 0-23 hour in Eastern Time
    is_curfew_period    BOOLEAN DEFAULT 0,          -- 1 if during 8pm-8am ET
    is_weekend          BOOLEAN DEFAULT 0,          -- 1 if Saturday or Sunday

    -- Metadata
    fetched_at          TEXT DEFAULT (datetime('now')),
    raw_json            TEXT                        -- full API response for this flight
);

-- Indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(operation_date);
CREATE INDEX IF NOT EXISTS idx_flights_direction ON flights(direction);
CREATE INDEX IF NOT EXISTS idx_flights_category ON flights(aircraft_category);
CREATE INDEX IF NOT EXISTS idx_flights_curfew ON flights(is_curfew_period);
CREATE INDEX IF NOT EXISTS idx_flights_registration ON flights(registration);
CREATE INDEX IF NOT EXISTS idx_flights_ident ON flights(ident);
CREATE INDEX IF NOT EXISTS idx_flights_type ON flights(aircraft_type);

-- Daily summary table (materialized for fast dashboard queries)
CREATE TABLE IF NOT EXISTS daily_summary (
    operation_date      TEXT PRIMARY KEY,           -- YYYY-MM-DD
    total_operations    INTEGER DEFAULT 0,
    arrivals            INTEGER DEFAULT 0,
    departures          INTEGER DEFAULT 0,
    helicopters         INTEGER DEFAULT 0,
    fixed_wing          INTEGER DEFAULT 0,
    jets                INTEGER DEFAULT 0,
    unknown_type        INTEGER DEFAULT 0,
    curfew_operations   INTEGER DEFAULT 0,
    unique_aircraft     INTEGER DEFAULT 0,
    day_of_week         TEXT,                       -- Monday, Tuesday, etc.
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Track data ingestion runs
CREATE TABLE IF NOT EXISTS ingestion_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    pull_date           TEXT NOT NULL,              -- date that was pulled
    started_at          TEXT DEFAULT (datetime('now')),
    completed_at        TEXT,
    flights_fetched     INTEGER DEFAULT 0,
    flights_inserted    INTEGER DEFAULT 0,
    flights_skipped     INTEGER DEFAULT 0,          -- duplicates
    api_requests_made   INTEGER DEFAULT 0,
    status              TEXT DEFAULT 'running',      -- running, success, error
    error_message       TEXT
);
