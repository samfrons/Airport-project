#!/usr/bin/env python3
"""
JPX Dashboard — Quick Stats Query
===================================

Query the local database for summary statistics.
Useful for spot-checking data and generating quick reports.

Usage:
    python scripts/query_stats.py                         # today's summary
    python scripts/query_stats.py --month 2025-08         # monthly summary
    python scripts/query_stats.py --date 2025-08-15       # single day detail
    python scripts/query_stats.py --curfew                # curfew violations
    python scripts/query_stats.py --top-operators 10      # top N operators
    python scripts/query_stats.py --helicopters           # helicopter detail
"""

import sys
import click
from pathlib import Path
from tabulate import tabulate

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.db.database import get_connection

DB_PATH = Path(__file__).parent.parent / "data" / "jpx_flights.db"


def query(conn, sql: str, params=()) -> list:
    """Execute a query and return results as list of dicts."""
    cursor = conn.execute(sql, params)
    columns = [d[0] for d in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@click.command()
@click.option("--date", help="Show detail for a specific date (YYYY-MM-DD)")
@click.option("--month", help="Monthly summary (YYYY-MM)")
@click.option("--curfew", is_flag=True, help="Show curfew-period operations")
@click.option("--top-operators", type=int, help="Top N operators by volume")
@click.option("--helicopters", is_flag=True, help="Helicopter operations detail")
@click.option("--summary", is_flag=True, default=True, help="Overall database summary")
def main(date, month, curfew, top_operators, helicopters, summary):
    """Query JPX flight data from the local database."""

    if not DB_PATH.exists():
        print("Database not found. Run daily_pull.py first.")
        sys.exit(1)

    conn = get_connection(str(DB_PATH))

    if date:
        show_date_detail(conn, date)
    elif month:
        show_monthly_summary(conn, month)
    elif curfew:
        show_curfew_ops(conn)
    elif top_operators:
        show_top_operators(conn, top_operators)
    elif helicopters:
        show_helicopter_detail(conn)
    else:
        show_overall_summary(conn)

    conn.close()


def show_overall_summary(conn):
    """Database-wide summary."""
    stats = query(conn, """
        SELECT
            COUNT(*) as total_flights,
            COUNT(DISTINCT operation_date) as days_covered,
            MIN(operation_date) as earliest_date,
            MAX(operation_date) as latest_date,
            SUM(CASE WHEN aircraft_category = 'helicopter' THEN 1 ELSE 0 END) as helicopters,
            SUM(CASE WHEN aircraft_category = 'jet' THEN 1 ELSE 0 END) as jets,
            SUM(CASE WHEN aircraft_category = 'fixed_wing' THEN 1 ELSE 0 END) as fixed_wing,
            SUM(CASE WHEN aircraft_category = 'unknown' THEN 1 ELSE 0 END) as unknown,
            SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END) as curfew_ops,
            COUNT(DISTINCT registration) as unique_aircraft
        FROM flights
    """)

    if not stats or stats[0]["total_flights"] == 0:
        print("No data in database. Run daily_pull.py first.")
        return

    s = stats[0]
    print(f"\n{'═' * 50}")
    print(f"  JPX Dashboard — Database Summary")
    print(f"{'═' * 50}")
    print(f"  Date range:        {s['earliest_date']} → {s['latest_date']}")
    print(f"  Days covered:      {s['days_covered']}")
    print(f"  Total operations:  {s['total_flights']}")
    print(f"  Unique aircraft:   {s['unique_aircraft']}")
    print(f"")
    print(f"  Aircraft breakdown:")
    print(f"    Helicopters:     {s['helicopters']}")
    print(f"    Jets:            {s['jets']}")
    print(f"    Fixed-wing:      {s['fixed_wing']}")
    print(f"    Unknown:         {s['unknown']}")
    print(f"")
    print(f"  Curfew-period ops: {s['curfew_ops']}")
    if s['total_flights'] > 0:
        pct = s['curfew_ops'] / s['total_flights'] * 100
        print(f"  Curfew rate:       {pct:.1f}%")
    print(f"{'═' * 50}\n")


def show_date_detail(conn, date: str):
    """Detail for a specific date."""
    rows = query(conn, """
        SELECT ident, registration, direction, aircraft_type, aircraft_category,
               operation_hour_et, is_curfew_period,
               origin_code, destination_code
        FROM flights
        WHERE operation_date = ?
        ORDER BY operation_hour_et, direction
    """, (date,))

    if not rows:
        print(f"No data for {date}")
        return

    print(f"\n  JPX Operations — {date} ({len(rows)} total)\n")
    print(tabulate(rows, headers="keys", tablefmt="simple"))


def show_monthly_summary(conn, month: str):
    """Monthly summary from daily_summary table."""
    rows = query(conn, """
        SELECT *
        FROM daily_summary
        WHERE operation_date LIKE ?
        ORDER BY operation_date
    """, (f"{month}%",))

    if not rows:
        print(f"No data for {month}")
        return

    # Clean up for display
    display = [{
        "date": r["operation_date"],
        "day": r["day_of_week"][:3],
        "total": r["total_operations"],
        "arr": r["arrivals"],
        "dep": r["departures"],
        "heli": r["helicopters"],
        "jet": r["jets"],
        "fw": r["fixed_wing"],
        "curfew": r["curfew_operations"],
    } for r in rows]

    print(f"\n  JPX Monthly Summary — {month}\n")
    print(tabulate(display, headers="keys", tablefmt="simple"))

    totals = {k: sum(r[k] for r in rows) for k in ["total_operations", "helicopters", "jets", "curfew_operations"]}
    print(f"\n  Month totals: {totals['total_operations']} ops, "
          f"{totals['helicopters']} heli, {totals['jets']} jet, "
          f"{totals['curfew_operations']} curfew")


def show_curfew_ops(conn):
    """Show curfew-period operations."""
    rows = query(conn, """
        SELECT operation_date, ident, registration, direction,
               aircraft_type, aircraft_category, operation_hour_et,
               origin_code, destination_code
        FROM flights
        WHERE is_curfew_period = 1
        ORDER BY operation_date DESC, operation_hour_et
        LIMIT 50
    """)

    if not rows:
        print("No curfew-period operations found.")
        return

    print(f"\n  Curfew-Period Operations (8 PM – 8 AM ET) — Last 50\n")
    print(tabulate(rows, headers="keys", tablefmt="simple"))


def show_top_operators(conn, n: int):
    """Top operators by volume."""
    rows = query(conn, """
        SELECT
            COALESCE(registration, ident) as aircraft,
            aircraft_type,
            aircraft_category,
            COUNT(*) as operations,
            SUM(CASE WHEN direction = 'arrival' THEN 1 ELSE 0 END) as arrivals,
            SUM(CASE WHEN direction = 'departure' THEN 1 ELSE 0 END) as departures,
            MIN(operation_date) as first_seen,
            MAX(operation_date) as last_seen
        FROM flights
        GROUP BY COALESCE(registration, ident)
        ORDER BY operations DESC
        LIMIT ?
    """, (n,))

    print(f"\n  Top {n} Aircraft/Operators at JPX\n")
    print(tabulate(rows, headers="keys", tablefmt="simple"))


def show_helicopter_detail(conn):
    """Helicopter operations breakdown."""
    rows = query(conn, """
        SELECT
            aircraft_type,
            COUNT(*) as operations,
            COUNT(DISTINCT registration) as unique_aircraft,
            COUNT(DISTINCT operation_date) as days_active,
            SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END) as curfew_ops
        FROM flights
        WHERE aircraft_category = 'helicopter'
        GROUP BY aircraft_type
        ORDER BY operations DESC
    """)

    if not rows:
        print("No helicopter operations found.")
        return

    print(f"\n  Helicopter Operations by Type\n")
    print(tabulate(rows, headers="keys", tablefmt="simple"))

    total = sum(r["operations"] for r in rows)
    total_curfew = sum(r["curfew_ops"] for r in rows)
    print(f"\n  Total helicopter ops: {total} ({total_curfew} during curfew)")


if __name__ == "__main__":
    main()
