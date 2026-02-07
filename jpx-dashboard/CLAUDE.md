# JPX Airport Dashboard — Claude Code Context

## Project Overview

A public flight data dashboard for East Hampton Town Airport (ICAO: KJPX, formerly KHTO).
Built by the Wainscott Citizens Advisory Committee (WCAC) to provide transparent,
data-driven insights into airport operations.

**Key stakeholders:** Marc Frons (WCAC), Sam Frons (collaborator)

## What This Project Does

- Daily batch-pulls flight data from FlightAware AeroAPI v4
- Stores operations in a local SQLite database
- Classifies aircraft as helicopter / fixed-wing / jet
- Tracks voluntary curfew compliance (8 PM–8 AM ET)
- Serves a public-facing dashboard with charts and metrics

## Architecture

- **Data source:** FlightAware AeroAPI v4 (Standard tier, $100/mo)
  - Base URL: `https://aeroapi.flightaware.com/aeroapi`
  - Auth: `x-apikey` header
  - Historical data back to January 2011
  - 15 records per page, billed per page per query
- **Backend:** Python 3.11+, SQLite (upgradeable to PostgreSQL)
- **Frontend:** TBD (React planned, may use Streamlit for rapid prototyping)
- **Airport codes:** Use `KJPX` for data from May 2022 onward, `KHTO` for pre-May 2022 data

## Key API Endpoints

| Endpoint | Use |
|----------|-----|
| `GET /airports/KJPX` | Airport info |
| `GET /airports/KJPX/flights` | Current/recent flights |
| `GET /history/airports/KJPX/flights` | Historical flights (date range) |
| `GET /flights/{fa_flight_id}/track` | Flight positions/track |
| `GET /aircraft/{reg}/owner` | Aircraft owner lookup |
| `GET /airports/KJPX/flights/counts` | Current activity counts |

## Environment Setup

```bash
# API key is stored in .env (never committed)
source .env
# or
export AEROAPI_KEY="your-key-here"
```

## Important Conventions

- All timestamps from the API are UTC. East Hampton is ET (UTC-4 summer / UTC-5 winter).
- Curfew window: 8:00 PM to 8:00 AM Eastern Time (voluntary).
- Aircraft classification uses ICAO type designator codes. Helicopters typically start with
  common prefixes (e.g., R22, R44, S76, EC35, A109, B06, B407, etc.)
- The `aircraft_type` field from FlightAware uses ICAO codes.
- Pagination: always set `max_pages` to control API costs.

## Database

SQLite file at `data/jpx_flights.db`. Schema in `src/db/schema.sql`.
Main table: `flights` — one row per operation (arrival or departure).

## Running

```bash
# Activate virtualenv
source venv/bin/activate

# Run daily batch pull
python scripts/daily_pull.py

# Run with a specific date
python scripts/daily_pull.py --date 2025-08-15

# Query the database
python scripts/query_stats.py --month 2025-08
```

## Collaboration

Marc and Sam work from this shared GitHub repo. Both maintain Claude Projects
with the same knowledge files. Update this file and `docs/ARCHITECTURE.md`
when making significant decisions so the other person's Claude stays in sync.

## Cost Notes

- Standard tier: $100/mo flat + per-query fees
- Airport flights query: ~$0.01 per page (15 records)
- ~100 daily operations at JPX = ~7 pages = ~$0.07/day
- Historical pulls are the same price per page
- Owner lookup: ~$0.005 per query
- Monthly API costs for daily batch: ~$2-5/mo (well under the $100 minimum)
