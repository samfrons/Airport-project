#!/usr/bin/env python3
"""
JPX Dashboard — Fix Curfew Flags
=================================

Recalculates operation_hour_et and is_curfew_period from UTC timestamps.
Uses the correct 9 PM – 7 AM ET curfew definition.

This fixes:
1. Incorrect hour calculations (e.g., DST issues)
2. Wrong curfew flags (old 8 PM – 8 AM vs correct 9 PM – 7 AM)

Usage:
    python scripts/migrations/fix_curfew_flags.py                    # SQLite
    python scripts/migrations/fix_curfew_flags.py --target supabase  # Supabase
    python scripts/migrations/fix_curfew_flags.py --dry-run          # Preview only
"""

import sys
import os
import logging
import click
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.analysis.classify import utc_to_eastern, is_curfew_hour, get_operation_time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ET = ZoneInfo("America/New_York")


def get_sqlite_connection():
    """Get SQLite connection."""
    import sqlite3
    db_path = Path(__file__).parent.parent.parent / "data" / "jpx_flights.db"
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database not found at {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def get_supabase_client():
    """Get Supabase client."""
    try:
        from supabase import create_client
    except ImportError:
        raise ImportError("supabase-py not installed. Run: pip install supabase")

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY required")

    return create_client(url, key)


def recalculate_times(flight: dict) -> dict:
    """
    Recalculate operation_hour_et and is_curfew_period from UTC timestamps.

    Returns dict with corrected values or None if no timestamp available.
    """
    direction = flight.get("direction")

    # Determine the relevant timestamp
    if direction == "arrival":
        ts = flight.get("actual_on") or flight.get("scheduled_on")
    else:
        ts = flight.get("actual_off") or flight.get("scheduled_off")

    if not ts:
        return None

    # Convert to Eastern Time
    et_time = utc_to_eastern(ts)
    if not et_time:
        return None

    hour = et_time.hour
    curfew = is_curfew_hour(hour)  # Uses correct 9 PM – 7 AM rule
    date = et_time.strftime("%Y-%m-%d")
    weekend = et_time.weekday() >= 5  # Saturday=5, Sunday=6

    return {
        "operation_date": date,
        "operation_hour_et": hour,
        "is_curfew_period": curfew,
        "is_weekend": weekend,
    }


def fix_sqlite(conn, dry_run: bool = False) -> dict:
    """Fix curfew flags in SQLite."""
    cursor = conn.execute("""
        SELECT id, fa_flight_id, direction,
               actual_on, actual_off, scheduled_on, scheduled_off,
               operation_date, operation_hour_et, is_curfew_period, is_weekend
        FROM flights
    """)
    flights = cursor.fetchall()

    changes = []
    hour_changes = 0
    curfew_changes = 0
    date_changes = 0

    for flight in flights:
        correct = recalculate_times(dict(flight))
        if not correct:
            continue

        flight_changes = {}

        # Check each field
        if flight["operation_hour_et"] != correct["operation_hour_et"]:
            flight_changes["operation_hour_et"] = {
                "old": flight["operation_hour_et"],
                "new": correct["operation_hour_et"]
            }
            hour_changes += 1

        stored_curfew = bool(flight["is_curfew_period"])
        if stored_curfew != correct["is_curfew_period"]:
            flight_changes["is_curfew_period"] = {
                "old": stored_curfew,
                "new": correct["is_curfew_period"]
            }
            curfew_changes += 1

        if flight["operation_date"] != correct["operation_date"]:
            flight_changes["operation_date"] = {
                "old": flight["operation_date"],
                "new": correct["operation_date"]
            }
            date_changes += 1

        if flight_changes:
            changes.append({
                "id": flight["id"],
                "fa_flight_id": flight["fa_flight_id"],
                "changes": flight_changes,
                "correct": correct,
            })

    log.info(f"Found {len(changes)} flights needing updates")
    log.info(f"  Hour changes: {hour_changes}")
    log.info(f"  Curfew changes: {curfew_changes}")
    log.info(f"  Date changes: {date_changes}")

    if not dry_run and changes:
        log.info("Applying updates...")
        for change in changes:
            conn.execute("""
                UPDATE flights
                SET operation_date = ?,
                    operation_hour_et = ?,
                    is_curfew_period = ?,
                    is_weekend = ?
                WHERE id = ?
            """, (
                change["correct"]["operation_date"],
                change["correct"]["operation_hour_et"],
                1 if change["correct"]["is_curfew_period"] else 0,
                1 if change["correct"]["is_weekend"] else 0,
                change["id"]
            ))
        conn.commit()
        log.info(f"Updated {len(changes)} records")

        # Regenerate daily summaries
        affected_dates = set()
        for change in changes:
            affected_dates.add(change["correct"]["operation_date"])
            if "operation_date" in change["changes"]:
                affected_dates.add(change["changes"]["operation_date"]["old"])

        log.info(f"Regenerating {len(affected_dates)} daily summaries...")
        from src.db.database import update_daily_summary
        for date in affected_dates:
            if date:
                update_daily_summary(conn, date)

    return {
        "total_checked": len(flights),
        "total_changes": len(changes),
        "hour_changes": hour_changes,
        "curfew_changes": curfew_changes,
        "date_changes": date_changes,
        "dry_run": dry_run,
        "sample_changes": changes[:5],
    }


def fix_supabase(client, dry_run: bool = False) -> dict:
    """Fix curfew flags in Supabase."""
    # Fetch all flights
    all_flights = []
    offset = 0
    page_size = 1000

    while True:
        response = client.table("flights").select(
            "id, fa_flight_id, direction, "
            "actual_on, actual_off, scheduled_on, scheduled_off, "
            "operation_date, operation_hour_et, is_curfew_period, is_weekend"
        ).range(offset, offset + page_size - 1).execute()

        if not response.data:
            break
        all_flights.extend(response.data)
        if len(response.data) < page_size:
            break
        offset += page_size

    log.info(f"Fetched {len(all_flights)} flights")

    changes = []
    hour_changes = 0
    curfew_changes = 0
    date_changes = 0

    for flight in all_flights:
        correct = recalculate_times(flight)
        if not correct:
            continue

        flight_changes = {}

        if flight["operation_hour_et"] != correct["operation_hour_et"]:
            flight_changes["operation_hour_et"] = {
                "old": flight["operation_hour_et"],
                "new": correct["operation_hour_et"]
            }
            hour_changes += 1

        if flight["is_curfew_period"] != correct["is_curfew_period"]:
            flight_changes["is_curfew_period"] = {
                "old": flight["is_curfew_period"],
                "new": correct["is_curfew_period"]
            }
            curfew_changes += 1

        if flight["operation_date"] != correct["operation_date"]:
            flight_changes["operation_date"] = {
                "old": flight["operation_date"],
                "new": correct["operation_date"]
            }
            date_changes += 1

        if flight_changes:
            changes.append({
                "id": flight["id"],
                "fa_flight_id": flight["fa_flight_id"],
                "changes": flight_changes,
                "correct": correct,
            })

    log.info(f"Found {len(changes)} flights needing updates")

    if not dry_run and changes:
        log.info("Applying updates in batches...")
        updated = 0

        for change in changes:
            try:
                client.table("flights").update({
                    "operation_date": change["correct"]["operation_date"],
                    "operation_hour_et": change["correct"]["operation_hour_et"],
                    "is_curfew_period": change["correct"]["is_curfew_period"],
                    "is_weekend": change["correct"]["is_weekend"],
                }).eq("id", change["id"]).execute()
                updated += 1
            except Exception as e:
                log.error(f"Error updating {change['fa_flight_id']}: {e}")

        log.info(f"Updated {updated} records")

        # Regenerate daily summaries
        affected_dates = set()
        for change in changes:
            affected_dates.add(change["correct"]["operation_date"])

        log.info(f"Regenerating {len(affected_dates)} daily summaries...")
        from src.db.supabase_writer import SupabaseWriter
        writer = SupabaseWriter()
        for date in affected_dates:
            if date:
                writer.upsert_daily_summary(date)

    return {
        "total_checked": len(all_flights),
        "total_changes": len(changes),
        "hour_changes": hour_changes,
        "curfew_changes": curfew_changes,
        "date_changes": date_changes,
        "dry_run": dry_run,
        "sample_changes": changes[:5],
    }


def print_results(result: dict):
    """Print migration results."""
    print("\n" + "=" * 60)
    print("  CURFEW FLAG FIX RESULTS")
    print("=" * 60 + "\n")

    print(f"Total flights checked: {result['total_checked']:,}")
    print(f"Flights needing fixes: {result['total_changes']:,}")
    print(f"\nBreakdown:")
    print(f"  Hour changes:   {result['hour_changes']:,}")
    print(f"  Curfew changes: {result['curfew_changes']:,}")
    print(f"  Date changes:   {result['date_changes']:,}")

    if result["sample_changes"]:
        print("\nSample changes:")
        for change in result["sample_changes"][:3]:
            print(f"  {change['fa_flight_id']}:")
            for field, vals in change["changes"].items():
                print(f"    {field}: {vals['old']} → {vals['new']}")

    if result["dry_run"]:
        print("\n[DRY RUN] No changes made. Run without --dry-run to apply.")
    else:
        print("\nChanges applied successfully.")

    print()


@click.command()
@click.option("--target", type=click.Choice(["sqlite", "supabase"]), default="sqlite",
              help="Target database")
@click.option("--dry-run", is_flag=True, help="Preview changes without applying")
def main(target: str, dry_run: bool):
    """Fix curfew flags and hour calculations."""

    print(f"\nFixing curfew flags in {target}...")
    print("Using curfew definition: 9 PM – 7 AM ET")
    if dry_run:
        print("[DRY RUN MODE]")

    if target == "sqlite":
        conn = get_sqlite_connection()
        result = fix_sqlite(conn, dry_run)
        conn.close()
    else:
        client = get_supabase_client()
        result = fix_supabase(client, dry_run)

    print_results(result)


if __name__ == "__main__":
    main()
