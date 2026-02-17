#!/usr/bin/env python3
"""
JPX Dashboard — Historical Data Backfill
==========================================

Pulls historical flight data from FlightAware AeroAPI for specified date ranges.
Writes directly to Supabase (production) with SQLite as backup.

Features:
- Automatic airport code selection (KHTO pre-2022-05, KJPX after)
- Cost tracking with configurable limits (--max-cost)
- Resume capability (skips dates already in database)
- Dry-run mode for cost estimation
- Progress logging and state persistence

Usage:
    # Estimate cost for summer 2024
    python scripts/backfill/historical_pull.py \
        --start 2024-05-25 --end 2024-09-07 --dry-run

    # Pull with cost limit
    python scripts/backfill/historical_pull.py \
        --start 2024-05-25 --end 2024-09-07 --max-cost 20

    # Pull a single date
    python scripts/backfill/historical_pull.py --date 2024-07-04

Cost Estimates (per day):
- Summer (100 ops/day): ~7 pages × $0.01 = $0.07
- Winter (30 ops/day):  ~2 pages × $0.01 = $0.02
"""

import sys
import os
import json
import logging
import click
from pathlib import Path
from datetime import datetime, timedelta, timezone
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.api.aeroapi import AeroAPIClient, AeroAPIError
from src.analysis.classify import (
    classify_aircraft, utc_to_eastern, is_curfew_hour, is_weekend, get_operation_time
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# Airport code transition date
KJPX_START_DATE = "2022-05-01"

# State file for resume capability
STATE_FILE = Path(__file__).parent / ".backfill_state.json"


def get_airport_code(date_str: str) -> str:
    """Get the correct airport code for a given date."""
    return "KJPX" if date_str >= KJPX_START_DATE else "KHTO"


def load_state() -> dict:
    """Load backfill state from file."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"completed_dates": [], "total_cost": 0.0}


def save_state(state: dict):
    """Save backfill state to file."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def get_existing_dates(writer, source: str = "supabase") -> set:
    """Get dates that already have data."""
    if source == "supabase":
        try:
            # Get distinct dates from daily_summary
            response = writer.client.table("daily_summary").select("operation_date").execute()
            return {row["operation_date"] for row in response.data}
        except Exception as e:
            log.warning(f"Could not fetch existing dates from Supabase: {e}")
            return set()
    else:
        # SQLite
        import sqlite3
        db_path = Path(__file__).parent.parent.parent / "data" / "jpx_flights.db"
        if not db_path.exists():
            return set()
        conn = sqlite3.connect(str(db_path))
        cursor = conn.execute("SELECT DISTINCT operation_date FROM flights")
        dates = {row[0] for row in cursor.fetchall()}
        conn.close()
        return dates


def process_flight(flight: dict, direction: str) -> dict:
    """Transform a raw API flight record into a database-ready dict."""
    op_time_utc = get_operation_time(flight, direction)
    op_time_et = utc_to_eastern(op_time_utc) if op_time_utc else None

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
        "is_curfew_period": curfew,
        "is_weekend": weekend,
        "raw_json": json.dumps(flight, default=str),
    }


def estimate_daily_cost(date_str: str) -> float:
    """
    Estimate cost for pulling a single day.
    Summer months (~100 ops) = ~$0.07
    Winter months (~30 ops) = ~$0.02
    """
    month = int(date_str.split("-")[1])
    if month in [5, 6, 7, 8, 9]:  # May-September
        return 0.07
    else:
        return 0.02


def pull_single_date(
    client: AeroAPIClient,
    writer,
    date_str: str,
    dry_run: bool = False
) -> dict:
    """
    Pull all flights for a single date.

    Returns dict with:
        - date: the date pulled
        - flights: number of flights
        - cost: actual API cost
        - status: 'success', 'skipped', or 'error'
    """
    airport_code = get_airport_code(date_str)

    if dry_run:
        estimated_cost = estimate_daily_cost(date_str)
        return {
            "date": date_str,
            "airport": airport_code,
            "flights": 0,
            "cost": estimated_cost,
            "status": "dry_run",
        }

    start = f"{date_str}T00:00:00Z"
    end_dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    end = end_dt.strftime("%Y-%m-%dT00:00:00Z")

    try:
        log.info(f"Pulling {date_str} from {airport_code}...")

        data = client.airport_flights_history(
            airport_id=airport_code,
            start=start,
            end=end,
            max_pages=10,
        )

        flights = []
        for direction_key, direction_label in [("arrivals", "arrival"), ("departures", "departure")]:
            raw_flights = data.get(direction_key, [])
            for flight in raw_flights:
                record = process_flight(flight, direction_label)
                if record["fa_flight_id"]:
                    flights.append(record)

        # Insert to Supabase
        if flights:
            inserted = writer.batch_insert_flights(flights)
            writer.upsert_daily_summary(date_str)
            log.info(f"  Inserted {inserted} flights for {date_str}")
        else:
            log.info(f"  No flights found for {date_str}")

        return {
            "date": date_str,
            "airport": airport_code,
            "flights": len(flights),
            "cost": client.cost_estimate,
            "status": "success",
        }

    except AeroAPIError as e:
        log.error(f"  API error for {date_str}: {e}")
        return {
            "date": date_str,
            "airport": airport_code,
            "flights": 0,
            "cost": client.cost_estimate,
            "status": "error",
            "error": str(e),
        }


def generate_date_range(start_date: str, end_date: str) -> list:
    """Generate list of dates in range."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    dates = []
    current = start
    while current <= end:
        dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)

    return dates


@click.command()
@click.option("--start", "start_date", default=None, help="Start date (YYYY-MM-DD)")
@click.option("--end", "end_date", default=None, help="End date (YYYY-MM-DD)")
@click.option("--date", "single_date", default=None, help="Pull single date (YYYY-MM-DD)")
@click.option("--max-cost", type=float, default=50.0, help="Maximum cost limit in USD")
@click.option("--dry-run", is_flag=True, help="Estimate cost without pulling")
@click.option("--skip-existing", is_flag=True, default=True, help="Skip dates already in database")
@click.option("--target", type=click.Choice(["supabase", "sqlite"]), default="supabase",
              help="Target database")
def main(
    start_date: str,
    end_date: str,
    single_date: str,
    max_cost: float,
    dry_run: bool,
    skip_existing: bool,
    target: str,
):
    """Pull historical flight data from FlightAware."""

    # Determine date range
    if single_date:
        dates = [single_date]
        start_date = end_date = single_date
    elif start_date and end_date:
        dates = generate_date_range(start_date, end_date)
    else:
        click.echo("Error: Specify --date or --start/--end")
        return

    # Initialize writer
    if target == "supabase":
        from src.db.supabase_writer import SupabaseWriter
        try:
            writer = SupabaseWriter()
        except (ImportError, ValueError) as e:
            log.error(f"Cannot connect to Supabase: {e}")
            return
    else:
        # For SQLite, we'll use the existing database module
        from src.db.database import get_connection, insert_flight, update_daily_summary
        writer = None  # We'll handle SQLite differently

    # Get existing dates if skipping
    existing_dates = set()
    if skip_existing and not dry_run:
        log.info("Checking for existing dates...")
        existing_dates = get_existing_dates(writer, target)
        log.info(f"Found {len(existing_dates)} dates already in database")

    # Filter out existing dates
    dates_to_pull = [d for d in dates if d not in existing_dates]

    print(f"\n{'=' * 60}")
    print(f"  JPX Dashboard — Historical Backfill")
    print(f"  Range: {start_date} → {end_date}")
    print(f"  Target: {target}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"{'=' * 60}\n")

    print(f"Total dates in range:  {len(dates)}")
    print(f"Already in database:   {len(dates) - len(dates_to_pull)}")
    print(f"Dates to pull:         {len(dates_to_pull)}")
    print(f"Max cost limit:        ${max_cost:.2f}")
    print()

    if not dates_to_pull:
        print("No new dates to pull!")
        return

    # Estimate total cost
    if dry_run:
        total_estimated = sum(estimate_daily_cost(d) for d in dates_to_pull)
        print(f"Estimated total cost: ${total_estimated:.2f}")

        # Show breakdown by month
        by_month = defaultdict(lambda: {"days": 0, "cost": 0.0})
        for d in dates_to_pull:
            month = d[:7]
            by_month[month]["days"] += 1
            by_month[month]["cost"] += estimate_daily_cost(d)

        print("\nEstimate by month:")
        for month, info in sorted(by_month.items()):
            print(f"  {month}: {info['days']} days, ${info['cost']:.2f}")

        return

    # Initialize API client
    client = AeroAPIClient()
    state = load_state()

    total_cost = 0.0
    total_flights = 0
    results = []

    for i, date_str in enumerate(dates_to_pull):
        # Check cost limit
        if total_cost >= max_cost:
            log.warning(f"Cost limit reached (${total_cost:.2f} >= ${max_cost:.2f})")
            break

        # Pull the date
        result = pull_single_date(client, writer, date_str, dry_run)
        results.append(result)

        if result["status"] == "success":
            total_flights += result["flights"]
            state["completed_dates"].append(date_str)

        total_cost = client.cost_estimate
        state["total_cost"] = total_cost
        save_state(state)

        # Progress
        if (i + 1) % 10 == 0:
            log.info(f"Progress: {i + 1}/{len(dates_to_pull)} dates, "
                     f"{total_flights} flights, ${total_cost:.2f}")

    # Summary
    print(f"\n{'─' * 60}")
    print(f"  Backfill Complete")
    print(f"  Dates processed: {len(results)}")
    print(f"  Total flights:   {total_flights}")
    print(f"  API requests:    {client.request_count}")
    print(f"  Total cost:      ${total_cost:.2f}")

    # Status breakdown
    success = sum(1 for r in results if r["status"] == "success")
    errors = sum(1 for r in results if r["status"] == "error")
    if errors > 0:
        print(f"  Successful:      {success}")
        print(f"  Errors:          {errors}")
    print(f"{'─' * 60}\n")

    # Log to Supabase
    if target == "supabase" and not dry_run:
        writer.log_ingestion(
            pull_date=f"{start_date} to {end_date}",
            flights_fetched=total_flights,
            flights_inserted=total_flights,
            api_requests=client.request_count,
            status="success" if errors == 0 else "partial",
        )


if __name__ == "__main__":
    main()
