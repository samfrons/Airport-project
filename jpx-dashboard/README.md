# JPX Airport Dashboard

A public operations dashboard for **East Hampton Town Airport** (ICAO: KJPX, formerly KHTO), built for the Wainscott Citizens Advisory Committee (WCAC). The dashboard provides transparent, data-driven insights into airport operations — tracking flight volumes, aircraft types, route patterns, and voluntary curfew compliance.

## What It Does

- **Interactive flight map** — Mapbox GL map with curved bezier route arcs, color-coded by aircraft type, hover popups, click-to-filter, and three view modes (routes, stats, heatmap)
- **Operations metrics** — Total operations, arrivals/departures split, aircraft type breakdown with visual indicators
- **Curfew compliance** — Tracks flights during the voluntary 8 PM - 8 AM ET quiet hours with hourly distribution charts
- **Flight log** — Sortable, filterable table of all operations with direction, aircraft type, origin/destination, and curfew status
- **Time range filtering** — Quick presets (today, 7d, 30d, 90d) and custom date range picker
- **Data pipeline** — Automated daily pulls from FlightAware AeroAPI v4 with aircraft classification and Eastern Time derivation

## Architecture

```
                                                  ┌──────────────────────┐
┌─────────────────┐     ┌────────────────┐        │  React 19 SPA        │
│  FlightAware    │────▶│  daily_pull.py  │───┐    │  ├ AirportMap (Mapbox)│
│  AeroAPI v4     │     │  (Python cron)  │   │    │  ├ StatsCards         │
│  Standard tier  │     └────────────────┘   │    │  ├ CurfewChart        │
└─────────────────┘                          │    │  ├ FlightTable        │
                                             ▼    │  └ TimeFilter         │
                                ┌──────────────┐  └──────────┬───────────┘
                                │  SQLite DB   │             │
                                │  jpx_flights │◀────────────┘
                                │  .db         │   Express API
                                └──────────────┘   (port 3001)
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4 | Single-page dashboard |
| Map | Mapbox GL JS 3, custom bezier arcs, GeoJSON layers | Interactive geographic visualization |
| Charts | Chart.js + react-chartjs-2 | Hourly curfew distribution |
| State | Zustand | Cross-component state (filters, selections, data) |
| API | Express.js, better-sqlite3 (read-only) | REST endpoints for flight data |
| Database | SQLite with WAL mode | Flight operations, daily summaries, ingestion logs |
| Pipeline | Python 3.11+, FlightAware AeroAPI v4 | Daily batch data ingestion |
| Classification | Rule-based ICAO type matching | Helicopter / jet / fixed-wing / unknown |

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ (for the data pipeline)
- **FlightAware AeroAPI key** ([Standard tier](https://www.flightaware.com/commercial/aeroapi/))
- **Mapbox access token** (set via `VITE_MAPBOX_TOKEN` env var, or uses the project default)

### 1. Clone and set up

```bash
git clone https://github.com/samfrons/Airport-project.git
cd Airport-project/jpx-dashboard
./scripts/setup.sh
```

The setup script creates a Python virtualenv, installs dependencies, initializes the SQLite database, and copies `.env.example` to `.env`.

### 2. Configure API credentials

```bash
# Edit .env and add your FlightAware API key
vi .env
```

```
AEROAPI_KEY=your-flightaware-api-key
```

### 3. Pull flight data

```bash
source venv/bin/activate

# Pull yesterday's flights (default)
python scripts/daily_pull.py

# Pull a specific date
python scripts/daily_pull.py --date 2025-08-15

# Pull a date range
python scripts/daily_pull.py --date 2025-08-01 --end 2025-08-31
```

Or seed the database with test data for development:

```bash
node scripts/seed_test_data.js
```

### 4. Start the servers

```bash
# Terminal 1 — API server
cd api && npm install && npm start
# Runs on http://localhost:3001

# Terminal 2 — Frontend dev server
cd frontend && npm install && npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
jpx-dashboard/
├── api/
│   ├── server.js              # Express REST API (read-only SQLite)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Shell layout, header, section structure
│   │   ├── main.tsx           # React entry point
│   │   ├── index.css          # Design tokens, Mapbox overrides, animations
│   │   ├── components/
│   │   │   ├── AirportMap.tsx  # Mapbox GL map with routes/stats/heatmap
│   │   │   ├── StatsCards.tsx  # Operations metrics grid
│   │   │   ├── FlightTable.tsx # Sortable flight log with filters
│   │   │   ├── CurfewChart.tsx # Hourly distribution bar chart
│   │   │   ├── TimeFilter.tsx  # Date range selector
│   │   │   └── index.ts       # Barrel exports
│   │   ├── store/
│   │   │   └── flightStore.ts  # Zustand store (flights, filters, map state)
│   │   └── types/
│   │       └── flight.ts       # TypeScript interfaces
│   ├── tailwind.config.js     # Design system tokens
│   ├── vite.config.ts
│   └── package.json
├── src/                        # Python data pipeline
│   ├── api/
│   │   └── aeroapi.py          # FlightAware AeroAPI v4 client
│   ├── db/
│   │   ├── database.py         # SQLite operations (insert, summarize, log)
│   │   └── schema.sql          # Database schema (flights, daily_summary, ingestion_log)
│   └── analysis/
│       └── classify.py         # Aircraft type classification + time utilities
├── scripts/
│   ├── setup.sh               # One-time project setup
│   ├── daily_pull.py          # Daily batch data ingestion
│   ├── query_stats.py         # CLI stats queries
│   └── seed_test_data.js      # Generate test data for development
├── data/                       # SQLite database (not committed)
├── docs/
│   └── ARCHITECTURE.md        # Architecture decisions and project status
├── tests/
│   └── test_api.py            # API integration tests
├── CLAUDE.md                  # Context for Claude Code sessions
├── .env.example               # API key template
└── requirements.txt           # Python dependencies
```

## API Endpoints

The Express API server runs on port 3001 (configurable via `PORT` env var).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flights` | GET | Flight operations with filtering |
| `/api/summary` | GET | Pre-aggregated daily summary stats |
| `/api/stats` | GET | Aggregate statistics across all data |
| `/api/health` | GET | Database connection and flight count |

### Query parameters

**`/api/flights`** and **`/api/summary`**:
- `start` — Start date (YYYY-MM-DD)
- `end` — End date (YYYY-MM-DD)

**`/api/flights`** additionally:
- `category` — Filter by aircraft type: `helicopter`, `jet`, `fixed_wing`, or `all`
- `direction` — Filter by direction: `arrival`, `departure`, or `all`

### Example

```bash
curl "http://localhost:3001/api/flights?start=2025-08-01&end=2025-08-31&category=helicopter"
```

Response:
```json
{
  "flights": [...],
  "airports": [
    {
      "code": "KTEB",
      "name": "Teterboro",
      "city": "Teterboro",
      "lat": 40.8501,
      "lng": -74.0608,
      "flight_count": 12
    }
  ],
  "total": 47
}
```

## Database Schema

Three tables in `data/jpx_flights.db`:

**`flights`** — One row per operation (arrival or departure)
- FlightAware identifiers (`fa_flight_id`, `ident`, `registration`)
- Direction, aircraft type/category, operator
- Origin and destination (code, name, city)
- UTC timestamps (scheduled and actual)
- Derived Eastern Time fields (`operation_date`, `operation_hour_et`, `is_curfew_period`, `is_weekend`)

**`daily_summary`** — Pre-aggregated daily stats for fast dashboard queries
- Counts by direction, aircraft type, curfew status, unique aircraft

**`ingestion_log`** — Tracks each batch pull for debugging and auditing

## CLI Tools

### Query stats from the database

```bash
source venv/bin/activate

# Overall database summary
python scripts/query_stats.py

# Single day detail
python scripts/query_stats.py --date 2025-08-15

# Monthly summary
python scripts/query_stats.py --month 2025-08

# Curfew violations (last 50)
python scripts/query_stats.py --curfew

# Top operators by volume
python scripts/query_stats.py --top-operators 10

# Helicopter breakdown by type
python scripts/query_stats.py --helicopters
```

## Design System

The dashboard uses a **Swiss International Typographic Style** with a dark theme optimized for data readability.

- **Font**: Inter with OpenType features (cv02, cv03, cv04, cv11)
- **Palette**: Zinc-based dark theme (#09090b page, #111113 surface, #18181b raised, #27272a borders)
- **Accent**: Blue-600 (#2563eb) — used sparingly for interactive elements
- **Aircraft colors**: Helicopter `#f87171` (red), Jet `#60a5fa` (blue), Fixed Wing `#34d399` (green)
- **Borders**: All sharp edges (0 border-radius), except `rounded-full` for indicator dots
- **Typography**: `.overline` labels (10px/uppercase/wide tracking), `.stat-number` for large metrics (32px/tabular-nums)
- **Icons**: Lucide React at 14-16px with `strokeWidth` 1.5-1.8

## Key Design Decisions

1. **Daily batch, not real-time.** Data is pulled once daily to keep API costs at ~$2-5/mo vs. hundreds for real-time polling.

2. **KJPX for 2022+, KHTO for pre-2022.** The airport ICAO code changed in May 2022. The pipeline handles this automatically.

3. **Rule-based aircraft classification.** Maintained sets of known ICAO type codes for helicopters, jets, and fixed-wing. Unknown types should be periodically reviewed and added.

4. **Curfew = 8 PM to 8 AM Eastern.** All times stored as UTC in the database. Eastern Time derivation happens at ingestion.

5. **SQLite for now.** Trivially upgradeable to PostgreSQL if concurrent access is needed. The schema is compatible.

6. **Raw Mapbox GL, not react-map-gl wrapper.** Direct control over layers, sources, and event handlers for performance with dynamic GeoJSON data.

## Data Source

Flight data from [FlightAware AeroAPI v4](https://www.flightaware.com/commercial/aeroapi/) (Standard tier, $100/mo). Historical data available from January 2011 onward.

### Cost model

- Standard tier: $100/mo flat fee
- Airport history query: ~$0.01 per page (15 records)
- ~100 daily operations at JPX = ~7 pages = ~$0.07/day
- Monthly API usage: ~$2-5/mo (well under the $100 minimum)
- Owner lookup: ~$0.005 per query (used sparingly)

## Development

### Build for production

```bash
cd frontend
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # Preview the production build
```

### Lint

```bash
cd frontend
npm run lint
```

### Using with Claude Code

```bash
# From the jpx-dashboard directory:
claude

# Claude Code reads CLAUDE.md automatically for project context.
# Example prompts:
#   "Pull yesterday's flights and store them in the database"
#   "Show me curfew violations for last week"
#   "Add a function to classify helicopters by ICAO type code"
```

## Collaboration

Marc Frons and Sam Frons work from this shared GitHub repo.

- **Marc (Backend):** API integration, data pipeline, database, batch scripts, classification logic
- **Sam (Frontend):** Dashboard UI, charts/visualizations, map, responsive design, deployment

Both collaborators maintain Claude Projects with the same knowledge files. When making significant architecture decisions, update `docs/ARCHITECTURE.md` so the other person's Claude sessions stay in sync.

## License

Private — WCAC internal use.
