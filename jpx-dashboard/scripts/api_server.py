#!/usr/bin/env python3
"""
JPX Dashboard — Real-Time API Server
=====================================

A lightweight FastAPI server exposing FlightAware AeroAPI endpoints
for real-time queries from the Next.js frontend.

This avoids spawning Python processes for every request and provides:
- Caching layer (in-memory LRU)
- Cost tracking
- Rate limiting awareness
- Structured JSON responses

Usage:
    python scripts/api_server.py                    # Run on default port 3003
    python scripts/api_server.py --port 8080        # Custom port
    uvicorn scripts.api_server:app --reload         # Development mode

Endpoints:
    GET /health                     - Health check
    GET /track/{fa_flight_id}       - Flight track positions
    GET /owner/{registration}       - Aircraft owner info
    GET /search                     - Search flights
    GET /live                       - Current flights at KJPX
    GET /nearby                     - Nearby airports
    GET /airport/{code}             - Airport info
    GET /stats                      - API usage statistics
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.api.aeroapi import AeroAPIClient, AeroAPIError
from src.api.weather import (
    fetch_metar,
    fetch_taf,
    fetch_air_quality,
    parse_metar,
    parse_air_quality,
    get_current_weather,
)

# Mock data imports
from data.mock.flightaware import (
    generate_mock_track,
    generate_mock_owner,
    generate_mock_live_flights,
    generate_mock_nearby_airports,
    generate_mock_airport_info,
    generate_mock_flight_counts,
    generate_mock_search,
)

# ── Logging Configuration ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="JPX Dashboard API",
    description="Real-time FlightAware AeroAPI proxy for JPX Dashboard",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Shared Client Instance ────────────────────────────────────────────────────

# Single client instance with caching enabled
# Cache TTL: owner lookups (24h), tracks (1h), live flights (5min)
_client: Optional[AeroAPIClient] = None
_mock_mode: bool = False


def is_mock_mode() -> bool:
    """Check if the server is running in mock mode (no API key)."""
    return not bool(os.environ.get("AEROAPI_KEY"))


def get_client() -> Optional[AeroAPIClient]:
    """Get or create the shared AeroAPI client. Returns None if in mock mode."""
    global _client, _mock_mode
    api_key = os.environ.get("AEROAPI_KEY")

    if not api_key:
        _mock_mode = True
        log.info("Running in MOCK MODE - no AEROAPI_KEY configured")
        return None

    if _client is None:
        _client = AeroAPIClient(
            api_key=api_key,
            enable_cache=True,
            cache_maxsize=200,
            cache_ttl=3600,  # 1 hour default
            max_retries=3,
        )
        _mock_mode = False
    return _client


# ── Response Models ───────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    api_configured: bool
    mock_mode: bool


class APIStatsResponse(BaseModel):
    request_count: int
    cost_estimate_usd: float
    cache_enabled: bool
    cache_size: int


class TrackPosition(BaseModel):
    timestamp: str
    latitude: float
    longitude: float
    altitude: Optional[int] = None
    groundspeed: Optional[int] = None
    heading: Optional[int] = None


class TrackResponse(BaseModel):
    fa_flight_id: str
    positions: list[dict]
    position_count: int


class OwnerResponse(BaseModel):
    registration: str
    owner: Optional[str] = None
    location: Optional[str] = None
    location2: Optional[str] = None
    website: Optional[str] = None


class FlightSearchResponse(BaseModel):
    flights: list[dict]
    total: int
    query: str


class LiveFlightsResponse(BaseModel):
    arrivals: list[dict]
    departures: list[dict]
    scheduled_arrivals: list[dict]
    scheduled_departures: list[dict]
    timestamp: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    api_key = os.environ.get("AEROAPI_KEY")
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        api_configured=bool(api_key),
        mock_mode=is_mock_mode(),
    )


@app.get("/stats", response_model=APIStatsResponse)
async def get_api_stats():
    """Get API usage statistics for this server session."""
    client = get_client()
    if client is None:
        # Mock mode stats
        return APIStatsResponse(
            request_count=0,
            cost_estimate_usd=0.0,
            cache_enabled=False,
            cache_size=0,
        )
    summary = client.get_session_summary()
    return APIStatsResponse(
        request_count=summary["request_count"],
        cost_estimate_usd=summary["cost_estimate_usd"],
        cache_enabled=summary["cache"]["enabled"],
        cache_size=summary["cache"].get("size", 0),
    )


@app.get("/track/{fa_flight_id}")
async def get_flight_track(fa_flight_id: str):
    """
    Get flight track positions for a specific flight.

    Args:
        fa_flight_id: FlightAware flight ID (e.g., "AAL100-1234567890-airline-0001")

    Returns:
        Track positions with lat/lon/altitude/speed/heading
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_track(fa_flight_id)
        return {
            **mock_data,
            "cost_estimate": 0.0,
        }
    try:
        data = client.flight_track(fa_flight_id)
        positions = data.get("positions", [])
        return {
            "fa_flight_id": fa_flight_id,
            "positions": positions,
            "position_count": len(positions),
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Flight {fa_flight_id} not found")
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@app.get("/owner/{registration}")
async def get_aircraft_owner(registration: str):
    """
    Get owner information for a US-registered aircraft.

    Args:
        registration: Aircraft registration (e.g., "N12345")

    Returns:
        Owner name, location, and contact info
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_owner(registration)
        return {
            **mock_data,
            "cost_estimate": 0.0,
        }
    try:
        data = client.aircraft_owner(registration.upper())
        return {
            "registration": registration.upper(),
            "owner": data.get("owner"),
            "location": data.get("location"),
            "location2": data.get("location2"),
            "website": data.get("website"),
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Owner info not found for {registration}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@app.get("/search")
async def search_flights(
    q: str = Query(..., description="Search query (e.g., '-origin KJPX', '-idents N12345')"),
    max_pages: int = Query(1, ge=1, le=5, description="Maximum pages to fetch"),
):
    """
    Search for flights using FlightAware query syntax.

    Query examples:
        -origin KJPX              (flights departing KJPX)
        -destination KJPX         (flights arriving at KJPX)
        -originOrDestination KJPX (flights to/from KJPX)
        -idents N12345            (flights by tail number)
        -type H60                 (flights by aircraft type)
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_search(q)
        return {
            **mock_data,
            "cost_estimate": 0.0,
        }
    try:
        data = client.search_flights(q, max_pages=max_pages)
        flights = data.get("flights", [])
        return {
            "flights": flights,
            "total": len(flights),
            "query": q,
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@app.get("/live")
async def get_live_flights(
    airport: str = Query("KJPX", description="Airport ICAO code"),
    max_pages: int = Query(2, ge=1, le=5, description="Maximum pages to fetch"),
):
    """
    Get current and scheduled flights at an airport.

    Returns arrivals, departures, and scheduled flights.
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_live_flights(airport)
        return {
            **mock_data,
            "cost_estimate": 0.0,
        }
    try:
        # Fetch all flight types
        data = client.airport_flights(airport, flight_type="all", max_pages=max_pages)

        return {
            "arrivals": data.get("arrivals", []),
            "departures": data.get("departures", []),
            "scheduled_arrivals": data.get("scheduled_arrivals", []),
            "scheduled_departures": data.get("scheduled_departures", []),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@app.get("/nearby")
async def get_nearby_airports(
    airport: str = Query("KJPX", description="Airport ICAO code"),
    radius: int = Query(30, ge=5, le=100, description="Search radius in statute miles"),
):
    """
    Get airports within a radius of the specified airport.
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_nearby_airports(airport, radius)
        return {
            "airports": mock_data.get("nearby", []),
            "center": airport,
            "radius_miles": radius,
            "mock": True,
            "cost_estimate": 0.0,
        }
    try:
        data = client.nearby_airports(airport, radius=radius)
        return {
            "airports": data.get("nearby", []),
            "center": airport,
            "radius_miles": radius,
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@app.get("/airport/{code}")
async def get_airport_info(code: str):
    """
    Get detailed information about an airport.

    Args:
        code: Airport ICAO code (e.g., "KJPX", "KJFK")
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_airport_info(code)
        return {
            **mock_data,
            "cost_estimate": 0.0,
        }
    try:
        data = client.airport_info(code.upper())
        return {
            **data,
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Airport {code} not found")
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@app.get("/counts")
async def get_flight_counts(
    airport: str = Query("KJPX", description="Airport ICAO code"),
):
    """
    Get current flight count snapshot for an airport.
    """
    client = get_client()
    if client is None:
        # Return mock data
        mock_data = generate_mock_flight_counts(airport)
        return {
            **mock_data,
            "airport": airport,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cost_estimate": 0.0,
        }
    try:
        data = client.airport_flight_counts(airport)
        return {
            **data,
            "airport": airport,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cost_estimate": client.cost_estimate,
        }
    except AeroAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# ── Weather Endpoints ────────────────────────────────────────────────────────

@app.get("/weather/metar")
async def get_metar(
    airport: str = Query("KJPX", description="Airport ICAO code"),
):
    """
    Get current METAR observation from NOAA Aviation Weather API.

    Returns raw and parsed METAR data including:
    - Temperature, dewpoint, humidity
    - Wind speed, direction, gusts
    - Visibility, pressure
    - Cloud coverage and weather phenomena
    - Flight category (VFR/MVFR/IFR/LIFR)
    """
    result = fetch_metar(airport)

    if result.get("data"):
        parsed = parse_metar(result["data"])
        return {
            "airport": airport,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "parsed": parsed,
            "raw": result["data"],
            "cached": result.get("cached", False),
            "stale": result.get("stale", False),
            "source": result.get("source", "NOAA Aviation Weather"),
        }
    else:
        raise HTTPException(
            status_code=503,
            detail=result.get("error", "Failed to fetch METAR data"),
        )


@app.get("/weather/taf")
async def get_taf(
    airport: str = Query("KJPX", description="Airport ICAO code"),
):
    """
    Get Terminal Aerodrome Forecast (TAF) from NOAA Aviation Weather API.

    Returns the aviation weather forecast for the next 24-30 hours.
    """
    result = fetch_taf(airport)

    if result.get("data"):
        return {
            "airport": airport,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": result["data"],
            "cached": result.get("cached", False),
            "stale": result.get("stale", False),
            "source": result.get("source", "NOAA Aviation Weather"),
        }
    else:
        raise HTTPException(
            status_code=503,
            detail=result.get("error", "Failed to fetch TAF data"),
        )


@app.get("/air-quality")
async def get_air_quality(
    lat: float = Query(40.9596, description="Latitude"),
    lon: float = Query(-72.2517, description="Longitude"),
    distance: int = Query(25, ge=1, le=100, description="Search radius in miles"),
):
    """
    Get current air quality observations from EPA AirNow API.

    Returns AQI readings for multiple pollutants (O3, PM2.5, etc.)
    with EPA category classifications (Good, Moderate, Unhealthy, etc.)
    """
    result = fetch_air_quality(lat, lon, distance)

    if result.get("data"):
        parsed = parse_air_quality(result["data"])
        return {
            "location": {"lat": lat, "lon": lon},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "parsed": parsed,
            "raw": result["data"],
            "cached": result.get("cached", False),
            "stale": result.get("stale", False),
            "source": result.get("source", "EPA AirNow"),
        }
    else:
        # Return helpful error for missing API key
        error_detail = result.get("error", "Failed to fetch air quality data")
        help_msg = result.get("help", "")
        if help_msg:
            error_detail = f"{error_detail}. {help_msg}"

        raise HTTPException(status_code=503, detail=error_detail)


@app.get("/weather")
async def get_weather(
    airport: str = Query("KJPX", description="Airport ICAO code"),
):
    """
    Get combined weather data: METAR, TAF, and air quality.

    This is the primary endpoint for the dashboard weather display.
    """
    return get_current_weather(airport)


# ── Error Handlers ────────────────────────────────────────────────────────────

@app.exception_handler(AeroAPIError)
async def aeroapi_error_handler(request, exc: AeroAPIError):
    """Handle AeroAPI errors."""
    return JSONResponse(
        status_code=exc.status_code or 500,
        content={
            "error": "AeroAPI Error",
            "detail": exc.detail,
            "status_code": exc.status_code,
        },
    )


# ── Main Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="JPX Dashboard API Server")
    parser.add_argument("--port", type=int, default=3003, help="Port to run on (default: 3003)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    print(f"\n{'═' * 56}")
    print(f"  JPX Dashboard — Real-Time API Server")
    print(f"  Running on http://{args.host}:{args.port}")
    print(f"  API docs: http://{args.host}:{args.port}/docs")
    print(f"{'═' * 56}\n")

    uvicorn.run(
        "scripts.api_server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
