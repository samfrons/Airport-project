# JPX Dashboard — Architecture & Status

**Last updated:** 2026-02-07
**Status:** Project scaffold complete, ready for first data pull

> This document is the single source of truth for project state. Update it
> whenever you make a significant decision or complete a milestone. Both Marc
> and Sam should keep a copy in their respective Claude Projects.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  FlightAware    │────▶│  daily_pull   │────▶│  SQLite DB       │
│  AeroAPI v4     │     │  (Python)     │     │  jpx_flights.db  │
│  (Standard $100)│     │  cron/manual  │     │                  │
└─────────────────┘     └──────────────┘     └───────┬──────────┘
                                                      │
                                              ┌───────▼──────────┐
                                              │  Dashboard UI    │
                                              │  (TBD: React or  │
                                              │   Streamlit)     │
                                              └──────────────────┘
```

## Tech Stack

| Layer         | Choice                | Rationale                              |
|---------------|----------------------|----------------------------------------|
| Data source   | FlightAware AeroAPI v4 | History to 2011, proper licensing, good GA coverage |
| Language      | Python 3.11+         | Team familiarity, rich data libraries  |
| Database      | SQLite               | Zero config, portable, sufficient for ~100 ops/day |
| API client    | requests + custom wrapper | Simple, no heavy dependencies       |
| Frontend      | TBD                  | React (artifacts) or Streamlit (rapid) |
| Hosting       | TBD                  | GitHub Pages (static) or small VPS     |

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

## Data Model

Main table: `flights` — one row per operation (arrival or departure).
Key fields: fa_flight_id, ident, registration, direction, aircraft_type,
aircraft_category, operation_date, operation_hour_et, is_curfew_period.

Summary table: `daily_summary` — pre-aggregated daily stats for fast queries.

Ingestion log: `ingestion_log` — tracks each batch pull for debugging.

## API Cost Model

- Standard tier: $100/mo minimum (flat fee)
- Per-query fees are negligible for our volume (~$2-5/mo actual usage)
- Airport history query: ~$0.01 per page (15 records)
- ~100 ops/day at JPX = ~7 pages = ~$0.07/day
- Owner lookup: ~$0.005 each (use sparingly)

## Work Division

**Marc (Backend):** API integration, data pipeline, database, batch scripts,
classification logic, cron job setup.

**Sam (Frontend):** Dashboard UI, charts/visualizations, responsive design,
deployment, user-facing documentation.

**Shared:** Architecture decisions, schema changes, classification lists.

## Milestones

- [x] Research & proposal (Dec 2025)
- [x] API evaluation: FlightAware vs AirNav (Jan 2026)
- [x] FlightAware Standard tier signup
- [x] Project scaffold & Claude Code setup
- [ ] First successful data pull (validation)
- [ ] Backfill summer 2025 data
- [ ] Classification accuracy review
- [ ] Dashboard prototype (Streamlit or React)
- [ ] Curfew compliance report generation
- [ ] Year-over-year comparison (2024 vs 2025)
- [ ] Public deployment

## Open Questions

- What frontend framework? (Streamlit for speed, React for polish)
- Hosting: GitHub Pages (free, static) vs. small VPS (dynamic)?
- Should we track flight tracks (positions) or just operations? (cost implications)
- Integration with Town's AirNav Radar data — still pending Town response
