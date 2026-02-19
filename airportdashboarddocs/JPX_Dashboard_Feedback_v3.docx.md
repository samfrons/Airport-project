**JPX Dashboard**

Implementation Feedback v3

February 16, 2026  |  Prepared by Marc Frons, WCAC

*This document reflects a review of the latest dashboard build (screenshots dated Feb 16, 2026). The navigation restructure, summary cards, and aircraft breakdown are all excellent. This feedback addresses remaining bugs, consistency issues, and three new feature requests.*

# **1\. Bugs — Fix First**

These issues affect data accuracy and must be resolved before any external review.

## **1.1 Violation Count Logic Is Broken**

On the Operations page, Total Ops \= 35, Violations \= 35, Critical \= 35, Protected Spp Events \= 35\. Everything equals everything. On the Aircraft & Operators page, Private/Unknown shows 85 flights / 85 violations (100% violation rate), and Blade shows 15/15. The violation classification logic appears to be flagging every flight as a violation. This makes all compliance metrics meaningless.

**Fix:** Debug the violation classification logic. A violation should only be flagged when a flight operates during the curfew window (9 PM – 7 AM ET) or when the aircraft type is classified as a noise concern. Most daytime fixed-wing prop operations should show zero violations.

## **1.2 Curfew Threshold Inconsistency**

The Overview summary card correctly shows “9 PM – 7 AM ET” (Pilot’s Pledge standard). However, three other locations still use the old 8 PM – 8 AM window:

1. Curfew Compliance section subtitle: “Voluntary curfew (8 PM – 8 AM ET) — 21 violations detected”

2. Flight Activity Replay: curfew shading shows 8p–8a

3. Hourly operations table: marks “curfew” starting at 8 PM

**Fix:** Single source of truth. Define CURFEW\_START \= 21 (9 PM) and CURFEW\_END \= 7 (7 AM) as constants. Every component that references the curfew window should read from these constants.

## **1.3 Helicopter Operations Card Subtitle**

The “Helicopter Operations: 52” card shows “51 jet · 44 prop” as its subtitle. Those are counts for the other aircraft types, not helicopter subtypes. This is confusing under a helicopter-specific card.

**Fix:** Change subtitle to show helicopter-specific context: “35% of all operations” or a top-type breakdown like “11 S76 · 11 R44 · 8 EC35”.

## 

## **1.4 PC12 Miscategorized as Jet**

The Pilatus PC-12 (ICAO: PC12) appears under “Jets” in the Aircraft Type Breakdown. The PC-12 is a single-engine turboprop and belongs under Fixed Wing. At 77 dB it is the quietest entry in the Jets list, which is a visible clue. Check whether other turboprops (e.g., TBM, King Air variants) are also being miscategorized.

**Fix:** Review the ICAO type code classification mapping. Turboprops should be classified as Fixed Wing, not Jet. The distinction matters because jet counts feed into the Noise Index.

## **1.5 Dual Date Range Pickers**

The Overview page has the main date range picker at the top (02/01–02/28) but the “Noise & Environment Impact Timeline” section has its own separate picker (02/09–02/16) showing a different data window. This means the summary cards show one dataset and the charts below show another.

**Fix:** One date range controls everything on the page. Remove the secondary picker from the Operations/Timeline section, or sync it to the global picker.

# **2\. Remove or Hide**

## **2.1 All Biodiversity / Species References**

We have no data source for biodiversity or species impact. The following elements should be removed entirely:

* “Species Protection 25%” weight in the Compliance Score (currently showing 0%, which drags the overall score to 48 “Poor”)

* “Daily Biodiversity Violations by Severity” chart (all bars showing Critical/red)

* “Protected Species & Habitat Impact Over Time” chart

* “Wildlife Impact” toggle on the Flight Map

* “Protected Spp. Events: 35” metric in Operations mini-cards

After removal, reweight the Compliance Score across Curfew and Noise only (see 2.2).

## **2.2 Compliance Score Redesign**

The current composite score (Curfew 30%, Noise 30%, Species 25%, Volume 15%) produces a single number that invites arguments about weighting. With Species and Volume removed due to missing data, the score becomes simpler.

**Recommendation:** Show Curfew Compliance % and Noise Compliance % as separate, clearly labeled metrics rather than combining them into one score. “Curfew Compliance: 86%” and “Noise Compliance: 75%” are defensible, transparent numbers. A combined “48 Poor” grade is editorially risky and harder to defend. If the composite score is retained, at minimum, remove the two data-less categories and reweight to Curfew 50% / Noise 50%.

## **2.3 Empty Noise Layer Toggles on Flight Map**

The Flight Map shows toggle switches for “Noise Sensors,” “Aircraft Noise,” and “Complaints” under Noise Layers, plus “Wildlife Impact” under Biodiversity. None of these have data sources yet. Showing empty toggles implies capabilities we don’t have.

**Fix:** Hide all toggles until the corresponding data source is connected. When complaint data arrives, re-enable the Complaints toggle. When/if noise monitors are deployed, re-enable Noise Sensors.

# **3\. Labeling & Clarity**

## **3.1 Noise dB Values Need Source Label**

The Operations section shows “Avg Noise 81 dB” and “Peak Noise 88 dB,” and the Aircraft Breakdown shows per-type dB estimates. These are modeled estimates based on ICAO type-certification data, not on ground-level measurements from physical monitors.

**Fix:** Label as “Est. 81 dB” or “\~81 dB (modeled)”. Add a footnote or tooltip: “Noise estimates based on aircraft type certification data. Actual ground-level noise varies with altitude, distance, and atmospheric conditions. No physical noise monitors are currently installed at JPX.” This is critical for credibility — when someone asks “where are your noise monitors?” we need the answer to be obvious.

## **3.2 Noise & Impact Section Placeholder**

The Noise & Impact section shows: “Noise monitoring data will appear here when sensors are installed. Contact the Wainscott CAC for updates on monitoring deployment.” This is good — honest and forward-looking. Keep it.

# **4\. New Feature Requests**

## **4.1 Historical Volume Comparison**

This is the most important new feature for the community. The core question residents care about: “Is it getting worse?” We need the ability to compare operation volumes across equivalent time periods.

**What to build:** A comparison view where the user selects a time period and sees it side-by-side with the same period from the prior year. For example: “This July vs. Last July,” “This Summer vs. Last Summer,” or custom date ranges.

Breakdowns needed:

* Total operations: year-over-year change (absolute and percentage)

* By aircraft type: helicopters, jets, fixed wing — separately, because total ops might be flat while helicopter ops are surging

* By time period: day of week, hour of day, month — to identify shifting patterns

* By operator: who is increasing/decreasing volume (especially helicopter operators like Blade)

**Data availability:** FlightAware AeroAPI has historical data back to 2011\. The daily\_summary table already stores the data needed. This is primarily a frontend visualization task. Note: Verify that the pipeline correctly handles KHTO (pre-May 2022\) and KJPX (post-May 2022\) airport identifiers across the full historical range.

**Suggested UI:** Add a “Compare” toggle to the date range selector. When enabled, show two overlaid data series on the existing charts (current period in solid, comparison period in dashed/lighter). Include a summary showing “+15% total ops, \+32% helicopter ops vs. same period last year.”

**LOE:** Medium. Data exists in the pipeline; this is visualization and UI work.

## **4.2 Color System Overhaul**

The current color usage sends mixed signals. The Aircraft Breakdown uses red for helicopters, blue for jets, and green for fixed-wing. But red visually reads as “bad” and green as “good,” which implies helicopters are inherently bad and fixed-wing are good — a helicopter operation at 2 PM is perfectly compliant.

**Principle:** Red and green should be reserved exclusively for compliance status (violation vs. compliant). Aircraft types should use a neutral, distinct palette.

Proposed color assignments:

* Compliance: Green \= compliant, Red \= violation (curfew breach, noise threshold exceeded)

* Aircraft types: Warm orange or coral for helicopters, Steel blue for jets, Teal or sage for fixed wing. Distinct but not emotionally loaded.

* Complaints (future): Purple or gold markers/icons that overlay on maps and charts without conflicting with the compliance color system

* Curfew shading on timeline/replay: Use a neutral gray or light purple band, not red

**LOE:** Low. CSS/theme changes. Define a color constant file so all components reference the same palette.

## **4.3 Clickable Summary Cards → Detail Reports**

Each summary card on the Overview should be clickable, opening an in-page detail panel with the underlying data for the selected date range.

Proposed click-through behavior:

* **Total Operations:** Opens filtered flight list showing all operations, sortable by date, time, aircraft type, operator, and tail number.

* **Helicopter Operations:** Opens filtered flight list showing only helicopter operations, sorted by operator. Blade’s 15 flights appear at the top. Shows operator subtotals.

* **Curfew Violations:** Opens violators table showing each flight that operated during 9 PM – 7 AM: timestamp, tail number, ICAO type, operator, arrival/departure. Highlight repeat offenders (operators with 3+ violations in the period). This is the most politically important click-through.

* **Noise Index:** Opens list of operations classified as high-noise (helicopters \+ Stage 2 jets), showing type, estimated dB, and operator.

Each detail panel should include an “Export CSV” button to export data for use at a Town Board meeting or to share with committee members.

**LOE:** Medium. The data already exists in the flights table; this is routing, filtering, and display. Suggest using a slide-out panel or modal rather than navigating to a new page, so the user doesn’t lose context.

# 

# **5\. Noise Estimate Methodology Note**

Since the dB values shown throughout the dashboard are modeled (not measured), we need a brief methodology note accessible from anywhere noise data appears. This could be a tooltip, a footnote, or a dedicated info panel.

Suggested text:

*"Noise estimates are derived from ICAO aircraft type certification data and do not represent actual ground-level measurements. Actual noise exposure varies with altitude, distance, flight path, atmospheric conditions, and aircraft configuration. No physical noise monitoring equipment is currently installed at JPX. For measured noise data, the Town would need to deploy noise monitoring terminals (NMTs)."*

# **6\. Implementation Priority**

Work top to bottom. Bugs first, then cleanup, then new features.

| \# | Item | Type | LOE | Impact |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Fix violation count logic | Bug | Medium | **Critical** |
| 2 | Sync curfew to 9 PM – 7 AM everywhere | Bug | Low | **Critical** |
| 3 | Remove all biodiversity/species references | Cleanup | Low | **High** |
| 4 | Fix the Helicopter Operations card subtitle | Bug | Low | Medium |
| 5 | Reclassify PC12 as Fixed Wing (and audit others) | Bug | Low | Medium |
| 6 | Hide empty Noise Layer toggles on map | Cleanup | Low | Medium |
| 7 | Unify date range pickers (one picker per page) | Bug | Low | Medium |
| 8 | Label noise values as estimates | Labeling | Low | **High** |
| 9 | Color system overhaul | Feature | Low | **High** |
| 10 | Redesign Compliance Score (separate metrics) | Design | Medium | Medium |
| 11 | Clickable summary cards → detail panels | Feature | Medium | **High** |
| 12 | Historical volume comparison view | Feature | Medium–High | **Critical** |

# 

# **7\. What’s Working Well**

For the record, these elements are strong and should not be changed:

* 7-item navigation structure flows logically top to bottom — exactly as specified

* Summary cards show the right four metrics (Total Ops, Helicopter Ops, Curfew Violations, Noise Index)

* “Updated Feb 16, 12:46 PM” timestamp replaces the misleading “LIVE DATA” toggle

* Aircraft Type Breakdown with ICAO codes, dB estimates, and color-coded horizontal bars is excellent

* Operator Scorecards with sort options (Violations, Critical, Rate, Flights, Name) are presentation-ready

* Flight Map with color-coded routes by aircraft type looks sharp

* Flight Activity Replay with 24-hour timeline playback is a powerful feature

* Hourly operations table with curfew flagging provides granular detail

* Complaints section with “File a Complaint” button linking to PlaneNoise is correct

* Airport Diagram is a beautiful, professional addition

* Footer properly credits FlightAware AeroAPI and Wainscott Citizens Advisory Committee

* Export CSV and Export Compliance Report buttons are valuable for committee use

*Questions: marc.frons@gmail.com*