#!/usr/bin/env python3
"""
Aircraft Noise Calculator for KJPX Dashboard

Physics-based noise estimation using:
- EASA certification data for source noise levels
- FlightAware track data for actual altitude/position
- SAE-AIR-5662 lateral attenuation model
- Atmospheric absorption per ISO 9613-1

Usage:
    from src.analysis.noise_calculator import (
        get_noise_profile, calculate_ground_noise, calculate_flight_noise_impact
    )
"""

import json
import math
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Tuple

# ─── Constants ───────────────────────────────────────────────────────────────

# EASA certification reference distance (304.8 meters = 1000 feet)
CERTIFICATION_REFERENCE_DISTANCE_FT = 1000

# Standard atmospheric absorption coefficient (dB per 1000 ft, A-weighted average)
ATMOSPHERIC_ABSORPTION_COEFFICIENT = 0.5

# Earth radius in feet for Haversine calculations
EARTH_RADIUS_FT = 20902230.97  # 6371 km * 3280.84 ft/km

# KJPX airport coordinates
KJPX_LAT = 40.9590
KJPX_LON = -72.2516

# ─── Lateral Attenuation Table (SAE-AIR-5662) ────────────────────────────────

LATERAL_ATTENUATION_TABLE = [
    (0, 0),      # Directly below
    (10, 0.5),
    (20, 1.2),
    (30, 2.5),
    (40, 4.0),
    (50, 5.5),
    (60, 7.0),
    (70, 8.5),
    (80, 9.5),
    (90, 10.0),  # Perpendicular
]

# ─── Category Averages (LAmax at 1000ft reference) ───────────────────────────

CATEGORY_AVERAGES = {
    "helicopter": {"default": 84, "light": 78, "medium": 84, "heavy": 90},
    "jet": {"default": 88, "light": 82, "medium": 88, "heavy": 94},
    "fixed_wing": {"default": 76, "light": 72, "medium": 76, "heavy": 82},
    "unknown": {"default": 80},
}

# ─── Observer Locations (KJPX Area) ──────────────────────────────────────────

OBSERVER_LOCATIONS = [
    {"id": "wainscott-main", "name": "Wainscott Main Street", "lat": 40.9445, "lon": -72.2337},
    {"id": "sagaponack-south", "name": "Sagaponack South", "lat": 40.9234, "lon": -72.2567},
    {"id": "runway-approach", "name": "Runway 28 Approach", "lat": 40.9589, "lon": -72.2312},
    {"id": "runway-departure", "name": "Runway 10 Departure", "lat": 40.9591, "lon": -72.2720},
    {"id": "northwest-residential", "name": "Northwest Residential", "lat": 40.9678, "lon": -72.2612},
    {"id": "georgica-pond", "name": "Georgica Pond Area", "lat": 40.9412, "lon": -72.2234},
    {"id": "daniels-hole-road", "name": "Daniels Hole Road", "lat": 40.9512, "lon": -72.2445},
    {"id": "beach-lane", "name": "Beach Lane", "lat": 40.9312, "lon": -72.2389},
]


# ─── Data Classes ────────────────────────────────────────────────────────────

@dataclass
class NoiseProfile:
    """EASA noise certification data for an aircraft type."""
    icao_type: str
    manufacturer: Optional[str]
    model: Optional[str]
    category: str  # helicopter, jet, fixed_wing, unknown
    takeoff_db: float  # LAmax at 1000ft reference
    approach_db: float
    lateral_epnl: Optional[float] = None
    flyover_epnl: Optional[float] = None
    approach_epnl: Optional[float] = None
    data_source: str = "CATEGORY_ESTIMATE"  # EASA_CERTIFIED, CATEGORY_ESTIMATE, UNVERIFIED
    confidence: str = "medium"  # high, medium, low


@dataclass
class TrackPosition:
    """Single position report from FlightAware track."""
    timestamp: str
    latitude: float
    longitude: float
    altitude_ft: int
    groundspeed_kts: Optional[int] = None
    heading: Optional[int] = None


@dataclass
class NoiseEstimate:
    """Ground-level noise estimate at a specific location."""
    db: float
    source: str  # EASA_CERTIFIED, CATEGORY_ESTIMATE, UNVERIFIED
    confidence: str  # high, medium, low
    warning: Optional[str] = None
    slant_distance_ft: Optional[float] = None
    horizontal_distance_ft: Optional[float] = None
    geometric_attenuation: Optional[float] = None
    atmospheric_attenuation: Optional[float] = None
    lateral_attenuation: Optional[float] = None


# ─── Load EASA Data ──────────────────────────────────────────────────────────

_noise_profiles_cache: Dict[str, NoiseProfile] = {}


def _load_easa_data() -> Dict[str, NoiseProfile]:
    """Load EASA noise profiles from JSON file."""
    global _noise_profiles_cache

    if _noise_profiles_cache:
        return _noise_profiles_cache

    # Path to EASA JSON data
    easa_path = Path(__file__).parent.parent.parent / "data" / "noise" / "easa" / "icaoToEasaMap.json"

    if not easa_path.exists():
        # Return empty dict if file doesn't exist (will use category averages)
        return {}

    try:
        with open(easa_path, 'r') as f:
            data = json.load(f)

        mappings = data.get("mappings", {})
        for icao, profile_data in mappings.items():
            _noise_profiles_cache[icao.upper()] = NoiseProfile(
                icao_type=icao.upper(),
                manufacturer=profile_data.get("easa_manufacturer"),
                model=profile_data.get("easa_model"),
                category=profile_data.get("category", "unknown"),
                takeoff_db=profile_data.get("takeoff_db", 80),
                approach_db=profile_data.get("approach_db", 76),
                lateral_epnl=profile_data.get("lateral_epnl"),
                flyover_epnl=profile_data.get("flyover_epnl"),
                approach_epnl=profile_data.get("approach_epnl"),
                data_source=profile_data.get("data_source", "CATEGORY_ESTIMATE"),
                confidence=profile_data.get("confidence", "medium"),
            )
    except Exception as e:
        print(f"Warning: Could not load EASA data: {e}")

    return _noise_profiles_cache


def get_noise_profile(icao_type: str, category: str = "unknown") -> NoiseProfile:
    """
    Get noise profile for an ICAO aircraft type code.

    Falls back to category averages if no EASA data is available.
    """
    profiles = _load_easa_data()
    icao_upper = (icao_type or "").upper()

    if icao_upper in profiles:
        return profiles[icao_upper]

    # Fall back to category average
    cat_data = CATEGORY_AVERAGES.get(category, CATEGORY_AVERAGES["unknown"])
    return NoiseProfile(
        icao_type=icao_upper or "UNKN",
        manufacturer=None,
        model=None,
        category=category,
        takeoff_db=cat_data["default"],
        approach_db=cat_data["default"] - 4,
        data_source="CATEGORY_ESTIMATE",
        confidence="low",
    )


# ─── Geometry Functions ──────────────────────────────────────────────────────

def _to_radians(degrees: float) -> float:
    return degrees * (math.pi / 180)


def _to_degrees(radians: float) -> float:
    return radians * (180 / math.pi)


def calculate_horizontal_distance_ft(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculate distance between two points using Haversine formula."""
    d_lat = _to_radians(lat2 - lat1)
    d_lon = _to_radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2 +
        math.cos(_to_radians(lat1)) * math.cos(_to_radians(lat2)) *
        math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_FT * c


def calculate_slant_distance_ft(altitude_ft: float, horizontal_ft: float) -> float:
    """Calculate slant distance (actual acoustic path length)."""
    return math.sqrt(altitude_ft ** 2 + horizontal_ft ** 2)


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing between two points (degrees 0-360)."""
    d_lon = _to_radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(_to_radians(lat2))
    x = (
        math.cos(_to_radians(lat1)) * math.sin(_to_radians(lat2)) -
        math.sin(_to_radians(lat1)) * math.cos(_to_radians(lat2)) * math.cos(d_lon)
    )
    bearing = math.atan2(y, x)
    return (_to_degrees(bearing) + 360) % 360


def calculate_lateral_angle(
    observer_lat: float, observer_lon: float,
    aircraft_lat: float, aircraft_lon: float,
    heading: float
) -> float:
    """Calculate lateral angle from aircraft flight path to observer (0-90 degrees)."""
    bearing_to_observer = calculate_bearing(
        aircraft_lat, aircraft_lon, observer_lat, observer_lon
    )

    angle_diff = abs(bearing_to_observer - heading)
    if angle_diff > 180:
        angle_diff = 360 - angle_diff

    return min(90, angle_diff)


def get_lateral_attenuation(angle_degrees: float) -> float:
    """Get lateral attenuation for a given angle using linear interpolation."""
    angle = min(90, max(0, abs(angle_degrees)))

    lower = LATERAL_ATTENUATION_TABLE[0]
    upper = LATERAL_ATTENUATION_TABLE[-1]

    for i in range(len(LATERAL_ATTENUATION_TABLE) - 1):
        if LATERAL_ATTENUATION_TABLE[i][0] <= angle <= LATERAL_ATTENUATION_TABLE[i + 1][0]:
            lower = LATERAL_ATTENUATION_TABLE[i]
            upper = LATERAL_ATTENUATION_TABLE[i + 1]
            break

    # Linear interpolation
    ratio = (angle - lower[0]) / (upper[0] - lower[0] or 1)
    return lower[1] + ratio * (upper[1] - lower[1])


# ─── Core Noise Calculations ─────────────────────────────────────────────────

def calculate_ground_noise(
    source_db: float,
    altitude_ft: float,
    observer_lat: float,
    observer_lon: float,
    aircraft_lat: float,
    aircraft_lon: float,
    heading: Optional[float] = None
) -> NoiseEstimate:
    """
    Calculate ground-level noise estimate at an observer location.

    Uses physics-based model:
    1. Slant distance (actual acoustic path)
    2. Geometric spreading (inverse square law)
    3. Atmospheric absorption (~0.5 dB per 1000 ft)
    4. Lateral attenuation (SAE-AIR-5662)
    """
    # 1. Calculate horizontal distance
    horizontal_distance_ft = calculate_horizontal_distance_ft(
        observer_lat, observer_lon, aircraft_lat, aircraft_lon
    )

    # 2. Calculate slant distance
    slant_distance_ft = calculate_slant_distance_ft(altitude_ft, horizontal_distance_ft)

    # Minimum distance to prevent extreme values
    effective_slant_distance = max(slant_distance_ft, 100)

    # 3. Geometric spreading (inverse square law)
    geometric_attenuation = 20 * math.log10(
        effective_slant_distance / CERTIFICATION_REFERENCE_DISTANCE_FT
    )

    # 4. Atmospheric absorption
    atmospheric_attenuation = (
        (effective_slant_distance / 1000) * ATMOSPHERIC_ABSORPTION_COEFFICIENT
    )

    # 5. Lateral attenuation
    lateral_attenuation = 0.0
    if heading is not None:
        lateral_angle = calculate_lateral_angle(
            observer_lat, observer_lon, aircraft_lat, aircraft_lon, heading
        )
        lateral_attenuation = get_lateral_attenuation(lateral_angle)

    # Calculate final ground-level noise
    ground_db = source_db - geometric_attenuation - atmospheric_attenuation - lateral_attenuation
    ground_db = max(0, round(ground_db * 10) / 10)

    return NoiseEstimate(
        db=ground_db,
        source="CALCULATED",
        confidence="high",
        slant_distance_ft=round(slant_distance_ft),
        horizontal_distance_ft=round(horizontal_distance_ft),
        geometric_attenuation=round(geometric_attenuation * 10) / 10,
        atmospheric_attenuation=round(atmospheric_attenuation * 10) / 10,
        lateral_attenuation=round(lateral_attenuation * 10) / 10,
    )


def calculate_noise_at_position(
    icao_type: str,
    position: TrackPosition,
    observer_lat: float,
    observer_lon: float,
    direction: str = "arrival",
    category: str = "unknown"
) -> NoiseEstimate:
    """
    Calculate noise estimate at an observer location for a single track position.
    """
    profile = get_noise_profile(icao_type, category)
    source_db = profile.approach_db if direction == "arrival" else profile.takeoff_db

    estimate = calculate_ground_noise(
        source_db=source_db,
        altitude_ft=position.altitude_ft,
        observer_lat=observer_lat,
        observer_lon=observer_lon,
        aircraft_lat=position.latitude,
        aircraft_lon=position.longitude,
        heading=position.heading,
    )

    # Update source and confidence from profile
    estimate.source = profile.data_source
    estimate.confidence = profile.confidence

    if profile.data_source != "EASA_CERTIFIED":
        estimate.warning = f"No EASA data for {icao_type}. Using {profile.category} average."

    return estimate


def calculate_flight_noise_impact(
    fa_flight_id: str,
    icao_type: str,
    track: List[TrackPosition],
    direction: str = "arrival",
    category: str = "unknown",
    observers: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Calculate noise impact for an entire flight track across all observers.

    Returns a dict with max/avg noise and per-observer impacts.
    """
    if observers is None:
        observers = OBSERVER_LOCATIONS

    profile = get_noise_profile(icao_type, category)
    position_interval_seconds = 5  # Typical FlightAware interval

    # Calculate noise at each position for primary observer (Wainscott)
    primary_observer = observers[0]
    track_noise = []

    for position in track:
        estimate = calculate_noise_at_position(
            icao_type=icao_type,
            position=position,
            observer_lat=primary_observer["lat"],
            observer_lon=primary_observer["lon"],
            direction=direction,
            category=category,
        )
        track_noise.append({
            "position": {
                "timestamp": position.timestamp,
                "lat": position.latitude,
                "lon": position.longitude,
                "alt": position.altitude_ft,
            },
            "db": estimate.db,
        })

    # Calculate aggregate metrics
    noise_values = [t["db"] for t in track_noise]
    max_db = max(noise_values) if noise_values else 0
    avg_db = sum(noise_values) / len(noise_values) if noise_values else 0
    exposure_seconds = len(track) * position_interval_seconds

    # Calculate per-observer impacts
    observer_impacts = []
    for obs in observers:
        obs_max_db = 0
        closest_ft = float("inf")
        time_above_65 = 0
        time_above_75 = 0

        for position in track:
            estimate = calculate_noise_at_position(
                icao_type=icao_type,
                position=position,
                observer_lat=obs["lat"],
                observer_lon=obs["lon"],
                direction=direction,
                category=category,
            )

            if estimate.db > obs_max_db:
                obs_max_db = estimate.db

            slant_dist = estimate.slant_distance_ft or 0
            if slant_dist < closest_ft:
                closest_ft = slant_dist

            if estimate.db >= 65:
                time_above_65 += position_interval_seconds
            if estimate.db >= 75:
                time_above_75 += position_interval_seconds

        observer_impacts.append({
            "observer_id": obs["id"],
            "observer_name": obs["name"],
            "max_db": round(obs_max_db * 10) / 10,
            "closest_approach_ft": round(closest_ft),
            "time_above_65db": time_above_65,
            "time_above_75db": time_above_75,
        })

    return {
        "fa_flight_id": fa_flight_id,
        "aircraft_type": icao_type,
        "direction": direction,
        "noise_profile": {
            "manufacturer": profile.manufacturer,
            "model": profile.model,
            "takeoff_db": profile.takeoff_db,
            "approach_db": profile.approach_db,
            "data_source": profile.data_source,
            "confidence": profile.confidence,
        },
        "max_ground_db": round(max_db * 10) / 10,
        "avg_ground_db": round(avg_db * 10) / 10,
        "exposure_seconds": exposure_seconds,
        "track_count": len(track),
        "observer_impacts": observer_impacts,
    }


# ─── Simple Estimate (no track data) ─────────────────────────────────────────

def get_simple_noise_estimate(
    icao_type: str,
    altitude_ft: float,
    direction: str = "arrival",
    category: str = "unknown"
) -> NoiseEstimate:
    """
    Simple noise estimate when track data is not available.
    Assumes aircraft is directly overhead.
    """
    profile = get_noise_profile(icao_type, category)
    source_db = profile.approach_db if direction == "arrival" else profile.takeoff_db

    # Simple inverse square law (altitude only)
    geometric_attenuation = 20 * math.log10(
        max(altitude_ft, 100) / CERTIFICATION_REFERENCE_DISTANCE_FT
    )

    ground_db = source_db - geometric_attenuation
    ground_db = max(0, round(ground_db * 10) / 10)

    return NoiseEstimate(
        db=ground_db,
        source=profile.data_source,
        confidence=profile.confidence,
        warning=None if profile.data_source == "EASA_CERTIFIED" else f"Using category estimate for {icao_type}",
    )


# ─── CLI for Testing ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # Test basic noise calculation
    print("\n=== KJPX Noise Calculator Test ===\n")

    # Test profiles
    test_types = ["S76", "R44", "GLF5", "C172", "UNKN"]
    for icao in test_types:
        profile = get_noise_profile(icao)
        print(f"{icao}: {profile.manufacturer or 'Unknown'} {profile.model or ''}")
        print(f"  Takeoff: {profile.takeoff_db} dB, Approach: {profile.approach_db} dB")
        print(f"  Source: {profile.data_source}, Confidence: {profile.confidence}")
        print()

    # Test ground noise calculation
    print("=== Ground Noise at Wainscott ===\n")

    # S76 at 800ft, directly over Wainscott
    estimate = calculate_ground_noise(
        source_db=88,  # S76 takeoff
        altitude_ft=800,
        observer_lat=40.9445,
        observer_lon=-72.2337,
        aircraft_lat=40.9445,  # Directly overhead
        aircraft_lon=-72.2337,
        heading=280,
    )

    print(f"S76 at 800ft directly overhead:")
    print(f"  Estimated ground dB: {estimate.db}")
    print(f"  Slant distance: {estimate.slant_distance_ft} ft")
    print(f"  Geometric attenuation: {estimate.geometric_attenuation} dB")
    print(f"  Atmospheric attenuation: {estimate.atmospheric_attenuation} dB")
    print(f"  Lateral attenuation: {estimate.lateral_attenuation} dB")
