# JPX Airport Dashboard

A public flight data dashboard for East Hampton Town Airport (KJPX), providing
transparent, data-driven insights into airport operations for the Wainscott
Citizens Advisory Committee (WCAC).

## Features

- Daily/weekly/monthly operation counts
- Aircraft type breakdown (helicopter vs. fixed-wing vs. jet)
- Voluntary curfew compliance tracking (8 PM – 8 AM ET)
- Year-over-year trend analysis (data back to 2011)
- Top operators by volume

## Quick Start

### 1. Clone and set up the environment

```bash
git clone https://github.com/YOUR_ORG/jpx-dashboard.git
cd jpx-dashboard
./scripts/setup.sh
```

### 2. Configure your API key

```bash
cp .env.example .env
# Edit .env and add your FlightAware AeroAPI key
```

### 3. Run a test pull

```bash
source venv/bin/activate
python scripts/daily_pull.py --date 2025-08-15
```

### 4. Query the data

```bash
python scripts/query_stats.py --month 2025-08
```

## Project Structure

```
jpx-dashboard/
├── CLAUDE.md              # Context file for Claude Code sessions
├── README.md
├── requirements.txt
├── .env.example           # Template for API credentials
├── .gitignore
├── data/                  # SQLite database (not committed)
├── docs/
│   └── ARCHITECTURE.md    # Shared architecture doc (keep updated!)
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   └── aeroapi.py     # FlightAware AeroAPI v4 client
│   ├── db/
│   │   ├── __init__.py
│   │   ├── schema.sql     # Database schema
│   │   └── database.py    # Database operations
│   └── analysis/
│       ├── __init__.py
│       └── classify.py    # Aircraft type classification
├── scripts/
│   ├── setup.sh           # One-time project setup
│   ├── daily_pull.py      # Daily batch data pull
│   └── query_stats.py     # Quick stats from the database
└── tests/
    └── test_api.py        # API integration tests
```

## Collaboration (Marc & Sam)

We use this GitHub repo as the single source of truth. Both collaborators
maintain their own Claude Project with the same knowledge files. When making
significant architecture decisions or completing major features, update
`docs/ARCHITECTURE.md` so the other person's Claude sessions stay in sync.

**Backend track:** API integration, data pipeline, database, batch scripts
**Frontend track:** Dashboard UI, charts, visualizations

## Using with Claude Code

```bash
# From the project directory, just run:
claude

# Claude Code will automatically read CLAUDE.md for project context.
# Example prompts:
#   "Pull yesterday's flights from KJPX and store them in the database"
#   "Show me curfew violations for last week"
#   "Add a function to classify helicopters by ICAO type code"
```

## Data Source

[FlightAware AeroAPI v4](https://www.flightaware.com/commercial/aeroapi/)
(Standard tier). Historical data from January 2011 onward.

## License

Private — WCAC internal use.
