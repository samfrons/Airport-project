#!/usr/bin/env python3
"""
JPX Dashboard — Data Validation Suite
=======================================

Comprehensive validation of flight data quality:
1. Required fields - fa_flight_id, direction, etc.
2. Classification consistency - aircraft_category matches classify_aircraft()
3. Timestamp sanity - hours 0-23, valid dates
4. Curfew flag consistency - matches 9 PM – 7 AM rule
5. Referential integrity - daily_summary matches flight counts

Usage:
    python scripts/validate/validate_data.py                    # SQLite
    python scripts/validate/validate_data.py --source supabase  # Supabase
    python scripts/validate/validate_data.py --output report.json
"""

import sys
import os
import json
import logging
import click
from pathlib import Path
from datetime import datetime
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.analysis.classify import classify_aircraft, is_curfew_hour

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# Validation rules
REQUIRED_FIELDS = ["fa_flight_id", "direction"]
RECOMMENDED_FIELDS = ["aircraft_type", "registration", "operation_date", "operation_hour_et"]
VALID_DIRECTIONS = ["arrival", "departure"]
VALID_CATEGORIES = ["helicopter", "jet", "fixed_wing", "unknown"]


class ValidationResult:
    """Accumulates validation results."""

    def __init__(self):
        self.errors = []
        self.warnings = []
        self.stats = defaultdict(int)

    def error(self, flight_id: str, field: str, message: str):
        self.errors.append({
            "flight_id": flight_id,
            "field": field,
            "message": message,
            "severity": "error",
        })
        self.stats[f"error_{field}"] += 1

    def warning(self, flight_id: str, field: str, message: str):
        self.warnings.append({
            "flight_id": flight_id,
            "field": field,
            "message": message,
            "severity": "warning",
        })
        self.stats[f"warning_{field}"] += 1

    def to_dict(self) -> dict:
        return {
            "total_errors": len(self.errors),
            "total_warnings": len(self.warnings),
            "errors": self.errors[:100],  # First 100
            "warnings": self.warnings[:100],
            "stats": dict(self.stats),
        }


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


def fetch_flights(source: str):
    """Fetch all flights from source."""
    if source == "sqlite":
        conn = get_sqlite_connection()
        cursor = conn.execute("SELECT * FROM flights")
        flights = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return flights
    else:
        client = get_supabase_client()
        all_flights = []
        offset = 0
        page_size = 1000

        while True:
            response = client.table("flights").select("*").range(
                offset, offset + page_size - 1
            ).execute()
            if not response.data:
                break
            all_flights.extend(response.data)
            if len(response.data) < page_size:
                break
            offset += page_size

        return all_flights


def fetch_daily_summaries(source: str):
    """Fetch daily summaries."""
    if source == "sqlite":
        conn = get_sqlite_connection()
        cursor = conn.execute("SELECT * FROM daily_summary")
        summaries = {row["operation_date"]: dict(row) for row in cursor.fetchall()}
        conn.close()
        return summaries
    else:
        client = get_supabase_client()
        response = client.table("daily_summary").select("*").execute()
        return {row["operation_date"]: row for row in response.data}


def validate_required_fields(flight: dict, result: ValidationResult):
    """Validate required fields are present."""
    flight_id = flight.get("fa_flight_id", "UNKNOWN")

    for field in REQUIRED_FIELDS:
        if not flight.get(field):
            result.error(flight_id, field, f"Missing required field: {field}")

    for field in RECOMMENDED_FIELDS:
        if not flight.get(field):
            result.warning(flight_id, field, f"Missing recommended field: {field}")


def validate_direction(flight: dict, result: ValidationResult):
    """Validate direction field."""
    flight_id = flight.get("fa_flight_id", "UNKNOWN")
    direction = flight.get("direction")

    if direction and direction not in VALID_DIRECTIONS:
        result.error(flight_id, "direction", f"Invalid direction: {direction}")


def validate_category(flight: dict, result: ValidationResult):
    """Validate aircraft_category matches classify_aircraft()."""
    flight_id = flight.get("fa_flight_id", "UNKNOWN")
    stored_cat = flight.get("aircraft_category")
    aircraft_type = flight.get("aircraft_type")

    if stored_cat and stored_cat not in VALID_CATEGORIES:
        result.error(flight_id, "aircraft_category", f"Invalid category: {stored_cat}")

    if aircraft_type:
        expected_cat = classify_aircraft(aircraft_type)
        if stored_cat != expected_cat:
            result.warning(
                flight_id, "aircraft_category",
                f"Category mismatch: {stored_cat} vs expected {expected_cat} for {aircraft_type}"
            )


def validate_timestamps(flight: dict, result: ValidationResult):
    """Validate timestamp fields."""
    flight_id = flight.get("fa_flight_id", "UNKNOWN")

    # Validate operation_hour_et
    hour = flight.get("operation_hour_et")
    if hour is not None:
        if not isinstance(hour, int) or hour < 0 or hour > 23:
            result.error(flight_id, "operation_hour_et", f"Invalid hour: {hour}")

    # Validate operation_date format
    date = flight.get("operation_date")
    if date:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            result.error(flight_id, "operation_date", f"Invalid date format: {date}")

    # Validate timestamp format
    for field in ["actual_on", "actual_off", "scheduled_on", "scheduled_off"]:
        ts = flight.get(field)
        if ts:
            try:
                # Should be ISO 8601
                if "Z" in ts or "+" in ts:
                    datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                result.warning(flight_id, field, f"Invalid timestamp format: {ts}")


def validate_curfew_flag(flight: dict, result: ValidationResult):
    """Validate is_curfew_period matches hour."""
    flight_id = flight.get("fa_flight_id", "UNKNOWN")
    hour = flight.get("operation_hour_et")
    curfew = flight.get("is_curfew_period")

    if hour is not None and curfew is not None:
        # Normalize boolean
        if isinstance(curfew, int):
            curfew = bool(curfew)

        expected = is_curfew_hour(hour)
        if curfew != expected:
            result.warning(
                flight_id, "is_curfew_period",
                f"Curfew flag mismatch: hour {hour} should be {expected}, got {curfew}"
            )


def validate_summary_consistency(
    flights: list,
    summaries: dict,
    result: ValidationResult
):
    """Validate daily_summary matches actual flight counts."""
    # Calculate actual counts per date
    actual_counts = defaultdict(lambda: {
        "total": 0, "arrivals": 0, "departures": 0,
        "helicopters": 0, "jets": 0, "fixed_wing": 0, "curfew": 0
    })

    for flight in flights:
        date = flight.get("operation_date")
        if not date:
            continue

        actual_counts[date]["total"] += 1

        if flight.get("direction") == "arrival":
            actual_counts[date]["arrivals"] += 1
        elif flight.get("direction") == "departure":
            actual_counts[date]["departures"] += 1

        cat = flight.get("aircraft_category")
        if cat == "helicopter":
            actual_counts[date]["helicopters"] += 1
        elif cat == "jet":
            actual_counts[date]["jets"] += 1
        elif cat == "fixed_wing":
            actual_counts[date]["fixed_wing"] += 1

        if flight.get("is_curfew_period"):
            actual_counts[date]["curfew"] += 1

    # Compare with summaries
    for date, actual in actual_counts.items():
        summary = summaries.get(date)

        if not summary:
            result.warning(date, "daily_summary", f"No summary for date {date}")
            continue

        # Check each field
        checks = [
            ("total_operations", actual["total"]),
            ("arrivals", actual["arrivals"]),
            ("departures", actual["departures"]),
            ("helicopters", actual["helicopters"]),
            ("jets", actual["jets"]),
            ("fixed_wing", actual["fixed_wing"]),
            ("curfew_operations", actual["curfew"]),
        ]

        for field, expected in checks:
            stored = summary.get(field, 0)
            if stored != expected:
                result.warning(
                    date, f"daily_summary.{field}",
                    f"Summary mismatch: {field} is {stored}, should be {expected}"
                )


def run_validation(source: str) -> dict:
    """Run all validations."""
    log.info(f"Fetching data from {source}...")
    flights = fetch_flights(source)
    summaries = fetch_daily_summaries(source)

    log.info(f"Validating {len(flights)} flights...")
    result = ValidationResult()

    for flight in flights:
        validate_required_fields(flight, result)
        validate_direction(flight, result)
        validate_category(flight, result)
        validate_timestamps(flight, result)
        validate_curfew_flag(flight, result)

    log.info("Validating summary consistency...")
    validate_summary_consistency(flights, summaries, result)

    return {
        "source": source,
        "validation_time": datetime.now().isoformat(),
        "total_flights": len(flights),
        "total_summaries": len(summaries),
        **result.to_dict(),
    }


def print_validation_report(report: dict):
    """Print formatted validation report."""
    print("\n" + "=" * 60)
    print("  DATA VALIDATION REPORT")
    print("=" * 60 + "\n")

    print(f"Source: {report['source']}")
    print(f"Flights validated: {report['total_flights']:,}")
    print(f"Summaries checked: {report['total_summaries']:,}")
    print()

    # Summary
    print("RESULTS")
    print("-" * 40)
    print(f"  Errors:   {report['total_errors']:,}")
    print(f"  Warnings: {report['total_warnings']:,}")
    print()

    # Stats breakdown
    if report.get("stats"):
        print("BREAKDOWN BY FIELD")
        print("-" * 40)
        for key, count in sorted(report["stats"].items()):
            severity, field = key.split("_", 1)
            print(f"  {severity.upper():8} {field}: {count:,}")
        print()

    # Sample errors
    if report.get("errors"):
        print("SAMPLE ERRORS")
        print("-" * 40)
        for err in report["errors"][:5]:
            print(f"  [{err['flight_id']}] {err['field']}: {err['message']}")
        if report["total_errors"] > 5:
            print(f"  ... and {report['total_errors'] - 5} more")
        print()

    # Sample warnings
    if report.get("warnings"):
        print("SAMPLE WARNINGS")
        print("-" * 40)
        for warn in report["warnings"][:5]:
            print(f"  [{warn['flight_id']}] {warn['field']}: {warn['message']}")
        if report["total_warnings"] > 5:
            print(f"  ... and {report['total_warnings'] - 5} more")
        print()

    # Overall status
    print("=" * 60)
    if report["total_errors"] == 0 and report["total_warnings"] == 0:
        print("  STATUS: ALL VALIDATIONS PASSED ✓")
    elif report["total_errors"] == 0:
        print(f"  STATUS: PASSED ({report['total_warnings']} warnings)")
    else:
        print(f"  STATUS: FAILED ({report['total_errors']} errors)")
    print("=" * 60 + "\n")


@click.command()
@click.option("--source", type=click.Choice(["sqlite", "supabase"]), default="sqlite",
              help="Data source to validate")
@click.option("--output", type=click.Path(), default=None,
              help="Save JSON report to file")
def main(source: str, output: str):
    """Run comprehensive data validation."""

    report = run_validation(source)

    print_validation_report(report)

    if output:
        with open(output, "w") as f:
            json.dump(report, f, indent=2, default=str)
        print(f"Report saved to: {output}")

    # Exit with error code if validation failed
    if report["total_errors"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
