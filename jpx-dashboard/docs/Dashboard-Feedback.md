**JPX Dashboard**

Consolidated Feedback & Implementation Guide

February 14, 2026  —  Marc Frons, WCAC

Sam — first of all, absolutely amazing job on this. Very slick, very professional. The map visualization is beautiful, and the overall build quality is impressive. What follows is a consolidated set of feedback organized by priority. **Work through it top to bottom** — the most impactful changes are first.

# **1\. Page Architecture & Navigation**

This is the most important structural change. The dashboard is a single-page layout with the sidebar acting as a table of contents. The nav items should mirror the physical order of sections on the page — first nav item scrolls to the top section, last item scrolls to the bottom, everything sequential in between. Right now, clicking through the nav jumps you up and down the page unpredictably.

**The order should tell a story:** start with the big picture (how busy is the airport?), drill into specifics (what’s flying, when, who’s violating curfew), then the map for spatial context, and finally action items like filing complaints.

## **Proposed Nav Structure**

Seven items, flat list, no sub-sections, no accordion menus:

| \# | Nav Label | What It Contains |
| :---- | :---- | :---- |
| 1 | **Overview** | Summary cards \+ key stats. This is the landing view. (Currently “Statistics.”) |
| 2 | **Operations** | Merge Timeline \+ Hourly Distribution. Answers: How busy is the airport and when? |
| 3 | **Aircraft & Operators** | Merge Aircraft Breakdown \+ Operator Scorecards. Answers: what’s flying and who’s flying it? |
| 4 | **Curfew Compliance** | THE politically important section. Combine current Compliance \+ Violations here. Include the violators table (time, aircraft type, operator, tail number) and repeat offender flagging. |
| 5 | **Flight Map** | Route map with heatmap toggle. Fold Flight Routes and Flight Replay into this section (Replay as a secondary button, not a nav item). |
| 6 | **Noise & Impact** | Noise index \+ environmental impact data (renamed from “Wildlife Impact”). Only show sections with real data behind them. |
| 7 | **Complaints** | For now: a prominent link out to the Town’s PlaneNoise form (planenoise.com/khto/). Eventually, our own integrated complaint view. |

## 

## **Items to Cut or Defer**

| Current Item | Action |
| :---- | :---- |
| Flight Replay | Tuck under Flight Map as a secondary feature/button |
| Flight Routes | Fold into Flight Map |
| Flight Log | Move to Settings or an admin-only view (power-user/debug tool) |
| Biodiversity | Cut unless real data exists. If kept, fold into Noise & Impact |
| Weather Correlation | Defer. Interesting for analysis, but not a public transparency metric |
| Noise Reports | Hide until we have a data source. Don’t show empty sections |
| Thresholds / Alerts | Settings only, not top-level nav items |

**Rule:** Section headers on the page must match the nav labels exactly. No surprises.

# **2\. Summary Cards (Top of Page)**

## **Current**

Total Operations  |  Unique Aircraft  |  Curfew Period  |  Wildlife Violations

## **Proposed**

**Total Operations  |  Helicopter Operations  |  Curfew Violations  |  Noise Index**

Why this matters: Helicopter ops is the single most politically important number for the communities around JPX. It should be on the top line, always visible. Once we have complaint data, we may swap Noise Index for Complaints.

## **Data Issues to Fix**

* **"Unique Aircraft: 40" card:** The breakdown underneath (21 heli \+ 27 jet \+ 23 prop \= 71\) shows total operations by type, not 40 unique aircraft. Either fix the breakdown to show unique counts by type, or relabel the card.

* **"Wildlife Violations: 71 / 100%":** Every operation can’t be a wildlife violation. This looks like a placeholder or data bug. Hide until the data is real.

# **3\. Labeling Changes**

| Current | Change To |
| :---- | :---- |
| "Statistics" | **"Overview"** |
| "Curfew Period: 10" | **"Curfew Violations: 10"** — current label sounds like it’s describing the time window, not counting violations |
| "8 PM – 8 AM ET" | **"9 PM – 7 AM ET"** — match the Pilot’s Pledge (see Section 4). Consider showing 7–8 AM and 8–9 PM shoulder periods as a separate count. |
| "LIVE DATA" toggle | **"Last updated: \[timestamp\]"** — architecture is a daily batch, not real-time. “Live” on a transparency tool could undermine credibility. |
| "Wildlife Impact" (everywhere) | **"Impact"** or **"Noise & Impact"** |
| Noise Layers panel on map (Noise Sensors, Aircraft Noise, Complaints) | **Hide all toggles that don’t have data sources yet.** Showing empty features to Town officials will hurt credibility. |

# **4\. Curfew & Noise Thresholds**

**Anchor everything to the East Hampton Pilot’s Pledge:** easthamptonalliance.org/pilot-pledge. The strategy is to hold the aviation community to its own stated standard. “Let’s start by taking them at their word and see how they do.”

## **Curfew Window**

The Pilot’s Pledge specifies a voluntary curfew of 9 PM – 7 AM. The dashboard currently uses 8 PM – 8 AM. Update to match the Pledge. Consider also tracking the shoulder periods (7–8 AM and 8–9 PM) as a secondary metric, since those hours are still sensitive for the community.

**Note:** The FBO (Sound Aircraft Services) separately promotes an 11 PM – 7 AM window for fixed-wing. We may eventually want a toggle between different curfew definitions, but for now, anchor on the Pledge.

## **Noise Classification**

We need a “Noise Index” metric — a count of operations classified as “noisy.” The simplest defensible approach: count all helicopter operations plus older Stage 2 jet types. This can be derived from the ICAO type codes we already have in the classification system.

## **Curfew Violators Table**

Add a table (linked from or embedded in the Curfew Compliance section) showing each curfew-period operation with: time of arrival/departure, aircraft type, tail number (registration), and operator name (e.g., Blade, HeliFlite). Flag repeat offenders — if the same tail number shows up during curfew hours multiple times, highlight it.

## **Altitude Compliance**

The Pledge also specifies minimum altitudes: 3,500 ft for helicopters (except arrivals/departures), 1,000 ft for piston/turboprop, 1,500 ft for turbojets. FlightAware track data includes altitude. This could be a future compliance metric but is lower priority than curfew tracking.

# **5\. Date Range Selector**

Replace the current date picker \+ Apply button with an auto-refresh dropdown. Selecting a preset range or adjusting a custom range should immediately update the page — no Apply button needed.

## **Preset Ranges**

The current presets (Today, 7d, 30d, 90d) are fine for now. Eventually we’ll want ranges that match the airport’s seasonal patterns — Memorial Day to Labor Day is the peak season, now bleeding into all of September. But let’s get more feedback before investing heavily in custom seasonal presets.

A good starting set: This Month, Last Month, 90 Days, This Year, Last Year, and a custom date picker.

# **6\. Complaints Integration**

**Immediate:** Add a prominent “File a Complaint” button or link that opens the Town’s PlaneNoise form (planenoise.com/khto/) in a new tab. Make it easy for dashboard visitors to report noise. This can be a persistent element in the nav or a button on the Overview section.

**Future:** We’re working on getting the Town’s historical complaint data (via direct request and FOIL if needed). When we have it, the Complaints section becomes a fully interactive view — complaint volume over time, a geographic heatmap of complaint origins, and correlations with specific flights.

# **7\. Feature Requests (Phase 2\)**

## **Individual Flight Noise Visualization**

It would be powerful to visualize the noise impact of a single flight — for example, selecting a helicopter operation and seeing its estimated ground-level noise footprint plotted on the map at various points along the route. This would use FlightAware track data (altitude \+ position) combined with the aircraft’s ICAO type code to estimate dBA at ground level. This is a Phase 2 feature — get the core dashboard right first.

## **Repeat Offender Reporting**

Beyond flagging individual curfew violations, we want to surface patterns: operators or tail numbers that repeatedly violate the curfew or fly classified-as-noisy aircraft. A simple “top 10 curfew violators” ranking by operator and/or tail number would be very politically impactful.

## **Historical Data Validation**

Make sure all historical data loads correctly across the full date range, back to 2022\. The airport code changed from KHTO to KJPX in May 2022, so verify the pipeline handles both identifiers correctly.

# **8\. Implementation Priority**

Suggested order of attack:

1. **Nav restructure \+ page reorder** — this is the biggest architectural change and improves everything else

2. **Summary cards** — swap in Helicopter Ops, Curfew Violations, Noise Index

3. **Labeling fixes** — quick wins from the table in Section 3

4. **Curfew threshold update** — change to 9 PM – 7 AM per Pilot’s Pledge

5. **Data bug fixes** — Unique Aircraft card mismatch, Wildlife Violations placeholder

6. **Hide empty features** — remove Noise Layers toggles and any sections without data

7. **Complaints link** — add prominent link to PlaneNoise form

8. **Date range UX** — auto-refresh dropdown replacing Apply button

9. **Curfew violators table \+ repeat offender flagging**

10. **Phase 2 features** — noise visualization, altitude compliance, complaint integration

*Again — amazing work, Sam. This is going to make a real impact.* 

