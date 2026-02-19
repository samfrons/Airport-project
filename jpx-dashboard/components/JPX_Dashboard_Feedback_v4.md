**JPX Dashboard**

**Implementation Feedback v4**

February 18, 2026  │  Prepared by Marc Frons, WCAC  │  Build reviewed: airport-project-one.vercel.app

*This document supersedes v3 (February 16, 2026). It reflects a full live review conducted February 18 using direct API verification and DOM inspection. Section 1 tracks the status of all v3 items. Sections 2–4 contain new bugs, UI issues, and features to implement. Section 5 is the consolidated implementation priority table.*

 

 

# **What’s Working — Do Not Change**

The following elements are strong and should be preserved in all future builds:

•   	7-item navigation structure flows logically top to bottom

•   	Summary cards show the right four metrics (Total Ops, Helicopter Ops, Curfew Violations, Noise Index)

•   	Data freshness timestamp (e.g. “Updated Feb 16, 12:46 PM”) replaces the old “LIVE DATA” label — honest and correct

•   	Aircraft Type Breakdown with ICAO codes, dB estimates, and color-coded horizontal bars is well-designed

•   	Operator Scorecards with sort options (Violations, Critical, Rate, Flights, Name) are presentation-ready

•   	Flight Map with color-coded routes by aircraft type looks sharp

•   	Flight Activity Replay with 24-hour timeline is a powerful and distinctive feature

•   	Hourly operations table with curfew flagging provides granular detail

•   	Complaints section with “File a Complaint” button linking to PlaneNoise is correct

•   	Airport Diagram is a professional addition

•   	Footer credits FlightAware AeroAPI and Wainscott Citizens Advisory Committee correctly

•   	Export CSV and Export Compliance Report buttons are valuable for committee use

•   	Overview summary cards now correctly open detail panels on click

 

 

# **Section 1 — Status of v3 Feedback Items**

Each item from the February 16 feedback document has been re-verified against the live build. **Green \= confirmed fixed. Orange \= partially addressed. Red \= not yet done.**

 

| v3 Item | Status | Notes |
| :---- | :---- | :---- |
| 1.1 Violation Count Logic | **✅ Fixed** | Curfew violations \= 15; operator scorecards correctly show “Clean violations” for most operators |
| 1.2 Curfew Threshold (9 PM–7 AM everywhere) | **✅ Fixed** | Curfew Compliance section now reads “9 PM – 7 AM ET” consistently |
| 1.3 Helicopter Card Subtitle | **✅ Fixed** | Now shows “35% of total ops” — correct |
| 1.4 PC12 Reclassification as Fixed Wing | **✅ Fixed** | PC12 now appears in Fixed Wing group with green bar |
| 1.5 Dual Date Range Pickers | **⚠️ Partial** | Not re-verified in this session; flag for Sam to confirm the secondary picker was removed |
| 2.1 Remove All Biodiversity/Species References | **⚠️ Partial** | Charts removed; but a footnote reading “Biodiversity thresholds based on peer-reviewed research” still appears on the heatmap. Remove this line. |
| 2.2 Compliance Score Redesign | **⚠️ Partial** | Now shows Curfew and Noise as two separate gauges (good). But Noise 75% derives from a wrong exceedance count — see Bug 2.3 below. |
| 2.3 Hide Empty Map Layer Toggles | **✅ Fixed** | No empty noise or wildlife toggles visible on Flight Map |
| 3.1 Label Noise dB Values as Estimates | **⚠️ Partial** | “EST. NOISE” appears on individual flight cards. Not applied consistently in charts, tables, or the hour-by-hour summary. Needs completion. |
| 3.2 Noise & Impact Section Placeholder | **✅ Fixed** | Placeholder message is honest and forward-looking — kept as-is per v3 recommendation |
| 4.1 Historical Volume Comparison | **🔴 Not Done** | No year-over-year comparison view implemented. Still the highest-priority new feature. |
| 4.2 Color Legend and Threshold Labels | **🔴 Not Done** | No legend, no threshold labels, no cited standards. The red/orange/yellow/green color scheme itself is correct and should be kept — the fix is making the thresholds visible and anchored to FAA/EPA/WHO standards |
| 4.3 Clickable Summary Cards → Detail Panels | **✅ Fixed** | All four overview cards open detail panels on click |

 

 

# **Section 2 — Bugs: Fix Before Any External Review**

These issues produce wrong numbers in the dashboard. All were discovered by cross-referencing displayed values against the FlightAware API directly.

 

## **Bug 2.1 — Noise Index Card: Three-Way Calculation Inconsistency**

**Where:** Overview page, Noise Index card \+ its detail panel

**Problem:** The card face, the card subtitle, and the detail panel all compute different numbers from the same data.

| Location | Value Shown | What It’s Actually Counting |
| :---- | :---- | :---- |
| Card face | 52 | Helicopters only — jets silently dropped |
| Card subtitle | Heli \+ loud jets | Label implies 77 (52 helis \+ 25 loud/very\_loud jets) — correct intent, wrong count on face |
| Detail panel | 94 | All helis \+ ALL jets regardless of noise level — noise filter dropped |
| Correct value | 77 | 52 helicopters \+ 25 loud/very\_loud jets (API-verified for Feb 2026\) |

 

**Fix:** Define a single getNoiseIndex(flights) function. Logic: all helicopters \+ jets where noise\_category \=== ‘loud’ or ‘very\_loud’. Card face, card subtitle, and detail panel must all call this same function.

 

## **Bug 2.2 — Noise Exceedance Count and Noise Compliance % Both Wrong**

**Where:** Curfew Compliance → Compliance Metrics → Regulatory Summary

**Problem:** The Regulatory Summary shows “Noise Exceedance Count (Est. ≥85 dB): 37 flights” and “Noise Compliance: 75%.” Neither number can be reproduced from the API.

| Noise Field Used | Flights ≥85 dB | Notes |
| :---- | :---- | :---- |
| effective\_db (per-flight measured) | 21 | The most accurate field — high-confidence per-flight value |
| takeoff\_db | 22 |   |
| approach\_db | 18 |   |
| Max across all three fields | 26 |   |
| Dashboard claims | 37 | Cannot be reproduced from any API field — likely uses FAA type-certification reference values (fixed per aircraft model, not per-flight) |

 

**Impact:** Noise Compliance % flows directly from this count. Using effective\_db, the correct rate is 85.7%, not 75% — a 10-point gap that will be challenged if anyone audits the data.

**Fix:** Decide on a single canonical noise source and document it. Recommendation: use effective\_db with a disclosed methodology note. If FAA type-certification values are intentionally used (they are more conservative and defensible), state so explicitly in the UI and on the export report. Update the exceedance count and compliance % accordingly.

 

## **Bug 2.3 — Repeat Offenders Label Says “3+” But Counts “2+”**

**Where:** Compliance Metrics → Regulatory Summary row: “Repeat Offenders (3+ violations)”

**Problem:** The row reports 2 operators. But Blade has 4 curfew violations and HeliNY has 2\. HeliNY does not meet the stated 3+ threshold. Either the label is wrong or the count is wrong.

**Fix:** Change label to “Repeat Offenders (2+ violations)” to match actual logic, or change threshold to 3+ and remove HeliNY from the count.

 

## **Bug 2.4 — Flight Activity Replay: Wrong Peak Noise and Wrong Tail Number**

**Where:** Flight Map → Flight Activity Replay → stats bar at 16:00 ET

**Problem:** The stats bar displays “Peak Noise: 85 dB (N209LX).” Per the API, N209LX flew at 11 AM with effective\_db \= 82\. The actual peak through 4 PM is N306JR at 84 dB. The wrong flight and wrong dB are both shown.

**Fix:** The cumulative peak calculation should compare effective\_db across all flights up to the current playhead hour and surface the highest value and its registration number.

 

## **Bug 2.5 — Noise dB Inconsistent Even Within the Hour-by-Hour Table**

**Where:** Flight Map → Flight Activity Replay → Hour-by-Hour Summary table

**Problem:** Some hours show values matching effective\_db; others are off by \+3 dB (consistent with FAA type-certification offsets). This means the table is mixing two different data sources — worse than consistently using either one.

| Hour | Table Shows (Avg/Peak) | API effective\_db | Delta |
| :---- | :---- | :---- | :---- |
| 11 AM | 85 / 85 | 82 / 82 | \+3 dB — using cert data |
| 4 PM | 81 / 81 | 84 / 84 | −3 dB — using cert data |
| 5 PM | 82 / 90 | 82 / 90 | Correct — matches effective\_db |
| 7 PM | 77 / 78 | 77 / 78 | Correct — matches effective\_db |

 

**Fix:** Choose one source consistently. Use effective\_db throughout. The mixed-source behavior is harder to defend than any single methodology.

 

## **Bug 2.6 — Data Pipeline Stalled: Missing 7 Days**

**Where:** All sections — systemic

**Problem:** The latest flight in the database is February 11\. Today is February 18\. The operations heatmap shows seven blank days, the replay has no data after Feb 11, and any “This Month” view is presenting an incomplete picture. This will be particularly damaging if the dashboard is shared publicly while stale.

**Fix:** Investigate and restart the FlightAware AeroAPI ingestion job. Check the Vercel cron log and API rate limit status. Add a visible data freshness indicator showing the actual date of the last ingested flight — not the page load time.

 

## **Bug 2.7 — 2025 Historical Data Incomplete**

**Where:** Applies to any comparison or trend view covering 2025

**Problem:** The database contains only January 1 – February 16, 2025 (446 flights). March through December 2025 is entirely missing — including the critical summer peak season. Any year-over-year comparison will be severely misleading until this is backfilled.

**Fix:** Backfill full 2025 historical data from FlightAware AeroAPI (historical data available back to 2011). Also verify that the pipeline correctly handles the KHTO (pre-May 2022\) and KJPX (post-May 2022\) airport code transition across the full historical range.

 

 

# **Section 3 — UI and Data Clarity Issues**

These are not data accuracy bugs but significantly affect usability, interpretability, and credibility for public presentations.

 

## **3.1 — Detail Panel Overlay Obscures Context**

**Where:** Overview page — all four clickable cards

When any summary card is clicked, the rest of the page blurs and darkens. This reads as a bug rather than intentional design, and it removes the context the user may need to interpret the detail data.

**Fix:** Replace the blur overlay with a right-side drawer panel (no overlay) or a split-pane layout (40% drawer, 60% compressed main content). The main content should remain visible and readable while the detail panel is open.

 

## **3.2 — “Status” Column Is Empty Everywhere**

**Where:** All detail panels (Total Ops, Helicopter, Curfew, Noise) and the Curfew Violations table

The Status column appears in every detail table but shows only dashes. It adds visual clutter without providing information.

**Fix:** Either populate it (complaint filed, contested, resolved, waived) or remove it. If the intent is future functionality, remove the column for now and re-add when the data exists.

 

## **3.3 — Detail Panels Missing dB and Direction Columns**

**Where:** All Operations detail panel; Helicopter Operations detail panel

The detail panels show aircraft type and operator but omit two of the most useful fields for advocacy: estimated noise level and whether the flight was an arrival or departure.

**Fix:** Add “Est. dB” and “Arr/Dep” columns to the All Operations and Helicopter detail panels. Both fields exist in the API response.

 

## **3.4 — No Color Legend on Aircraft Type Breakdown**

**Where:** Aircraft & Operators → Aircraft Type Breakdown

The horizontal bars use red, orange, yellow, and green to encode noise level, but there is no legend anywhere on the page explaining what each color means or what dB threshold triggers each color change.

| Color | Observed Range | Recommended Threshold | Anchor |
| :---- | :---- | :---- | :---- |
| ■ Red | 88–90 dB | \> 85 dB | OSHA action level; above this level affects hearing in sustained exposure |
| ■ Orange | 82–87 dB | 75–85 dB | FAA Part 150 “significant impact” review zone |
| ■ Yellow | 76–81 dB | 65–75 dB | WHO guideline; FAA “compatible” zone upper boundary |
| ■ Green | 69–75 dB | \< 65 dB | Below EPA recommended outdoor threshold |

 

**Fix:** Add an inline legend above the chart with these four color blocks, threshold values, and a cited standard for each. The legend should appear directly above the chart, not in a tooltip or footnote — it needs to be visible in screenshots and exports used at town board presentations.

**Important:** The color choices themselves are correct. Red for a 90 dB Gulfstream is the right call for an advocacy tool — the problem is not the colors but the absence of justification. Without a legend, the color scheme can be dismissed as subjective. With labeled, standards-based thresholds, the same red bar carries the weight of “this aircraft exceeds the FAA Part 150 significant impact threshold” — a claim that is much harder to argue with at a town board meeting.

 

## **3.5 — Noise dB Source Not Consistently Labeled**

**Where:** Applies throughout — Aircraft Breakdown, Compliance Metrics, Hour-by-Hour table, flight cards

**Carried from v3 item 3.1 — partially implemented.** The “EST. NOISE” label appears on individual flight cards but not in chart axes, table column headers, or the compliance metrics section.

**Fix:** Apply the “(Est.)” or “∼” prefix universally to every dB value displayed — chart axes, table headers, card values. Add one global footnote: “Noise estimates are derived from FAA aircraft type certification data. Actual ground-level noise varies with altitude, distance, flight path, and atmospheric conditions. No physical noise monitoring equipment is currently installed at JPX.”

 

## **3.6 — “Passing (80)” Reference Line on Compliance Trend Chart Is Unexplained**

**Where:** Curfew Compliance → Compliance Trend chart

A horizontal green reference line labeled “Passing (80)” crosses the chart. There is no tooltip, no footnote, and no explanation of what 80% means or who set it as the passing threshold.

**Fix:** Add a tooltip or footnote: e.g., “80% is the internal benchmark for acceptable compliance; it does not represent an FAA or town-mandated standard.” Alternatively, if this is an arbitrary round number, replace it with a labeled standard or remove it.

 

## **3.7 — Flight Map: Airport Tab Is Empty / Unfinished**

**Where:** Both the embedded Curfew Compliance map and the standalone Flight Map section

Clicking the “Airport” tab shows only the regional map and an auto-opened popup reading “KJPX / East Hampton Town Airport / East Hampton, NY.” There are no runway markers, aircraft positions, approach paths, or other airport-specific content.

**Fix:** If this tab is intended to show runway layout or traffic patterns and is not yet built, hide the tab or replace it with a “Coming soon” placeholder. Do not leave a functional-looking tab that delivers nothing.

 

## **3.8 — Flight Map: Heatmap and Route Map Have No Legends**

**Where:** Flight Map → Heatmap tab; Flight Map → Routes tab

The heatmap renders without a legend. Users cannot tell whether color intensity represents flight count, noise level, or a combination. On the Routes tab, airport bubble sizes appear to encode volume, but this is also unlabeled.

**Fix:** Add a two-line legend to the heatmap (“Red \= high traffic density, Blue \= low” or equivalent). Add a tooltip to each airport bubble on the Routes tab showing: airport name, total ops count, and breakdown by aircraft type.

 

## **3.9 — Map Legend: “Unknown” Row and “147 ops” Total Visually Ambiguous**

**Where:** Flight Map legend (all tabs)

The legend shows Helicopter 52 / Jet 42 / Fixed Wing 53 / Unknown (no count), with “147 ops” appearing below. The layout makes “147 ops” read as Unknown’s subtotal rather than the grand total.

**Fix:** Either give Unknown its own count (0 for the current dataset) or remove the row. Style “147 ops” as a clearly distinct total footer — different weight, separator line, or label like “Total: 147”.

 

## **3.10 — Flight Activity Replay: “Active Flights” Label Is Misleading**

**Where:** Flight Map → Flight Activity Replay

The section below the timeline is labeled “Active Flights · \[hour\].” This implies live/real-time data. The feature is a historical replay of what flew during that hour on the selected past date.

**Fix:** Rename to “Flights at \[hour\]” or “Operations at 4 PM.” Reserve “Active” for any future real-time feed.

 

## **3.11 — Replay Date Selector Defaults to Feb 6, Not Latest Available Date**

**Where:** Flight Map → Flight Activity Replay → date picker

The date selector opens on February 6, which is neither the current date nor the latest date with data (February 11). Users clicking into this feature for the first time see stale and non-obvious data.

**Fix:** Default the selector to the latest date for which ingested data exists.

 

## **3.12 — Operator Identity Gap: 58% of Operations Have No Operator**

**Where:** Aircraft & Operators → Operator Scorecards; Curfew Violations table

Private/Unknown accounts for 85 of 147 flights (58%) this month. This is particularly damaging in the Curfew Violations table, where 10 of 15 violations show “—” in the Operator column.

**Fix:** Surface this gap explicitly. Add a note to the Operator Scorecards section: “\[N\] of \[total\] operations this period have no identified operator.” On the curfew violation table, add a similar summary line. This frames the gap as a data quality and accountability issue — which it is — rather than hiding it in silent dashes.

 

## **3.13 — Minor Fixes**

•   	**“1 ops” grammar:** Change to “1 op” wherever operation count equals 1 (heatmap tooltips, replay header).

•   	**Noise & Impact nav item:** Gray out or add a “planned” badge. A prominent nav item pointing to a placeholder creates a dead-end impression.

•   	**“Wainscott CAC” abbreviation:** Spell out as “Wainscott Citizens Advisory Committee” in the Noise & Impact placeholder text. The abbreviation is opaque to outside visitors.

•   	**“Track” button on flight cards:** Label as “Track on FlightAware ↗” so users know where the link goes before clicking.

 

 

# **Section 4 — Features to Implement**

 

## **4.1 — Historical Volume Comparison View \[CRITICAL — Carried from v3\]**

The single most important question for the WCAC community is: “Is it getting worse?” The dashboard cannot answer this without a year-over-year comparison. Note that this feature is blocked until the 2025 full-year backfill (Bug 2.7) is complete.

**What to build:** A “Compare” toggle on the date range selector. When enabled, overlay the same period from the prior year on all existing charts (current period in solid, prior year in dashed/lighter). Show a summary delta: “+15% total ops, \+32% helicopter ops vs. same period last year.”

Breakdowns needed: total operations year-over-year; by aircraft type (helicopters separately from jets/fixed wing, since total ops may be flat while helicopter ops surge); by time period (day of week, hour of day, month); by operator.

**Data note:** FlightAware AeroAPI has historical data to 2011\. The daily\_summary table already has the needed structure. Verify KHTO/KJPX airport code transition handling across the full historical range.

**Suggested UI:** Add “Compare” toggle next to the date picker. Comparison period shown in dashed/lighter style on existing charts. Include summary callout: “+15% total ops, \+32% helicopter ops vs. same period last year.”

 

## **4.2 — Custom Tooltips for Operations Heatmap**

**Where:** Operations → Operations Heatmap

The current heatmap uses native browser title attributes for tooltips, which are slow to appear, cannot be styled, disappear on screenshot, and truncate long content. They also contain a grammatical error (“1 ops”).

**What to build:** Replace with a custom React tooltip component (Radix UI Tooltip or Floating UI) showing:

•   	Formatted date/time: Sunday, Feb 1 · 10:00–11:00 AM ET

•   	Aircraft breakdown: 3 helicopters, 2 fixed-wing, 1 jet

•   	Direction split: 6 arrivals, 1 departure

•   	Avg and peak noise: avg 80 dB (Est.), peak 84.5 dB

•   	Curfew flag if applicable

•   	Sample tail numbers: N76BL, N166RB, N135EC…

•   	Grammar fix: “1 operation” not “1 ops”

 

## **4.3 — Add Version / Build Info to Footer**

When screenshots or exports are shared with the town board, there is no way to know which build they came from or how current the data is.

**What to build:** Add to the footer: version number (or Git commit hash), build date, and the actual date of the last ingested flight. Example: “Build v4.2 • Feb 18, 2026 • Data through Feb 11, 2026.”

 

 

# **Section 5 — Implementation Priority**

Work top to bottom. Bugs first, then UI/clarity, then features. Items marked Critical should be resolved before any external presentation or public URL sharing.

 

| \# | Item | Type | LOE | Impact |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Fix Noise Index calculation (card, subtitle, panel all use same function) | **Bug** | Low | **Critical** |
| 2 | Fix noise exceedance count: choose one source, document it, recalculate Noise Compliance % | **Bug** | Low | **Critical** |
| 3 | Fix “Repeat Offenders (3+)” label — change to 2+ or fix the count | **Bug** | Low | **Critical** |
| 4 | Investigate and restart data ingestion pipeline; add data freshness indicator | **Bug** | Medium | **Critical** |
| 5 | Fix replay peak noise: show correct tail \# and dB (effective\_db, cumulative) | **Bug** | Low | **Critical** |
| 6 | Fix hour-by-hour table: use effective\_db consistently, not mixed sources | **Bug** | Low | **Critical** |
| 7 | Backfill full 2025 historical data (Mar–Dec missing) | **Bug** | High | **Critical** |
| 8 | Remove residual “Biodiversity thresholds” footnote from heatmap | **Cleanup** | Low | **High** |
| 9 | Replace detail panel blur overlay with right-side drawer | **UI** | Medium | **High** |
| 10 | Remove or populate “Status” column in all detail tables | **Cleanup** | Low | **High** |
| 11 | Add dB and Arr/Dep columns to detail panels | **UI** | Low | **High** |
| 12 | Add color legend \+ threshold labels to Aircraft Type Breakdown | **Labeling** | Low | **High** |
| 13 | Apply “Est.” label to all dB values consistently; add global footnote | **Labeling** | Low | **High** |
| 14 | Fix map legend: Unknown row count; “147 ops” styled as total footer | **UI** | Low | **Medium** |
| 15 | Explain or remove “Passing (80)” reference line on trend chart | **Labeling** | Low | **Medium** |
| 16 | Hide or replace Airport tab (empty placeholder) | **UI** | Low | **Medium** |
| 17 | Add heatmap legend; add bubble tooltips to route map | **UI** | Low | **Medium** |
| 18 | Rename “Active Flights” → “Flights at \[hour\]” | **Labeling** | Low | **Medium** |
| 19 | Default replay date selector to latest data date (not hardcoded Feb 6\) | **Bug** | Low | **Medium** |
| 20 | Surface operator identity gap (58% unknown) in Scorecards and curfew table | **UI** | Low | **Medium** |
| 21 | Verify dual date range pickers fixed (v3 item 1.5) | **Bug** | Low | **Medium** |
| 22 | Minor fixes: “1 ops” grammar, nav badge, CAC abbreviation, Track button label | **Cleanup** | Low | **Low** |
| 23 | Add version/build date/data freshness to footer | **Feature** | Low | **Medium** |
| 24 | Custom heatmap tooltips (replace native title attributes) | **Feature** | Medium | **High** |
| 25 | Historical volume comparison view (requires \#7 first) | **Feature** | High | **Critical** |
| 26 | Add noise threshold legend to Aircraft Breakdown: inline color blocks, labeled dB thresholds, cited standards (FAA Part 150, EPA, WHO) | **Feature** | Low | **High** |

 

 

**Questions:** marc.frons@gmail.com  •  Wainscott Citizens Advisory Committee

Dashboard: https://airport-project-one.vercel.app

# **Section 6 — Strategic Considerations**

These notes provide context for prioritization decisions and architectural choices. They don't change what needs to be built but may affect how Sam approaches the work.

## **6.1 — Treat the Noise Data Issues as One Refactor, Not Six Patches**

Bugs 2.1, 2.2, 2.4, 2.5, and labeling item 3.5 are all symptoms of the same root problem: there is no single canonical noise data source, and different components pull from different fields (effective\_db, takeoff\_db, approach\_db, or FAA type-certification reference values). The recommendation to standardize on effective\_db is correct — it is per-flight and empirical rather than a fixed lookup by aircraft model.

The architectural fix: define one getNoisedB(flight) function that every component calls, parallel to the getNoiseIndex fix for Bug 2.1. Sam should treat priority items 1, 2, 5, and 6 as a single coordinated "noise data consistency" sprint rather than four separate patches. This produces a more coherent fix and avoids the risk of resolving one bug while introducing inconsistency elsewhere.

## **6.2 — Pipeline Freshness Is the Most Visible Problem**

Bug 2.6 (seven days of missing data) should arguably be the very first fix, ahead of calculation bugs. A stale dashboard is worse than a dashboard with wrong numbers, because staleness is visible at a glance — the heatmap shows seven blank days, the replay has no data after Feb 11, and any visitor's first impression is "this thing is broken." Calculation errors require auditing to detect; a week of empty space requires only eyes.

The data freshness indicator recommended in Bug 2.6 is essential, but note the distinction between two different timestamps: (1) when the page was last loaded or refreshed (the current "Updated Feb 16, 12:46 PM" shows this), and (2) when the last flight was actually ingested into the database. The second is what matters. If the pipeline stalls again, the page refresh timestamp will keep updating while the data gets progressively staler. The footer should show both: "Page loaded: \[timestamp\] · Data through: \[last flight date\]."

## **6.3 — 2025 Backfill Timing Matters for Summer Comparisons**

The missing March–December 2025 data (Bug 2.7) blocks the historical comparison feature (4.1), which is the dashboard's most important political capability. If the goal is to have summer 2025 vs. summer 2026 comparisons ready by Memorial Day weekend, the backfill needs to start soon. FlightAware AeroAPI historical queries are straightforward but rate-limited, so a full-year backfill may take several days of scheduled batch pulls. Start this running in the background while other bugs are being fixed.

Also confirm that the pipeline correctly handles both KHTO (pre-May 2022\) and KJPX (post-May 2022\) airport identifiers. Any historical query before May 2022 must use the old code or it will return zero results.

## **6.4 — The Color Legend Is Strategically Important**

The recommendation in Section 3.4 to anchor the red/orange/yellow/green color scheme to published standards (OSHA, FAA Part 150, WHO, EPA) transforms the Aircraft Type Breakdown from an opinion about which planes are loud into a standards-based assessment. "This aircraft exceeds the FAA Part 150 significant impact threshold" is a fundamentally different claim than "we colored this bar red because it seemed loud." The former is defensible at a town board meeting; the latter is dismissible.

The document correctly notes that the color choices themselves are already right — the problem is exclusively the absence of visible justification. The legend should appear inline above the chart, not in a tooltip, because it needs to be visible in screenshots and PDF exports used at presentations.

## **6.5 — The Operator Identity Gap Is a Finding, Not Just a Data Problem**

Section 3.12 notes that 58% of operations have no identified operator, and 10 of 15 curfew violations show no operator. The instinct may be to treat this as a data quality issue to quietly fix. Instead, surfacing it explicitly is the right strategic move. "Two-thirds of curfew violations are committed by unidentified operators" is itself a politically significant finding — it highlights an accountability gap at the airport that the Town should be addressing.

FlightAware data includes registration (tail) numbers even when operator names are missing. A Phase 2 enhancement could cross-reference tail numbers against the FAA aircraft registry to recover owner/operator information for many of these flights. This would reduce the "unknown" percentage substantially without requiring any new data sources.

## **6.6 — The "Passing (80)" Line: Remove Rather Than Justify**

The Compliance Trend chart (Section 3.6) shows a horizontal green line labeled "Passing (80)." If this threshold is arbitrary, it should be removed rather than retroactively justified. Any benchmark the dashboard sets becomes a target that the aviation community will either game to or argue against. If the Pilot's Pledge community achieves 79% curfew compliance, we don't want to be in the position of defending why 80% is the magic number.

Better approach: show the raw compliance trend without a passing threshold and let the viewer draw conclusions. If a reference line is desired, anchor it to something externally defined — for example, the compliance rate from the prior year's same period, which creates a "better or worse than last year" comparison without imposing a subjective standard.

## **6.7 — Detail Panel UX: Drawer vs. Modal**

Section 3.1 recommends replacing the blur overlay with a right-side drawer. This is correct as a UX principle — clicking a summary card should not feel like leaving the page. However, Sam may have architectural reasons for the modal approach (e.g., the detail panels contain complex tables that need full width).

The key requirement: the user should be able to see the summary cards while reviewing the detail data, so they can click between cards without closing and reopening panels. A right-side drawer at 50–60% width accomplishes this. If full width is needed for the data tables, a slide-over panel that pushes the main content left (rather than overlaying and blurring it) would also work.

