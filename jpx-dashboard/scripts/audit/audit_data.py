#!/usr/bin/env python3
"""
JPX Dashboard — Data Quality Audit
====================================

Comprehensive audit of flight data for:
1. Classification accuracy - Compare current vs correct classify_aircraft() results
2. Timestamp consistency - Verify UTC→ET conversion
3. Curfew flag accuracy - Verify 9 PM – 7 AM ET logic
4. Missing required fields

Usage:
    python scripts/audit/audit_data.py                    # Audit SQLite
    python scripts/audit/audit_data.py --source supabase  # Audit Supabase
    python scripts/audit/audit_data.py --fix              # Fix misclassifications
"""

import sys
import os
import json
import logging
import click
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Add project root to path
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


def audit_classifications(conn, source: str = "sqlite") -> dict:
    """
    Compare stored aircraft_category vs what classify_aircraft() returns.
    Returns dict with mismatch details.
    """
    log.info("Auditing aircraft classifications...")

    if source == "sqlite":
        cursor = conn.execute("""
            SELECT id, fa_flight_id, aircraft_type, aircraft_category
            FROM flights
            WHERE aircraft_type IS NOT NULL
        """)
        flights = cursor.fetchall()
    else:
        # Supabase
        response = conn.table("flights").select(
            "id, fa_flight_id, aircraft_type, aircraft_category"
        ).not_.is_("aircraft_type", "null").execute()
        flights = response.data

    mismatches = []
    type_counts = defaultdict(lambda: {"correct": 0, "wrong": 0})

    for flight in flights:
        if source == "sqlite":
            flight_id = flight["id"]
            fa_id = flight["fa_flight_id"]
            aircraft_type = flight["aircraft_type"]
            stored_cat = flight["aircraft_category"]
        else:
            flight_id = flight["id"]
            fa_id = flight["fa_flight_id"]
            aircraft_type = flight["aircraft_type"]
            stored_cat = flight["aircraft_category"]

        correct_cat = classify_aircraft(aircraft_type)

        if stored_cat != correct_cat:
            mismatches.append({
                "id": flight_id,
                "fa_flight_id": fa_id,
                "aircraft_type": aircraft_type,
                "stored": stored_cat,
                "correct": correct_cat,
            })
            type_counts[aircraft_type]["wrong"] += 1
        else:
            type_counts[aircraft_type]["correct"] += 1

    return {
        "total_checked": len(flights),
        "mismatches": len(mismatches),
        "mismatch_details": mismatches[:100],  # First 100 for review
        "type_summary": dict(type_counts),
    }


def audit_curfew_flags(conn, source: str = "sqlite") -> dict:
    """
    Verify curfew flags match the 9 PM – 7 AM ET rule.
    """
    log.info("Auditing curfew flags...")

    if source == "sqlite":
        cursor = conn.execute("""
            SELECT id, fa_flight_id, operation_hour_et, is_curfew_period,
                   actual_on, actual_off, scheduled_on, scheduled_off, direction
            FROM flights
            WHERE operation_hour_et IS NOT NULL
        """)
        flights = cursor.fetchall()
    else:
        response = conn.table("flights").select(
            "id, fa_flight_id, operation_hour_et, is_curfew_period, "
            "actual_on, actual_off, scheduled_on, scheduled_off, direction"
        ).not_.is_("operation_hour_et", "null").execute()
        flights = response.data

    mismatches = []
    boundary_issues = []  # Hours 6, 7, 20, 21 where errors are most likely

    for flight in flights:
        if source == "sqlite":
            hour = flight["operation_hour_et"]
            stored_curfew = bool(flight["is_curfew_period"])
        else:
            hour = flight["operation_hour_et"]
            stored_curfew = flight["is_curfew_period"]

        correct_curfew = is_curfew_hour(hour)

        if stored_curfew != correct_curfew:
            mismatch = {
                "id": flight["id"] if source == "sqlite" else flight["id"],
                "fa_flight_id": flight["fa_flight_id"],
                "hour_et": hour,
                "stored": stored_curfew,
                "correct": correct_curfew,
            }
            mismatches.append(mismatch)

            # Track boundary cases
            if hour in [6, 7, 20, 21]:
                boundary_issues.append(mismatch)

    return {
        "total_checked": len(flights),
        "mismatches": len(mismatches),
        "boundary_issues": boundary_issues,
        "mismatch_details": mismatches[:50],
    }


def audit_timestamps(conn, source: str = "sqlite") -> dict:
    """
    Verify operation_hour_et is correctly derived from UTC timestamps.
    """
    log.info("Auditing timestamps...")

    if source == "sqlite":
        cursor = conn.execute("""
            SELECT id, fa_flight_id, direction,
                   actual_on, actual_off, scheduled_on, scheduled_off,
                   operation_hour_et
            FROM flights
            LIMIT 1000
        """)
        flights = cursor.fetchall()
    else:
        response = conn.table("flights").select(
            "id, fa_flight_id, direction, actual_on, actual_off, "
            "scheduled_on, scheduled_off, operation_hour_et"
        ).limit(1000).execute()
        flights = response.data

    mismatches = []

    for flight in flights:
        direction = flight["direction"]
        stored_hour = flight["operation_hour_et"]

        # Determine which timestamp to use
        if direction == "arrival":
            ts = flight["actual_on"] or flight["scheduled_on"]
        else:
            ts = flight["actual_off"] or flight["scheduled_off"]

        if not ts or stored_hour is None:
            continue

        # Convert and check
        et_time = utc_to_eastern(ts)
        if et_time:
            correct_hour = et_time.hour
            if stored_hour != correct_hour:
                mismatches.append({
                    "id": flight["id"],
                    "fa_flight_id": flight["fa_flight_id"],
                    "utc_ts": ts,
                    "stored_hour": stored_hour,
                    "correct_hour": correct_hour,
                })

    return {
        "total_checked": len(flights),
        "mismatches": len(mismatches),
        "mismatch_details": mismatches[:50],
    }


def audit_required_fields(conn, source: str = "sqlite") -> dict:
    """
    Check for missing required fields.
    """
    log.info("Auditing required fields...")

    required_fields = ["fa_flight_id", "direction", "operation_date"]
    recommended_fields = ["aircraft_type", "registration", "operation_hour_et"]

    issues = {"missing_required": [], "missing_recommended": defaultdict(int)}

    if source == "sqlite":
        cursor = conn.execute("SELECT * FROM flights")
        flights = cursor.fetchall()

        for flight in flights:
            flight_dict = dict(flight)
            for field in required_fields:
                if not flight_dict.get(field):
                    issues["missing_required"].append({
                        "id": flight_dict["id"],
                        "field": field,
                    })
            for field in recommended_fields:
                if not flight_dict.get(field):
                    issues["missing_recommended"][field] += 1
    else:
        response = conn.table("flights").select("*").execute()
        flights = response.data

        for flight in flights:
            for field in required_fields:
                if not flight.get(field):
                    issues["missing_required"].append({
                        "id": flight["id"],
                        "field": field,
                    })
            for field in recommended_fields:
                if not flight.get(field):
                    issues["missing_recommended"][field] += 1

    issues["missing_recommended"] = dict(issues["missing_recommended"])

    return {
        "total_flights": len(flights),
        "missing_required_count": len(issues["missing_required"]),
        "missing_required": issues["missing_required"][:20],
        "missing_recommended": issues["missing_recommended"],
    }


def print_audit_report(results: dict):
    """Print formatted audit report."""
    print("\n" + "=" * 70)
    print("  JPX DASHBOARD — DATA QUALITY AUDIT REPORT")
    print("=" * 70 + "\n")

    # Classification audit
    clf = results.get("classifications", {})
    print("CLASSIFICATION AUDIT")
    print("-" * 40)
    print(f"  Total flights checked:  {clf.get('total_checked', 0):,}")
    print(f"  Misclassified:          {clf.get('mismatches', 0):,}")
    if clf.get('mismatches', 0) > 0:
        print("\n  Misclassified aircraft types:")
        for mismatch in clf.get('mismatch_details', [])[:10]:
            print(f"    {mismatch['aircraft_type']}: {mismatch['stored']} → {mismatch['correct']}")
    print()

    # Curfew audit
    cfw = results.get("curfew", {})
    print("CURFEW FLAG AUDIT")
    print("-" * 40)
    print(f"  Total flights checked:  {cfw.get('total_checked', 0):,}")
    print(f"  Incorrect flags:        {cfw.get('mismatches', 0):,}")
    if cfw.get('boundary_issues'):
        print("\n  Boundary hour issues (6,7,20,21):")
        for issue in cfw.get('boundary_issues', [])[:5]:
            print(f"    Hour {issue['hour_et']}: stored={issue['stored']}, correct={issue['correct']}")
    print()

    # Timestamp audit
    ts = results.get("timestamps", {})
    print("TIMESTAMP AUDIT")
    print("-" * 40)
    print(f"  Total flights checked:  {ts.get('total_checked', 0):,}")
    print(f"  Hour mismatches:        {ts.get('mismatches', 0):,}")
    print()

    # Required fields audit
    req = results.get("required_fields", {})
    print("REQUIRED FIELDS AUDIT")
    print("-" * 40)
    print(f"  Total flights:           {req.get('total_flights', 0):,}")
    print(f"  Missing required fields: {req.get('missing_required_count', 0):,}")
    if req.get("missing_recommended"):
        print("\n  Missing recommended fields:")
        for field, count in req.get("missing_recommended", {}).items():
            print(f"    {field}: {count:,} flights")
    print()

    # Summary
    print("=" * 70)
    total_issues = (
        clf.get('mismatches', 0) +
        cfw.get('mismatches', 0) +
        ts.get('mismatches', 0) +
        req.get('missing_required_count', 0)
    )
    if total_issues == 0:
        print("  STATUS: ALL CHECKS PASSED")
    else:
        print(f"  STATUS: {total_issues:,} ISSUES FOUND")
    print("=" * 70 + "\n")


@click.command()
@click.option("--source", type=click.Choice(["sqlite", "supabase"]), default="sqlite",
              help="Data source to audit")
@click.option("--output", type=click.Path(), default=None,
              help="Save JSON report to file")
def main(source: str, output: str):
    """Run comprehensive data quality audit."""

    print(f"\nConnecting to {source}...")

    if source == "sqlite":
        conn = get_sqlite_connection()
    else:
        conn = get_supabase_client()

    results = {
        "source": source,
        "audit_time": datetime.now().isoformat(),
        "classifications": audit_classifications(conn, source),
        "curfew": audit_curfew_flags(conn, source),
        "timestamps": audit_timestamps(conn, source),
        "required_fields": audit_required_fields(conn, source),
    }

    print_audit_report(results)

    if output:
        with open(output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Report saved to: {output}")

    if source == "sqlite":
        conn.close()


if __name__ == "__main__":
    main()
