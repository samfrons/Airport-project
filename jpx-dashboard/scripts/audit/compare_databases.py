#!/usr/bin/env python3
"""
JPX Dashboard — Compare SQLite vs Supabase
============================================

Compares local SQLite database with Supabase to find:
1. Records in SQLite but not in Supabase (need syncing)
2. Records in Supabase but not in SQLite (potential issues)
3. Records with differing data between both

Usage:
    python scripts/audit/compare_databases.py
    python scripts/audit/compare_databases.py --date 2024-08-15
"""

import sys
import os
import logging
import click
from pathlib import Path
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

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
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY required")

    return create_client(url, key)


def get_sqlite_flights(conn, date: str = None) -> dict:
    """Get flights from SQLite indexed by fa_flight_id."""
    if date:
        cursor = conn.execute(
            "SELECT * FROM flights WHERE operation_date = ?", (date,)
        )
    else:
        cursor = conn.execute("SELECT * FROM flights")

    return {row["fa_flight_id"]: dict(row) for row in cursor.fetchall()}


def get_supabase_flights(client, date: str = None) -> dict:
    """Get flights from Supabase indexed by fa_flight_id."""
    query = client.table("flights").select("*")

    if date:
        query = query.eq("operation_date", date)

    # Paginate through all results
    flights = {}
    offset = 0
    page_size = 1000

    while True:
        response = query.range(offset, offset + page_size - 1).execute()
        if not response.data:
            break
        for row in response.data:
            flights[row["fa_flight_id"]] = row
        if len(response.data) < page_size:
            break
        offset += page_size

    return flights


def compare_flights(sqlite_flights: dict, supabase_flights: dict) -> dict:
    """Compare two flight dictionaries."""
    sqlite_ids = set(sqlite_flights.keys())
    supabase_ids = set(supabase_flights.keys())

    only_sqlite = sqlite_ids - supabase_ids
    only_supabase = supabase_ids - sqlite_ids
    in_both = sqlite_ids & supabase_ids

    # Check for differences in shared records
    differences = []
    check_fields = [
        "aircraft_type", "aircraft_category", "direction",
        "operation_date", "operation_hour_et", "is_curfew_period",
        "registration", "origin_code", "destination_code"
    ]

    for fa_id in in_both:
        sqlite_rec = sqlite_flights[fa_id]
        supa_rec = supabase_flights[fa_id]

        diffs = {}
        for field in check_fields:
            sqlite_val = sqlite_rec.get(field)
            supa_val = supa_rec.get(field)

            # Normalize for comparison
            if isinstance(sqlite_val, bool):
                sqlite_val = 1 if sqlite_val else 0
            if isinstance(supa_val, bool):
                supa_val = 1 if supa_val else 0

            if sqlite_val != supa_val:
                diffs[field] = {"sqlite": sqlite_val, "supabase": supa_val}

        if diffs:
            differences.append({
                "fa_flight_id": fa_id,
                "differences": diffs
            })

    return {
        "only_sqlite": list(only_sqlite),
        "only_supabase": list(only_supabase),
        "in_both": len(in_both),
        "differences": differences,
    }


def print_comparison_report(result: dict, sqlite_flights: dict, supabase_flights: dict):
    """Print formatted comparison report."""
    print("\n" + "=" * 70)
    print("  SQLite vs Supabase COMPARISON REPORT")
    print("=" * 70 + "\n")

    print("RECORD COUNTS")
    print("-" * 40)
    print(f"  SQLite records:    {len(sqlite_flights):,}")
    print(f"  Supabase records:  {len(supabase_flights):,}")
    print(f"  In both:           {result['in_both']:,}")
    print()

    # Only in SQLite (need syncing)
    only_sqlite = result["only_sqlite"]
    print(f"ONLY IN SQLite ({len(only_sqlite):,} records - NEED SYNC)")
    print("-" * 40)
    if only_sqlite:
        # Group by date
        by_date = defaultdict(list)
        for fa_id in only_sqlite:
            date = sqlite_flights[fa_id].get("operation_date", "unknown")
            by_date[date].append(fa_id)

        print("  By date:")
        for date in sorted(by_date.keys())[:10]:
            print(f"    {date}: {len(by_date[date])} flights")
        if len(by_date) > 10:
            print(f"    ... and {len(by_date) - 10} more dates")
    else:
        print("  None")
    print()

    # Only in Supabase (unexpected)
    only_supabase = result["only_supabase"]
    print(f"ONLY IN SUPABASE ({len(only_supabase):,} records)")
    print("-" * 40)
    if only_supabase:
        for fa_id in only_supabase[:5]:
            print(f"  {fa_id}")
        if len(only_supabase) > 5:
            print(f"  ... and {len(only_supabase) - 5} more")
    else:
        print("  None")
    print()

    # Differences
    diffs = result["differences"]
    print(f"FIELD DIFFERENCES ({len(diffs):,} records)")
    print("-" * 40)
    if diffs:
        # Summarize by field
        field_counts = defaultdict(int)
        for d in diffs:
            for field in d["differences"]:
                field_counts[field] += 1

        print("  By field:")
        for field, count in sorted(field_counts.items(), key=lambda x: -x[1]):
            print(f"    {field}: {count} records differ")

        print("\n  Sample differences:")
        for d in diffs[:3]:
            print(f"    {d['fa_flight_id']}:")
            for field, vals in d["differences"].items():
                print(f"      {field}: {vals['sqlite']} (SQLite) vs {vals['supabase']} (Supabase)")
    else:
        print("  None")
    print()

    # Summary
    print("=" * 70)
    needs_action = len(only_sqlite) + len(diffs)
    if needs_action == 0:
        print("  STATUS: DATABASES IN SYNC")
    else:
        print(f"  STATUS: {len(only_sqlite):,} TO SYNC, {len(diffs):,} DIFFER")
    print("=" * 70 + "\n")


@click.command()
@click.option("--date", default=None, help="Compare only a specific date (YYYY-MM-DD)")
def main(date: str):
    """Compare SQLite and Supabase flight data."""

    print("\nConnecting to databases...")

    try:
        sqlite_conn = get_sqlite_connection()
        print("  SQLite: connected")
    except FileNotFoundError as e:
        print(f"  SQLite: {e}")
        return

    try:
        supabase_client = get_supabase_client()
        print("  Supabase: connected")
    except (ImportError, ValueError) as e:
        print(f"  Supabase: {e}")
        sqlite_conn.close()
        return

    print(f"\nFetching flights{f' for {date}' if date else ''}...")

    sqlite_flights = get_sqlite_flights(sqlite_conn, date)
    print(f"  SQLite: {len(sqlite_flights):,} flights")

    supabase_flights = get_supabase_flights(supabase_client, date)
    print(f"  Supabase: {len(supabase_flights):,} flights")

    # Compare
    result = compare_flights(sqlite_flights, supabase_flights)

    print_comparison_report(result, sqlite_flights, supabase_flights)

    sqlite_conn.close()


if __name__ == "__main__":
    main()
