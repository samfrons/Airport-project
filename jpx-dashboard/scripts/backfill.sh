#!/usr/bin/env bash
#
# Backfill historical flight data for KJPX (formerly KHTO)
#
# The airport ICAO code changed from KHTO to KJPX in May 2022.
# daily_pull.py handles this automatically -- it uses KHTO for dates
# before 2022-05-01 and KJPX for dates on or after.
#
# Usage:
#   ./scripts/backfill.sh 2022-01-01 2022-06-30   # backfill a date range
#   ./scripts/backfill.sh 2022-04-15              # backfill a single date
#
# Requirements:
#   - AEROAPI_KEY environment variable set
#   - Python 3.8+ with dependencies installed
#   - Supabase credentials in .env.local (if using Supabase backend)
#
# Note: FlightAware AeroAPI charges per query. A full year backfill
# (~365 API calls) will consume API credits. Check your plan limits.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DAILY_PULL="$SCRIPT_DIR/daily_pull.py"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <start-date> [end-date]"
  echo ""
  echo "Examples:"
  echo "  $0 2022-01-01 2022-12-31   # Full year 2022"
  echo "  $0 2023-06-01 2023-09-30   # Summer 2023"
  echo "  $0 2024-01-15              # Single day"
  echo ""
  echo "The script automatically uses KHTO for dates before May 2022"
  echo "and KJPX for dates on or after May 2022."
  exit 1
fi

START_DATE="$1"
END_DATE="${2:-$START_DATE}"

# Validate date format
if ! date -d "$START_DATE" >/dev/null 2>&1; then
  echo "Error: Invalid start date '$START_DATE'. Use YYYY-MM-DD format."
  exit 1
fi
if ! date -d "$END_DATE" >/dev/null 2>&1; then
  echo "Error: Invalid end date '$END_DATE'. Use YYYY-MM-DD format."
  exit 1
fi

# Check prerequisites
if [ -z "${AEROAPI_KEY:-}" ]; then
  echo "Error: AEROAPI_KEY environment variable not set."
  echo "Export it or add to .env file: export AEROAPI_KEY=your_key_here"
  exit 1
fi

if [ ! -f "$DAILY_PULL" ]; then
  echo "Error: daily_pull.py not found at $DAILY_PULL"
  exit 1
fi

echo "=== JPX/HTO Historical Data Backfill ==="
echo "Date range: $START_DATE to $END_DATE"

# Show which airport code will be used for key dates
if [[ "$START_DATE" < "2022-05-01" ]]; then
  echo "Note: Dates before 2022-05-01 will query as KHTO"
fi
if [[ "$END_DATE" >= "2022-05-01" ]]; then
  echo "Note: Dates from 2022-05-01 onward will query as KJPX"
fi

echo ""
echo "Starting backfill..."
echo ""

python3 "$DAILY_PULL" --date "$START_DATE" --end "$END_DATE"

echo ""
echo "=== Backfill complete ==="
echo "Run 'python3 scripts/query_stats.py' to verify data integrity."
