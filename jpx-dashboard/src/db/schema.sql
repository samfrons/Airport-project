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
    is_curfew_period    BOOLEAN DEFAULT 0,          -- 1 if during 9pm-7am ET (Pilot's Pledge)
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

-- ============================================================
-- Noise Complaint Tables
-- Based on PlaneNoise complaint form fields (planenoise.com/khto/)
-- ============================================================

-- Raw complaints table (PII stripped: no names, phone, email, house numbers)
CREATE TABLE IF NOT EXISTS complaints (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id           TEXT,                       -- PlaneNoise's internal complaint ID if provided

    -- Event timing (what the complainant reported)
    event_date          TEXT NOT NULL,              -- Date of noise event (YYYY-MM-DD)
    event_time          TEXT,                       -- Time of noise event (HH:MM, local ET)
    event_datetime_utc  TEXT,                       -- Combined and converted to UTC (ISO 8601)
    event_hour_et       INTEGER,                    -- Hour in Eastern Time (0-23)
    is_curfew_period    INTEGER DEFAULT 0,          -- 1 if during 9 PM - 7 AM ET (Pilot's Pledge)
    is_weekend          INTEGER DEFAULT 0,          -- 1 if Saturday or Sunday

    -- Location (privacy-redacted: street name only, no house number)
    street_name         TEXT,                       -- Street name without house number
    municipality        TEXT,                       -- e.g., Wainscott, Bridgehampton, Sag Harbor
    zip_code            TEXT,
    latitude            REAL,                       -- Geocoded from street/municipality
    longitude           REAL,

    -- Complaint details (maps to PlaneNoise form fields)
    airport             TEXT DEFAULT 'JPX',         -- JPX, MTP (Montauk), or Other
    complaint_types     TEXT,                       -- Comma-separated: Excessive Noise, Low Altitude,
                                                    -- Hovering, Frequency, Excessive Vibration,
                                                    -- Too Early or Late, Speech Disturbance,
                                                    -- Sleep Disturbance, Other
    aircraft_type       TEXT,                       -- Jet, Prop, Helicopter, Seaplane, Unknown, Multiple
    aircraft_description TEXT,                      -- Free text: "white helicopter", "blue jet", etc.
    flight_direction    TEXT,                       -- Arrival, Departure, North, South, East, West
    comments            TEXT,                       -- Free text comments from complainant

    -- Flight correlation fields (populated by matching against flights table)
    matched_flight_id   TEXT,                       -- FK to flights.fa_flight_id if matched
    matched_confidence  TEXT,                       -- high, medium, low, unmatched
    matched_registration TEXT,                      -- Tail number from matched flight
    matched_operator    TEXT,                       -- Operator from matched flight

    -- Metadata
    submission_date     TEXT,                       -- When complaint was filed (may differ from event_date)
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_complaints_event_date ON complaints(event_date);
CREATE INDEX IF NOT EXISTS idx_complaints_event_hour ON complaints(event_hour_et);
CREATE INDEX IF NOT EXISTS idx_complaints_municipality ON complaints(municipality);
CREATE INDEX IF NOT EXISTS idx_complaints_aircraft_type ON complaints(aircraft_type);
CREATE INDEX IF NOT EXISTS idx_complaints_curfew ON complaints(is_curfew_period);
CREATE INDEX IF NOT EXISTS idx_complaints_matched_flight ON complaints(matched_flight_id);
CREATE INDEX IF NOT EXISTS idx_complaints_street ON complaints(street_name);
CREATE INDEX IF NOT EXISTS idx_complaints_date_municipality ON complaints(event_date, municipality);

-- Complaint daily summary (pre-aggregated for fast dashboard queries)
CREATE TABLE IF NOT EXISTS complaint_daily_summary (
    date                TEXT PRIMARY KEY,           -- YYYY-MM-DD
    total_complaints    INTEGER DEFAULT 0,
    helicopter_complaints INTEGER DEFAULT 0,
    jet_complaints      INTEGER DEFAULT 0,
    prop_complaints     INTEGER DEFAULT 0,
    seaplane_complaints INTEGER DEFAULT 0,
    unknown_complaints  INTEGER DEFAULT 0,
    curfew_complaints   INTEGER DEFAULT 0,          -- Complaints during 9 PM - 7 AM
    excessive_noise     INTEGER DEFAULT 0,          -- By complaint type
    low_altitude        INTEGER DEFAULT 0,
    too_early_late      INTEGER DEFAULT 0,
    sleep_disturbance   INTEGER DEFAULT 0,
    unique_streets      INTEGER DEFAULT 0,          -- Geographic spread indicator
    unique_municipalities INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now'))
);

-- Complaint hotspot summary (for geographic heatmap)
CREATE TABLE IF NOT EXISTS complaint_hotspots (
    street_name         TEXT,
    municipality        TEXT,
    latitude            REAL,                       -- Geocoded street centroid
    longitude           REAL,
    total_complaints    INTEGER DEFAULT 0,
    helicopter_complaints INTEGER DEFAULT 0,
    curfew_complaints   INTEGER DEFAULT 0,
    date_first          TEXT,                       -- Earliest complaint from this location
    date_last           TEXT,                       -- Most recent complaint
    PRIMARY KEY (street_name, municipality)
);

-- Geocoding cache (avoid repeated API calls for same addresses)
CREATE TABLE IF NOT EXISTS geocode_cache (
    street_name         TEXT,
    municipality        TEXT,
    zip_code            TEXT,
    latitude            REAL,
    longitude           REAL,
    geocoder            TEXT,                       -- census, nominatim, etc.
    geocoded_at         TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (street_name, municipality)
);
