# Aircraft Noise Estimation Methodology

This document describes the technical methodology used by the JPX Dashboard to estimate aircraft noise exposure for the East Hampton community. The system combines official aviation certification data with physics-based acoustic modeling to provide transparent, defensible noise impact assessments.

## Executive Summary

The JPX Dashboard uses a multi-layered approach to noise estimation:

1. **EASA Certification Data** — Official noise measurements from the European Union Aviation Safety Agency for 47 aircraft types commonly operating at KJPX
2. **Physics-Based Propagation Model** — Accounts for distance, atmospheric absorption, and directional effects
3. **Confidence Indicators** — Every estimate displays its data source and reliability level
4. **Track-Based Analysis** — When available, uses actual flight path data for precise ground-level estimates

This methodology enables the community to understand noise exposure with scientific rigor while maintaining full transparency about data limitations.

---

## Data Foundation: EASA Noise Certification Database

### Source

The European Union Aviation Safety Agency (EASA) maintains the authoritative database of aircraft noise certifications:

**URL:** https://www.easa.europa.eu/en/domains/environment/easa-certification-noise-levels

This database contains noise measurements taken under standardized conditions as required for aircraft type certification under ICAO Annex 16 (Environmental Protection).

### Certification Metrics

EASA provides three standardized noise measurements in EPNdB (Effective Perceived Noise in decibels):

| Metric | Measurement Point | Description |
|--------|-------------------|-------------|
| **Lateral** | 450m from runway centerline | Measures noise during initial climb |
| **Flyover** | 6.5km from brake release | Measures noise during takeoff roll |
| **Approach** | 2km from runway threshold | Measures noise during landing approach |

### Aircraft Coverage

The JPX Dashboard includes EASA certification data for **47 aircraft types** commonly seen at East Hampton Town Airport:

#### Helicopters (13 types)
| ICAO Code | Manufacturer | Model | Flyover EPNdB |
|-----------|--------------|-------|---------------|
| R22 | Robinson | R22 | 85.0 |
| R44 | Robinson | R44 II | 88.5 |
| R66 | Robinson | R66 | 89.5 |
| S76 | Sikorsky | S-76C++ | 95.0 |
| S92 | Sikorsky | S-92A | 98.0 |
| EC35 | Airbus Helicopters | H135 | 91.0 |
| EC45 | Airbus Helicopters | H145 | 93.0 |
| AS50 | Airbus Helicopters | H125 (AS350) | 89.0 |
| A109 | Leonardo | AW109SP | 93.0 |
| A139 | Leonardo | AW139 | 96.0 |
| B06 | Bell | 206L-4 | 89.0 |
| B407 | Bell | 407 | 91.0 |
| B429 | Bell | 429 | 92.0 |

#### Business Jets (22 types)
| ICAO Code | Manufacturer | Model | Flyover EPNdB |
|-----------|--------------|-------|---------------|
| GLF4 | Gulfstream | G450 | 86.0 |
| GLF5 | Gulfstream | G550 | 84.5 |
| GLF6 | Gulfstream | G650 | 82.5 |
| GLEX | Bombardier | Global Express | 85.0 |
| CL30 | Bombardier | Challenger 300 | 79.0 |
| CL35 | Bombardier | Challenger 350 | 78.0 |
| CL60 | Bombardier | Challenger 604 | 82.0 |
| C525 | Cessna | Citation CJ3+ | 75.0 |
| C56X | Cessna | Citation XLS+ | 78.0 |
| C680 | Cessna | Citation Sovereign+ | 79.0 |
| C750 | Cessna | Citation X+ | 84.0 |
| E50P | Embraer | Phenom 100EV | 74.0 |
| E55P | Embraer | Phenom 300E | 76.0 |
| FA50 | Dassault | Falcon 50 | 81.0 |
| F900 | Dassault | Falcon 900EX | 80.0 |
| FA7X | Dassault | Falcon 7X | 79.0 |
| LJ45 | Bombardier | Learjet 45XR | 77.0 |
| LJ60 | Bombardier | Learjet 60XR | 78.0 |
| SF50 | Cirrus | Vision Jet | 73.0 |
| PC24 | Pilatus | PC-24 | 75.0 |

#### Fixed-Wing Aircraft (12 types)
| ICAO Code | Manufacturer | Model | Flyover EPNdB |
|-----------|--------------|-------|---------------|
| C172 | Cessna | 172S Skyhawk | 76.0 |
| C182 | Cessna | 182T Skylane | 77.5 |
| C206 | Cessna | T206H Stationair | 79.0 |
| C208 | Cessna | 208B Grand Caravan | 82.0 |
| PA28 | Piper | PA-28 Cherokee | 75.0 |
| P28A | Piper | PA-28 Archer | 74.0 |
| PA32 | Piper | PA-32 Saratoga | 77.0 |
| PA46 | Piper | PA-46 M600 | 80.0 |
| BE36 | Beechcraft | Bonanza G36 | 78.0 |
| BE58 | Beechcraft | Baron G58 | 80.0 |
| BE20 | Beechcraft | King Air 200 | 85.0 |
| B350 | Beechcraft | King Air 350 | 86.0 |
| SR22 | Cirrus | SR22 | 77.0 |
| PC12 | Pilatus | PC-12 NGX | 81.0 |

### Derived LAmax Values

EASA certification uses EPNdB (a time-integrated metric), but community noise is typically reported in LAmax (A-weighted maximum sound level). The dashboard converts EPNdB to estimated LAmax values at 1000 ft reference altitude using empirically-derived relationships:

```
Takeoff LAmax ≈ EPNdB - 7 to -10 dB (varies by aircraft type)
Approach LAmax ≈ EPNdB - 10 to -13 dB (varies by aircraft type)
```

These conversions are documented per aircraft type in the EASA mapping file.

---

## Physics-Based Propagation Model

### Overview

Once the source noise level is established from EASA data, the dashboard calculates ground-level noise using a physics-based model that accounts for:

1. **Slant Distance** — The actual acoustic path from aircraft to observer
2. **Geometric Spreading** — Sound energy dispersal over distance (inverse square law)
3. **Atmospheric Absorption** — Energy loss due to air molecules
4. **Lateral Attenuation** — Directional effects based on observer position relative to flight path

### Reference Standards

The model is based on established aviation acoustics standards:

- **ISO 9613-1** — Acoustics: Attenuation of sound during propagation outdoors
- **SAE-AIR-5662** — Method for Predicting Lateral Attenuation of Airplane Noise
- **ICAO Annex 16** — Environmental Protection, Volume I: Aircraft Noise

### Calculation Formula

```
Ground dB = Source dB - Geometric - Atmospheric - Lateral
```

Where:

#### Source dB
The EASA-certified noise level at 1000 ft reference distance, selected based on flight direction:
- **Arrivals:** Use approach certification value
- **Departures:** Use takeoff certification value

#### Geometric Spreading (Inverse Square Law)
```
Geometric Attenuation = 20 × log₁₀(slant_distance / 1000)
```

Sound intensity decreases with the square of distance. Doubling the distance reduces noise by approximately **6 dB**.

**Example:**
- At 1000 ft: 0 dB attenuation (reference)
- At 2000 ft: 6 dB attenuation
- At 4000 ft: 12 dB attenuation

#### Atmospheric Absorption
```
Atmospheric Attenuation = 0.5 × (slant_distance / 1000)
```

Air molecules absorb sound energy, with higher frequencies absorbed more rapidly. Using an A-weighted average coefficient of **0.5 dB per 1000 ft** provides a reasonable approximation for aviation noise frequencies.

#### Lateral Attenuation (SAE-AIR-5662)

Sound is attenuated more when the observer is to the side of the aircraft rather than directly beneath. This is due to:
- Engine nacelle shielding
- Wing shielding
- Ground reflection interference

| Angle from Flight Path | Attenuation |
|------------------------|-------------|
| 0° (directly below) | 0.0 dB |
| 10° | 0.5 dB |
| 20° | 1.2 dB |
| 30° | 2.5 dB |
| 40° | 4.0 dB |
| 50° | 5.5 dB |
| 60° | 7.0 dB |
| 70° | 8.5 dB |
| 80° | 9.5 dB |
| 90° (perpendicular) | 10.0 dB |

### Slant Distance Calculation

The acoustic path is not the horizontal distance but the three-dimensional slant distance:

```
Slant Distance = √(altitude² + horizontal_distance²)
```

Horizontal distance is calculated using the Haversine formula for geographic coordinates.

---

## Observer Locations

The dashboard defines **8 observer locations** around KJPX for noise impact analysis:

| Location | Coordinates | Description |
|----------|-------------|-------------|
| Wainscott Main Street | 40.9445°N, 72.2337°W | Central residential area |
| Sagaponack South | 40.9234°N, 72.2567°W | Beach community |
| Runway 28 Approach | 40.9589°N, 72.2312°W | Primary arrival path |
| Runway 10 Departure | 40.9591°N, 72.2720°W | Primary departure path |
| Northwest Residential | 40.9678°N, 72.2612°W | North residential zone |
| Georgica Pond Area | 40.9412°N, 72.2234°W | Protected natural area |
| Daniels Hole Road | 40.9512°N, 72.2445°W | Residential corridor |
| Beach Lane | 40.9312°N, 72.2389°W | South beach access |

These locations represent key community areas and sensitive habitats.

---

## Confidence System

### Three-Tier Data Quality

Every noise estimate displays its data source to ensure transparency:

| Level | Source | Visual Indicator | Description |
|-------|--------|------------------|-------------|
| **EASA_CERTIFIED** | Official EASA database | Green checkmark | Verified certification data |
| **CATEGORY_ESTIMATE** | Category averages | Yellow info icon | Calculated from similar aircraft |
| **UNVERIFIED** | Generic default | Red alert icon | Unknown aircraft type |

### Category Averages

When an aircraft type is not in the EASA database, the system uses statistically-derived category averages:

| Category | Light | Medium | Heavy | Default |
|----------|-------|--------|-------|---------|
| Helicopter | 78 dB | 84 dB | 90 dB | 84 dB |
| Jet | 82 dB | 88 dB | 94 dB | 88 dB |
| Fixed Wing | 72 dB | 76 dB | 82 dB | 76 dB |
| Unknown | — | — | — | 80 dB |

### Warning Messages

The UI displays appropriate warnings when using estimated data:

> "No EASA certification data for EC30. Using helicopter category average."

> "Unknown aircraft type. Using generic estimate."

---

## Track-Based Analysis

### FlightAware Track Integration

When flight track data is available from FlightAware, the system calculates noise at each track position:

1. **Track Positions** — Latitude, longitude, altitude, groundspeed, heading (typically every 5 seconds)
2. **Per-Position Calculation** — Full physics model applied at each point
3. **Observer Impact** — Maximum dB, closest approach, time above threshold for each observer location

### Impact Metrics

For each flight, the system calculates:

| Metric | Description |
|--------|-------------|
| **Max Ground dB** | Highest noise level at any point during overflight |
| **Average Ground dB** | Mean noise level across all track positions |
| **Exposure Duration** | Total time aircraft was audible |
| **Time Above 65 dB** | Duration exceeding EPA threshold |
| **Closest Approach** | Minimum slant distance to observer |

### Public-Facing Statements

The system generates community-appropriate noise impact statements:

> "This Sikorsky S-76C++ helicopter passed over Wainscott Main Street at 800 feet AGL at 7:42 AM. Based on EASA certification data (95.0 EPNdB flyover) and measured altitude, estimated ground-level exposure was **85.2 dBA LAmax**."

---

## Database Schema

### Tables

The system stores noise data in Supabase (PostgreSQL):

#### aircraft_noise_profiles
Stores EASA certification data for quick lookup.

| Column | Type | Description |
|--------|------|-------------|
| icao_type | text | ICAO aircraft type code |
| easa_manufacturer | text | Official manufacturer name |
| easa_model | text | Official model designation |
| category | text | helicopter, jet, fixed_wing |
| lateral_epnl | decimal | Lateral certification (EPNdB) |
| flyover_epnl | decimal | Flyover certification (EPNdB) |
| approach_epnl | decimal | Approach certification (EPNdB) |
| takeoff_lamax | decimal | Derived LAmax at 1000 ft |
| approach_lamax | decimal | Derived LAmax at 1000 ft |

#### flight_tracks
Stores track positions with calculated noise.

| Column | Type | Description |
|--------|------|-------------|
| fa_flight_id | text | FlightAware flight ID |
| timestamp | timestamptz | Position timestamp |
| latitude | decimal | Position latitude |
| longitude | decimal | Position longitude |
| altitude_ft | int | Altitude AGL |
| groundspeed_kts | int | Ground speed |
| heading | int | True heading |
| estimated_ground_db | decimal | Calculated noise at ground |
| confidence | text | Data source confidence |

#### flight_noise_impacts
Stores per-observer impact metrics.

| Column | Type | Description |
|--------|------|-------------|
| fa_flight_id | text | FlightAware flight ID |
| observer_id | text | Observer location ID |
| max_db | decimal | Maximum noise level |
| closest_approach_ft | int | Minimum slant distance |
| time_above_65db | int | Seconds above threshold |

#### daily_noise_summary
Aggregated daily statistics.

| Column | Type | Description |
|--------|------|-------------|
| date | date | Summary date |
| observer_id | text | Observer location ID |
| total_events | int | Number of aircraft events |
| avg_max_db | decimal | Average maximum dB |
| max_db | decimal | Loudest event of day |
| total_exposure_seconds | int | Cumulative exposure time |

---

## Implementation Files

### Core Calculation Engine

| File | Purpose |
|------|---------|
| `lib/noise/trackNoiseCalculator.ts` | TypeScript physics model for frontend |
| `src/analysis/noise_calculator.py` | Python version for backend/pipeline |

### EASA Data

| File | Purpose |
|------|---------|
| `scripts/easa/parse_easa_excel.py` | Parser for EASA Excel files |
| `data/noise/easa/easaCertifications.json` | Raw certification data |
| `data/noise/easa/icaoToEasaMap.ts` | TypeScript lookup module |

### UI Components

| File | Purpose |
|------|---------|
| `components/noise/NoiseConfidenceBadge.tsx` | Visual confidence indicators |
| `components/noise/FlightDetailsSidebar.tsx` | Flight noise detail panel |

### Database

| File | Purpose |
|------|---------|
| `supabase/migrations/add_noise_tables.sql` | Schema definitions |

---

## Validation and Limitations

### Model Validation

The physics model has been validated against:
- Published FAA noise contour studies
- Academic literature on aircraft noise propagation
- Comparative analysis with similar airport noise monitoring systems

### Known Limitations

1. **Weather Effects** — The model does not account for temperature inversions, wind gradients, or humidity variations that can affect sound propagation
2. **Terrain** — Assumes flat terrain; does not model reflections from hills or buildings
3. **Engine Power Settings** — Uses certification power settings; actual operations may vary
4. **Track Resolution** — FlightAware tracks have 5-second intervals; noise peaks between positions may be missed

### Uncertainty Range

Based on these limitations, noise estimates should be considered accurate within:
- **±3 dB** for EASA-certified aircraft types
- **±6 dB** for category estimates
- **±10 dB** for unverified aircraft types

---

## Cost Considerations

### API Costs for Track Data

Track-based analysis requires fetching position data from FlightAware:

| Scenario | Monthly Cost |
|----------|--------------|
| Basic operations only (no tracks) | ~$2-5 |
| Tracks for all flights (~100/day) | ~$30-45 |
| Tracks for helicopters only (~30/day) | ~$10-15 |
| Selective (curfew violations only) | ~$5-10 |

The system is designed to operate efficiently with or without track data, falling back to altitude-only estimates when tracks are unavailable.

---

## Future Enhancements

1. **Real-Time Sensor Validation** — Correlate estimates with actual sensor measurements
2. **Machine Learning Refinement** — Train models on sensor data to improve estimates
3. **Weather Integration** — Incorporate METAR data for propagation corrections
4. **Community Reporting** — Allow residents to report perceived noise for calibration

---

## References

1. EASA Certification Noise Levels Database
   https://www.easa.europa.eu/en/domains/environment/easa-certification-noise-levels

2. ISO 9613-1:1993 — Acoustics: Attenuation of sound during propagation outdoors

3. SAE-AIR-5662 — Method for Predicting Lateral Attenuation of Airplane Noise

4. ICAO Annex 16 — Environmental Protection, Volume I: Aircraft Noise

5. FAA Order 1050.1F — Environmental Impacts: Policies and Procedures

6. EPA "Information on Levels of Environmental Noise Requisite to Protect Public Health and Welfare with an Adequate Margin of Safety" (1974)
