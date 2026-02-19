# JPX Dashboard Implementation Plan

## Responding to: "Noise Monitoring and Data Transparency Options" (WCAC, Jan 2026)

This plan maps every actionable recommendation from the WCAC document to concrete
dashboard implementation work. Items are organized by the document's phased approach,
with each item cross-referenced to the relevant PDF section.

---

## Gap Analysis: Current Dashboard vs. PDF Recommendations

### Already Implemented
| PDF Recommendation | Dashboard Status |
|---|---|
| Public-facing portal for community access | Main dashboard app (Next.js/Vercel) |
| Helicopter vs. fixed-wing breakdown | StatsCards, FlightTable category filters |
| Real-time flight tracking (ADS-B via FlightAware) | `/api/flights`, `/api/flights/live` |
| Aircraft identification (registration, type, operator) | FlightTable, OperatorScorecard |
| Historical data queries | Date range filter with presets |
| Curfew compliance tracking (9 PM - 7 AM) | CurfewChart, CurfewViolatorsTable |
| Modeled noise estimation | EASA-based NoiseCalculator (47 aircraft types) |
| Complaint submission link | "File a Complaint" link to planenoise.com |
| Operator identification and scoring | OperatorScorecard with CSV export |
| Interactive map with flight paths | AirportMap (Mapbox GL, 3 view modes) |

### Gaps Remaining
| PDF Recommendation | Gap |
|---|---|
| Monthly/quarterly PDF summary reports (Scottsdale model) | No report generation |
| Year-over-year comparison | Not implemented |
| Top 10 operators by volume (dedicated summary) | OperatorScorecard exists but no "top N" summary view |
| Jet vs. piston/turboprop sub-classification | Only helicopter/jet/fixed_wing categories |
| Integrated complaint system linked to flight data | External link only; no flight-complaint correlation |
| Complaint analytics (by location, time, operator, type) | No complaint analytics dashboard |
| Real noise monitor (NMT) data ingestion | Mock sensor data only |
| Noise event correlation with specific flights | Not implemented |
| Community-facing simplified view for residents | Single expert-level interface only |
| Data export for Town website posting | CSV export exists; no automated report publishing |
| Day-of-week distribution chart | Hourly chart exists but no day-of-week view |

---

## Phase 1: Quick Wins (PDF Part VI, Phase 1)

_"Publish monthly reports from existing AirNav Radar data... only staff time to generate."_

The dashboard should automate what the PDF says requires "staff time" -- generating and
publishing the exact metrics the PDF recommends.

### 1.1 Monthly Summary Report Generator

**PDF reference:** Phase 1 recommended metrics list (p.7)

**What to build:** A `/reports` page and `/api/reports/monthly` endpoint that generates
downloadable PDF/HTML summary reports containing all six metrics the PDF specifies.

**Required metrics (from PDF):**
- Total operations by month
- Fixed-wing vs. helicopter breakdown
- Jet vs. piston/turboprop breakdown
- Day-of-week and time-of-day distribution
- Year-over-year comparison
- Top 10 operators by volume

**Implementation:**
- New component: `components/reports/MonthlyReport.tsx`
  - Server-rendered HTML report with print-optimized CSS
  - Charts rendered as static images for PDF export
  - Matches Scottsdale Airport quarterly report format (PDF Appendix, item 5)
- New API route: `app/api/reports/monthly/route.ts`
  - Query params: `month`, `year`
  - Returns aggregated data for the specified month
  - Includes month-over-month and year-over-year deltas
- New API route: `app/api/reports/generate-pdf/route.ts`
  - Generates a downloadable PDF using the monthly data
  - Suitable for Town website posting
- Add "Reports" section to navigation or as a sub-item under Overview

**Files to create/modify:**
- `components/reports/MonthlyReport.tsx` (new)
- `components/reports/ReportCharts.tsx` (new - static chart renderers)
- `app/api/reports/monthly/route.ts` (new)
- `app/reports/page.tsx` (new page, or integrate into main dashboard)
- `lib/supabase/db.ts` (add `getMonthlyReport` query)

### 1.2 Year-over-Year Comparison View

**PDF reference:** Phase 1 recommended metrics, "year-over-year comparison" (p.7)

**What to build:** A comparison chart showing the current period vs. the same period in
prior years, answering the community question: "Is it getting better or worse?"

**Implementation:**
- New component: `components/analytics/YearOverYearChart.tsx`
  - Line/bar chart overlaying multiple years for the same month range
  - Metrics: total ops, helicopter ops, curfew violations, noise index
  - Toggle between absolute numbers and percentage change
- Extend `/api/analytics/trends` to accept `compare_years=true` param
  - Returns data grouped by year for the requested date range
- Add to the Overview section of the main dashboard
- Requires historical data backfill (summer 2025 at minimum)

**Files to create/modify:**
- `components/analytics/YearOverYearChart.tsx` (new)
- `app/api/analytics/trends/route.ts` (extend)
- `lib/supabase/db.ts` (add `getYearOverYearStats` query)
- `app/page.tsx` (add YoY section to Overview)

### 1.3 Day-of-Week Distribution Chart

**PDF reference:** Phase 1 recommended metrics, "day-of-week... distribution" (p.7)

**What to build:** A chart showing operations by day of week, highlighting weekend
vs. weekday patterns. The current CurfewChart only shows hourly (time-of-day).

**Implementation:**
- New component: `components/analytics/DayOfWeekChart.tsx`
  - Bar chart showing Mon-Sun operation counts
  - Stacked by category (helicopter/jet/fixed-wing)
  - Average line overlay
  - Weekend bars visually distinguished
- Data source: aggregate from `daily_summary` table (`day_of_week` column exists)
- Add to Operations section alongside existing CurfewChart

**Files to create/modify:**
- `components/analytics/DayOfWeekChart.tsx` (new)
- `app/page.tsx` (add to Operations section)

### 1.4 Top 10 Operators Summary Widget

**PDF reference:** Phase 1 recommended metrics, "top 10 operators by volume" (p.7)

**What to build:** A compact ranked list of the top 10 operators, surfaced prominently
in the Overview section. Different from the full OperatorScorecard -- this is a
quick-glance widget.

**Implementation:**
- New component: `components/TopOperatorsWidget.tsx`
  - Ranked bar chart or table showing top 10 operators by flight count
  - Shows: rank, operator name, flight count, helicopter %, curfew violation count
  - Links to full OperatorScorecard for details
- Data source: aggregate from flights table grouped by operator
- Add to Overview section

**Files to create/modify:**
- `components/TopOperatorsWidget.tsx` (new)
- `app/page.tsx` (add to Overview section)

### 1.5 Refined Aircraft Sub-Classification

**PDF reference:** Phase 1, "jet vs. piston/turboprop" (p.7); also Part II Option 3, "helicopter vs. fixed-wing breakdown" (p.3)

**What to build:** Extend the current three-category system (helicopter/jet/fixed_wing)
to distinguish piston from turboprop within fixed-wing, since this matters for noise
profiles and community impact.

**Implementation:**
- Extend `aircraft_category` handling in the flight data pipeline:
  - Map known ICAO types to sub-categories: `piston`, `turboprop`, `jet`, `helicopter`
  - Use EASA noise data and known type codes for classification
  - Store as a new `aircraft_subcategory` field or derive at query time
- Update StatsCards to show the 4-way breakdown
- Update FlightTable category filter to include sub-categories
- Update CurfewChart tooltips to show sub-category detail

**Files to create/modify:**
- `types/flight.ts` (add `aircraft_subcategory` field)
- `data/noise/easa/icaoToEasaMap.ts` (add subcategory mappings)
- `lib/supabase/db.ts` (update queries to include subcategory)
- `components/StatsCards.tsx` (update breakdown display)
- `components/FlightTable.tsx` (extend category filter)
- `app/api/flights/route.ts` (add subcategory to response)

---

## Phase 2: Enhanced Transparency (PDF Part VI, Phase 2)

_"Deploy a public flight tracking portal... integrate complaint management... a formal
complaint system linked to flight data."_

### 2.1 Integrated Complaint Submission Form

**PDF reference:** Phase 2, "Integrate complaint management" (p.7); also Part III WebTrak features, "complaint submission portal" (p.3)

**What to build:** Replace the external planenoise.com link with an in-app complaint
form that captures structured data and stores it in Supabase, linked to flight data.

**Current state:** `ComplaintForm.tsx` exists but links externally. The `noise_complaints`
table exists in Supabase schema but is populated with mock data only.

**Implementation:**
- Rework `components/ComplaintForm.tsx`:
  - Date/time picker (pre-filled to "now")
  - Location input (address text + map pin placement on AirportMap)
  - Aircraft description (optional; auto-suggest from recent flights)
  - Noise severity (1-5 scale)
  - Duration estimate
  - Category (helicopter, jet, fixed-wing, unknown)
  - Contact info (optional, for follow-up)
  - "Link to flight" -- show flights within +/- 30 min of complaint time,
    let user select the probable offending flight
- New API route: `app/api/complaints/route.ts`
  - POST: Create complaint (validate, store in Supabase `noise_complaints`)
  - GET: List complaints with filters (date range, location, status)
- New API route: `app/api/complaints/correlate/route.ts`
  - Given a complaint time/location, return candidate flights sorted by
    proximity (time and estimated noise at complaint location)
- Keep the external planenoise.com link as an additional option ("Also file
  with regional complaint system")

**Files to create/modify:**
- `components/ComplaintForm.tsx` (rewrite)
- `app/api/complaints/route.ts` (new)
- `app/api/complaints/correlate/route.ts` (new)
- `lib/supabase/db.ts` (add complaint CRUD functions)
- `types/noise.ts` (extend `NoiseComplaint` type)

### 2.2 Complaint Analytics Dashboard

**PDF reference:** Phase 2, "track complaints by location, time, operator, and aircraft type" (p.7); WebTrak feature: "correlates complaints to specific flights" (p.3)

**What to build:** A dedicated analytics view for complaint data, showing patterns
and trends that help the Town understand the relationship between operations and
community impact.

**Implementation:**
- New component: `components/complaints/ComplaintAnalytics.tsx`
  - Complaints over time (daily/weekly/monthly trend line)
  - Complaints by hour of day (overlay on CurfewChart)
  - Complaints by day of week
  - Geographic heatmap of complaint origins
  - Top complained-about operators (when flight correlation exists)
  - Top complained-about aircraft types
  - Repeat vs. new complainants (if contact info provided)
  - Complaint resolution status tracking
- Integrate into the Complaints navigation section
- Use existing map complaint layer (already has markers/heatmap/clusters modes)

**Files to create/modify:**
- `components/complaints/ComplaintAnalytics.tsx` (new)
- `components/complaints/ComplaintTrendChart.tsx` (new)
- `components/complaints/ComplaintHeatmap.tsx` (new -- or extend AirportMap)
- `app/page.tsx` (add to Complaints section)

### 2.3 Community/Resident Simplified View

**PDF reference:** Part II, "public-facing portal for community access" (p.1 gaps table); Part III, WebTrak-style "community-facing portal" (p.3)

**What to build:** A simplified, public-facing view designed for non-technical residents.
The current dashboard is comprehensive but oriented toward analysts/administrators.
A community view would focus on: "What's happening now? How loud is it? How do I
complain?"

**Implementation:**
- New route: `app/community/page.tsx`
  - Simplified layout (no sidebar, card-based)
  - Shows: current/recent flights on map, today's operation count, current
    noise estimate at user's location (modeled), complaint submission button,
    link to full dashboard for details
  - Mobile-first responsive design
  - No authentication required
- Consider this as a future enhancement after core Phase 2 items

**Files to create/modify:**
- `app/community/page.tsx` (new)
- `app/community/layout.tsx` (new -- simplified layout without admin nav)
- `components/community/CommunityOverview.tsx` (new)
- `components/community/QuickComplaint.tsx` (new)

### 2.4 Embeddable Widget for Town Website

**PDF reference:** Part II Option 1 limitations, "AirNav doesn't offer a simple embeddable public widget" (p.2); Phase 1 recommended action 3, "Town website posting" (p.8)

**What to build:** A lightweight embeddable iframe/widget that the Town can place on
ehamptonny.gov, showing key daily stats without requiring visitors to navigate to the
full dashboard.

**Implementation:**
- New route: `app/embed/page.tsx`
  - Minimal UI: today's total ops, helicopter count, curfew violations
  - Auto-refreshing (5-min interval)
  - Configurable via URL params (theme, metrics to show)
  - CORS headers allowing embedding from Town domain
  - `<iframe>` embed code generator
- New route: `app/api/embed/stats/route.ts`
  - Returns today's summary stats in a simple JSON format
  - Public endpoint (no auth)

**Files to create/modify:**
- `app/embed/page.tsx` (new)
- `app/api/embed/stats/route.ts` (new)

---

## Phase 3: Noise Measurement Readiness (PDF Part VI, Phase 3)

_"Deploy portable NMTs for targeted monitoring... Integrate with HMMH analysis."_

### 3.1 Real NMT Data Ingestion Pipeline

**PDF reference:** Phase 3, "deploy portable NMTs" (p.7); Part IV NMT hardware options (p.5)

**Current state:** The dashboard has mock sensor data (`data/noise/mockSensors.ts`)
and UI for displaying sensors on the map. The `noise_complaints` and noise-related
tables exist in the schema. But there's no pipeline for ingesting real NMT data.

**What to build:** API infrastructure to receive, store, and display real noise
measurement data from portable NMT devices.

**Implementation:**
- New API route: `app/api/noise/measurements/route.ts`
  - POST: Ingest noise measurement (timestamp, location, dBA_Leq, dBA_Lmax,
    dBA_L90, duration_sec, device_id)
  - GET: Query measurements by time range, location, device
  - Validate against expected ranges (20-120 dBA)
- New API route: `app/api/noise/events/route.ts`
  - Noise events (threshold exceedances) with auto-correlation to flights
  - GET: List events with flight linkage
- Supabase migration: `noise_measurements` table
  - `id`, `device_id`, `timestamp`, `lat`, `lng`
  - `dba_leq`, `dba_lmax`, `dba_l90`, `dba_l10`
  - `duration_seconds`, `correlated_flight_id`
- Update `AirportMap.tsx` noise sensor layer to display real data when available,
  falling back to mock/modeled data when not
- New component: `components/noise/NoiseMeasurementChart.tsx`
  - Time-series chart of measured dBA values
  - Overlay flight events on the chart
  - Compare measured vs. modeled noise for same flights

**Files to create/modify:**
- `app/api/noise/measurements/route.ts` (new)
- `app/api/noise/events/route.ts` (new)
- `supabase/migrations/add_noise_measurements.sql` (new)
- `types/noise.ts` (add `NoiseMeasurement`, `NoiseEvent` types)
- `lib/supabase/db.ts` (add measurement queries)
- `components/noise/NoiseMeasurementChart.tsx` (new)
- `components/AirportMap.tsx` (update sensor layer data source)
- `store/flightStore.ts` (add measurement state and fetch actions)

### 3.2 Noise Event-to-Flight Correlation Engine

**PDF reference:** Part IV, "enables correlation of specific aircraft to specific noise events" (p.4); Phase 3, "noise measurement data could validate community concerns with objective data" (p.7)

**What to build:** An algorithm that matches measured noise events to specific flights
based on temporal and spatial proximity, providing the "defensible data" the PDF
emphasizes.

**Implementation:**
- New library: `lib/noise/eventCorrelation.ts`
  - Input: noise event (time, location, dBA)
  - Query flights within +/- 5 min window
  - Calculate expected noise at measurement location for each candidate flight
    (using existing NoiseCalculator)
  - Rank candidates by: temporal proximity, spatial proximity (slant distance),
    predicted-vs-measured dBA agreement
  - Return best match with confidence score
- Integrate with noise measurement ingestion (auto-correlate on ingest)
- Display in UI: "This noise event was likely caused by [flight X] (confidence: high)"

**Files to create/modify:**
- `lib/noise/eventCorrelation.ts` (new)
- `app/api/noise/events/route.ts` (integrate correlation)
- `components/noise/NoiseEventDetail.tsx` (new -- shows event + correlated flight)

### 3.3 Measured vs. Modeled Noise Validation

**PDF reference:** Part I tier comparison, flight tracking + modeled noise "doesn't account for local conditions" (p.2); Part IV, "ground-truth measurements" (p.4)

**What to build:** A validation view comparing the dashboard's EASA-based noise
estimates against actual measurements (once NMTs are deployed). This addresses the
PDF's key concern that modeled noise doesn't account for local conditions (terrain,
temperature inversions, ground reflection).

**Implementation:**
- New component: `components/noise/ModelValidation.tsx`
  - Scatter plot: modeled dBA (x-axis) vs. measured dBA (y-axis)
  - Color by aircraft category
  - R-squared and RMSE statistics
  - Identify systematic biases (e.g., "helicopters modeled 5 dB low")
  - Per-aircraft-type accuracy breakdown
- Feed back into noise model calibration (adjust category averages based on
  measured data)

**Files to create/modify:**
- `components/noise/ModelValidation.tsx` (new)
- `lib/noise/trackNoiseCalculator.ts` (add calibration offset support)
- `app/page.tsx` (add to Noise & Impact section, gated behind data availability)

---

## Phase 4: Data Infrastructure & Operations

These items support all three phases and address the PDF's "Recommended Immediate
Actions" (p.8).

### 4.1 Historical Data Backfill

**PDF reference:** Part II Option 2, FlightAware "historical data back to 2011" (p.3)

**What to build:** Automate backfill of historical flight data to enable year-over-year
comparisons. Currently the database has data from when daily pulls started.

**Implementation:**
- Extend `scripts/daily_pull.py` with a `--backfill` mode
  - Accept start/end date range
  - Rate-limit FlightAware API calls (respect quotas)
  - Idempotent (skip already-fetched dates)
  - Progress logging
- Priority: backfill summer 2024 and summer 2025 first (peak seasons)
- Document API cost implications in README

**Files to create/modify:**
- `scripts/daily_pull.py` (extend with backfill mode)
- `scripts/backfill.sh` (new -- wrapper with date ranges)

### 4.2 Automated Report Scheduling

**PDF reference:** Phase 1, "publish monthly reports" and "regular data exports" (p.7-8)

**What to build:** A scheduled job (cron or Vercel Cron) that auto-generates and
publishes monthly reports without manual staff intervention.

**Implementation:**
- Vercel Cron job: `app/api/cron/monthly-report/route.ts`
  - Runs on the 1st of each month
  - Generates the previous month's report
  - Stores in Supabase storage or sends via email
  - Optionally posts to a public URL
- Configuration in `vercel.json` for cron schedule

**Files to create/modify:**
- `app/api/cron/monthly-report/route.ts` (new)
- `vercel.json` (add cron config)

### 4.3 Data Export Enhancements

**PDF reference:** Phase 1 action 2, "request regular data exports showing monthly operations by aircraft type" (p.2)

**What to build:** Extend existing CSV export with additional formats and pre-built
report templates.

**Implementation:**
- Extend `lib/exportUtils.ts`:
  - Monthly operations summary CSV (one row per month)
  - Operator summary CSV (one row per operator per month)
  - Curfew violations detail CSV
  - Complaint summary CSV
- Add export buttons to relevant dashboard sections
- Support date range selection for all exports

**Files to create/modify:**
- `lib/exportUtils.ts` (extend)
- `components/reports/ExportMenu.tsx` (new -- dropdown with export options)

### 4.4 Database Health and Monitoring

**PDF reference:** General operational readiness for a public-facing tool

**What to build:** Extend the existing `/api/health` endpoint with data freshness
checks and monitoring.

**Implementation:**
- Extend `app/api/health/route.ts`:
  - Check: latest flight data age (alert if >48 hours stale)
  - Check: daily_summary completeness (gaps in date sequence)
  - Check: Supabase connection pool status
- Add a small "Data Freshness" indicator in the dashboard footer
  - Shows last successful data pull timestamp
  - Warning badge if data is stale

**Files to create/modify:**
- `app/api/health/route.ts` (extend)
- `components/DataFreshnessIndicator.tsx` (new)
- `app/page.tsx` (add indicator to footer area)

---

## Implementation Priority Matrix

| Item | Phase | Effort | Impact | Priority |
|---|---|---|---|---|
| 1.1 Monthly Report Generator | 1 | Medium | High | P0 |
| 1.2 Year-over-Year Comparison | 1 | Medium | High | P0 |
| 1.3 Day-of-Week Distribution | 1 | Low | Medium | P1 |
| 1.4 Top 10 Operators Widget | 1 | Low | Medium | P1 |
| 1.5 Aircraft Sub-Classification | 1 | Medium | Medium | P1 |
| 2.1 Integrated Complaint Form | 2 | Medium | High | P0 |
| 2.2 Complaint Analytics | 2 | Medium | High | P1 |
| 2.3 Community Simplified View | 2 | High | High | P2 |
| 2.4 Embeddable Widget | 2 | Low | Medium | P2 |
| 3.1 NMT Data Ingestion | 3 | High | High | P2 |
| 3.2 Event-Flight Correlation | 3 | Medium | High | P2 |
| 3.3 Model Validation | 3 | Medium | Medium | P3 |
| 4.1 Historical Backfill | Infra | Medium | High | P0 |
| 4.2 Automated Report Scheduling | Infra | Low | Medium | P1 |
| 4.3 Data Export Enhancements | Infra | Low | Medium | P1 |
| 4.4 Database Health Monitoring | Infra | Low | Low | P2 |

### Recommended implementation order (P0 items first):
1. **4.1** Historical Data Backfill -- prerequisite for YoY and meaningful reports
2. **1.1** Monthly Report Generator -- the PDF's #1 quick win
3. **1.2** Year-over-Year Comparison -- key community question
4. **2.1** Integrated Complaint Form -- replaces external-only workflow
5. Then P1 items in any order, then P2/P3

---

## Relationship to PDF Options

The WCAC document presents 7 options across 3 tiers. This dashboard is essentially
**Option 3 (DIY Dashboard Using Public APIs)** combined with elements of **Option 4
(WebTrak-style community portal)** -- built with FlightAware AeroAPI + Next.js instead
of a commercial subscription.

| PDF Option | Status in Dashboard |
|---|---|
| Option 1: AirNav Radar Reports | Superseded -- dashboard uses FlightAware, which has richer data |
| Option 2: FlightAware Integration | Implemented -- AeroAPI v4 is the primary data source |
| Option 3: DIY Dashboard | This IS the dashboard |
| Option 4: WebTrak features | Partially implemented -- complaint correlation and community view are gaps |
| Option 5: Casper Noise Lab features | Some features present (flight density, complaint tracking) |
| Option 6: Portable NMTs | Phase 3 readiness work outlined above |
| Option 7: Full NOMS | Future evaluation per PDF recommendation |

The dashboard's advantage over commercial options: lower cost, full customization,
already built with JPX-specific features (biodiversity, EASA noise modeling, Pilot's
Pledge curfew rules) that no off-the-shelf product provides.

The dashboard's gap vs. commercial options: no real noise measurement data (yet),
no formal complaint-to-flight correlation (planned for Phase 2), and no automated
report generation (planned for Phase 1).

---

## Testing Strategy

Each implementation item should include:
- Unit tests for new business logic (Jest)
- Component tests for new UI components (Testing Library)
- E2E tests for new user flows (Playwright -- framework already configured)
- API route tests for new endpoints

Existing E2E test suites (`e2e/navigation.spec.ts`, `e2e/summary-cards.spec.ts`, etc.)
should be extended as existing components are modified.

---

## Notes for WCAC Review

1. **"Clarify current subscription" (PDF action 1):** The dashboard uses FlightAware
   AeroAPI v4, not AirNav Radar. FlightAware provides richer data (tracks, owner
   lookup, historical data back to 2011). The Town's AirNav subscription could be
   used as a secondary/validation source.

2. **"Request HMMH input" (PDF action 2):** The dashboard's noise modeling could be
   validated/calibrated against HMMH analysis data once available. The Phase 3
   model validation component is designed for this.

3. **"Review peer airports" (PDF action 5):** The Scottsdale quarterly report format
   is the template for item 1.1. WebTrak-style complaint correlation is the template
   for items 2.1-2.2.
