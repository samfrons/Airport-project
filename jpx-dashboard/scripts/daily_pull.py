#!/usr/bin/env python3
"""
JPX Dashboard — Daily Flight Data Pull
========================================

Pulls flight operations for a given date from FlightAware AeroAPI,
classifies aircraft, detects curfew-period operations, and stores
everything in either the local SQLite database or directly in Supabase.

Usage:
    python scripts/daily_pull.py                       # pull yesterday → SQLite
    python scripts/daily_pull.py --supabase             # pull yesterday → Supabase
    python scripts/daily_pull.py --date 2025-08-15      # pull specific date
    python scripts/daily_pull.py --date 2025-08-01 --end 2025-08-31  # date range
    python scripts/daily_pull.py --supabase --date 2025-02-12 --end 2025-02-20  # backfill to Supabase

Cost estimate: ~$0.07 per day pulled (~7 pages at $0.01/page for ~100 ops)

Environment variables (for --supabase mode):
    SUPABASE_URL         - Supabase project URL
    SUPABASE_SERVICE_KEY - Service role key for server-side writes
"""

import sys
import json
import logging
import click
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.aeroapi import AeroAPIClient, AeroAPIError
from src.db.database import get_connection, init_db, insert_flight, update_daily_summary, log_ingestion
from src.analysis.classify import (
    classify_aircraft, utc_to_eastern, is_curfew_hour, is_weekend, get_operation_time
)

# Lazy import for Supabase writer (only needed when --supabase flag is used)
_supabase_writer = None

def get_supabase_writer():
    """Lazy-initialize and return the SupabaseWriter singleton."""
    global _supabase_writer
    if _supabase_writer is None:
        from src.db.supabase_writer import SupabaseWriter
        _supabase_writer = SupabaseWriter()
    return _supabase_writer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def process_flight(flight: dict, direction: str) -> dict:
    """
    Transform a raw API flight record into a database-ready dict.
    Adds classification, curfew detection, and Eastern Time fields.
    """
    # Get the relevant operation time
    op_time_utc = get_operation_time(flight, direction)
    op_time_et = utc_to_eastern(op_time_utc) if op_time_utc else None

    # Derive date and hour in Eastern Time
    if op_time_et:
        op_date = op_time_et.strftime("%Y-%m-%d")
        op_hour = op_time_et.hour
        curfew = is_curfew_hour(op_hour)
        weekend = is_weekend(op_date)
    else:
        op_date = None
        op_hour = None
        curfew = False
        weekend = False

    # Extract origin/destination safely
    origin = flight.get("origin") or {}
    dest = flight.get("destination") or {}

    return {
        "fa_flight_id": flight.get("fa_flight_id"),
        "ident": flight.get("ident"),
        "registration": flight.get("registration"),
        "direction": direction,
        "aircraft_type": flight.get("aircraft_type"),
        "aircraft_category": classify_aircraft(flight.get("aircraft_type")),
        "operator": flight.get("operator"),
        "operator_iata": flight.get("operator_iata"),
        "origin_code": origin.get("code"),
        "origin_name": origin.get("name"),
        "origin_city": origin.get("city"),
        "destination_code": dest.get("code"),
        "destination_name": dest.get("name"),
        "destination_city": dest.get("city"),
        "scheduled_off": flight.get("scheduled_off"),
        "actual_off": flight.get("actual_off"),
        "scheduled_on": flight.get("scheduled_on"),
        "actual_on": flight.get("actual_on"),
        "operation_date": op_date,
        "operation_hour_et": op_hour,
        "is_curfew_period": 1 if curfew else 0,
        "is_weekend": 1 if weekend else 0,
        "raw_json": json.dumps(flight, default=str),
    }


def pull_date(client: AeroAPIClient, conn, date_str: str) -> dict:
    """
    Pull all flights for a single date and store in the SQLite database.
    Returns a summary dict.
    """
    start = f"{date_str}T00:00:00Z"
    end_dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    end = end_dt.strftime("%Y-%m-%dT00:00:00Z")

    log.info(f"Pulling flights for {date_str}...")

    # Start ingestion log
    log_id = log_ingestion(conn, pull_date=date_str)

    inserted = 0
    skipped = 0
    total = 0

    try:
        # Use KJPX for dates from 2022-05-01 onward, KHTO for earlier
        airport_code = "KJPX" if date_str >= "2022-05-01" else "KHTO"

        data = client.airport_flights_history(
            airport_id=airport_code,
            start=start,
            end=end,
            max_pages=10,  # up to 150 flights — sufficient for JPX
        )

        # Process arrivals and departures
        for direction_key, direction_label in [("arrivals", "arrival"), ("departures", "departure")]:
            flights = data.get(direction_key, [])
            log.info(f"  {direction_label}s: {len(flights)} flights")

            for flight in flights:
                total += 1
                record = process_flight(flight, direction_label)

                if record["fa_flight_id"]:
                    was_inserted = insert_flight(conn, record)
                    if was_inserted:
                        inserted += 1
                    else:
                        skipped += 1
                else:
                    skipped += 1

        conn.commit()

        # Update daily summary
        update_daily_summary(conn, date_str)

        # Update ingestion log
        log_ingestion(conn,
            id=log_id,
            completed_at=datetime.now(timezone.utc).isoformat(),
            flights_fetched=total,
            flights_inserted=inserted,
            flights_skipped=skipped,
            api_requests_made=client.request_count,
            status="success",
        )

        log.info(f"  ✓ {date_str}: {total} fetched, {inserted} inserted, {skipped} skipped")

    except AeroAPIError as e:
        log.error(f"  ✗ API error for {date_str}: {e}")
        log_ingestion(conn,
            id=log_id,
            status="error",
            error_message=str(e),
        )

    return {
        "date": date_str,
        "total": total,
        "inserted": inserted,
        "skipped": skipped,
    }


def _fetch_flights_for_date(client: AeroAPIClient, date_str: str) -> list:
    """
    Fetch and process all flights for a single date from the AeroAPI.
    Returns a list of processed flight record dicts.
    """
    start = f"{date_str}T00:00:00Z"
    end_dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    end = end_dt.strftime("%Y-%m-%dT00:00:00Z")

    airport_code = "KJPX" if date_str >= "2022-05-01" else "KHTO"

    data = client.airport_flights_history(
        airport_id=airport_code,
        start=start,
        end=end,
        max_pages=10,
    )

    records = []
    for direction_key, direction_label in [("arrivals", "arrival"), ("departures", "departure")]:
        flights = data.get(direction_key, [])
        log.info(f"  {direction_label}s: {len(flights)} flights")
        for flight in flights:
            record = process_flight(flight, direction_label)
            if record["fa_flight_id"]:
                records.append(record)

    return records


def pull_date_supabase(client: AeroAPIClient, date_str: str) -> dict:
    """
    Pull all flights for a single date and store directly in Supabase.
    Returns a summary dict.
    """
    log.info(f"Pulling flights for {date_str} → Supabase...")
    writer = get_supabase_writer()

    inserted = 0
    total = 0

    try:
        records = _fetch_flights_for_date(client, date_str)
        total = len(records)

        if records:
            inserted = writer.batch_insert_flights(records)

        # Update daily summary in Supabase
        writer.upsert_daily_summary(date_str)

        # Log ingestion in Supabase
        writer.log_ingestion(
            pull_date=date_str,
            flights_fetched=total,
            flights_inserted=inserted,
            flights_skipped=total - inserted,
            api_requests=client.request_count,
            status="success",
        )

        log.info(f"  ✓ {date_str}: {total} fetched, {inserted} inserted → Supabase")

    except AeroAPIError as e:
        log.error(f"  ✗ API error for {date_str}: {e}")
        writer.log_ingestion(
            pull_date=date_str,
            status="error",
            error_message=str(e),
        )

    return {
        "date": date_str,
        "total": total,
        "inserted": inserted,
        "skipped": total - inserted,
    }


@click.command()
@click.option("--date", "start_date", default=None, help="Date to pull (YYYY-MM-DD). Defaults to yesterday.")
@click.option("--end", "end_date", default=None, help="End date for range pull (YYYY-MM-DD).")
@click.option("--supabase", is_flag=True, help="Write directly to Supabase instead of local SQLite.")
def main(start_date: str, end_date: str, supabase: bool):
    """Pull JPX flight data from FlightAware and store in the database."""

    # Default to yesterday
    if not start_date:
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        start_date = yesterday.strftime("%Y-%m-%d")

    if not end_date:
        end_date = start_date

    target = "Supabase" if supabase else "SQLite"

    # For SQLite mode, ensure database exists
    conn = None
    if not supabase:
        db_path = Path(__file__).parent.parent / "data" / "jpx_flights.db"
        if not db_path.exists():
            log.info("Database not found — initializing...")
            db_path.parent.mkdir(exist_ok=True)
            init_db(str(db_path))
        conn = get_connection(str(db_path))

    client = AeroAPIClient()

    print(f"\n{'═' * 56}")
    print(f"  JPX Dashboard — Daily Pull → {target}")
    print(f"  Date range: {start_date} → {end_date}")
    print(f"{'═' * 56}\n")

    # Iterate through date range
    current = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    results = []

    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        if supabase:
            result = pull_date_supabase(client, date_str)
        else:
            result = pull_date(client, conn, date_str)
        results.append(result)
        current += timedelta(days=1)

    # Print summary
    total_ops = sum(r["total"] for r in results)
    total_inserted = sum(r["inserted"] for r in results)
    total_skipped = sum(r["skipped"] for r in results)

    print(f"\n{'─' * 56}")
    print(f"  Summary: {len(results)} day(s) processed → {target}")
    print(f"  Total operations:  {total_ops}")
    print(f"  Inserted:          {total_inserted}")
    print(f"  Skipped (dupes):   {total_skipped}")
    print(f"  API requests:      {client.request_count}")
    print(f"{'─' * 56}\n")

    if conn:
        conn.close()


if __name__ == "__main__":
    main()
