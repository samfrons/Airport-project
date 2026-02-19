-- ============================================================
-- JPX Dashboard: Noise Complaint Data Schema
-- Based on PlaneNoise complaint form fields (planenoise.com/khto/)
-- Designed for integration with existing flights table
-- ============================================================

-- The complaints table mirrors what PlaneNoise collects, minus PII.
-- When we receive the data export (CSV/Excel), it will likely include
-- all of these fields. We strip complainant name, phone, email, and
-- house number before loading. Street name + municipality is kept
-- for geographic correlation with flight paths.

CREATE TABLE complaints (
    -- Internal
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id           TEXT,           -- PlaneNoise's internal complaint ID if provided

    -- Event timing (what the complainant reported)
    event_date          TEXT NOT NULL,   -- Date of noise event (YYYY-MM-DD)
    event_time          TEXT,            -- Time of noise event (HH:MM, local ET)
    event_datetime_utc  TEXT,            -- Combined and converted to UTC for flight matching
    event_hour_et       INTEGER,         -- Hour in Eastern Time (0-23) for hourly analysis
    is_curfew_period    INTEGER,         -- 1 if event falls within 9 PM - 7 AM ET (Pilot's Pledge)
    is_weekend          INTEGER,         -- 1 if Saturday or Sunday

    -- Location (privacy-redacted: street name only, no house number)
    street_name         TEXT,            -- Street name without house number
    municipality        TEXT,            -- e.g., Wainscott, Bridgehampton, Sag Harbor, Noyac
    zip_code            TEXT,            -- ZIP code
    latitude            REAL,            -- If provided; may be geocoded from street/municipality
    longitude           REAL,            -- If provided; may be geocoded from street/municipality

    -- Complaint details (maps directly to PlaneNoise form fields)
    airport             TEXT DEFAULT 'JPX',  -- JPX, MTP (Montauk), or Other
    complaint_types     TEXT,            -- Comma-separated: Excessive Noise, Low Altitude,
                                         -- Hovering, Frequency, Excessive Vibration,
                                         -- Too Early or Late, Speech Disturbance,
                                         -- Sleep Disturbance, Other
    aircraft_type       TEXT,            -- Jet, Prop, Helicopter, Seaplane, Unknown, Multiple, Other
    aircraft_description TEXT,           -- Free text: "white helicopter", "blue and white jet", etc.
    flight_direction    TEXT,            -- Arrival, Departure, North, South, East, West
    comments            TEXT,            -- Free text comments from complainant

    -- Correlation fields (populated by matching against flights table)
    matched_flight_id   TEXT,            -- FK to flights.fa_flight_id if we can match
    matched_confidence  TEXT,            -- high, medium, low, unmatched
    matched_registration TEXT,           -- Tail number from matched flight
    matched_operator    TEXT,            -- Operator from matched flight

    -- Metadata
    submission_date     TEXT,            -- When complaint was filed (may differ from event_date)
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Indexes for common dashboard queries
CREATE INDEX idx_complaints_event_date ON complaints(event_date);
CREATE INDEX idx_complaints_event_hour ON complaints(event_hour_et);
CREATE INDEX idx_complaints_municipality ON complaints(municipality);
CREATE INDEX idx_complaints_aircraft_type ON complaints(aircraft_type);
CREATE INDEX idx_complaints_curfew ON complaints(is_curfew_period);
CREATE INDEX idx_complaints_matched_flight ON complaints(matched_flight_id);
CREATE INDEX idx_complaints_street ON complaints(street_name);


-- ============================================================
-- Complaint daily summary (pre-aggregated, like daily_summary for flights)
-- ============================================================

CREATE TABLE complaint_daily_summary (
    date                TEXT PRIMARY KEY,
    total_complaints    INTEGER DEFAULT 0,
    helicopter_complaints INTEGER DEFAULT 0,
    jet_complaints      INTEGER DEFAULT 0,
    prop_complaints     INTEGER DEFAULT 0,
    seaplane_complaints INTEGER DEFAULT 0,
    unknown_complaints  INTEGER DEFAULT 0,
    curfew_complaints   INTEGER DEFAULT 0,   -- Complaints during 9 PM - 7 AM
    excessive_noise     INTEGER DEFAULT 0,   -- By complaint type
    low_altitude        INTEGER DEFAULT 0,
    too_early_late      INTEGER DEFAULT 0,
    sleep_disturbance   INTEGER DEFAULT 0,
    unique_streets      INTEGER DEFAULT 0,   -- Geographic spread indicator
    unique_municipalities INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now'))
);


-- ============================================================
-- Complaint hotspot summary (for geographic heatmap)
-- ============================================================

CREATE TABLE complaint_hotspots (
    street_name         TEXT,
    municipality        TEXT,
    latitude            REAL,            -- Geocoded street centroid
    longitude           REAL,
    total_complaints    INTEGER DEFAULT 0,
    helicopter_complaints INTEGER DEFAULT 0,
    curfew_complaints   INTEGER DEFAULT 0,
    date_first          TEXT,            -- Earliest complaint from this location
    date_last           TEXT,            -- Most recent complaint
    PRIMARY KEY (street_name, municipality)
);
