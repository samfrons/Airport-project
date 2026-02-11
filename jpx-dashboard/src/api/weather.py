"""
Weather & Air Quality Service
==============================

Fetches real weather data from NOAA Aviation Weather API and
air quality data from EPA AirNow API.

Data Sources:
  - METAR/TAF: https://aviationweather.gov/api/data/metar?ids=KJPX&format=json
  - AQI: https://www.airnowapi.org/aq/observation/latLong/current/

Features:
  - In-memory caching with configurable TTL
  - Fallback to last known values on API failure
  - Rate limit awareness
"""

import os
import time
import logging
from typing import Optional, Any
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

# NOAA Aviation Weather API (free, no auth required)
NOAA_BASE_URL = "https://aviationweather.gov/api/data"

# EPA AirNow API (free, requires registration)
AIRNOW_BASE_URL = "https://www.airnowapi.org/aq/observation/latLong/current/"
AIRNOW_API_KEY = os.environ.get("AIRNOW_API_KEY", "")

# KJPX Airport coordinates (East Hampton, NY)
KJPX_LAT = 40.9596
KJPX_LON = -72.2517

# NYC area coordinates for AQI (nearest monitoring station to East Hampton)
# East Hampton has no local AQI station, so we use NYC region as proxy
NYC_AQI_LAT = 40.7589
NYC_AQI_LON = -73.8511

# Cache TTL in seconds
METAR_CACHE_TTL = 900   # 15 minutes
TAF_CACHE_TTL = 3600    # 1 hour
AQI_CACHE_TTL = 3600    # 1 hour


# ── Simple Cache Implementation ───────────────────────────────────────────────

class SimpleCache:
    """Simple in-memory cache with TTL."""

    def __init__(self):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._last_valid: dict[str, Any] = {}  # Fallback values

    def get(self, key: str, ttl: int) -> Optional[Any]:
        """Get cached value if not expired."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < ttl:
                return value
        return None

    def set(self, key: str, value: Any) -> None:
        """Store value in cache."""
        self._cache[key] = (value, time.time())
        # Also store as last valid value for fallback
        self._last_valid[key] = value

    def get_fallback(self, key: str) -> Optional[Any]:
        """Get last known valid value (for error recovery)."""
        return self._last_valid.get(key)


_cache = SimpleCache()


# ── NOAA METAR API ────────────────────────────────────────────────────────────

def fetch_metar(airport: str = "KJPX") -> dict:
    """
    Fetch current METAR observation from NOAA Aviation Weather API.

    Returns:
        dict with METAR data or error info
    """
    cache_key = f"metar_{airport}"

    # Check cache first
    cached = _cache.get(cache_key, METAR_CACHE_TTL)
    if cached is not None:
        return {"data": cached, "cached": True}

    try:
        url = f"{NOAA_BASE_URL}/metar"
        params = {
            "ids": airport,
            "format": "json",
            "taf": "false",
        }

        log.info(f"Fetching METAR for {airport}")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # NOAA returns a list of observations
        if isinstance(data, list) and len(data) > 0:
            metar = data[0]
            _cache.set(cache_key, metar)
            return {
                "data": metar,
                "cached": False,
                "source": "NOAA Aviation Weather",
            }
        else:
            # Empty response - try fallback
            fallback = _cache.get_fallback(cache_key)
            if fallback:
                return {
                    "data": fallback,
                    "cached": True,
                    "stale": True,
                    "error": "No data returned, using cached value",
                }
            return {"error": "No METAR data available", "data": None}

    except requests.exceptions.RequestException as e:
        log.error(f"METAR fetch failed: {e}")
        fallback = _cache.get_fallback(cache_key)
        if fallback:
            return {
                "data": fallback,
                "cached": True,
                "stale": True,
                "error": str(e),
            }
        return {"error": f"Failed to fetch METAR: {e}", "data": None}


def parse_metar(raw_metar: dict) -> dict:
    """
    Parse NOAA METAR response into a standardized format.

    Returns:
        dict with parsed weather data
    """
    if not raw_metar:
        return {}

    # NOAA METAR fields (may vary based on observation)
    return {
        "icao": raw_metar.get("icaoId", ""),
        "observation_time": raw_metar.get("obsTime"),
        "report_time": raw_metar.get("reportTime"),
        "raw_text": raw_metar.get("rawOb", ""),

        # Temperature (Celsius in API, convert to Fahrenheit for display)
        "temperature_c": raw_metar.get("temp"),
        "temperature_f": _c_to_f(raw_metar.get("temp")),
        "dewpoint_c": raw_metar.get("dewp"),
        "dewpoint_f": _c_to_f(raw_metar.get("dewp")),

        # Wind
        "wind_direction": raw_metar.get("wdir"),  # degrees
        "wind_speed_kt": raw_metar.get("wspd"),   # knots
        "wind_speed_mph": _kt_to_mph(raw_metar.get("wspd")),
        "wind_gust_kt": raw_metar.get("wgst"),
        "wind_gust_mph": _kt_to_mph(raw_metar.get("wgst")),

        # Visibility (statute miles)
        "visibility_sm": raw_metar.get("visib"),

        # Pressure
        "altimeter_inhg": raw_metar.get("altim"),  # inches of mercury

        # Cloud coverage
        "clouds": raw_metar.get("clouds", []),

        # Weather phenomena (rain, fog, etc.)
        "weather": raw_metar.get("wxString", ""),

        # Flight category (VFR, MVFR, IFR, LIFR)
        "flight_category": raw_metar.get("fltCat", raw_metar.get("fltcat", "")),

        # Humidity (calculated if temp and dewpoint available)
        "humidity": _calc_humidity(
            raw_metar.get("temp"),
            raw_metar.get("dewp")
        ),
    }


# ── NOAA TAF API ──────────────────────────────────────────────────────────────

def fetch_taf(airport: str = "KJPX") -> dict:
    """
    Fetch TAF (Terminal Aerodrome Forecast) from NOAA Aviation Weather API.

    Returns:
        dict with TAF data or error info
    """
    cache_key = f"taf_{airport}"

    # Check cache first
    cached = _cache.get(cache_key, TAF_CACHE_TTL)
    if cached is not None:
        return {"data": cached, "cached": True}

    try:
        url = f"{NOAA_BASE_URL}/taf"
        params = {
            "ids": airport,
            "format": "json",
        }

        log.info(f"Fetching TAF for {airport}")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        if isinstance(data, list) and len(data) > 0:
            taf = data[0]
            _cache.set(cache_key, taf)
            return {
                "data": taf,
                "cached": False,
                "source": "NOAA Aviation Weather",
            }
        else:
            fallback = _cache.get_fallback(cache_key)
            if fallback:
                return {
                    "data": fallback,
                    "cached": True,
                    "stale": True,
                    "error": "No data returned, using cached value",
                }
            return {"error": "No TAF data available", "data": None}

    except requests.exceptions.RequestException as e:
        log.error(f"TAF fetch failed: {e}")
        fallback = _cache.get_fallback(cache_key)
        if fallback:
            return {
                "data": fallback,
                "cached": True,
                "stale": True,
                "error": str(e),
            }
        return {"error": f"Failed to fetch TAF: {e}", "data": None}


# ── EPA AirNow API ────────────────────────────────────────────────────────────

def fetch_air_quality(
    lat: float = KJPX_LAT,
    lon: float = KJPX_LON,
    distance: int = 100,  # Larger radius needed for East Hampton area
) -> dict:
    """
    Fetch current air quality observations from EPA AirNow API.

    Note: East Hampton (KJPX) has no local AQI monitoring station.
    If no data is found for the specified coordinates, we fall back
    to NYC region data as the nearest reliable source.

    Args:
        lat: Latitude
        lon: Longitude
        distance: Search radius in miles

    Returns:
        dict with AQI data or error info
    """
    cache_key = f"aqi_{lat}_{lon}"

    # Check cache first
    cached = _cache.get(cache_key, AQI_CACHE_TTL)
    if cached is not None:
        return {"data": cached, "cached": True}

    if not AIRNOW_API_KEY:
        return {
            "error": "AirNow API key not configured",
            "data": None,
            "help": "Set AIRNOW_API_KEY in .env file",
        }

    def _fetch_aqi(fetch_lat: float, fetch_lon: float, fetch_distance: int) -> list:
        """Helper to fetch AQI from specific coordinates."""
        params = {
            "format": "application/json",
            "latitude": fetch_lat,
            "longitude": fetch_lon,
            "distance": fetch_distance,
            "API_KEY": AIRNOW_API_KEY,
        }
        response = requests.get(AIRNOW_BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json()

    try:
        log.info(f"Fetching AQI for ({lat}, {lon})")
        data = _fetch_aqi(lat, lon, distance)

        # If no data for East Hampton area, fall back to NYC region
        if not (isinstance(data, list) and len(data) > 0):
            if abs(lat - KJPX_LAT) < 0.1 and abs(lon - KJPX_LON) < 0.1:
                log.info("No AQI data for East Hampton, falling back to NYC region")
                data = _fetch_aqi(NYC_AQI_LAT, NYC_AQI_LON, 50)

        if isinstance(data, list) and len(data) > 0:
            # AirNow returns multiple readings (O3, PM2.5, etc.)
            _cache.set(cache_key, data)
            return {
                "data": data,
                "cached": False,
                "source": "EPA AirNow",
                "note": "NYC region data (nearest station to East Hampton)" if abs(lat - KJPX_LAT) < 0.1 else None,
            }
        else:
            fallback = _cache.get_fallback(cache_key)
            if fallback:
                return {
                    "data": fallback,
                    "cached": True,
                    "stale": True,
                    "error": "No data returned, using cached value",
                }
            return {"error": "No AQI data available for this location", "data": None}

    except requests.exceptions.RequestException as e:
        log.error(f"AQI fetch failed: {e}")
        fallback = _cache.get_fallback(cache_key)
        if fallback:
            return {
                "data": fallback,
                "cached": True,
                "stale": True,
                "error": str(e),
            }
        return {"error": f"Failed to fetch AQI: {e}", "data": None}


def parse_air_quality(raw_data: list) -> dict:
    """
    Parse AirNow response into a standardized format.

    Returns:
        dict with combined AQI data
    """
    if not raw_data:
        return {}

    # Find the highest AQI reading (worst air quality)
    primary = max(raw_data, key=lambda x: x.get("AQI", 0))

    # Organize by pollutant
    pollutants = {}
    for reading in raw_data:
        param = reading.get("ParameterName", "Unknown")
        pollutants[param] = {
            "aqi": reading.get("AQI", 0),
            "category": reading.get("Category", {}).get("Name", "Unknown"),
            "category_number": reading.get("Category", {}).get("Number", 0),
        }

    return {
        "overall_aqi": primary.get("AQI", 0),
        "category": primary.get("Category", {}).get("Name", "Unknown"),
        "category_number": primary.get("Category", {}).get("Number", 0),
        "main_pollutant": primary.get("ParameterName", "Unknown"),
        "reporting_area": primary.get("ReportingArea", "Unknown"),
        "state": primary.get("StateCode", ""),
        "date_observed": primary.get("DateObserved", ""),
        "hour_observed": primary.get("HourObserved", 0),
        "pollutants": pollutants,
    }


# ── Helper Functions ──────────────────────────────────────────────────────────

def _c_to_f(celsius: Optional[float]) -> Optional[float]:
    """Convert Celsius to Fahrenheit."""
    if celsius is None:
        return None
    return round(celsius * 9 / 5 + 32, 1)


def _kt_to_mph(knots: Optional[float]) -> Optional[float]:
    """Convert knots to miles per hour."""
    if knots is None:
        return None
    return round(knots * 1.15078, 1)


def _calc_humidity(temp_c: Optional[float], dewp_c: Optional[float]) -> Optional[int]:
    """
    Calculate relative humidity from temperature and dewpoint.
    Uses Magnus formula approximation.
    """
    if temp_c is None or dewp_c is None:
        return None

    # Magnus formula constants
    a = 17.27
    b = 237.7

    try:
        gamma_t = (a * temp_c) / (b + temp_c)
        gamma_d = (a * dewp_c) / (b + dewp_c)

        import math
        rh = 100 * math.exp(gamma_d - gamma_t)
        return min(100, max(0, round(rh)))
    except (ValueError, ZeroDivisionError):
        return None


# ── Aggregated Weather Data ───────────────────────────────────────────────────

def get_current_weather(airport: str = "KJPX") -> dict:
    """
    Get combined current weather data from all sources.

    Returns:
        dict with parsed METAR, TAF summary, and AQI
    """
    metar_result = fetch_metar(airport)
    taf_result = fetch_taf(airport)
    aqi_result = fetch_air_quality()

    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "airport": airport,
    }

    # METAR data
    if metar_result.get("data"):
        result["metar"] = parse_metar(metar_result["data"])
        result["metar"]["raw"] = metar_result["data"]
        result["metar"]["cached"] = metar_result.get("cached", False)
        result["metar"]["stale"] = metar_result.get("stale", False)
    else:
        result["metar"] = {"error": metar_result.get("error")}

    # TAF data
    if taf_result.get("data"):
        result["taf"] = {
            "raw": taf_result["data"],
            "cached": taf_result.get("cached", False),
            "stale": taf_result.get("stale", False),
        }
    else:
        result["taf"] = {"error": taf_result.get("error")}

    # AQI data
    if aqi_result.get("data"):
        result["aqi"] = parse_air_quality(aqi_result["data"])
        result["aqi"]["cached"] = aqi_result.get("cached", False)
        result["aqi"]["stale"] = aqi_result.get("stale", False)
    else:
        result["aqi"] = {"error": aqi_result.get("error")}

    return result
