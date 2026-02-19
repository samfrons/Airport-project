# JPX Dashboard Implementation Plan

## Responding to: v4 Feedback (Feb 18, 2026) + v3 (Feb 14, 2026)

This plan tracks implementation of all feedback items from the WCAC Dashboard
review documents. Items from the v3 plan are included for completeness; the
v4 document added 26 prioritized items including bugs found via API cross-verification.

---

## Status Summary

### v4 Priority Items (26 total)

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Fix Noise Index calculation consistency | P0 | DONE |
| 2 | Fix noise exceedance count | P0 | DONE |
| 3 | Fix Repeat Offenders threshold (3+ → 2+) | P0 | DONE |
| 4 | Investigate pipeline stall + freshness indicator | P1 | DONE |
| 5 | Fix replay peak noise | P1 | DONE |
| 6 | Fix hour-by-hour table noise sources | P1 | DONE |
| 7 | Backfill 2025 historical data | P1 | READY (script + workflow created) |
| 8 | Remove residual biodiversity footnote | P0 | DONE |
| 9 | Detail panel: drawer instead of blur | P1 | DONE (already a drawer) |
| 10 | Remove/fix Status column | P1 | DONE |
| 11 | Add dB and direction columns | P1 | DONE |
| 12 | Add color legend to Aircraft Breakdown | P1 | DONE |
| 13 | Apply "Est." labels consistently | P1 | DONE |
| 14 | Fix map legend Unknown row | P1 | DONE |
| 15 | Explain/remove "Passing (80)" line | P1 | DONE |
| 16 | Hide empty Airport tab | P1 | DONE |
| 17 | Add heatmap legend | P1 | DONE |
| 18 | Rename "Active Flights" | P2 | DONE |
| 19 | Default replay to latest date | P2 | DONE |
| 20 | Surface operator identity gap | P2 | DONE |
| 21 | Verify dual date pickers | P2 | VERIFIED |
| 22 | Minor fixes (grammar, labels) | P2 | DONE |
| 23 | Add version/build/freshness to footer | P2 | DONE |
| 24 | Custom heatmap tooltips | P2 | DONE |
| 25 | Historical volume comparison | P2 | DONE |
| 26 | Noise threshold legend | P2 | DONE |

**Score: 26/26 addressed** (1 item needs operational action: backfill)

---

## v4 Implementation Details

### Batch 1: Noise Data Consistency Sprint (items 1,2,3,5,6,8,10,11,13,15,18,19,22)

**Created:** `lib/noise/getNoiseDb.ts` — single canonical module for all noise calculations.

- `getNoiseDb(flight)` — direction-appropriate dB from EASA certification data
- `getNoiseIndex(flights)` — helicopters + loud jets (≥85 dB)
- `getNoiseIndexBreakdown(flights)` — helicopters vs loud jets split
- `getNoiseCategory(db)` — quiet/moderate/loud/very_loud

**Components updated to use canonical module:**
- `StatsCards.tsx` — card face, subtitle, detail panel all use `getNoiseIndexBreakdown()`
- `ComplianceDashboard.tsx` — replaced local `getNoiseDb()` + `NOISE_THRESHOLD_DB`
- `OperatorScorecard.tsx` — replaced local `getNoiseDb()` + threshold
- `FlightPathReplay.tsx` — replaced `enrichFlightNoise()` with canonical functions
- `FlightTable.tsx` — replaced inline noise calc, removed biodiversity imports
- `AircraftBreakdownPanel.tsx` — uses direction-appropriate dB instead of avg(takeoff, approach)
- `NoiseEnvironmentTimeline.tsx` — replaced local `getFlightNoise()` with canonical import

**Other fixes in this batch:**
- Repeat offenders threshold: 3+ → 2+ (ComplianceDashboard, OperatorScorecard)
- Removed biodiversity Status column from FlightTable, replaced with Flags (Curfew + Loud)
- Removed biodiversity footnote from NoiseEnvironmentTimeline footer
- Added "Est." prefix to all noise dB labels (headers, column names, stat cards)
- "Passing (80)" → "Passing Threshold (80%)" in ComplianceDashboard chart
- "Active Flights · 3:00 PM" → "Flights at 3:00 PM" in FlightPathReplay
- Replay defaults to latest available date instead of earliest
- Curfew legend "8p–8a" → "9p–7a" in FlightPathReplay

### Batch 2: Map, Timeline, UI (items 12,14,16,17,20,23,24,26)

**AircraftBreakdownPanel:**
- Added noise threshold color legend (Quiet <65, Moderate 65-75, Loud 75-85, Very Loud ≥85)
- Reference labels for Pilot's Pledge (85 dB), EPA (55 dB outdoor), WHO (45 dB night)

**AirportMap:**
- Removed empty "Airport" tab from view mode toggle
- Legend now filters out categories with 0 count (removes "Unknown" row)
- Added heatmap density legend with gradient (Low → High) when in heatmap view

**NoiseEnvironmentTimeline (complete biodiversity removal):**
- Removed all biodiversity imports (evaluateFlight, getImpactSeverityColor, etc.)
- Removed violations chart datasets and species/habitat chart
- Replaced with "Daily Curfew & Loud Operations" chart
- Removed Biodiversity Violations Heatmap section entirely
- Updated aggregate stats: Total Ops, Est. Avg/Peak Noise, Curfew Ops, Loud Ops
- Replaced native `title` tooltips with custom CSS tooltips on heatmap cells

**page.tsx:**
- Operator identity gap banner: shows when >20% of flights have unknown operator
- Enhanced footer: version (v0.4.0), build date, data freshness, noise disclaimer
- Updated Noise & Impact placeholder with monitoring status and estimation methodology
- Data freshness indicator in header: shows latest data date, warns when stale (>2 days)

### Batch 3: Historical + Pipeline (items 4,7,25)

**HistoricalComparison component (new):**
- Year-over-year comparison of Total Ops, Helicopter Ops, Jet Ops, Curfew Violations, Noise Index
- Percentage change indicators with trend arrows (red = more impact, green = less)
- Graceful fallback when prior year data unavailable
- Placed in Operations section of main page

**Pipeline improvements:**
- Created `.github/workflows/daily-pull.yml` for automated daily data ingestion
- Schedule: 6 AM ET daily (11:00 UTC)
- Manual dispatch with date/range inputs
- Data integrity verification step
- `backfill.sh` script already available for historical data pulls

---

## v3 Items (Previously Completed)

All 37 items from the v3 feedback (Feb 14, 2026) were completed in earlier commits.
See git history for details. Key items:
- 7 flat nav items, correct order, matching labels
- 4 summary cards (Total Ops, Helicopter Ops, Curfew Violations, Noise Index)
- Curfew window 9 PM - 7 AM throughout
- Shoulder period tracking (7-8 AM, 8-9 PM)
- Top 10 curfew violators ranking
- Flight noise footprint on map
- Altitude compliance library
- Historical data validation (KHTO → KJPX transition)
- Biodiversity removed from all user-facing components

---

## Remaining Operational Items

| Item | Status | Action Required |
|------|--------|----------------|
| Backfill Mar-Dec 2025 data | READY | Run `./scripts/backfill.sh 2025-03-01 2025-12-31` |
| Complaint integration | BLOCKED | Waiting on Town data via FOIL/direct request |
| GitHub Actions secrets | NEEDED | Add `AEROAPI_KEY` to repository secrets |

---

## Files Changed (v4 implementation)

| File | Changes |
|------|---------|
| `lib/noise/getNoiseDb.ts` | NEW: canonical noise functions |
| `components/HistoricalComparison.tsx` | NEW: year-over-year comparison |
| `.github/workflows/daily-pull.yml` | NEW: automated daily pull |
| `components/StatsCards.tsx` | Use canonical getNoiseIndexBreakdown |
| `components/ComplianceDashboard.tsx` | Canonical noise; repeat offenders 2+; Passing label |
| `components/OperatorScorecard.tsx` | Canonical noise; repeat offenders 2+; Est. labels |
| `components/FlightPathReplay.tsx` | Canonical noise; replay defaults; rename Active Flights |
| `components/FlightTable.tsx` | Remove biodiversity; canonical noise; Flags column |
| `components/noise/AircraftBreakdownPanel.tsx` | Canonical noise; threshold legend |
| `components/NoiseEnvironmentTimeline.tsx` | Remove biodiversity; custom tooltips; compliance chart |
| `components/AirportMap.tsx` | Hide Airport tab; filter legend; heatmap legend |
| `components/CurfewViolatorsTable.tsx` | Rename Status → Repeat |
| `app/page.tsx` | Operator gap; freshness; footer; HistoricalComparison |
