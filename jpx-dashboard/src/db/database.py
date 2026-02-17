"""
Database operations for the JPX Dashboard.
Uses SQLite (file: data/jpx_flights.db).
"""

import json
import sqlite3
import logging
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent.parent / "data" / "jpx_flights.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection(db_path: str = None) -> sqlite3.Connection:
    """Get a SQLite connection with row factory enabled."""
    path = db_path or str(DB_PATH)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(db_path: str = None):
    """Initialize the database from schema.sql."""
    conn = get_connection(db_path)
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.close()
    log.info(f"Database initialized at {db_path or DB_PATH}")


def insert_flight(conn: sqlite3.Connection, flight: dict) -> bool:
    """
    Insert a single flight record. Returns True if inserted, False if duplicate.
    The flight dict should already have derived fields (category, curfew, etc.).
    """
    try:
        conn.execute("""
            INSERT OR IGNORE INTO flights (
                fa_flight_id, ident, registration, direction,
                aircraft_type, aircraft_category, operator, operator_iata,
                origin_code, origin_name, origin_city,
                destination_code, destination_name, destination_city,
                scheduled_off, actual_off, scheduled_on, actual_on,
                operation_date, operation_hour_et, is_curfew_period, is_weekend,
                raw_json
            ) VALUES (
                :fa_flight_id, :ident, :registration, :direction,
                :aircraft_type, :aircraft_category, :operator, :operator_iata,
                :origin_code, :origin_name, :origin_city,
                :destination_code, :destination_name, :destination_city,
                :scheduled_off, :actual_off, :scheduled_on, :actual_on,
                :operation_date, :operation_hour_et, :is_curfew_period, :is_weekend,
                :raw_json
            )
        """, flight)
        return conn.total_changes > 0
    except sqlite3.IntegrityError:
        return False


def update_daily_summary(conn: sqlite3.Connection, date: str):
    """Recalculate the daily_summary row for a given date."""
    conn.execute("""
        INSERT OR REPLACE INTO daily_summary (
            operation_date, total_operations, arrivals, departures,
            helicopters, fixed_wing, jets, unknown_type,
            curfew_operations, unique_aircraft, day_of_week, updated_at
        )
        SELECT
            operation_date,
            COUNT(*) as total_operations,
            SUM(CASE WHEN direction = 'arrival' THEN 1 ELSE 0 END),
            SUM(CASE WHEN direction = 'departure' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_category = 'helicopter' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_category = 'fixed_wing' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_category = 'jet' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_category = 'unknown' THEN 1 ELSE 0 END),
            SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END),
            COUNT(DISTINCT registration),
            CASE CAST(strftime('%w', operation_date) AS INTEGER)
                WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday' WHEN 6 THEN 'Saturday'
            END,
            datetime('now')
        FROM flights
        WHERE operation_date = ?
        GROUP BY operation_date
    """, (date,))
    conn.commit()


def log_ingestion(conn: sqlite3.Connection, **kwargs) -> int:
    """Create or update an ingestion log entry. Returns the log ID."""
    if "id" not in kwargs:
        cursor = conn.execute("""
            INSERT INTO ingestion_log (pull_date, status)
            VALUES (:pull_date, 'running')
        """, kwargs)
        conn.commit()
        return cursor.lastrowid
    else:
        sets = ", ".join(f"{k} = :{k}" for k in kwargs if k != "id")
        conn.execute(f"UPDATE ingestion_log SET {sets} WHERE id = :id", kwargs)
        conn.commit()
        return kwargs["id"]


# ============================================================
# Complaint Operations
# ============================================================

def insert_complaint(conn: sqlite3.Connection, complaint: dict) -> bool:
    """
    Insert a single complaint record. Returns True if inserted, False if duplicate.
    The complaint dict should have derived fields (is_curfew_period, etc.).
    """
    try:
        conn.execute("""
            INSERT OR IGNORE INTO complaints (
                source_id, event_date, event_time, event_datetime_utc,
                event_hour_et, is_curfew_period, is_weekend,
                street_name, municipality, zip_code, latitude, longitude,
                airport, complaint_types, aircraft_type, aircraft_description,
                flight_direction, comments,
                matched_flight_id, matched_confidence, matched_registration, matched_operator,
                submission_date
            ) VALUES (
                :source_id, :event_date, :event_time, :event_datetime_utc,
                :event_hour_et, :is_curfew_period, :is_weekend,
                :street_name, :municipality, :zip_code, :latitude, :longitude,
                :airport, :complaint_types, :aircraft_type, :aircraft_description,
                :flight_direction, :comments,
                :matched_flight_id, :matched_confidence, :matched_registration, :matched_operator,
                :submission_date
            )
        """, complaint)
        return conn.total_changes > 0
    except sqlite3.IntegrityError:
        return False


def update_complaint_daily_summary(conn: sqlite3.Connection, date: str):
    """Recalculate the complaint_daily_summary row for a given date."""
    conn.execute("""
        INSERT OR REPLACE INTO complaint_daily_summary (
            date, total_complaints, helicopter_complaints, jet_complaints,
            prop_complaints, seaplane_complaints, unknown_complaints,
            curfew_complaints, excessive_noise, low_altitude,
            too_early_late, sleep_disturbance,
            unique_streets, unique_municipalities, created_at
        )
        SELECT
            event_date,
            COUNT(*) as total_complaints,
            SUM(CASE WHEN aircraft_type = 'Helicopter' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_type = 'Jet' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_type = 'Prop' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_type = 'Seaplane' THEN 1 ELSE 0 END),
            SUM(CASE WHEN aircraft_type IN ('Unknown', 'Other', 'Multiple') OR aircraft_type IS NULL THEN 1 ELSE 0 END),
            SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END),
            SUM(CASE WHEN complaint_types LIKE '%Excessive Noise%' THEN 1 ELSE 0 END),
            SUM(CASE WHEN complaint_types LIKE '%Low Altitude%' THEN 1 ELSE 0 END),
            SUM(CASE WHEN complaint_types LIKE '%Too Early%' OR complaint_types LIKE '%Too Late%' THEN 1 ELSE 0 END),
            SUM(CASE WHEN complaint_types LIKE '%Sleep Disturbance%' THEN 1 ELSE 0 END),
            COUNT(DISTINCT street_name),
            COUNT(DISTINCT municipality),
            datetime('now')
        FROM complaints
        WHERE event_date = ?
        GROUP BY event_date
    """, (date,))
    conn.commit()


def update_complaint_hotspots(conn: sqlite3.Connection):
    """Rebuild the complaint_hotspots table from complaint data."""
    conn.execute("DELETE FROM complaint_hotspots")
    conn.execute("""
        INSERT INTO complaint_hotspots (
            street_name, municipality, latitude, longitude,
            total_complaints, helicopter_complaints, curfew_complaints,
            date_first, date_last
        )
        SELECT
            street_name,
            municipality,
            AVG(latitude) as latitude,
            AVG(longitude) as longitude,
            COUNT(*) as total_complaints,
            SUM(CASE WHEN aircraft_type = 'Helicopter' THEN 1 ELSE 0 END),
            SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END),
            MIN(event_date) as date_first,
            MAX(event_date) as date_last
        FROM complaints
        WHERE street_name IS NOT NULL AND municipality IS NOT NULL
        GROUP BY street_name, municipality
    """)
    conn.commit()


def get_geocode_cache(conn: sqlite3.Connection, street_name: str, municipality: str) -> Optional[dict]:
    """Look up cached geocode result for a street/municipality pair."""
    cursor = conn.execute("""
        SELECT latitude, longitude, geocoder, geocoded_at
        FROM geocode_cache
        WHERE street_name = ? AND municipality = ?
    """, (street_name, municipality))
    row = cursor.fetchone()
    if row:
        return {
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "geocoder": row["geocoder"],
            "geocoded_at": row["geocoded_at"],
        }
    return None


def cache_geocode(conn: sqlite3.Connection, street_name: str, municipality: str,
                  zip_code: str, latitude: float, longitude: float, geocoder: str):
    """Cache a geocoding result."""
    conn.execute("""
        INSERT OR REPLACE INTO geocode_cache
        (street_name, municipality, zip_code, latitude, longitude, geocoder)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (street_name, municipality, zip_code, latitude, longitude, geocoder))
    conn.commit()


def get_flights_in_window(conn: sqlite3.Connection, datetime_utc: str, minutes: int = 15) -> list:
    """
    Get flights within ±minutes of a given UTC datetime for complaint matching.
    Returns a list of flight dicts.
    """
    cursor = conn.execute("""
        SELECT
            fa_flight_id, ident, registration, direction,
            aircraft_type, aircraft_category, operator,
            COALESCE(actual_on, scheduled_on, actual_off, scheduled_off) as operation_time
        FROM flights
        WHERE operation_time IS NOT NULL
          AND datetime(operation_time) BETWEEN datetime(?, '-' || ? || ' minutes')
                                           AND datetime(?, '+' || ? || ' minutes')
        ORDER BY ABS(julianday(operation_time) - julianday(?))
    """, (datetime_utc, minutes, datetime_utc, minutes, datetime_utc))
    return [dict(row) for row in cursor.fetchall()]
