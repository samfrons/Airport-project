#!/usr/bin/env python3
"""
JPX Dashboard — SQLite to Supabase Migration
==============================================

One-time migration of existing SQLite flight data to Supabase.

Steps:
1. Reads all flights from local SQLite database
2. Optionally reclassifies aircraft using updated classify_aircraft()
3. Optionally recalculates curfew flags using correct 9 PM - 7 AM logic
4. Batch inserts into Supabase
5. Regenerates daily_summary for all dates
6. Verifies migration with count comparison

Usage:
    # Preview migration (no changes)
    python scripts/sync/sqlite_to_supabase.py --dry-run

    # Run migration
    python scripts/sync/sqlite_to_supabase.py

    # Skip verification
    python scripts/sync/sqlite_to_supabase.py --no-verify

    # Reclassify and fix curfew during migration
    python scripts/sync/sqlite_to_supabase.py --fix-classifications --fix-curfew
"""

import sys
import os
import json
import logging
import click
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.analysis.classify import classify_aircraft, utc_to_eastern, is_curfew_hour

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def get_sqlite_connection():
    """Get SQLite connection."""
    import sqlite3
    db_path = Path(__file__).parent.parent.parent / "data" / "jpx_flights.db"
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database not found at {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def get_supabase_writer():
    """Get Supabase writer."""
    from src.db.supabase_writer import SupabaseWriter
    return SupabaseWriter()


def fetch_all_sqlite_flights(conn) -> list:
    """Fetch all flights from SQLite."""
    cursor = conn.execute("""
        SELECT
            fa_flight_id, ident, registration, direction,
            aircraft_type, aircraft_category, operator, operator_iata,
            origin_code, origin_name, origin_city,
            destination_code, destination_name, destination_city,
            scheduled_off, actual_off, scheduled_on, actual_on,
            operation_date, operation_hour_et, is_curfew_period, is_weekend,
            raw_json
        FROM flights
        ORDER BY operation_date, id
    """)
    return [dict(row) for row in cursor.fetchall()]


def fix_flight_classification(flight: dict) -> dict:
    """Re-run classification on a flight."""
    if flight.get("aircraft_type"):
        flight["aircraft_category"] = classify_aircraft(flight["aircraft_type"])
    return flight


def fix_flight_curfew(flight: dict) -> dict:
    """Recalculate curfew flag using correct 9 PM - 7 AM logic."""
    direction = flight.get("direction")

    # Determine the relevant timestamp
    if direction == "arrival":
        ts = flight.get("actual_on") or flight.get("scheduled_on")
    else:
        ts = flight.get("actual_off") or flight.get("scheduled_off")

    if ts:
        et_time = utc_to_eastern(ts)
        if et_time:
            flight["operation_hour_et"] = et_time.hour
            flight["is_curfew_period"] = is_curfew_hour(et_time.hour)
            flight["operation_date"] = et_time.strftime("%Y-%m-%d")
            flight["is_weekend"] = et_time.weekday() >= 5

    return flight


def migrate_flights(
    flights: list,
    writer,
    fix_classifications: bool = False,
    fix_curfew: bool = False,
    dry_run: bool = False,
) -> dict:
    """
    Migrate flights to Supabase.

    Returns summary dict.
    """
    # Apply fixes if requested
    if fix_classifications:
        log.info("Re-classifying aircraft...")
        classification_changes = 0
        for flight in flights:
            old_cat = flight.get("aircraft_category")
            fix_flight_classification(flight)
            if flight.get("aircraft_category") != old_cat:
                classification_changes += 1
        log.info(f"  {classification_changes} classification changes")

    if fix_curfew:
        log.info("Fixing curfew flags...")
        curfew_changes = 0
        for flight in flights:
            old_curfew = flight.get("is_curfew_period")
            fix_flight_curfew(flight)
            if flight.get("is_curfew_period") != old_curfew:
                curfew_changes += 1
        log.info(f"  {curfew_changes} curfew flag changes")

    if dry_run:
        return {
            "total_flights": len(flights),
            "inserted": 0,
            "dry_run": True,
        }

    # Batch insert
    log.info(f"Inserting {len(flights)} flights to Supabase...")
    inserted = writer.batch_insert_flights(flights, batch_size=500)

    return {
        "total_flights": len(flights),
        "inserted": inserted,
        "dry_run": False,
    }


def regenerate_summaries(flights: list, writer, dry_run: bool = False) -> int:
    """Regenerate daily_summary for all dates."""
    dates = set(f.get("operation_date") for f in flights if f.get("operation_date"))

    if dry_run:
        log.info(f"Would regenerate {len(dates)} daily summaries")
        return len(dates)

    log.info(f"Regenerating {len(dates)} daily summaries...")

    for i, date in enumerate(sorted(dates)):
        writer.upsert_daily_summary(date)
        if (i + 1) % 50 == 0:
            log.info(f"  Progress: {i + 1}/{len(dates)}")

    return len(dates)


def verify_migration(sqlite_conn, supabase_writer) -> dict:
    """Verify migration by comparing counts."""
    log.info("Verifying migration...")

    # SQLite counts
    sqlite_cursor = sqlite_conn.execute("SELECT COUNT(*) FROM flights")
    sqlite_total = sqlite_cursor.fetchone()[0]

    sqlite_cursor = sqlite_conn.execute("""
        SELECT operation_date, COUNT(*) as count
        FROM flights
        GROUP BY operation_date
        ORDER BY operation_date
    """)
    sqlite_by_date = {row[0]: row[1] for row in sqlite_cursor.fetchall()}

    # Supabase counts
    supabase_total = supabase_writer.get_flight_count()

    # Compare by date
    response = supabase_writer.client.table("daily_summary").select(
        "operation_date, total_operations"
    ).execute()
    supabase_by_date = {row["operation_date"]: row["total_operations"] for row in response.data}

    # Find discrepancies
    discrepancies = []
    all_dates = set(sqlite_by_date.keys()) | set(supabase_by_date.keys())

    for date in sorted(all_dates):
        sqlite_count = sqlite_by_date.get(date, 0)
        supabase_count = supabase_by_date.get(date, 0)
        if sqlite_count != supabase_count:
            discrepancies.append({
                "date": date,
                "sqlite": sqlite_count,
                "supabase": supabase_count,
                "diff": sqlite_count - supabase_count,
            })

    return {
        "sqlite_total": sqlite_total,
        "supabase_total": supabase_total,
        "match": sqlite_total == supabase_total,
        "discrepancies": discrepancies[:20],  # First 20
        "total_discrepancies": len(discrepancies),
    }


@click.command()
@click.option("--dry-run", is_flag=True, help="Preview migration without changes")
@click.option("--fix-classifications", is_flag=True,
              help="Re-classify aircraft using updated rules")
@click.option("--fix-curfew", is_flag=True,
              help="Recalculate curfew flags using 9 PM - 7 AM rule")
@click.option("--no-verify", is_flag=True, help="Skip verification step")
@click.option("--verify-only", is_flag=True, help="Only run verification")
def main(
    dry_run: bool,
    fix_classifications: bool,
    fix_curfew: bool,
    no_verify: bool,
    verify_only: bool,
):
    """Migrate SQLite flight data to Supabase."""

    print("\n" + "=" * 60)
    print("  SQLite → Supabase Migration")
    print("=" * 60 + "\n")

    # Connect to both databases
    try:
        sqlite_conn = get_sqlite_connection()
        log.info("Connected to SQLite")
    except FileNotFoundError as e:
        log.error(f"SQLite: {e}")
        return

    try:
        writer = get_supabase_writer()
        log.info("Connected to Supabase")
    except (ImportError, ValueError) as e:
        log.error(f"Supabase: {e}")
        sqlite_conn.close()
        return

    if verify_only:
        result = verify_migration(sqlite_conn, writer)
        print_verification(result)
        sqlite_conn.close()
        return

    # Fetch flights
    log.info("Fetching flights from SQLite...")
    flights = fetch_all_sqlite_flights(sqlite_conn)
    log.info(f"Found {len(flights)} flights")

    # Show options
    print(f"\nOptions:")
    print(f"  Fix classifications: {fix_classifications}")
    print(f"  Fix curfew flags:    {fix_curfew}")
    print(f"  Dry run:             {dry_run}")
    print()

    # Confirm if not dry run
    if not dry_run:
        if not click.confirm("Proceed with migration?"):
            print("Aborted.")
            sqlite_conn.close()
            return

    # Migrate
    result = migrate_flights(
        flights,
        writer,
        fix_classifications=fix_classifications,
        fix_curfew=fix_curfew,
        dry_run=dry_run,
    )

    print(f"\nMigration Results:")
    print(f"  Total flights: {result['total_flights']:,}")
    print(f"  Inserted:      {result['inserted']:,}")

    # Regenerate summaries
    if not dry_run:
        summaries = regenerate_summaries(flights, writer)
        print(f"  Summaries:     {summaries:,}")

    # Verify
    if not no_verify and not dry_run:
        print()
        verify_result = verify_migration(sqlite_conn, writer)
        print_verification(verify_result)

    sqlite_conn.close()
    print("\nMigration complete!")


def print_verification(result: dict):
    """Print verification results."""
    print("Verification:")
    print(f"  SQLite total:   {result['sqlite_total']:,}")
    print(f"  Supabase total: {result['supabase_total']:,}")

    if result["match"]:
        print("  Status: MATCH ✓")
    else:
        print(f"  Status: MISMATCH ({result['total_discrepancies']} dates differ)")

        if result["discrepancies"]:
            print("\n  Sample discrepancies:")
            for d in result["discrepancies"][:5]:
                print(f"    {d['date']}: SQLite={d['sqlite']}, "
                      f"Supabase={d['supabase']} (diff: {d['diff']:+d})")


if __name__ == "__main__":
    main()
