# JPX Dashboard — Architecture & Status

**Last updated:** 2026-02-07
**Status:** Frontend dashboard built, interactive map operational, API serving data

> This document is the single source of truth for project state. Update it
> whenever you make a significant decision or complete a milestone. Both Marc
> and Sam should keep a copy in their respective Claude Projects.

## Architecture Overview

```
┌─────────────────┐     ┌────────────────┐     ┌──────────────────┐
│  FlightAware    │────▶│  daily_pull.py  │────▶│  SQLite DB       │
│  AeroAPI v4     │     │  (Python cron)  │     │  jpx_flights.db  │
│  Standard $100  │     └────────────────┘     └────────┬─────────┘
└─────────────────┘                                     │
                                                ┌───────▼─────────┐
                                                │  Express API     │
                                                │  (port 3001)     │
                                                │  better-sqlite3  │
                                                └───────┬─────────┘
                                                        │
                                                ┌───────▼─────────┐
                                                │  React 19 SPA    │
                                                │  Vite 7 dev/prod │
                                                │  (port 5173)     │
                                                └──────────────────┘
```

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Data source | FlightAware AeroAPI v4 | History to 2011, proper licensing, good GA coverage |
| Pipeline | Python 3.11+, Click CLI | Team familiarity, rich data libraries |
| Database | SQLite (WAL mode) | Zero config, portable, sufficient for ~100 ops/day |
| API server | Express.js + better-sqlite3 | Read-only REST API, fast SQLite bindings |
| Frontend | React 19 + TypeScript 5.9 | Type safety, component architecture |
| Build | Vite 7 | Fast HMR, optimized production builds |
| Styling | Tailwind CSS v4 | Utility-first, design token support |
| Map | Mapbox GL JS 3 (raw, not react-map-gl) | Direct layer/source control, bezier arcs |
| Charts | Chart.js + react-chartjs-2 | Lightweight, customizable bar charts |
| State | Zustand | Minimal boilerplate, cross-component sharing |
| Icons | Lucide React | Consistent stroke-width, tree-shakeable |

## Frontend Component Architecture

```
App.tsx
├── TimeFilter         Segmented control: Today / 7d / 30d / 90d + custom dates
├── StatsCards          3-column grid: operations, aircraft types, curfew count
├── AirportMap          Mapbox GL with 3 view modes:
│   ├── Routes view     Curved bezier arcs, color-coded by aircraft category
│   ├── Stats view      KJPX-centered with pulse marker
│   └── Heatmap view    Geographic spread of traffic
├── CurfewChart         Chart.js bar chart: hourly distribution (daytime vs curfew)
└── FlightTable         Sortable table with direction/type/curfew indicators
```

### State Management (Zustand)

The store at `store/flightStore.ts` holds:

| State | Type | Purpose |
|-------|------|---------|
| `flights` | `Flight[]` | Current filtered flight data |
| `summary` | `DailySummary[]` | Pre-aggregated daily stats |
| `airports` | `Airport[]` | Airports with coordinates for mapping |
| `dateRange` | `DateRange` | Currently selected date window |
| `selectedCategory` | `string \| null` | Aircraft type filter |
| `selectedAirport` | `string \| null` | Map click → table cross-filter |
| `mapViewMode` | `MapViewMode` | `'routes' \| 'stats' \| 'heatmap'` |

### Map Implementation Details

- **Raw mapboxgl.Map** (not react-map-gl wrapper) for direct control
- Event handlers registered once on `map.on('load')` — target layers by name string
- `selectedAirportRef` (useRef) avoids stale closures in Mapbox click handlers
- `generateArc()` creates quadratic bezier curves (15% perpendicular offset)
- `MANAGED_LAYERS` / `MANAGED_SOURCES` arrays for cleanup on data changes
- Custom HTML pulse marker for KJPX home airport
- GeoJSON FeatureCollections built from API response airports array

### Design System (Swiss Modern)

- **Font**: Inter (400-700) with OpenType features
- **Palette**: Zinc-based (#09090b → #fafafa) with CSS custom properties
- **Accent**: Blue-600 (#2563eb) for interactive elements only
- **Aircraft colors**: Helicopter #f87171, Jet #60a5fa, Fixed Wing #34d399
- **Border radius**: All 0 (sharp edges), `rounded-full` for indicator dots only
- **Typography classes**: `.overline` (10px labels), `.stat-number` (32px metrics)

## Database Schema

Main table: `flights` — one row per operation (arrival or departure).
Key fields: `fa_flight_id`, `ident`, `registration`, `direction`, `aircraft_type`,
`aircraft_category`, `operation_date`, `operation_hour_et`, `is_curfew_period`.

Summary table: `daily_summary` — pre-aggregated daily stats for fast queries.

Ingestion log: `ingestion_log` — tracks each batch pull for debugging.

Full schema: `src/db/schema.sql`

## API Endpoints

| Endpoint | Query Params | Returns |
|----------|-------------|---------|
| `GET /api/flights` | `start`, `end`, `category`, `direction` | `{ flights, airports, total }` |
| `GET /api/summary` | `start`, `end` | `DailySummary[]` |
| `GET /api/stats` | — | Aggregate counts across all data |
| `GET /api/health` | — | `{ status, database, flight_count }` |

The `/api/flights` endpoint also returns an `airports` array with coordinates,
built from hardcoded `AIRPORT_COORDS` in `server.js` covering 20+ airports
commonly seen in JPX traffic.

## Key Design Decisions

1. **Daily batch, not real-time.** We pull yesterday's data each morning.
   This keeps API costs at ~$2-5/mo vs. hundreds for real-time polling.

2. **KJPX for 2022+, KHTO for pre-2022.** The airport ICAO code changed
   in May 2022. The daily_pull script handles this automatically.

3. **Aircraft classification is rule-based.** We maintain sets of known
   ICAO type codes for helicopters, jets, and fixed-wing. Unknown types
   get classified as "unknown" and should be periodically reviewed and
   added to the appropriate set.

4. **Curfew = 8 PM to 8 AM Eastern.** All times stored as UTC in the
   database. Eastern Time derivation happens at ingestion time.

5. **SQLite for now.** Trivially upgradeable to PostgreSQL if we need
   concurrent access for a web frontend. The schema is compatible.

6. **Raw Mapbox GL, not react-map-gl.** Direct mapboxgl.Map gives full
   control over GeoJSON sources, dynamic layers, and event handlers.
   Event handlers survive layer remove/re-add because they target layers
   by name string on the map instance.

7. **Zustand over Context.** Minimal boilerplate, no provider wrapping,
   supports cross-component state sharing (map ↔ table filtering).

## API Cost Model

- Standard tier: $100/mo minimum (flat fee)
- Per-query fees are negligible for our volume (~$2-5/mo actual usage)
- Airport history query: ~$0.01 per page (15 records)
- ~100 ops/day at JPX = ~7 pages = ~$0.07/day
- Owner lookup: ~$0.005 each (use sparingly)

## Work Division

**Marc (Backend):** API integration, data pipeline, database, batch scripts,
classification logic, cron job setup.

**Sam (Frontend):** Dashboard UI, charts/visualizations, map, responsive design,
deployment, user-facing documentation.

**Shared:** Architecture decisions, schema changes, classification lists.

## Milestones

- [x] Research & proposal (Dec 2025)
- [x] API evaluation: FlightAware vs AirNav (Jan 2026)
- [x] FlightAware Standard tier signup
- [x] Project scaffold & Claude Code setup
- [x] Dashboard frontend: React SPA with interactive Mapbox map
- [x] Swiss modern design system applied across all components
- [x] Express API server serving flight data from SQLite
- [x] Test data seed script for development
- [ ] First successful live data pull (validation with real API key)
- [ ] Backfill summer 2025 data
- [ ] Classification accuracy review
- [ ] Curfew compliance report generation
- [ ] Year-over-year comparison (2024 vs 2025)
- [ ] Public deployment

## Open Questions

- Hosting: GitHub Pages (free, static) vs. small VPS (dynamic)?
- Should we track flight tracks (positions) or just operations? (cost implications)
- Integration with Town's AirNav Radar data — still pending Town response
- Mobile responsiveness — dashboard works on desktop, tablet breakpoints TBD
