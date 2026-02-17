#!/usr/bin/env python3
"""
JPX Dashboard — Data Backup Script
===================================

Exports all flight data from Supabase to multiple backup formats:
- CSV files (flights.csv, daily_summary.csv)
- JSON files (flights.json, daily_summary.json)
- SQLite database (jpx_backup.db)

Usage:
    python scripts/backup_data.py
    python scripts/backup_data.py --output-dir /path/to/backups
"""

import os
import sys
import json
import csv
import sqlite3
import click
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.db.supabase_writer import SupabaseWriter


def fetch_all_records(client, table_name: str, batch_size: int = 1000) -> list:
    """Fetch all records from a table with pagination."""
    all_records = []
    offset = 0

    while True:
        response = client.table(table_name).select('*').range(offset, offset + batch_size - 1).execute()
        if not response.data:
            break
        all_records.extend(response.data)
        print(f"   Fetched {len(all_records):,} {table_name}...")
        offset += batch_size
        if len(response.data) < batch_size:
            break

    return all_records


@click.command()
@click.option('--output-dir', default=None, help='Output directory for backups')
def main(output_dir: str):
    """Backup all JPX flight data to CSV, JSON, and SQLite."""

    print("Connecting to Supabase...")
    w = SupabaseWriter()

    # Create backup directory
    if output_dir:
        backup_dir = output_dir
    else:
        backup_dir = f"backups/{datetime.now().strftime('%Y-%m-%d')}"

    os.makedirs(backup_dir, exist_ok=True)
    print(f"Backup directory: {backup_dir}/")

    # ============================================================
    # 1. Fetch all data
    # ============================================================
    print("\n1. Fetching flights...")
    all_flights = fetch_all_records(w.client, 'flights')
    print(f"   Total: {len(all_flights):,} flights")

    print("\n2. Fetching daily summaries...")
    all_summaries = fetch_all_records(w.client, 'daily_summary')
    print(f"   Total: {len(all_summaries):,} summaries")

    # ============================================================
    # 2. Export to CSV
    # ============================================================
    print("\n3. Exporting to CSV...")

    if all_flights:
        csv_path = f"{backup_dir}/flights.csv"
        with open(csv_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=all_flights[0].keys())
            writer.writeheader()
            writer.writerows(all_flights)
        print(f"   Saved flights.csv")

    if all_summaries:
        csv_path = f"{backup_dir}/daily_summary.csv"
        with open(csv_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=all_summaries[0].keys())
            writer.writeheader()
            writer.writerows(all_summaries)
        print(f"   Saved daily_summary.csv")

    # ============================================================
    # 3. Export to JSON
    # ============================================================
    print("\n4. Exporting to JSON...")

    json_path = f"{backup_dir}/flights.json"
    with open(json_path, 'w') as f:
        json.dump(all_flights, f, indent=2, default=str)
    print(f"   Saved flights.json")

    json_path = f"{backup_dir}/daily_summary.json"
    with open(json_path, 'w') as f:
        json.dump(all_summaries, f, indent=2, default=str)
    print(f"   Saved daily_summary.json")

    # ============================================================
    # 4. Export to SQLite
    # ============================================================
    print("\n5. Exporting to SQLite...")

    sqlite_path = f"{backup_dir}/jpx_backup.db"
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()

    # Create flights table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS flights (
        id INTEGER PRIMARY KEY,
        fa_flight_id TEXT UNIQUE,
        ident TEXT,
        registration TEXT,
        direction TEXT,
        aircraft_type TEXT,
        aircraft_category TEXT,
        operator TEXT,
        operator_iata TEXT,
        origin_code TEXT,
        origin_name TEXT,
        origin_city TEXT,
        destination_code TEXT,
        destination_name TEXT,
        destination_city TEXT,
        scheduled_off TEXT,
        actual_off TEXT,
        scheduled_on TEXT,
        actual_on TEXT,
        operation_date TEXT,
        operation_hour_et INTEGER,
        is_curfew_period BOOLEAN,
        is_weekend BOOLEAN,
        created_at TEXT,
        raw_json TEXT
    )
    ''')

    # Create daily_summary table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_summary (
        id INTEGER PRIMARY KEY,
        operation_date TEXT UNIQUE,
        total_operations INTEGER,
        arrivals INTEGER,
        departures INTEGER,
        helicopters INTEGER,
        fixed_wing INTEGER,
        jets INTEGER,
        unknown_type INTEGER,
        curfew_operations INTEGER,
        unique_aircraft INTEGER,
        day_of_week TEXT,
        updated_at TEXT
    )
    ''')

    # Insert flights
    flight_columns = [
        'fa_flight_id', 'ident', 'registration', 'direction', 'aircraft_type',
        'aircraft_category', 'operator', 'operator_iata', 'origin_code', 'origin_name',
        'origin_city', 'destination_code', 'destination_name', 'destination_city',
        'scheduled_off', 'actual_off', 'scheduled_on', 'actual_on', 'operation_date',
        'operation_hour_et', 'is_curfew_period', 'is_weekend', 'created_at'
    ]

    for flight in all_flights:
        values = [flight.get(col) for col in flight_columns]
        placeholders = ','.join(['?' for _ in flight_columns])
        cursor.execute(f'''
            INSERT OR REPLACE INTO flights ({','.join(flight_columns)})
            VALUES ({placeholders})
        ''', values)

    # Insert summaries
    summary_columns = [
        'operation_date', 'total_operations', 'arrivals', 'departures', 'helicopters',
        'fixed_wing', 'jets', 'unknown_type', 'curfew_operations', 'unique_aircraft',
        'day_of_week', 'updated_at'
    ]

    for summary in all_summaries:
        values = [summary.get(col) for col in summary_columns]
        placeholders = ','.join(['?' for _ in summary_columns])
        cursor.execute(f'''
            INSERT OR REPLACE INTO daily_summary ({','.join(summary_columns)})
            VALUES ({placeholders})
        ''', values)

    conn.commit()

    # Create indexes for faster queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(operation_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_flights_category ON flights(aircraft_category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_flights_registration ON flights(registration)')
    conn.commit()
    conn.close()

    print(f"   Saved jpx_backup.db")

    # ============================================================
    # Summary
    # ============================================================
    print("\n" + "=" * 60)
    print("  Backup Complete!")
    print("=" * 60)
    print(f"\nBackup location: {backup_dir}/")

    # Get file sizes
    total_size = 0
    for f in sorted(os.listdir(backup_dir)):
        size = os.path.getsize(f"{backup_dir}/{f}")
        total_size += size
        if size > 1024 * 1024:
            print(f"  {f}: {size / 1024 / 1024:.1f} MB")
        else:
            print(f"  {f}: {size / 1024:.1f} KB")

    print(f"\nTotal backup size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Flights: {len(all_flights):,}")
    print(f"Days: {len(all_summaries):,}")


if __name__ == "__main__":
    main()
