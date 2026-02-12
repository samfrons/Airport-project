# JPX Dashboard — Data Sources & Confidence Levels

This document explains all data sources used in the JPX Dashboard and their confidence levels. The dashboard treats users as informed stakeholders—all data is explicitly labeled with confidence indicators and source attribution.

## Philosophy

Every piece of data in the dashboard falls into one of three categories:

| Category | Meaning | Visual Indicator |
|----------|---------|------------------|
| **Real Data** | Verified from authoritative sources | Green badge / "LIVE" |
| **Estimated Data** | Calculated from models and research | Yellow badge / "estimated" |
| **Simulated Data** | Demo or fallback when APIs unavailable | Gray badge / "simulated" |

Users always know what they're looking at.

## Data Classification System

### Real Data (Verified)

| Data Type | Source | Update Frequency |
|-----------|--------|------------------|
| Flight Operations | FlightAware AeroAPI v4 | Daily batch pull |
| Aircraft Registration | FAA N-Number Registry | On-demand lookup |
| Weather METAR | NOAA Aviation Weather | 15-minute cache |
| Air Quality (AQI) | EPA AirNow API | 1-hour cache |
| EASA Noise Profiles | EASA Certification Database | Static reference |

### Estimated Data (Calculated)

| Data Type | Method | Confidence |
|-----------|--------|------------|
| Ground Noise Level | Physics model + EASA profiles | Medium-High |
| Biodiversity Impact | Research-derived percentages | Medium |
| Category Noise Averages | Statistical aggregation | Medium |
| Flight Path Noise Footprint | Inverse square law | Medium |

### Simulated Data (Demo/Fallback)

| Data Type | When Used | Indicator |
|-----------|-----------|-----------|
| Mock Flights | Development/demo mode | "Test data" badge |
| Mock Sensors | Demonstration network | "Demo" label |
| Weather Fallback | NOAA API unavailable | "simulated (API unavailable)" |
| AQI Fallback | EPA API unavailable | "simulated" |

## Flight Data

### Source: FlightAware AeroAPI v4

**Confidence: High**

- **Provider:** FlightAware (Standard tier, $100/mo)
- **Coverage:** East Hampton Town Airport (KJPX) and all connecting airports
- **History:** Data available back to January 2011
- **Update:** Daily batch pull (recommended: 6 AM ET for previous day)

**Data Fields:**
| Field | Source | Notes |
|-------|--------|-------|
| Flight ID | FlightAware | Unique identifier |
| Registration | FlightAware | N-number from transponder |
| Aircraft Type | FlightAware | ICAO type code |
| Operator | FlightAware | Airline/charter company |
| Times | FlightAware | Actual and scheduled (UTC) |
| Origin/Destination | FlightAware | ICAO airport codes |

**Derived Fields (at ingestion):**
| Field | Derivation |
|-------|------------|
| `operation_date` | UTC → Eastern Time conversion |
| `operation_hour_et` | Hour in local time |
| `is_curfew_period` | True if 8 PM – 8 AM ET |
| `is_weekend` | True if Saturday/Sunday |
| `aircraft_category` | Rule-based classification from ICAO type |

### Airport Code History

The airport ICAO code changed:
- **Pre-May 2022:** KHTO (Hampton)
- **May 2022+:** KJPX (East Hampton)

The data pipeline automatically handles this transition.

## Noise Data

### Three-Tier Confidence System

Every noise estimate displays one of three confidence levels:

#### EASA Certified (High Confidence)

**Badge:** Green checkmark

**Source:** EASA Certification Noise Levels Database
**URL:** https://www.easa.europa.eu/en/domains/environment/easa-certification-noise-levels

**Coverage:** 40+ aircraft types commonly seen at KJPX

**Example entries:**
| ICAO Type | Manufacturer | Model | Flyover EPNdB | Takeoff dB | Approach dB |
|-----------|--------------|-------|---------------|------------|-------------|
| S76 | Sikorsky | S-76C++ | 95.0 | 88 | 85 |
| GLF5 | Gulfstream | G550 | 84.5 | 89 | 85 |
| R44 | Robinson | R44 II | 88.5 | 82 | 80 |
| C172 | Cessna | 172S Skyhawk | 76.0 | 75 | 72 |

#### Category Estimate (Medium Confidence)

**Badge:** Yellow info icon

**When used:** Aircraft type known but no EASA certification entry

**Method:** Statistical averages by category:
| Category | Light | Medium | Heavy | Default |
|----------|-------|--------|-------|---------|
| Helicopter | 78 dB | 84 dB | 90 dB | 84 dB |
| Jet | 82 dB | 88 dB | 94 dB | 88 dB |
| Fixed Wing | 72 dB | 76 dB | 82 dB | 76 dB |

**Example warning:**
> "No EASA certification data for EC30. Using helicopter category average."

#### Unverified (Low Confidence)

**Badge:** Red alert icon

**When used:** Unknown aircraft type

**Method:** Generic default of 80 dB

**Example warning:**
> "Unknown aircraft type. Using generic estimate."

### Noise Calculation Method

**Reference:**
- SAE-AIR-5662 (Lateral Attenuation)
- ISO 9613-1 (Atmospheric Absorption)

**Formula:**
```
Ground dB = Source dB
          - Geometric Attenuation [20 × log₁₀(slant_distance / 1000)]
          - Atmospheric Absorption [0.5 × (slant_distance / 1000)]
          - Lateral Attenuation [0-10 dB based on angle]
```

**Key assumptions:**
- Reference distance: 1000 feet (EASA certification standard)
- Atmospheric absorption: 0.5 dB per 1000 ft (A-weighted average)
- Propagation: Spherical spreading (inverse square law)

## Weather Data

### Live Data: NOAA Aviation Weather

**Confidence: High**

**Indicator:** Green pulsing "LIVE" badge

**Source:** NOAA Aviation Weather Center
**Update frequency:** Every 15 minutes
**Cache duration:** 15 minutes

**Fields provided:**
| Field | Description |
|-------|-------------|
| Temperature | Degrees Fahrenheit |
| Wind | Speed (kts), direction (degrees), gusts |
| Visibility | Statute miles |
| Humidity | Percentage |
| Flight Category | VFR, MVFR, IFR, or LIFR |
| Ceiling | Cloud base in feet AGL |
| Altimeter | Pressure in inches Hg |

### Simulated Fallback

**Confidence: Low**

**Indicator:** "simulated (API unavailable)" text

**When used:** NOAA API timeout, error, or unavailable

**Method:** Deterministic generation using:
- Seeded random number generator (based on date)
- Seasonal variation (summer vs winter patterns)
- Diurnal patterns (day vs night)
- Prevailing wind patterns for Long Island

**Purpose:** Ensure dashboard remains functional when external APIs fail

## Air Quality Data

### Live Data: EPA AirNow

**Confidence: High**

**Source:** EPA AirNow API
**Update frequency:** Every hour
**Cache duration:** 1 hour

**Metrics:**
| Metric | Description |
|--------|-------------|
| AQI | Air Quality Index (0-500) |
| PM2.5 | Fine particulate matter |
| Ozone | Ground-level ozone |
| Category | Good, Moderate, Unhealthy, etc. |

### Simulated Fallback

When EPA API is unavailable, displays "simulated" with typical values for the region.

## Biodiversity Data

### Impact Zone Percentages

**Confidence: Medium (Research-Derived)**

All impact percentages cite peer-reviewed research:

| Zone | Impact | Primary Source |
|------|--------|----------------|
| Critical (85-105 dB) | 38-42% decline | CAA CAP 2517 |
| High (70-85 dB) | 31-38% decline | Francis et al. 2009 |
| Moderate (55-70 dB) | 25-31% decline | Ware et al. 2015 (PNAS) |
| Low (45-55 dB) | 12-15% decline | Buxton et al. 2017 |
| Minimal (35-45 dB) | 5-8% decline | Baseline studies |

### Species Sensitivity Thresholds

**Confidence: Medium (Literature-Derived)**

Each species threshold cites a specific source:

| Species | Threshold | Source |
|---------|-----------|--------|
| Piping Plover | 55 dB | USFWS Recovery Plan |
| Saltmarsh Sparrow | 65 dB | Greenlaw et al. 2018 |
| Eastern Screech-Owl | 50 dB | Mason et al. 2016 |
| American Robin | 60 dB | Francis et al. 2009 |

### Research Database

The Research tab cites 10+ peer-reviewed studies:

1. **Ware et al. 2015 (PNAS)** — "Phantom Roads" experiment showing 31% bird abundance decline at 55 dB
2. **Francis et al. 2009** — Compressor station noise effects on woodland birds
3. **Buxton et al. 2017 (Science)** — Noise pollution in US protected areas
4. **CAA CAP 2517** — UK guidance on aviation noise and wildlife
5. **Mason et al. 2016** — Anthropogenic noise and species richness
6. **Shannon et al. 2016** — Review of noise effects on wildlife

## Visual Indicators

### Badges

| Badge | Meaning |
|-------|---------|
| Green checkmark | Verified/certified data |
| Green pulsing dot + "LIVE" | Real-time data feed active |
| Yellow info icon | Estimated/calculated value |
| Red alert icon | Unverified/fallback data |
| Gray "simulated" | Demo or fallback mode |

### Footer Attribution

Every data panel displays its source:

**Examples:**
- "Live METAR from NOAA Aviation Weather"
- "Noise estimates from EASA certification profiles"
- "Based on peer-reviewed research (6+ studies)"
- "FlightAware AeroAPI v4 • Last updated: 2026-02-12 06:00 ET"

## Data Freshness

| Data Type | Update Frequency | Cache Duration | Staleness Indicator |
|-----------|------------------|----------------|---------------------|
| Flights | Daily batch | Until next pull | Shows last fetch time |
| Weather | 15 minutes | 15 minutes | Shows "LIVE" or time since update |
| AQI | 1 hour | 1 hour | Shows fetch timestamp |
| Noise profiles | Static | N/A | Version in footer |
| Biodiversity | Static | N/A | Research year citations |

## Data Pipeline

### Daily Flight Ingestion

```bash
# Recommended: Run at 6 AM ET via cron
python scripts/daily_pull.py

# Pipeline steps:
# 1. Query FlightAware for previous day's operations
# 2. Parse and classify aircraft types
# 3. Convert timestamps to Eastern Time
# 4. Flag curfew violations
# 5. Insert into database
# 6. Update daily_summary aggregates
# 7. Log ingestion in audit table
```

### Cost Tracking

Each API call is logged with:
- Timestamp
- Endpoint called
- Records retrieved
- Estimated cost
- Success/failure status

Monthly API costs typically: **$2-5/mo** (well under $100 minimum)

## Handling Missing Data

### Flight Data Gaps

If a day's pull fails:
- Gap logged in `ingestion_log` table
- Dashboard shows "No data available" for that date
- Can be backfilled with: `python scripts/daily_pull.py --date YYYY-MM-DD`

### Weather API Failure

1. Try primary endpoint (NOAA METAR)
2. If timeout/error, show simulated fallback
3. Log failure for monitoring
4. Indicator changes to "simulated (API unavailable)"

### Unknown Aircraft Type

1. Look up ICAO type code in EASA map
2. If not found, determine category (helicopter/jet/fixed_wing)
3. Use category average with yellow "estimate" badge
4. If category unknown, use generic 80 dB with red "unverified" badge
5. Log unknown types for periodic review

## Quality Assurance

### Automated Checks

- TypeScript validates all data types at compile time
- API routes validate query parameters
- Database constraints enforce data integrity

### Manual Review

- Monthly review of unknown aircraft types
- Quarterly validation of noise calculations against field measurements
- Annual update of EASA noise profile mapping

### Data Lineage

Every record maintains:
- `fetched_at` timestamp (when data was retrieved)
- `data_source` field (which API provided it)
- Confidence level indicator
