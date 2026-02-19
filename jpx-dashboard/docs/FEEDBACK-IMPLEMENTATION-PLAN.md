# JPX Dashboard Implementation Plan

## Responding to: Marc Frons Consolidated Feedback (Feb 14, 2026)

This plan addresses every item in the Dashboard-Feedback.md document, organized by
the feedback's own priority ordering. Each item is marked with its current status.

---

## Status Summary

All P0, P1, and actionable P2 items are now complete. Only one item remains
blocked on external data (complaint integration).

### Scorecard

| Feedback Section | Items | Done | Blocked |
|---|---|---|---|
| 1. Nav & Page Architecture | 14 | 14 | 0 |
| 2. Summary Cards | 5 | 5 | 0 |
| 3. Labeling Changes | 6 | 6 | 0 |
| 4. Curfew & Noise Thresholds | 5 | 5 | 0 |
| 5. Date Range Selector | 3 | 3 | 0 |
| 6. Complaints Integration | 2 | 1 | 1 |
| 7. Phase 2 Features | 3 | 3 | 0 |
| 8. Implementation Priority | -- | -- | -- |
| **Total** | **38** | **37** | **1** |

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
- [x] **1.1 Empty map layer toggles hidden** -- `NoiseLayerControls` and `NoiseLegend`
      removed from `AirportMap.tsx` since all noise/biodiversity layers use mock data.
      `loadNoiseData()` call removed from `page.tsx`.

---

## Section 2: Summary Cards

### DONE

- [x] Four cards: Total Operations, Helicopter Operations, Curfew Violations, Noise Index
      (`StatsCards.tsx`)
- [x] Old "Unique Aircraft" and "Wildlife Violations" cards removed
- [x] Helicopter Operations card shows jet + prop sub-breakdown
- [x] **2.1 Biodiversity metrics removed from ComplianceDashboard** -- Species Protection
      sub-score, Protected Species Events, and Habitat Violations regulatory rows all
      removed. Compliance reweighted to Curfew 40%, Noise 40%, Volume 20%.
      OperatorScorecard also refactored from biodiversity to curfew/noise focus.
      FlightDetailsSidebar biodiversity section removed.
- [x] **2.2 Noise Index expanded** -- Now counts all helicopters + loud jets (takeoff
      dB >= 85 at 1000 ft reference distance, per EASA certification data in
      `aircraftNoiseProfiles.ts`). Captures GLF5, GLF4, GLEX, C56X, C680, FA50, LJ45.

---

## Section 3: Labeling Changes

### DONE

- [x] "Statistics" -> "Overview" (`page.tsx:151`)
- [x] "Curfew Period" -> "Curfew Violations" (`StatsCards.tsx:82`)
- [x] "8 PM - 8 AM" -> "9 PM - 7 AM" in StatsCards and CurfewChart
- [x] "LIVE DATA" -> "Updated [timestamp]" (`page.tsx:100`, `TimeFilter.tsx:133`)
- [x] "Wildlife Impact" -> "Noise & Impact" in page section header (`page.tsx:226`)
- [x] **3.1 ComplianceDashboard curfew label fixed** -- Changed from
      "8 PM - 8 AM ET" to "9 PM - 7 AM ET". Also fixed FlightPathReplay curfew
      threshold from `hour >= 20 || hour < 8` to `hour >= 21 || hour < 7`.

---

## Section 4: Curfew & Noise Thresholds

### DONE

- [x] Curfew window updated to 9 PM - 7 AM (hours 21-6) in StatsCards, CurfewChart,
      CurfewViolatorsTable, FlightPathReplay
- [x] Curfew Violators Table exists with time, aircraft type, tail number,
      operator, repeat offender flagging (`CurfewViolatorsTable.tsx`)
- [x] Noise Index card exists in summary cards
- [x] **4.1 Shoulder period tracking** -- Added 7-8 AM and 8-9 PM tracking:
      - StatsCards: shoulder count sub-line in Curfew Violations card
      - CurfewChart: shoulder hours shown in lighter amber, separate from curfew/daytime
      - Chart legend and tooltips distinguish curfew vs shoulder vs daytime
      - OperatorScorecard: shoulder ops count per operator
- [x] **4.2 Altitude compliance library created** -- `lib/altitudeCompliance.ts`
      implements Pilot's Pledge thresholds (3,500 ft helicopters, 1,000 ft
      piston/turboprop, 1,500 ft turbojets). Excludes approach/departure phases
      within 3nm of KJPX at <1,500 ft AGL. Ready for integration when track data
      is available in bulk (currently per-flight via FlightAware API).

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

### BLOCKED

- [ ] **6.1 Integrated complaint view (when Town data obtained)**
  - **Blocked on:** Receiving actual complaint data from the Town (via direct
    request or FOIL). Infrastructure is ready (database schema, mock data,
    map layer plumbing) but no real data to display.
  - When unblocked: API route, import pipeline, complaint analytics component,
    flight correlation, geographic heatmap.

---

## Section 7: Phase 2 Features

### DONE

- [x] **7.1 Individual flight noise footprint on map** -- New
      `lib/noise/footprintCalculator.ts` computes ground-level noise contours
      from real FlightAware track data (altitude + position) using inverse square
      law and atmospheric absorption. Four dB contour bands (50-60, 60-70,
      70-80, 80+ dB) rendered as colored corridor polygons on the map.
      dB point markers with altitude labels along the track. "Show Noise
      Footprint" button appears when a flight is selected, fetches track
      data on demand. Legend shows contour color scale.

- [x] **7.2 Top 10 curfew violators ranking** -- New `TopCurfewViolators.tsx`
      component placed prominently at top of Curfew Compliance section.
      Toggle between "By Operator" and "By Tail Number" views. Shows rank,
      name/registration, violation count, most recent date, bar chart
      visualization, and repeat offender highlighting (3+ in amber).

- [x] **7.3 Historical data validation (KHTO -> KJPX)** -- Audit confirmed
      `daily_pull.py` already handles the transition correctly: uses KHTO for
      dates before 2022-05-01 and KJPX for dates on or after. New
      `scripts/backfill.sh` convenience script created for bulk historical
      pulls. Documentation in CLAUDE.md, ARCHITECTURE.md, and DATA-SOURCES.md
      already references the transition.

---

## Implementation Priority (following feedback Section 8 ordering)

| Priority | Item | Status | Description |
|---|---|---|---|
| **P0** | 3.1 | DONE | Fix curfew label bug ("8 PM" -> "9 PM") |
| **P0** | 1.1 | DONE | Hide empty map noise/biodiversity layer toggles |
| **P0** | 2.1 | DONE | Remove biodiversity metrics from ComplianceDashboard |
| **P0** | 2.2 | DONE | Expand Noise Index to include loud jets |
| **P1** | 4.1 | DONE | Add shoulder period tracking (7-8 AM, 8-9 PM) |
| **P1** | 7.2 | DONE | Surface top 10 curfew violators ranking prominently |
| **P2** | 7.1 | DONE | Individual flight noise footprint on map |
| **P2** | 4.2 | DONE | Altitude compliance library (integration when bulk tracks available) |
| **P2** | 6.1 | BLOCKED | Integrated complaint view (waiting on Town data) |
| **P2** | 7.3 | DONE | Historical data validation + backfill script |

---

## Additional Cleanup Performed

Beyond the explicit feedback items, the following credibility-related cleanup was done:

| File | Change |
|---|---|
| `components/OperatorScorecard.tsx` | Replaced biodiversity violations with curfew/noise/shoulder metrics |
| `components/noise/FlightDetailsSidebar.tsx` | Removed biodiversity impact section |
| `components/FlightPathReplay.tsx` | Fixed curfew threshold from 8 PM to 9 PM |
| `lib/exportUtils.ts` | Updated OperatorReport to curfew/noise fields |
| `__tests__/exportUtils.test.ts` | Updated test to match new OperatorReport interface |

---

## Files Changed Summary

| File | Changes |
|---|---|
| `app/page.tsx` | Add TopCurfewViolators; remove loadNoiseData |
| `components/ComplianceDashboard.tsx` | Fix label; remove species; reweight scores |
| `components/AirportMap.tsx` | Hide noise controls; add noise footprint rendering |
| `components/StatsCards.tsx` | Expand Noise Index; add shoulder count |
| `components/CurfewChart.tsx` | Add shoulder hour highlighting |
| `components/OperatorScorecard.tsx` | Replace biodiversity with curfew/noise metrics |
| `components/noise/FlightDetailsSidebar.tsx` | Remove biodiversity section |
| `components/FlightPathReplay.tsx` | Fix curfew threshold |
| `components/TopCurfewViolators.tsx` | New: prominent top 10 ranking widget |
| `lib/altitudeCompliance.ts` | New: Pilot's Pledge altitude compliance library |
| `lib/noise/footprintCalculator.ts` | New: ground-level noise contour calculator |
| `lib/exportUtils.ts` | Update OperatorReport interface |
| `scripts/backfill.sh` | New: historical data backfill convenience script |

---

## Notes

1. **Credibility is the theme.** All biodiversity/species/habitat features removed from
   user-facing components. No mock data shown to Town officials.

2. **The Pilot's Pledge is the anchor.** Compliance metrics reference the curfew (9 PM -
   7 AM), shoulder periods (7-8 AM, 8-9 PM), noise thresholds (85 dB), and altitude
   minimums (3,500/1,500/1,000 ft by category).

3. **Only complaint integration remains blocked** on receiving Town data via FOIL or
   direct request. All infrastructure is in place.
