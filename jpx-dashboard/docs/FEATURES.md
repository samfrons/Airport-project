# JPX Dashboard — Feature Documentation

This document describes the user-facing features of the JPX Airport Dashboard, a noise monitoring and environmental impact assessment platform for East Hampton Town Airport.

## 1. Interactive Flight Map

The centerpiece of the dashboard is an interactive Mapbox GL map showing flight operations at KJPX.

### Three View Modes

| Mode | Description |
|------|-------------|
| **Routes** | Curved bezier arcs connecting origin/destination airports to KJPX, color-coded by aircraft type |
| **Stats** | KJPX-centered view with airport statistics and pulse marker |
| **Heatmap** | Geographic density visualization of flight traffic |

### Interactions

- **Click airport markers** — Filter flight table to show only flights from that airport
- **Hover route arcs** — View flight details in tooltip
- **Toggle layers** — Show/hide noise sensors, aircraft noise, complaints, biodiversity zones
- **Satellite toggle** — Switch between dark basemap and satellite imagery

### Aircraft Color Coding

| Category | Color | Hex |
|----------|-------|-----|
| Helicopter | Red | `#f87171` |
| Jet | Blue | `#60a5fa` |
| Fixed Wing | Green | `#34d399` |
| Unknown | Gray | `#a1a1aa` |

## 2. Noise Visualization System

The dashboard provides three independent layers for comprehensive noise monitoring.

### 2.1 Community Sensors Layer

Fixed monitoring stations around the airport showing real-time noise readings.

- Marker size indicates current dB level
- Color gradient: Green (quiet) → Yellow (moderate) → Red (loud)
- Click for sensor details and historical readings

### 2.2 Aircraft-Derived Noise Layer

Calculated noise footprint based on flight paths, altitude, and aircraft type.

**Calculation Method:**
1. Look up aircraft type in EASA noise certification database
2. Get source dB at 1000 ft reference altitude
3. Apply geometric spreading (inverse square law)
4. Add atmospheric absorption (~0.5 dB per 1000 ft)
5. Apply lateral attenuation based on angle from flight path

**Formula:**
```
Ground dB = Source dB - 20×log₁₀(distance/1000) - 0.5×(distance/1000) - Lateral
```

### 2.3 Noise Complaints Layer

Community-submitted noise reports visualized as:
- **Markers mode** — Individual complaint locations
- **Heatmap mode** — Density visualization of complaint clusters

### Noise Confidence Indicators

Every noise reading displays its data quality:

| Level | Badge | Source | Example |
|-------|-------|--------|---------|
| **EASA Certified** | Green checkmark | EASA noise database | S76: 88 dB |
| **Category Estimate** | Yellow info | Category averages | Unknown heli: 84 dB |
| **Unverified** | Red alert | Generic default | Unknown: 80 dB |

40+ aircraft types have EASA-certified noise profiles, including:
- Robinson R22, R44, R66
- Sikorsky S-76, S-92
- Bell 407, 429
- Gulfstream G450, G550, G650
- Bombardier Challenger, Global Express
- Cessna Citation series
- And more

## 3. Biodiversity Impact Analysis

Research-backed assessment of aircraft noise effects on local wildlife and ecosystems.

### Five Concentric Impact Zones

| Zone | Radius | dB Range | Species Decline | Research Source |
|------|--------|----------|-----------------|-----------------|
| **Critical** | 1 km | 85-105 | 38-42% | CAA CAP 2517 |
| **High** | 2.5 km | 70-85 | 31-38% | Francis et al. 2009 |
| **Moderate** | 5 km | 55-70 | 25-31% | Phantom Road Experiment |
| **Low** | 8 km | 45-55 | 12-15% | Buxton et al. 2017 |
| **Minimal** | 12 km | 35-45 | 5-8% | Baseline studies |

### Species Impact Database

The dashboard tracks 20+ local species with:

- **Scientific and common names**
- **Taxonomic group** — Birds, mammals, amphibians, insects, reptiles
- **Conservation status** — Federally threatened, state endangered, etc.
- **Sensitivity threshold** — dB level causing documented impacts
- **Impact types** — Foraging disruption, breeding interference, territory abandonment
- **Source citations** — Peer-reviewed research for each threshold

**Notable Species:**
| Species | Status | Threshold | Impact |
|---------|--------|-----------|--------|
| Piping Plover | Federally Threatened | 55 dB | Nest abandonment |
| Least Tern | State Threatened | 60 dB | Colony disturbance |
| Saltmarsh Sparrow | Globally Vulnerable | 65 dB | Breeding disruption |
| Eastern Screech-Owl | — | 50 dB | Hunting efficiency -8%/dB |

### Research Citations

All biodiversity metrics cite peer-reviewed sources:

1. **Ware et al. 2015 (PNAS)** — Phantom Road Experiment: 55 dB causes 31% bird decline
2. **Francis et al. 2009** — Compressor noise effects on woodland birds
3. **Buxton et al. 2017 (Science)** — Noise impacts on US protected areas
4. **CAA CAP 2517** — UK aviation noise and wildlife guidance
5. **Mason et al. 2016** — Anthropogenic noise and species richness

### Panel Tabs

| Tab | Content |
|-----|---------|
| **Overview** | Key metrics, ecological indicators, highlight finding |
| **Species** | Filterable list of tracked species with expandable details |
| **Habitats** | Local habitat areas with estimated noise exposure |
| **Research** | Peer-reviewed study summaries with findings |

## 4. Compliance Dashboard

### Curfew Monitoring

Tracks compliance with voluntary quiet hours: **8 PM – 8 AM ET**

- Bar chart showing hourly distribution of operations
- Curfew hours highlighted in distinct color
- Total curfew violation count prominently displayed

### Operator Scorecards

Performance metrics by operator:
- Total operations
- Curfew compliance rate
- Average noise level
- Trend indicators (improving/declining)

## 5. Weather Correlation

Real-time weather conditions and their relationship to noise propagation.

### Data Sources

| Data | Source | Update | Indicator |
|------|--------|--------|-----------|
| METAR | NOAA Aviation Weather | 15 min | Green "LIVE" badge |
| AQI | EPA AirNow | 1 hour | Green "LIVE" badge |
| Fallback | Simulated | — | "simulated (API unavailable)" text |

### Weather Fields

- Temperature (°F)
- Wind speed and direction
- Visibility (statute miles)
- Humidity (%)
- Flight category (VFR/MVFR/IFR/LIFR)
- Cloud cover

### Correlation Analysis

Weather conditions affect noise propagation:
- **Temperature inversions** — Trap sound near ground
- **Wind direction** — Carry sound farther downwind
- **Humidity** — Affects atmospheric absorption

## 6. Threshold Manager

Customize alert thresholds for biodiversity and noise monitoring.

### Threshold Types

| Type | Description |
|------|-------------|
| **Noise Level** | Alert when dB exceeds threshold |
| **Time of Day** | Alert during sensitive hours (dawn chorus, dusk hunting) |
| **Seasonal** | Alert during breeding/migration seasons |
| **Habitat Proximity** | Alert near protected habitats |

### Default Thresholds

```
Critical Noise Level:     88 dB (critical severity)
High Noise Level:         80 dB (high severity)
Moderate Noise Level:     72 dB (moderate severity)
Dawn Chorus Protection:   4-7 AM (high severity)
Dusk Hunting Period:      7-9 PM (high severity)
Avian Breeding Season:    Apr-Aug, 70 dB (critical)
Amphibian Breeding:       Mar-Jun, 65 dB (high)
```

### Persistence

Thresholds are saved to localStorage and persist across sessions.
Use "Reset to Defaults" to restore original configuration.

## 7. Flight Data Features

### Flight Table

Sortable, filterable table of all operations:

| Column | Description |
|--------|-------------|
| Time | Operation time (ET) |
| Direction | Arrival/Departure with icon |
| Ident | Flight identifier/callsign |
| Registration | Aircraft N-number |
| Type | ICAO type code |
| Category | Helicopter/Jet/Fixed Wing |
| Origin/Destination | Airport codes and names |
| Curfew | Badge if during quiet hours |

### Flight Path Replay

Animated visualization of individual flight tracks:
- Playback controls (play/pause, speed)
- Position marker follows track
- Altitude and speed display
- Noise estimate at each position

### Search

Search flights by:
- Registration (N-number)
- Flight identifier
- Operator name
- Airport code

## 8. Time Filtering

Quick preset buttons:
- **Today** — Current day only
- **7d** — Last 7 days
- **30d** — Last 30 days
- **90d** — Last 90 days
- **Custom** — Date range picker

## 9. Complaint Submission

Community members can submit noise complaints:

### Fields
- Date/time of incident
- Location (address or map pin)
- Aircraft description (if observed)
- Noise level estimate
- Impact description
- Contact information (optional)

### Processing
Complaints are:
1. Geocoded to coordinates
2. Correlated with flight data (if time matches)
3. Added to complaints layer
4. Included in compliance reports

## 10. Alert Notification System

Real-time alerts when thresholds are exceeded.

### Alert Types

| Alert | Trigger |
|-------|---------|
| Noise Level | Operation exceeds dB threshold |
| Curfew Violation | Operation during quiet hours |
| Protected Species | Noise in critical habitat during sensitive period |
| Threshold Breach | Custom threshold exceeded |

### Notification Options
- In-app notification banner
- Sound alert (configurable)
- Badge on nav icon

## 11. Data Export

### CSV Export
Download flight data as CSV for analysis in Excel/Google Sheets.

### PDF Reports
Generate formatted reports including:
- Summary statistics
- Curfew compliance
- Noise exposure analysis
- Charts and visualizations

## 12. Theme Support

- **Dark mode** — Default, optimized for data readability
- **Light mode** — Alternative for high-contrast environments
- **System preference** — Auto-detect from OS settings

## Visual Design

### Sharp Edges
All UI elements use sharp corners (0 border-radius) except:
- Indicator dots (rounded-full)
- Progress circles

### Color Palette

**Dark Theme (Default):**
- Page background: `#09090b` (zinc-950)
- Surface: `#111113` (zinc-900)
- Raised: `#18181b` (zinc-850)
- Borders: `#27272a` (zinc-800)
- Text: `#fafafa` (zinc-50)

**Accent:** Blue-600 `#2563eb` — used sparingly for interactive elements

### Typography

- **Font:** Inter with OpenType features
- **Overline labels:** 10px, uppercase, wide tracking
- **Stat numbers:** 32px, tabular-nums for alignment
- **Body text:** 11-13px, relaxed line-height

### Icons

Lucide React icons at 14-16px with strokeWidth 1.5-1.8 for consistency.
