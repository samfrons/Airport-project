# JPX Airport Dashboard

A public flight operations dashboard for **East Hampton Town Airport** (ICAO: KJPX, formerly KHTO), built for the Wainscott Citizens Advisory Committee (WCAC). The dashboard provides transparent, data-driven insights into airport operations—tracking flight volumes, aircraft types, route patterns, voluntary curfew compliance, and environmental impact.

## Overview

| Purpose | Community noise monitoring and flight tracking for East Hampton Town Airport |
|---------|-----------------------------------------------------------------------------|
| Stakeholders | Wainscott Citizens Advisory Committee (WCAC), community members, local officials |
| Collaborators | Marc Frons (WCAC), Sam Frons |

## Key Features

- **Flight operations tracking** — FlightAware AeroAPI v4 integration with daily batch pulls
- **Interactive flight map** — Mapbox GL with curved bezier route arcs, three view modes (routes, stats, heatmap)
- **Three-layer noise visualization** — Community sensors, aircraft-derived noise, and noise complaints
- **Noise confidence system** — EASA-certified, category estimates, and unverified data clearly labeled
- **Biodiversity impact analysis** — Five concentric impact zones with peer-reviewed research citations
- **Curfew compliance monitoring** — Tracks 8 PM – 8 AM ET voluntary quiet hours
- **Weather correlation** — Live METAR data from NOAA with simulated fallback indicators
- **Operator performance scorecards** — Track compliance by operator
- **Threshold manager** — Customizable biodiversity and noise thresholds (localStorage persistence)
- **Export utilities** — CSV and PDF export for reports

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.9, React 19 |
| Styling | Tailwind CSS v4 (dark theme, sharp edges) |
| Maps | Mapbox GL JS 3.18 |
| Charts | Chart.js 4.5 + react-chartjs-2 |
| State | Zustand 5.0 |
| Database | Supabase (PostgreSQL) |
| Data Source | FlightAware AeroAPI v4 |

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ (for the data pipeline)
- **FlightAware AeroAPI key** ([Standard tier](https://www.flightaware.com/commercial/aeroapi/))
- **Mapbox access token** (set via `NEXT_PUBLIC_MAPBOX_TOKEN`)
- **Supabase project** (for database)

### 1. Clone and Install

```bash
git clone https://github.com/samfrons/Airport-project.git
cd Airport-project/jpx-dashboard
npm install
```

### 2. Configure Environment

Create a `.env.local` file with:

```env
# FlightAware API
AEROAPI_KEY=your-flightaware-api-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Set Up Python Environment (for data pipeline)

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Pull Flight Data

```bash
source venv/bin/activate

# Pull yesterday's flights (default)
python scripts/daily_pull.py

# Pull a specific date
python scripts/daily_pull.py --date 2025-08-15

# Pull a date range
python scripts/daily_pull.py --date 2025-08-01 --end 2025-08-31
```

Or seed with test data for development:

```bash
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
# Runs on http://localhost:3000
```

## Project Structure

```
jpx-dashboard/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (metadata, global CSS)
│   ├── page.tsx                # Main dashboard page
│   ├── globals.css             # Design tokens, Mapbox overrides
│   └── api/                    # API Route Handlers
│       ├── flights/            # Flight operations endpoints
│       │   ├── route.ts        # GET /api/flights (with filters)
│       │   ├── live/route.ts   # GET /api/flights/live
│       │   ├── search/route.ts # GET /api/flights/search
│       │   └── [id]/track/     # GET /api/flights/:id/track
│       ├── aircraft/           # Aircraft data
│       │   └── [reg]/owner/    # GET /api/aircraft/:reg/owner
│       ├── weather/            # Weather endpoints
│       │   ├── route.ts        # GET /api/weather
│       │   ├── metar/route.ts  # GET /api/weather/metar
│       │   └── taf/route.ts    # GET /api/weather/taf
│       ├── summary/route.ts    # GET /api/summary
│       ├── stats/route.ts      # GET /api/stats
│       ├── air-quality/        # GET /api/air-quality
│       └── health/route.ts     # GET /api/health
├── components/                 # React components (31 total)
│   ├── AirportMap.tsx          # Mapbox GL map with routes/stats/heatmap
│   ├── StatsCards.tsx          # Operations metrics grid
│   ├── FlightTable.tsx         # Sortable flight log with filters
│   ├── CurfewChart.tsx         # Hourly distribution bar chart
│   ├── TimeFilter.tsx          # Date range selector
│   ├── WeatherCorrelation.tsx  # Weather-noise correlation panel
│   ├── OperatorScorecard.tsx   # Operator compliance metrics
│   ├── ComplaintForm.tsx       # Noise complaint submission
│   ├── AlertNotificationSystem.tsx
│   ├── ComplianceDashboard.tsx
│   ├── FlightPathReplay.tsx    # Animated flight replay
│   ├── biodiversity/           # Biodiversity subsystem (3 components)
│   │   ├── BiodiversityPanel.tsx
│   │   ├── BiodiversityViolationsPanel.tsx
│   │   └── ThresholdManager.tsx
│   ├── noise/                  # Noise subsystem (5 components)
│   │   ├── FlightDetailsSidebar.tsx
│   │   ├── AircraftBreakdownPanel.tsx
│   │   ├── AltitudeLegend.tsx
│   │   └── NoiseConfidenceBadge.tsx
│   └── navigation/             # Navigation subsystem (5 components)
│       ├── SideNav.tsx
│       ├── NavGroup.tsx
│       ├── NavItem.tsx
│       ├── QuickActions.tsx
│       └── ScrollToTop.tsx
├── store/                      # Zustand state management
│   ├── flightStore.ts          # Main store (flights, noise, biodiversity)
│   ├── navStore.ts             # Navigation state
│   └── themeStore.ts           # Dark/light mode
├── types/                      # TypeScript interfaces
│   ├── flight.ts               # Flight, DailySummary, Airport
│   ├── noise.ts                # NoiseSensor, NoiseComplaint
│   ├── biodiversity.ts         # Species, Habitats, Research
│   └── biodiversityThresholds.ts
├── lib/                        # Utilities and database
│   ├── db.ts                   # Database helper + airport coordinates
│   ├── exportUtils.ts          # CSV/PDF export
│   ├── biodiversityViolationEngine.ts
│   ├── noise/                  # Noise calculation engine
│   │   └── trackNoiseCalculator.ts
│   └── supabase/               # Supabase client configuration
├── data/                       # Data files
│   ├── biodiversity/           # Species and habitat data
│   │   └── thresholds.ts       # Default biodiversity thresholds
│   └── noise/                  # Noise profiles and mock data
│       └── easa/               # EASA certification data
│           └── icaoToEasaMap.ts
├── scripts/                    # Python data pipeline
│   ├── daily_pull.py           # FlightAware daily batch
│   ├── query_stats.py          # CLI stats queries
│   └── api_server.py           # Python API server
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System architecture
│   ├── FEATURES.md             # Feature documentation
│   └── DATA-SOURCES.md         # Data sources and confidence
└── CLAUDE.md                   # Claude Code context
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flights` | GET | Flight operations with date/category/direction filters |
| `/api/flights/live` | GET | Current live flights |
| `/api/flights/search` | GET | Search flights by query |
| `/api/flights/:id/track` | GET | Flight track positions |
| `/api/aircraft/:reg/owner` | GET | Aircraft owner lookup |
| `/api/summary` | GET | Daily aggregated statistics |
| `/api/stats` | GET | Overall metrics |
| `/api/weather` | GET | Current weather conditions |
| `/api/weather/metar` | GET | METAR observations |
| `/api/weather/taf` | GET | TAF forecasts |
| `/api/air-quality` | GET | Air quality index |
| `/api/health` | GET | Database status |

### Query Parameters

**`/api/flights`**:
- `start` — Start date (YYYY-MM-DD)
- `end` — End date (YYYY-MM-DD)
- `category` — Filter: `helicopter`, `jet`, `fixed_wing`, or `all`
- `direction` — Filter: `arrival`, `departure`, or `all`

### Example

```bash
curl "http://localhost:3000/api/flights?start=2025-08-01&end=2025-08-31&category=helicopter"
```

## Data Pipeline

Flight data is pulled daily from FlightAware AeroAPI v4:

```bash
# Daily cron job (recommended: 6 AM ET)
python scripts/daily_pull.py
```

**Cost model:**
- Standard tier: $100/mo flat fee
- Airport history query: ~$0.01 per page (15 records)
- ~100 ops/day at JPX = ~7 pages = ~$0.07/day
- Monthly actual usage: **~$2-5/mo**

## Deployment

### Vercel (Recommended)

1. Import the `Airport-project` repository from GitHub
2. Set **Root Directory** to `jpx-dashboard`
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### CLI Deployment

```bash
cd jpx-dashboard
npx vercel          # Preview deploy
npx vercel --prod   # Production deploy
```

## Development Commands

```bash
npm run dev         # Start dev server (http://localhost:3000)
npm run build       # Production build
npm run start       # Start production server
npm run lint        # ESLint
npm run seed        # Generate test data
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode
```

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture and design decisions
- [FEATURES.md](docs/FEATURES.md) — Feature documentation for users
- [DATA-SOURCES.md](docs/DATA-SOURCES.md) — Data sources and confidence levels
- [NOISE-METHODOLOGY.md](docs/NOISE-METHODOLOGY.md) — Aircraft noise estimation methodology and EASA data

## Contributing

This project is maintained by:
- **Marc Frons** (WCAC) — API integration, data pipeline, classification logic
- **Sam Frons** — Dashboard UI, charts/visualizations, map, deployment

Both collaborators maintain Claude Projects with shared knowledge files. Update `CLAUDE.md` and `docs/ARCHITECTURE.md` when making significant decisions.

## License

Private — WCAC internal use.
