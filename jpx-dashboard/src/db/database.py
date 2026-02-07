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
