#!/usr/bin/env python3
"""
JPX Dashboard — Find Missing Date Gaps
========================================

Analyzes flight data to find gaps in date coverage.
Useful for planning historical backfill operations.

Usage:
    python scripts/audit/find_gaps.py                          # SQLite
    python scripts/audit/find_gaps.py --source supabase        # Supabase
    python scripts/audit/find_gaps.py --start 2020-01-01       # Custom range
"""

import sys
import os
import logging
import click
from pathlib import Path
from datetime import datetime, timedelta
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


def get_dates_with_data(conn, source: str) -> set:
    """Get all dates that have flight data."""
    if source == "sqlite":
        cursor = conn.execute("""
            SELECT DISTINCT operation_date FROM flights
            WHERE operation_date IS NOT NULL
            ORDER BY operation_date
        """)
        return {row["operation_date"] for row in cursor.fetchall()}
    else:
        response = conn.table("flights").select("operation_date").execute()
        return {row["operation_date"] for row in response.data if row["operation_date"]}


def get_flights_per_date(conn, source: str) -> dict:
    """Get flight counts per date."""
    if source == "sqlite":
        cursor = conn.execute("""
            SELECT operation_date, COUNT(*) as count
            FROM flights
            WHERE operation_date IS NOT NULL
            GROUP BY operation_date
            ORDER BY operation_date
        """)
        return {row["operation_date"]: row["count"] for row in cursor.fetchall()}
    else:
        response = conn.table("daily_summary").select("operation_date, total_operations").execute()
        return {row["operation_date"]: row["total_operations"] for row in response.data}


def find_gaps(dates_with_data: set, start_date: str, end_date: str) -> list:
    """Find missing dates in the range."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    gaps = []
    current = start
    gap_start = None

    while current <= end:
        date_str = current.strftime("%Y-%m-%d")

        if date_str not in dates_with_data:
            if gap_start is None:
                gap_start = date_str
        else:
            if gap_start is not None:
                gap_end = (current - timedelta(days=1)).strftime("%Y-%m-%d")
                gap_days = (current - datetime.strptime(gap_start, "%Y-%m-%d")).days
                gaps.append({
                    "start": gap_start,
                    "end": gap_end,
                    "days": gap_days,
                })
                gap_start = None

        current += timedelta(days=1)

    # Handle trailing gap
    if gap_start is not None:
        gap_days = (end - datetime.strptime(gap_start, "%Y-%m-%d")).days + 1
        gaps.append({
            "start": gap_start,
            "end": end_date,
            "days": gap_days,
        })

    return gaps


def analyze_seasonal_coverage(flights_per_date: dict) -> dict:
    """Analyze coverage by season (summer vs winter)."""
    summer_months = {5, 6, 7, 8, 9}  # May - September

    summer = {"dates": 0, "flights": 0}
    winter = {"dates": 0, "flights": 0}

    for date_str, count in flights_per_date.items():
        month = int(date_str.split("-")[1])
        if month in summer_months:
            summer["dates"] += 1
            summer["flights"] += count
        else:
            winter["dates"] += 1
            winter["flights"] += count

    return {
        "summer": summer,
        "winter": winter,
        "summer_avg_per_day": summer["flights"] / max(1, summer["dates"]),
        "winter_avg_per_day": winter["flights"] / max(1, winter["dates"]),
    }


def estimate_backfill_cost(gaps: list, seasonal: dict) -> dict:
    """
    Estimate FlightAware API cost to backfill gaps.
    Assumes ~$0.01 per page, 15 records per page.
    """
    summer_months = {5, 6, 7, 8, 9}

    total_pages = 0
    summer_days = 0
    winter_days = 0

    for gap in gaps:
        start = datetime.strptime(gap["start"], "%Y-%m-%d")
        end = datetime.strptime(gap["end"], "%Y-%m-%d")

        current = start
        while current <= end:
            month = current.month
            if month in summer_months:
                summer_days += 1
                # Summer average ~100 ops/day = ~7 pages
                total_pages += max(1, int(seasonal["summer_avg_per_day"] / 15) + 1)
            else:
                winter_days += 1
                # Winter average ~30 ops/day = ~2 pages
                total_pages += max(1, int(seasonal["winter_avg_per_day"] / 15) + 1)
            current += timedelta(days=1)

    return {
        "total_missing_days": summer_days + winter_days,
        "summer_days": summer_days,
        "winter_days": winter_days,
        "estimated_pages": total_pages,
        "estimated_cost_usd": total_pages * 0.01,
    }


@click.command()
@click.option("--source", type=click.Choice(["sqlite", "supabase"]), default="sqlite")
@click.option("--start", "start_date", default="2011-01-01",
              help="Start date for gap analysis (YYYY-MM-DD)")
@click.option("--end", "end_date", default=None,
              help="End date for gap analysis (default: yesterday)")
def main(source: str, start_date: str, end_date: str):
    """Find gaps in flight data coverage."""

    if not end_date:
        end_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    print(f"\nAnalyzing {source} for gaps: {start_date} to {end_date}")
    print("=" * 60)

    if source == "sqlite":
        conn = get_sqlite_connection()
    else:
        conn = get_supabase_client()

    # Get existing data
    dates_with_data = get_dates_with_data(conn, source)
    flights_per_date = get_flights_per_date(conn, source)

    print(f"\nData coverage:")
    print(f"  Dates with data: {len(dates_with_data):,}")
    print(f"  Total flights:   {sum(flights_per_date.values()):,}")

    if dates_with_data:
        earliest = min(dates_with_data)
        latest = max(dates_with_data)
        print(f"  Date range:      {earliest} to {latest}")

    # Find gaps
    gaps = find_gaps(dates_with_data, start_date, end_date)

    print(f"\nGaps found: {len(gaps)}")
    if gaps:
        print("\nLargest gaps:")
        sorted_gaps = sorted(gaps, key=lambda g: g["days"], reverse=True)[:10]
        for gap in sorted_gaps:
            print(f"  {gap['start']} to {gap['end']} ({gap['days']} days)")

    # Seasonal analysis
    seasonal = analyze_seasonal_coverage(flights_per_date)
    print(f"\nSeasonal coverage:")
    print(f"  Summer (May-Sep): {seasonal['summer']['dates']:,} days, "
          f"{seasonal['summer']['flights']:,} flights "
          f"({seasonal['summer_avg_per_day']:.1f}/day avg)")
    print(f"  Winter (Oct-Apr): {seasonal['winter']['dates']:,} days, "
          f"{seasonal['winter']['flights']:,} flights "
          f"({seasonal['winter_avg_per_day']:.1f}/day avg)")

    # Cost estimation
    if gaps:
        cost = estimate_backfill_cost(gaps, seasonal)
        print(f"\nBackfill cost estimate:")
        print(f"  Missing days:    {cost['total_missing_days']:,} "
              f"(summer: {cost['summer_days']:,}, winter: {cost['winter_days']:,})")
        print(f"  Estimated pages: {cost['estimated_pages']:,}")
        print(f"  Estimated cost:  ${cost['estimated_cost_usd']:.2f}")

    print()

    if source == "sqlite":
        conn.close()


if __name__ == "__main__":
    main()
