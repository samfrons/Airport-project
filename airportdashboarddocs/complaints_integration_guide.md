# Complaint Data Integration Guide

## Overview

This document describes how to integrate noise complaint data into the JPX dashboard. The schema maps directly to the PlaneNoise form fields used by the Town of East Hampton (planenoise.com/khto/), with privacy redactions applied.

## Data Source

The Town collects complaints through PlaneNoise. We're requesting a CSV/Excel export from January 2022 forward. The export will likely include all form fields. Before loading, we strip:

- Complainant name (first, last)
- Phone number
- Email address
- House number from street address (keep street name only)

Everything else loads directly.

## PlaneNoise Form Fields → Schema Mapping

| PlaneNoise Field | Schema Column | Notes |
|---|---|---|
| Noise Event - Date | `event_date` | Convert to YYYY-MM-DD |
| Noise Event - Time | `event_time` | Convert to HH:MM (24h ET) |
| (derived) | `event_datetime_utc` | Combine date+time, convert ET→UTC for flight matching |
| (derived) | `event_hour_et` | Extract hour (0-23) for hourly charts |
| (derived) | `is_curfew_period` | 1 if hour >= 21 or hour < 7 (Pilot's Pledge: 9 PM - 7 AM) |
| Address | `street_name` | Strip house number, keep street name only |
| (from address) | `municipality` | Parse or geocode: Wainscott, Bridgehampton, Sag Harbor, etc. |
| (from address) | `zip_code` | Extract ZIP |
| (geocoded) | `latitude`, `longitude` | Geocode from street + municipality for map plotting |
| Airport | `airport` | JPX, MTP, or Other. Filter to JPX only for dashboard. |
| Type of Complaint | `complaint_types` | Comma-separated. PlaneNoise allows multiple selections: Excessive Noise, Low Altitude, Hovering, Frequency, Excessive Vibration, Too Early or Late, Speech Disturbance, Sleep Disturbance, Other |
| Type of Aircraft | `aircraft_type` | Jet, Prop, Helicopter, Seaplane, Unknown, Multiple, Other |
| Description/Color | `aircraft_description` | Free text, as-is |
| Direction of Flight | `flight_direction` | Arrival, Departure, North, South, East, West |
| Comments | `comments` | Free text. May need PII scrubbing (people sometimes include names/addresses in comments). |

## Flight Correlation

The most powerful dashboard feature will be matching complaints to specific flights in the `flights` table. The matching logic:

### Time-window matching

```python
# For each complaint, find flights within a +/- 15 minute window
# of the reported noise event time.

def match_complaint_to_flights(complaint, flights_db):
    event_utc = complaint['event_datetime_utc']
    window_start = event_utc - timedelta(minutes=15)
    window_end = event_utc + timedelta(minutes=15)
    
    candidates = db.query("""
        SELECT * FROM flights 
        WHERE operation_date = ? 
        AND actual_departure_utc BETWEEN ? AND ?
        OR actual_arrival_utc BETWEEN ? AND ?
        ORDER BY ABS(
            julianday(COALESCE(actual_departure_utc, actual_arrival_utc)) 
            - julianday(?)
        )
    """, [complaint['event_date'], window_start, window_end, 
          window_start, window_end, event_utc])
    
    return rank_candidates(candidates, complaint)
```

### Confidence scoring

Rank matches based on how many fields align:

| Factor | Confidence Boost |
|---|---|
| Time within 5 min | High |
| Time within 15 min | Medium |
| Aircraft type matches (e.g., complaint says "Helicopter", flight is helicopter) | High |
| Direction matches (e.g., complaint says "Arrival", flight is arrival) | Medium |
| Only one flight in the time window | High |
| Multiple flights in window | Lower (ambiguous) |

Set `matched_confidence` to: `high` (3+ factors align), `medium` (2 factors), `low` (time only), `unmatched` (no candidate flights).

## Dashboard Visualization

### 1. Complaints Section (Nav Item #7)

**Immediate (before we have data):**
- "File a Complaint" button linking to planenoise.com/khto/
- Brief text explaining how complaints are tracked

**With data:**
- Complaint volume chart (daily/weekly/monthly, matching the date range selector)
- Breakdown by complaint type (bar chart: Excessive Noise, Low Altitude, etc.)
- Breakdown by aircraft type (pie/donut: Helicopter, Jet, Prop, Seaplane)
- Curfew-period complaint count highlighted

### 2. Complaint Heatmap (Flight Map section)

Add a "Complaints" toggle layer to the map:

- Plot complaint locations using geocoded street centroids
- Use graduated circles: larger = more complaints from that street
- Color by complaint type or aircraft type
- Click a hotspot to see: street name, municipality, total complaints, breakdown by type, date range of complaints

**Privacy note:** Because we use street-level (not address-level) geocoding, multiple houses on the same street aggregate to a single point. This provides corridor-level precision for flight path correlation without identifying individual households.

### 3. Correlation View

When a user clicks a specific flight on the map or in the flight log:
- Show any complaints that matched to that flight (time window + type)
- Display as a list below the flight details

When a user clicks a complaint hotspot:
- Show the flights that were operating during complaint times from that location
- Highlight the most common operators and aircraft types

### 4. Summary Card Integration

Once complaint data is loaded, the Overview summary cards could become:

**Total Operations | Helicopter Operations | Curfew Violations | Complaints**

The Complaints card shows total complaint count for the selected date range, with a subtitle showing the percentage that are helicopter-related.

## CSV Loading Script

The ingestion script should:

1. Read the CSV/Excel export
2. Strip PII (name, phone, email, house number)
3. Parse and normalize dates/times to UTC
4. Compute derived fields (is_curfew_period, is_weekend, event_hour_et)
5. Geocode street + municipality → lat/long (use a batch geocoder; cache results since many complaints come from the same streets)
6. Run flight correlation matching
7. Insert into complaints table
8. Rebuild complaint_daily_summary and complaint_hotspots

Expected volume: Based on published data, JPX receives roughly 20,000-50,000 complaints per summer season, so the database needs to handle ~100K+ rows for the 2022-present period.

## Geocoding Notes

For street-level geocoding without house numbers:

- Use the street name + municipality + "NY" as the geocoding query
- The result will be a point along the street centerline, which is fine for our purposes
- Cache all geocoding results — many complaints come from the same streets repeatedly
- Free options: Nominatim (OpenStreetMap), US Census Geocoder
- Rate-limited but sufficient for a one-time batch load

Common municipalities in the complaint data will be: Wainscott, East Hampton, Bridgehampton, Sag Harbor, Sagaponack, Noyac, North Haven, Southampton, Amagansett, Montauk, Springs, and North Fork communities (Shelter Island, Southold, etc.).
