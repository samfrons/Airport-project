# JPX Dashboard Implementation Plan

## Responding to: Marc Frons Consolidated Feedback (Feb 14, 2026)

This plan addresses every item in the Dashboard-Feedback.md document, organized by
the feedback's own priority ordering. Each item is marked with its current status
(DONE, BUG, or TODO) based on a code audit of the `feedback` branch.

---

## Status Summary

The feedback commit (`aa1fd89`) addressed the majority of the structural items.
However, a code audit reveals **several remaining bugs, inconsistencies, and
unimplemented items** that still need work.

### Scorecard

| Feedback Section | Items | Done | Remaining |
|---|---|---|---|
| 1. Nav & Page Architecture | 14 | 13 | 1 |
| 2. Summary Cards | 5 | 3 | 2 |
| 3. Labeling Changes | 6 | 5 | 1 |
| 4. Curfew & Noise Thresholds | 5 | 3 | 2 |
| 5. Date Range Selector | 3 | 3 | 0 |
| 6. Complaints Integration | 2 | 1 | 1 |
| 7. Phase 2 Features | 3 | 0 | 3 |
| 8. Implementation Priority | -- | -- | -- |
| **Total** | **38** | **28** | **10** |

---

## Section 1: Page Architecture & Navigation

### DONE

- [x] 7 flat nav items, no sub-sections, no accordion (`navConfig.ts:20-28`)
- [x] Correct order: Overview, Operations, Aircraft & Operators, Curfew Compliance,
      Flight Map, Noise & Impact, Complaints (`page.tsx:149-265`)
- [x] Section headers match nav labels exactly
- [x] Flight Replay tucked under Flight Map as secondary feature (`page.tsx:217-221`)
- [x] Flight Routes folded into Flight Map
- [x] Flight Log removed from main nav
- [x] Biodiversity removed from main page sections
- [x] Weather Correlation deferred (not in page)
- [x] Noise Reports hidden (Noise & Impact shows placeholder message)
- [x] Thresholds/Alerts not in top-level nav
- [x] Airport Diagram available as separate page (`/airport-diagram`)
- [x] Sections render in sequential scroll order matching nav
- [x] Keyboard navigation and Intersection Observer for active section highlighting

### TODO

- [ ] **1.1 Hide empty map layer toggles**
  - **Feedback (Section 3):** "Hide all toggles that don't have data sources yet.
    Showing empty features to Town officials will hurt credibility."
  - **Current state:** `NoiseLayerControls.tsx` still renders all 3 noise layers
    (Noise Sensors, Aircraft Noise, Complaints) plus the full Biodiversity section
    (Wildlife Impact, Impact zones, Habitat areas) -- all backed by mock data only.
  - **Fix:** Conditionally render each toggle only when real data is available.
    For now, hide the entire `NoiseLayerControls` panel since none of these layers
    have real data sources yet. The map should show flight routes/stats/heatmap
    without the noise/biodiversity overlay controls.
  - **Files:** `components/AirportMap.tsx` (remove/gate `<NoiseLayerControls />`
    rendering), `components/NoiseLayerControls.tsx` (add data-availability guards)

---

## Section 2: Summary Cards

### DONE

- [x] Four cards: Total Operations, Helicopter Operations, Curfew Violations, Noise Index
      (`StatsCards.tsx:34-127`)
- [x] Old "Unique Aircraft" and "Wildlife Violations" cards removed
- [x] Helicopter Operations card shows jet + prop sub-breakdown

### TODO

- [ ] **2.1 ComplianceDashboard still references biodiversity/species metrics**
  - **Feedback (Section 2):** "Wildlife Violations: 71 / 100% -- every operation can't
    be a wildlife violation. This looks like a placeholder or data bug. Hide until
    the data is real."
  - **Current state:** `ComplianceDashboard.tsx` still computes and displays:
    - "Species Protection" sub-score bar (line 929, weight 25%)
    - "Protected Species Events" in regulatory summary table (line 430)
    - "Habitat Violations" in regulatory summary table (line 435)
    - These are all driven by the biodiversity violation engine with mock thresholds,
      producing inflated/meaningless numbers.
  - **Fix:** Remove species/habitat metrics from ComplianceDashboard. Reweight
    compliance score to: Curfew 40%, Noise 40%, Volume 20%. Remove the two
    biodiversity rows from the regulatory summary table.
  - **Files:** `components/ComplianceDashboard.tsx`

- [ ] **2.2 Noise Index should include Stage 2 jets**
  - **Feedback (Section 4):** "count all helicopter operations plus older Stage 2 jet
    types. This can be derived from the ICAO type codes we already have."
  - **Current state:** `StatsCards.tsx:27-28` sets `noiseIndex = helicopters` with a
    comment "Can expand to include Stage 2 jets when data available". The EASA noise
    data in `icaoToEasaMap.ts` already has noise levels for all 47 aircraft types.
  - **Fix:** Expand the Noise Index calculation to include jets with EASA-certified
    noise levels above a threshold (e.g., 85 dB at 1000 ft). This uses data we
    already have -- no new data source needed.
  - **Files:** `components/StatsCards.tsx`, `data/noise/easa/icaoToEasaMap.ts`
    (reference), `data/noise/aircraftNoiseProfiles.ts` (reference)

---

## Section 3: Labeling Changes

### DONE

- [x] "Statistics" -> "Overview" (`page.tsx:151`)
- [x] "Curfew Period" -> "Curfew Violations" (`StatsCards.tsx:82`)
- [x] "8 PM - 8 AM" -> "9 PM - 7 AM" in StatsCards and CurfewChart
- [x] "LIVE DATA" -> "Updated [timestamp]" (`page.tsx:100`, `TimeFilter.tsx:133`)
- [x] "Wildlife Impact" -> "Noise & Impact" in page section header (`page.tsx:226`)

### BUG

- [ ] **3.1 ComplianceDashboard curfew label still says "8 PM - 8 AM ET"**
  - **Line:** `ComplianceDashboard.tsx:978`
  - **Current text:** `Voluntary curfew (8 PM - 8 AM ET) adherence`
  - **Should be:** `Voluntary curfew (9 PM - 7 AM ET) adherence`
  - **Also:** `NoiseLayerControls.tsx:146` still says "Wildlife Impact" instead of
    "Noise & Impact" (though this control panel should be hidden per item 1.1)

---

## Section 4: Curfew & Noise Thresholds

### DONE

- [x] Curfew window updated to 9 PM - 7 AM (hours 21-6) in StatsCards, CurfewChart,
      CurfewViolatorsTable
- [x] Curfew Violators Table exists with time, aircraft type, tail number,
      operator, repeat offender flagging (`CurfewViolatorsTable.tsx`)
- [x] Noise Index card exists in summary cards

### TODO

- [ ] **4.1 Shoulder period tracking (7-8 AM and 8-9 PM)**
  - **Feedback:** "Consider showing 7-8 AM and 8-9 PM shoulder periods as a separate
    count." and "Consider also tracking the shoulder periods (7-8 AM and 8-9 PM)
    as a secondary metric, since those hours are still sensitive for the community."
  - **Current state:** No shoulder period tracking. Curfew is binary (in/out).
  - **Implementation:**
    - Add shoulder period count to StatsCards Curfew Violations card as a sub-line
      (e.g., "3 during shoulder hours")
    - Add shoulder-hour highlighting to CurfewChart (different color from curfew
      and daytime -- e.g., a lighter amber)
    - Define shoulder hours: 7 AM (hour 7) and 8-9 PM (hours 20)
  - **Files:** `components/StatsCards.tsx`, `components/CurfewChart.tsx`,
    `components/CurfewViolatorsTable.tsx` (flag shoulder operations differently)

- [ ] **4.2 Altitude compliance tracking (lower priority)**
  - **Feedback (Section 4):** "The Pledge also specifies minimum altitudes: 3,500 ft
    for helicopters (except arrivals/departures), 1,000 ft for piston/turboprop,
    1,500 ft for turbojets. FlightAware track data includes altitude. This could be
    a future compliance metric but is lower priority than curfew tracking."
  - **Current state:** Flight tracks are fetched and cached
    (`store/flightStore.ts:fetchFlightTrack`), but altitude data is only used for
    noise calculation, not compliance checking.
  - **Implementation (Phase 2):**
    - New function in `lib/` to check track positions against altitude thresholds
      based on aircraft category
    - Exclude arrival/departure phases (within ~3nm of airport at <1500ft)
    - Add altitude violation count to OperatorScorecard
    - Add altitude compliance sub-score to ComplianceDashboard
  - **Files:** `lib/altitudeCompliance.ts` (new), `components/OperatorScorecard.tsx`,
    `components/ComplianceDashboard.tsx`

---

## Section 5: Date Range Selector

### DONE (all items complete)

- [x] Auto-refresh on change, no Apply button (`TimeFilter.tsx:49-57`, debounced 300ms)
- [x] Presets: This Month, Last Month, 90 Days, This Year, Last Year (`TimeFilter.tsx:7-13`)
- [x] Custom date picker with start/end inputs (`TimeFilter.tsx:110-125`)

---

## Section 6: Complaints Integration

### DONE

- [x] Prominent "File a Complaint" button linking to planenoise.com/khto/
      (`page.tsx:251-258`)

### TODO

- [ ] **6.1 Integrated complaint view (when Town data obtained)**
  - **Feedback:** "We're working on getting the Town's historical complaint data (via
    direct request and FOIL if needed). When we have it, the Complaints section
    becomes a fully interactive view -- complaint volume over time, a geographic
    heatmap of complaint origins, and correlations with specific flights."
  - **Current state:** Complaint section is a simple link-out card. The database
    schema has a `noise_complaints` table. Mock complaint data exists in
    `data/noise/mockComplaints.ts`. The map already has complaint layer
    infrastructure (markers/heatmap/clusters modes).
  - **Implementation (when data available):**
    - API route: `app/api/complaints/route.ts` (GET with date/location filters)
    - Import pipeline for Town complaint data (CSV/FOIL format)
    - Complaint analytics component: volume over time, by hour, by day-of-week,
      geographic heatmap, top complained-about operators
    - Flight correlation: given complaint time/location, show nearby flights
    - Keep the PlaneNoise external link as "Also file with regional system"
  - **Files:** `app/api/complaints/route.ts` (new), `components/complaints/` (new
    directory), `app/page.tsx` (expand Complaints section)
  - **Blocked on:** Receiving actual complaint data from the Town

---

## Section 7: Phase 2 Features

### TODO

- [ ] **7.1 Individual flight noise footprint on map**
  - **Feedback:** "Selecting a helicopter operation and seeing its estimated
    ground-level noise footprint plotted on the map at various points along the
    route. This would use FlightAware track data (altitude + position) combined
    with the aircraft's ICAO type code to estimate dBA at ground level."
  - **Current state:** The noise calculation engine exists
    (`components/noise/NoiseCalculator.ts`, `lib/noise/trackNoiseCalculator.ts`)
    and flight tracks are fetched/cached. FlightPathReplay exists but shows
    position animation, not noise footprint.
  - **Implementation:**
    - Extend FlightPathReplay or create new `FlightNoiseFootprint.tsx`:
      - For selected flight, compute estimated ground-level dBA at grid points
        along the track using existing NoiseCalculator
      - Render as a colored corridor/polygon on the map (gradient from red to
        green based on dB level)
      - Show dB values at key points (departure, climb, cruise, descent, arrival)
    - Trigger from FlightTable row click or FlightDetailsSidebar
  - **Files:** `components/noise/FlightNoiseFootprint.tsx` (new),
    `components/AirportMap.tsx` (add footprint layer),
    `lib/noise/trackNoiseCalculator.ts` (extend for ground grid calculation)

- [ ] **7.2 Top 10 curfew violators ranking**
  - **Feedback:** "A simple 'top 10 curfew violators' ranking by operator and/or tail
    number would be very politically impactful."
  - **Current state:** `ComplianceDashboard.tsx` already has a "Worst Offending
    Operators" horizontal bar chart (`curfewOperatorCounts`, lines 347-355, 696-736).
    However, it's buried deep in the ComplianceDashboard, and the feedback wants it
    more prominent. Also, there's no ranking by tail number.
  - **Implementation:**
    - Surface the top 10 ranking more prominently -- either as a standalone widget
      in the Curfew Compliance section or as a prominent card above the
      ComplianceDashboard charts
    - Add a toggle: "By Operator" / "By Tail Number"
    - Show: rank, name/registration, violation count, most recent violation date
  - **Files:** `components/TopCurfewViolators.tsx` (new or extract from
    ComplianceDashboard), `app/page.tsx` (add to Curfew Compliance section)

- [ ] **7.3 Historical data validation (KHTO -> KJPX)**
  - **Feedback:** "Make sure all historical data loads correctly across the full date
    range, back to 2022. The airport code changed from KHTO to KJPX in May 2022,
    so verify the pipeline handles both identifiers correctly."
  - **Current state:** `scripts/daily_pull.py` uses KJPX. Need to verify it handles
    KHTO for pre-May-2022 data.
  - **Implementation:**
    - Audit `scripts/daily_pull.py` for airport code handling
    - Add `--airport` flag or automatic code switching based on date
    - Backfill script: for dates before May 2022, query as KHTO; after, as KJPX
    - Verify Supabase data integrity across the code transition
  - **Files:** `scripts/daily_pull.py`, `scripts/backfill.sh` (new)

---

## Implementation Priority (following feedback Section 8 ordering)

The feedback says: "Work through it top to bottom -- the most impactful changes are first."

| Priority | Item | Effort | Description |
|---|---|---|---|
| **P0** | 3.1 | 5 min | Fix curfew label bug in ComplianceDashboard ("8 PM" -> "9 PM") |
| **P0** | 1.1 | 30 min | Hide empty map noise/biodiversity layer toggles |
| **P0** | 2.1 | 1-2 hr | Remove biodiversity metrics from ComplianceDashboard |
| **P0** | 2.2 | 30 min | Expand Noise Index to include loud jets (using existing EASA data) |
| **P1** | 4.1 | 1-2 hr | Add shoulder period tracking (7-8 AM, 8-9 PM) |
| **P1** | 7.2 | 1-2 hr | Surface top 10 curfew violators ranking prominently |
| **P2** | 7.1 | 4-6 hr | Individual flight noise footprint on map |
| **P2** | 4.2 | 3-4 hr | Altitude compliance checking |
| **P2** | 6.1 | 4-6 hr | Integrated complaint view (blocked on data) |
| **P2** | 7.3 | 2-3 hr | Historical data validation (KHTO -> KJPX) |

### Recommended order of implementation:

1. **Bug fix** (3.1): One-line change, "8 PM - 8 AM" -> "9 PM - 7 AM" in ComplianceDashboard
2. **Hide empty features** (1.1): Remove noise layer controls from map that have no data
3. **Clean ComplianceDashboard** (2.1): Strip biodiversity metrics, reweight scores
4. **Expand Noise Index** (2.2): Include loud jets in the count using EASA data
5. **Shoulder periods** (4.1): Add secondary curfew tracking for sensitive hours
6. **Top 10 violators** (7.2): Make the ranking more prominent and add by-tail-number view
7. **Phase 2 items** (7.1, 4.2, 6.1, 7.3): Noise footprint, altitude compliance,
   complaints integration, historical backfill

---

## Files Changed Summary

| File | Changes |
|---|---|
| `components/ComplianceDashboard.tsx` | Fix "8 PM" label; remove species/habitat metrics; reweight scores |
| `components/AirportMap.tsx` | Remove/gate NoiseLayerControls rendering |
| `components/NoiseLayerControls.tsx` | Add data-availability checks (or hide entirely) |
| `components/StatsCards.tsx` | Expand Noise Index; add shoulder period count |
| `components/CurfewChart.tsx` | Add shoulder hour highlighting |
| `components/TopCurfewViolators.tsx` | New: prominent top 10 ranking widget |
| `app/page.tsx` | Add TopCurfewViolators to Curfew Compliance section |
| `components/noise/FlightNoiseFootprint.tsx` | New: Phase 2 noise visualization |
| `lib/altitudeCompliance.ts` | New: Phase 2 altitude checking |
| `scripts/daily_pull.py` | Phase 2: KHTO/KJPX handling |

---

## Notes

1. **Credibility is the theme.** The feedback repeatedly emphasizes that showing empty
   features, placeholder data, or incorrect labels undermines trust with Town officials.
   P0 items are all about removing things that shouldn't be shown yet.

2. **The Pilot's Pledge is the anchor.** All compliance metrics should reference
   easthamptonalliance.org/pilot-pledge as the standard. The strategy is to hold
   the aviation community to its own stated commitments.

3. **Phase 2 features are real but not urgent.** The feedback explicitly says "get the
   core dashboard right first" before adding noise footprints and altitude compliance.

4. **Complaint integration is data-blocked.** The feature is well-specified in the
   feedback, but implementation depends on receiving Town complaint data via FOIL or
   direct request. The infrastructure (API routes, map layers) can be pre-built.
