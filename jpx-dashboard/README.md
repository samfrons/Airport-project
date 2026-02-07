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
┌─────────────────┐     ┌────────────────┐     ┌──────────────────┐
│  FlightAware    │────▶│  daily_pull.py  │────▶│  SQLite DB       │
│  AeroAPI v4     │     │  (Python cron)  │     │  jpx_flights.db  │
│  Standard tier  │     └────────────────┘     └────────┬─────────┘
└─────────────────┘                                     │
                                                ┌───────▼─────────┐
                                                │  Next.js 15      │
                                                │  API Routes +    │
                                                │  React 19 SPA    │
                                                └──────────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | Unified frontend + API, Vercel-native deployment |
| Frontend | React 19, TypeScript 5.9, Tailwind CSS v4 | Dashboard UI components |
| Map | Mapbox GL JS 3, custom bezier arcs, GeoJSON layers | Interactive geographic visualization |
| Charts | Chart.js + react-chartjs-2 | Hourly curfew distribution |
| State | Zustand | Cross-component state (filters, selections, data) |
| API | Next.js Route Handlers, better-sqlite3 (read-only) | REST endpoints for flight data |
| Database | SQLite with WAL mode | Flight operations, daily summaries, ingestion logs |
| Pipeline | Python 3.11+, FlightAware AeroAPI v4 | Daily batch data ingestion |
| Classification | Rule-based ICAO type matching | Helicopter / jet / fixed-wing / unknown |
| Deployment | Vercel | Zero-config deploy from GitHub |

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ (for the data pipeline)
- **FlightAware AeroAPI key** ([Standard tier](https://www.flightaware.com/commercial/aeroapi/))
- **Mapbox access token** (optional — set via `NEXT_PUBLIC_MAPBOX_TOKEN`, or uses the project default)

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
npm run seed
```

### 4. Start the dev server

```bash
npm install
npm run dev
# Runs on http://localhost:3000
```

Open **http://localhost:3000** in your browser. The API routes and frontend are served from the same Next.js server — no separate backend needed.

## Project Structure

```
jpx-dashboard/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (metadata, global CSS)
│   ├── page.tsx                # Main dashboard page
│   ├── globals.css             # Design tokens, Mapbox overrides, animations
│   └── api/                    # API Route Handlers
│       ├── flights/route.ts    # GET /api/flights
│       ├── summary/route.ts    # GET /api/summary
│       ├── stats/route.ts      # GET /api/stats
│       └── health/route.ts     # GET /api/health
├── components/                 # React components
│   ├── AirportMap.tsx          # Mapbox GL map with routes/stats/heatmap
│   ├── StatsCards.tsx          # Operations metrics grid
│   ├── FlightTable.tsx         # Sortable flight log with filters
│   ├── CurfewChart.tsx         # Hourly distribution bar chart
│   └── TimeFilter.tsx          # Date range selector
├── store/
│   └── flightStore.ts          # Zustand store (flights, filters, map state)
├── types/
│   └── flight.ts               # TypeScript interfaces
├── lib/
│   └── db.ts                   # Database helper + airport coordinates
├── src/                        # Python data pipeline
│   ├── api/
│   │   └── aeroapi.py          # FlightAware AeroAPI v4 client
│   ├── db/
│   │   ├── database.py         # SQLite operations (insert, summarize, log)
│   │   └── schema.sql          # Database schema (flights, daily_summary, ingestion_log)
│   └── analysis/
│       └── classify.py         # Aircraft type classification + time utilities
├── scripts/
│   ├── setup.sh                # One-time project setup
│   ├── daily_pull.py           # Daily batch data ingestion
│   ├── query_stats.py          # CLI stats queries
│   └── seed_test_data.js       # Generate test data for development
├── data/                       # SQLite database (not committed)
├── docs/
│   └── ARCHITECTURE.md         # Architecture decisions and project status
├── tests/
│   └── test_api.py             # API integration tests
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Design system tokens
├── tsconfig.json               # TypeScript configuration
├── CLAUDE.md                   # Context for Claude Code sessions
├── .env.example                # API key template
└── requirements.txt            # Python dependencies
```

## API Endpoints

All API routes are Next.js Route Handlers served from the same origin as the frontend.

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
curl "http://localhost:3000/api/flights?start=2025-08-01&end=2025-08-31&category=helicopter"
```

## Deployment (Vercel)

The project is designed for zero-config Vercel deployment.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard:
1. Import the repository
2. Set the **Root Directory** to `jpx-dashboard`
3. Vercel auto-detects Next.js — no additional configuration needed
4. Add `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel environment variables (optional)

**Note:** The SQLite database (`data/jpx_flights.db`) must be included in the deployment for the API routes to work. For production, either commit the database file or generate it during the build step.

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

1. **Next.js over Vite + Express.** Unified frontend and API in one project. API Route Handlers replace the separate Express server, and Vercel deployment is zero-config.

2. **Daily batch, not real-time.** Data is pulled once daily to keep API costs at ~$2-5/mo vs. hundreds for real-time polling.

3. **KJPX for 2022+, KHTO for pre-2022.** The airport ICAO code changed in May 2022. The pipeline handles this automatically.

4. **Rule-based aircraft classification.** Maintained sets of known ICAO type codes for helicopters, jets, and fixed-wing. Unknown types should be periodically reviewed and added.

5. **Curfew = 8 PM to 8 AM Eastern.** All times stored as UTC in the database. Eastern Time derivation happens at ingestion.

6. **SQLite for now.** Trivially upgradeable to PostgreSQL/Turso if concurrent access or edge deployment is needed.

7. **Raw Mapbox GL, not react-map-gl wrapper.** Direct control over layers, sources, and event handlers for performance with dynamic GeoJSON data.

## Data Source

Flight data from [FlightAware AeroAPI v4](https://www.flightaware.com/commercial/aeroapi/) (Standard tier, $100/mo). Historical data available from January 2011 onward.

### Cost model

- Standard tier: $100/mo flat fee
- Airport history query: ~$0.01 per page (15 records)
- ~100 daily operations at JPX = ~7 pages = ~$0.07/day
- Monthly API usage: ~$2-5/mo (well under the $100 minimum)
- Owner lookup: ~$0.005 per query (used sparingly)

## Development

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npm run seed     # Generate test data
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
