# JPX Dashboard — System Architecture

**Last updated:** 2026-02-12
**Status:** Next.js 15 + Supabase operational, all API routes and frontend functional

> This document is the single source of truth for project state. Update it whenever you make a significant decision or complete a milestone. Both Marc and Sam should keep a copy in their respective Claude Projects.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          JPX Dashboard                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   React 19 UI   │  │  API Routes     │  │   Middleware    │         │
│  │   Components    │  │  /api/*         │  │   Auth/Cache    │         │
│  │   (31 total)    │  │  (13 endpoints) │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
├─────────────────────────────────────────────────────────────────────────┤
│  Zustand State     │  Mapbox GL JS    │  Chart.js                      │
│  (3 stores)        │  (3.18)          │  (4.5)                         │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  FlightAware    │  │  Supabase       │  │  NOAA/EPA       │
│  AeroAPI v4     │  │  PostgreSQL     │  │  Weather/AQI    │
│  Standard $100  │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Data source | FlightAware AeroAPI v4 | History to 2011, proper licensing, good GA coverage |
| Pipeline | Python 3.11+, Click CLI | Team familiarity, rich data libraries |
| Database | Supabase (PostgreSQL) | Managed hosting, real-time, RLS |
| Framework | Next.js 15 (App Router) | Unified frontend + API, zero-config Vercel deployment |
| API | Next.js Route Handlers | Read-only REST, co-located with frontend |
| Frontend | React 19 + TypeScript 5.9 | Type safety, component architecture |
| Styling | Tailwind CSS v4 | Utility-first, design token support |
| Map | Mapbox GL JS 3.18 (raw) | Direct layer/source control, bezier arcs |
| Charts | Chart.js + react-chartjs-2 | Lightweight, customizable bar charts |
| State | Zustand 5.0 | Minimal boilerplate, cross-component sharing |
| Icons | Lucide React | Consistent stroke-width, tree-shakeable |
| Deployment | Vercel | Zero-config for Next.js, serverless API routes |

## Component Hierarchy

```
app/page.tsx ('use client')
├── SideNav                Side navigation with sections and quick actions
├── TimeFilter             Segmented control: Today / 7d / 30d / 90d + custom dates
├── StatsCards             3-column grid: operations, aircraft types, curfew count
├── AirportMap             Mapbox GL with 3 view modes:
│   ├── Routes view        Curved bezier arcs, color-coded by aircraft category
│   ├── Stats view         KJPX-centered with pulse marker
│   └── Heatmap view       Geographic spread of traffic
├── NoiseLayerControls     Toggle sensors, aircraft noise, complaints layers
├── NoiseLegend            Color legend for noise levels
├── CurfewChart            Chart.js bar chart: hourly distribution
├── FlightTable            Sortable table with direction/type/curfew indicators
├── OperatorScorecard      Operator compliance metrics
├── WeatherCorrelation     Weather-noise correlation panel
├── BiodiversityPanel      Species impact and research tabs
│   ├── Overview tab       Key metrics and ecological indicators
│   ├── Species tab        20+ species with sensitivity thresholds
│   ├── Habitats tab       Local habitat impact assessment
│   └── Research tab       Peer-reviewed study citations
├── ThresholdManager       Customizable alert thresholds
├── ComplaintForm          Noise complaint submission
└── AlertNotificationSystem Real-time threshold alerts
```

## State Management (Zustand)

### flightStore.ts — Main Store

| State | Type | Purpose |
|-------|------|---------|
| `flights` | `Flight[]` | Current filtered flight data |
| `summary` | `DailySummary[]` | Pre-aggregated daily stats |
| `airports` | `Airport[]` | Airports with coordinates for mapping |
| `dateRange` | `DateRange` | Currently selected date window |
| `selectedCategory` | `string \| null` | Aircraft type filter |
| `selectedAirport` | `string \| null` | Map click → table cross-filter |
| `selectedFlight` | `Flight \| null` | Selected flight for detail view |
| `mapViewMode` | `MapViewMode` | `'routes' \| 'stats' \| 'heatmap'` |
| `noiseSettings` | `NoiseLayerSettings` | Visibility/opacity for noise layers |
| `noiseSensors` | `NoiseSensor[]` | Sensor locations and readings |
| `noiseComplaints` | `NoiseComplaint[]` | Community complaint data |
| `biodiversitySettings` | `BiodiversityLayerSettings` | Species/habitat layer config |
| `thresholds` | `BiodiversityThreshold[]` | Alert thresholds (persisted to localStorage) |
| `flightTracks` | `Map<string, FlightTrack>` | Cached track data |
| `aircraftOwners` | `Map<string, AircraftOwner>` | Cached owner lookups |
| `liveFlights` | `LiveFlights \| null` | Real-time flight data |

### navStore.ts — Navigation State

Controls sidebar expansion/collapse and active section.

### themeStore.ts — Theme State

Dark/light mode toggle with system preference detection.

## Database Schema

### flights table

Primary operations table—one row per arrival or departure.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `fa_flight_id` | text | FlightAware unique ID |
| `ident` | text | Flight identifier (callsign) |
| `registration` | text | Aircraft registration (N-number) |
| `direction` | text | `'arrival'` or `'departure'` |
| `aircraft_type` | text | ICAO type code (e.g., S76, GLF5) |
| `aircraft_category` | text | `helicopter`, `jet`, `fixed_wing`, `unknown` |
| `operator` | text | Operator name |
| `origin_code` | text | Origin airport ICAO |
| `destination_code` | text | Destination airport ICAO |
| `operation_date` | date | Local date (ET) |
| `operation_hour_et` | int | Hour in Eastern Time (0-23) |
| `is_curfew_period` | boolean | True if 8 PM – 8 AM ET |
| `is_weekend` | boolean | True if Saturday/Sunday |
| `actual_off` | timestamp | Actual departure time (UTC) |
| `actual_on` | timestamp | Actual arrival time (UTC) |
| `fetched_at` | timestamp | Ingestion timestamp |

### daily_summary table

Pre-aggregated daily statistics for fast dashboard queries.

| Column | Type | Description |
|--------|------|-------------|
| `operation_date` | date | Primary key |
| `total_operations` | int | Total arrivals + departures |
| `arrivals` | int | Arrival count |
| `departures` | int | Departure count |
| `helicopters` | int | Helicopter operations |
| `fixed_wing` | int | Fixed-wing operations |
| `jets` | int | Jet operations |
| `curfew_operations` | int | Operations during curfew |
| `unique_aircraft` | int | Distinct registrations |

### ingestion_log table

Audit trail for data pipeline runs.

## Map Layer System

### Layer Management

```typescript
const MANAGED_LAYERS = [
  'airport-circles',
  'airport-labels',
  'flight-routes',
  'route-labels',
  'noise-heatmap',
  'sensor-markers',
  'complaint-markers',
  'biodiversity-zones',
];

const MANAGED_SOURCES = [
  'airports',
  'flight-routes',
  'noise-heatmap',
  'sensors',
  'complaints',
  'biodiversity',
];
```

### Route Generation

```typescript
// Quadratic bezier curves with 15% perpendicular offset
function generateArc(
  origin: [number, number],
  destination: [number, number],
  numPoints: number = 50
): [number, number][]
```

### Biodiversity Zones

Five concentric impact zones rendered as GeoJSON polygons:

| Zone | Radius | dB Range | Color |
|------|--------|----------|-------|
| Critical | 1 km | 85-105 | Red |
| High | 2.5 km | 70-85 | Orange |
| Moderate | 5 km | 55-70 | Yellow |
| Low | 8 km | 45-55 | Lime |
| Minimal | 12 km | 35-45 | Green |

## Noise Calculation Methodology

### Physics-Based Model

Location: `lib/noise/trackNoiseCalculator.ts`

The noise calculator uses a physics-based approach combining:

1. **EASA Certification Data** — Source noise levels from official certification database
2. **Geometric Spreading** — Inverse square law: `20 * log10(distance / 1000)`
3. **Atmospheric Absorption** — ~0.5 dB per 1000 ft (ISO 9613-1)
4. **Lateral Attenuation** — SAE-AIR-5662 model based on angle from flight path

### Formula

```
Ground dB = Source dB - Geometric Attenuation - Atmospheric Absorption - Lateral Attenuation
```

Where:
- **Source dB** = EASA certified noise at 1000 ft reference distance
- **Geometric Attenuation** = 20 × log₁₀(slant_distance / 1000)
- **Atmospheric Absorption** = 0.5 × (slant_distance / 1000)
- **Lateral Attenuation** = SAE table interpolation (0-10 dB based on angle)

### Data Sources

| Source | Confidence | Badge |
|--------|------------|-------|
| EASA Certified | High | Green checkmark |
| Category Estimate | Medium | Yellow info |
| Unverified | Low | Red alert |

40+ aircraft types mapped to EASA certification profiles.

## API Endpoints

### Flight Data

| Endpoint | Query Params | Returns |
|----------|--------------|---------|
| `GET /api/flights` | `start`, `end`, `category`, `direction` | `{ flights, airports, total }` |
| `GET /api/flights/live` | — | Current live flights |
| `GET /api/flights/search` | `q` | Search results |
| `GET /api/flights/:id/track` | — | Track positions |

### Weather

| Endpoint | Query Params | Returns |
|----------|--------------|---------|
| `GET /api/weather` | `airport` | Current conditions |
| `GET /api/weather/metar` | `airport` | METAR observation |
| `GET /api/weather/taf` | `airport` | TAF forecast |

### Other

| Endpoint | Returns |
|----------|---------|
| `GET /api/summary` | Daily aggregated stats |
| `GET /api/stats` | Overall metrics |
| `GET /api/air-quality` | AQI data |
| `GET /api/aircraft/:reg/owner` | Owner lookup |
| `GET /api/health` | Database status |

## Key Design Decisions

### 1. Next.js over Vite + Express
Unified frontend and API in one project. API Route Handlers replace the separate Express server, and Vercel deployment is zero-config. No CORS, no proxy, no separate ports.

### 2. Daily batch, not real-time
We pull yesterday's data each morning. This keeps API costs at ~$2-5/mo vs. hundreds for real-time polling.

### 3. KJPX for 2022+, KHTO for pre-2022
The airport ICAO code changed in May 2022. The daily_pull script handles this automatically.

### 4. Rule-based aircraft classification
Maintained sets of known ICAO type codes for helicopters, jets, and fixed-wing. Unknown types get classified as "unknown" and should be periodically reviewed.

### 5. Curfew = 8 PM to 8 AM Eastern
All times stored as UTC in the database. Eastern Time derivation happens at ingestion time.

### 6. Raw Mapbox GL, not react-map-gl
Direct mapboxgl.Map gives full control over GeoJSON sources, dynamic layers, and event handlers. Event handlers survive layer remove/re-add because they target layers by name string.

### 7. Zustand over Context
Minimal boilerplate, no provider wrapping, supports cross-component state sharing (map ↔ table filtering).

### 8. Three-tier noise confidence
All noise data is explicitly labeled: EASA_CERTIFIED (verified), CATEGORY_ESTIMATE (calculated), or UNVERIFIED (fallback). Users always know the data quality.

### 9. Research-backed biodiversity metrics
All impact percentages cite peer-reviewed studies (Ware et al. 2015, Francis et al. 2009, etc.). No invented numbers.

### 10. Sharp edges, no border-radius
Swiss International Typographic Style with all 0 border-radius (sharp edges), except `rounded-full` for indicator dots only.

## Design System (Swiss Modern)

- **Font**: Inter (400-700) with OpenType features (cv02, cv03, cv04, cv11)
- **Palette**: Zinc-based dark theme (#09090b → #fafafa) with CSS custom properties
- **Accent**: Blue-600 (#2563eb) for interactive elements only
- **Aircraft colors**: Helicopter `#f87171` (red), Jet `#60a5fa` (blue), Fixed Wing `#34d399` (green)
- **Border radius**: All 0 (sharp edges), `rounded-full` for indicator dots only
- **Typography**: `.overline` (10px/uppercase), `.stat-number` (32px/tabular-nums)

## API Cost Model

- Standard tier: $100/mo minimum (flat fee)
- Per-query fees are negligible for our volume (~$2-5/mo actual usage)
- Airport history query: ~$0.01 per page (15 records)
- ~100 ops/day at JPX = ~7 pages = ~$0.07/day
- Owner lookup: ~$0.005 each (use sparingly)

## Work Division

**Marc (Backend):** API integration, data pipeline, database, batch scripts, classification logic, cron job setup.

**Sam (Frontend):** Dashboard UI, charts/visualizations, map, responsive design, deployment, user-facing documentation.

**Shared:** Architecture decisions, schema changes, classification lists.

## Milestones

- [x] Research & proposal (Dec 2025)
- [x] API evaluation: FlightAware vs AirNav (Jan 2026)
- [x] FlightAware Standard tier signup
- [x] Project scaffold & Claude Code setup
- [x] Dashboard frontend: React SPA with interactive Mapbox map
- [x] Swiss modern design system applied across all components
- [x] API serving flight data from SQLite
- [x] Test data seed script for development
- [x] Next.js 15 migration (unified frontend + API)
- [x] Vercel-ready deployment configuration
- [x] Three-layer noise visualization system
- [x] EASA noise certification integration
- [x] Biodiversity impact analysis with research citations
- [x] Supabase PostgreSQL migration
- [ ] First successful live data pull (validation with real API key)
- [ ] Backfill summer 2025 data
- [ ] Classification accuracy review
- [ ] Curfew compliance report generation
- [ ] Year-over-year comparison (2024 vs 2025)
- [ ] Public deployment

## Open Questions

- Should we track flight tracks (positions) or just operations? (cost implications)
- Integration with Town's AirNav Radar data — still pending Town response
- Mobile responsiveness — dashboard works on desktop, tablet breakpoints TBD
- Real-time sensor integration — identify hardware/API options
