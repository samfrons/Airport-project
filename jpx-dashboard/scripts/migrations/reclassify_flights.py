#!/usr/bin/env python3
"""
JPX Dashboard — Reclassify All Flights
=======================================

Re-runs classify_aircraft() on all flight records and updates
any that have incorrect aircraft_category values.

Fixes issues like PC12 being classified as 'jet' instead of 'fixed_wing'.

Usage:
    python scripts/migrations/reclassify_flights.py                    # SQLite
    python scripts/migrations/reclassify_flights.py --target supabase  # Supabase
    python scripts/migrations/reclassify_flights.py --dry-run          # Preview only
"""

import sys
import os
import logging
import click
from pathlib import Path
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.analysis.classify import classify_aircraft

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


def reclassify_sqlite(conn, dry_run: bool = False) -> dict:
    """Reclassify flights in SQLite."""
    cursor = conn.execute("""
        SELECT id, fa_flight_id, aircraft_type, aircraft_category
        FROM flights
        WHERE aircraft_type IS NOT NULL
    """)
    flights = cursor.fetchall()

    mismatches = []
    type_changes = defaultdict(lambda: {"count": 0, "from": None, "to": None})

    for flight in flights:
        stored_cat = flight["aircraft_category"]
        correct_cat = classify_aircraft(flight["aircraft_type"])

        if stored_cat != correct_cat:
            mismatches.append({
                "id": flight["id"],
                "fa_flight_id": flight["fa_flight_id"],
                "aircraft_type": flight["aircraft_type"],
                "old_category": stored_cat,
                "new_category": correct_cat,
            })

            type_changes[flight["aircraft_type"]]["count"] += 1
            type_changes[flight["aircraft_type"]]["from"] = stored_cat
            type_changes[flight["aircraft_type"]]["to"] = correct_cat

    log.info(f"Found {len(mismatches)} misclassified flights")

    if not dry_run and mismatches:
        log.info("Updating records...")
        for mismatch in mismatches:
            conn.execute(
                "UPDATE flights SET aircraft_category = ? WHERE id = ?",
                (mismatch["new_category"], mismatch["id"])
            )
        conn.commit()
        log.info(f"Updated {len(mismatches)} records")

        # Regenerate daily summaries for affected dates
        affected_dates = set()
        cursor = conn.execute("""
            SELECT DISTINCT operation_date FROM flights
            WHERE id IN ({})
        """.format(",".join(str(m["id"]) for m in mismatches)))
        affected_dates = {row["operation_date"] for row in cursor.fetchall()}

        log.info(f"Regenerating daily summaries for {len(affected_dates)} dates...")
        from src.db.database import update_daily_summary
        for date in affected_dates:
            update_daily_summary(conn, date)

    return {
        "total_checked": len(flights),
        "mismatches": len(mismatches),
        "changes_by_type": dict(type_changes),
        "dry_run": dry_run,
    }


def reclassify_supabase(client, dry_run: bool = False) -> dict:
    """Reclassify flights in Supabase."""
    # Fetch all flights with aircraft_type
    all_flights = []
    offset = 0
    page_size = 1000

    while True:
        response = client.table("flights").select(
            "id, fa_flight_id, aircraft_type, aircraft_category"
        ).not_.is_("aircraft_type", "null").range(offset, offset + page_size - 1).execute()

        if not response.data:
            break
        all_flights.extend(response.data)
        if len(response.data) < page_size:
            break
        offset += page_size

    mismatches = []
    type_changes = defaultdict(lambda: {"count": 0, "from": None, "to": None})

    for flight in all_flights:
        stored_cat = flight["aircraft_category"]
        correct_cat = classify_aircraft(flight["aircraft_type"])

        if stored_cat != correct_cat:
            mismatches.append({
                "id": flight["id"],
                "fa_flight_id": flight["fa_flight_id"],
                "aircraft_type": flight["aircraft_type"],
                "old_category": stored_cat,
                "new_category": correct_cat,
            })

            type_changes[flight["aircraft_type"]]["count"] += 1
            type_changes[flight["aircraft_type"]]["from"] = stored_cat
            type_changes[flight["aircraft_type"]]["to"] = correct_cat

    log.info(f"Found {len(mismatches)} misclassified flights")

    if not dry_run and mismatches:
        log.info("Updating records in batches...")

        # Update in batches
        batch_size = 100
        updated = 0

        for i in range(0, len(mismatches), batch_size):
            batch = mismatches[i:i + batch_size]

            for mismatch in batch:
                try:
                    client.table("flights").update({
                        "aircraft_category": mismatch["new_category"]
                    }).eq("id", mismatch["id"]).execute()
                    updated += 1
                except Exception as e:
                    log.error(f"Error updating {mismatch['fa_flight_id']}: {e}")

            log.debug(f"Updated batch {i // batch_size + 1}")

        log.info(f"Updated {updated} records")

        # Regenerate affected daily summaries
        affected_dates = set()
        for mismatch in mismatches:
            # Need to get the date for each flight
            response = client.table("flights").select("operation_date").eq(
                "id", mismatch["id"]
            ).execute()
            if response.data:
                affected_dates.add(response.data[0]["operation_date"])

        log.info(f"Regenerating {len(affected_dates)} daily summaries...")
        from src.db.supabase_writer import SupabaseWriter
        writer = SupabaseWriter()
        for date in affected_dates:
            writer.upsert_daily_summary(date)

    return {
        "total_checked": len(all_flights),
        "mismatches": len(mismatches),
        "changes_by_type": dict(type_changes),
        "dry_run": dry_run,
    }


def print_results(result: dict):
    """Print migration results."""
    print("\n" + "=" * 60)
    print("  RECLASSIFICATION RESULTS")
    print("=" * 60 + "\n")

    print(f"Total flights checked: {result['total_checked']:,}")
    print(f"Misclassified:         {result['mismatches']:,}")

    if result["changes_by_type"]:
        print("\nChanges by aircraft type:")
        for atype, info in result["changes_by_type"].items():
            print(f"  {atype}: {info['count']} flights "
                  f"({info['from']} → {info['to']})")

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
    """Reclassify all flights using updated classify_aircraft()."""

    print(f"\nReclassifying flights in {target}...")
    if dry_run:
        print("[DRY RUN MODE]")

    if target == "sqlite":
        conn = get_sqlite_connection()
        result = reclassify_sqlite(conn, dry_run)
        conn.close()
    else:
        client = get_supabase_client()
        result = reclassify_supabase(client, dry_run)

    print_results(result)


if __name__ == "__main__":
    main()
