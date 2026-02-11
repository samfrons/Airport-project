"""
Mock Data Generators for FlightAware AeroAPI
=============================================

Generates realistic mock responses when AEROAPI_KEY is not configured.
Enables development and demos without API costs.

All mock responses include `mock: true` to indicate synthetic data.
"""

import random
import math
from datetime import datetime, timezone, timedelta
from typing import Optional

# East Hampton Airport (KJPX) coordinates
KJPX_LAT = 40.9596
KJPX_LON = -72.2518

# Common origin/destination airports
NEARBY_AIRPORTS = [
    {"code": "KTEB", "name": "Teterboro", "lat": 40.8501, "lon": -74.0608, "distance_nm": 65},
    {"code": "KHPN", "name": "Westchester County", "lat": 41.0670, "lon": -73.7076, "distance_nm": 45},
    {"code": "KFRG", "name": "Republic", "lat": 40.7288, "lon": -73.4134, "distance_nm": 30},
    {"code": "KISP", "name": "Long Island MacArthur", "lat": 40.7952, "lon": -73.1002, "distance_nm": 25},
    {"code": "KFOK", "name": "Francis S. Gabreski", "lat": 40.8437, "lon": -72.6318, "distance_nm": 15},
    {"code": "KHTO", "name": "East Hampton (old code)", "lat": 40.9596, "lon": -72.2518, "distance_nm": 0},
    {"code": "KPBI", "name": "Palm Beach Intl", "lat": 26.6832, "lon": -80.0956, "distance_nm": 1050},
    {"code": "KBED", "name": "Hanscom Field", "lat": 42.4700, "lon": -71.2890, "distance_nm": 140},
    {"code": "KJFK", "name": "John F Kennedy", "lat": 40.6413, "lon": -73.7781, "distance_nm": 55},
    {"code": "KLGA", "name": "LaGuardia", "lat": 40.7769, "lon": -73.8740, "distance_nm": 60},
]

# Sample aircraft registrations and types
MOCK_AIRCRAFT = [
    {"reg": "N789HE", "type": "S76", "type_name": "Sikorsky S-76", "category": "helicopter"},
    {"reg": "N456JT", "type": "GLF5", "type_name": "Gulfstream G550", "category": "jet"},
    {"reg": "N123AB", "type": "C172", "type_name": "Cessna 172", "category": "fixed_wing"},
    {"reg": "N321VL", "type": "PC12", "type_name": "Pilatus PC-12", "category": "turboprop"},
    {"reg": "N555HH", "type": "EC35", "type_name": "Eurocopter EC135", "category": "helicopter"},
    {"reg": "N777EH", "type": "A109", "type_name": "AgustaWestland AW109", "category": "helicopter"},
    {"reg": "N888GL", "type": "G280", "type_name": "Gulfstream G280", "category": "jet"},
    {"reg": "N999PJ", "type": "C750", "type_name": "Cessna Citation X", "category": "jet"},
    {"reg": "N234CD", "type": "BE9L", "type_name": "Beechcraft King Air", "category": "turboprop"},
    {"reg": "N567FW", "type": "PA32", "type_name": "Piper Cherokee Six", "category": "fixed_wing"},
    {"reg": "N142QS", "type": "CL35", "type_name": "Challenger 350", "category": "jet"},
    {"reg": "N890LX", "type": "B407", "type_name": "Bell 407", "category": "helicopter"},
]

# Sample owners
MOCK_OWNERS = [
    {"owner": "East Hampton Aviation LLC", "location": "New York, NY"},
    {"owner": "Hamptons Air Charter Inc", "location": "Southampton, NY"},
    {"owner": "Atlantic Executive Services", "location": "Westchester, NY"},
    {"owner": "Blade Urban Air Mobility", "location": "New York, NY"},
    {"owner": "Wells Fargo Bank (Trustee)", "location": "Salt Lake City, UT"},
    {"owner": "Bank of Utah (Trustee)", "location": "Ogden, UT"},
    {"owner": "NetJets Sales Inc", "location": "Columbus, OH"},
    {"owner": "Flexjet LLC", "location": "Richardson, TX"},
    {"owner": "Private Individual", "location": "Greenwich, CT"},
    {"owner": "SunTrust Bank (Trustee)", "location": "Atlanta, GA"},
]


def _generate_curved_path(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    num_points: int = 30,
    cruise_altitude: int = 5000,
) -> list[dict]:
    """Generate a realistic curved flight path between two points."""
    positions = []
    base_time = datetime.now(timezone.utc) - timedelta(hours=1)

    # Calculate great circle distance (simplified)
    lat_diff = end_lat - start_lat
    lon_diff = end_lon - start_lon
    total_distance = math.sqrt(lat_diff**2 + lon_diff**2)

    # Cruise speed based on altitude/aircraft type (knots)
    cruise_speed = random.randint(120, 250)

    for i in range(num_points):
        t = i / (num_points - 1)  # 0 to 1

        # Add slight curve using sine wave
        curve_offset = math.sin(t * math.pi) * 0.02

        lat = start_lat + lat_diff * t + curve_offset * lon_diff
        lon = start_lon + lon_diff * t - curve_offset * lat_diff

        # Altitude profile: climb -> cruise -> descend
        if t < 0.2:  # Climb
            alt = int(500 + (cruise_altitude - 500) * (t / 0.2))
            speed = int(cruise_speed * 0.7)
        elif t > 0.8:  # Descent
            alt = int(cruise_altitude - (cruise_altitude - 500) * ((t - 0.8) / 0.2))
            speed = int(cruise_speed * 0.8)
        else:  # Cruise
            alt = cruise_altitude + random.randint(-200, 200)
            speed = cruise_speed + random.randint(-10, 10)

        # Calculate heading
        if i < num_points - 1:
            next_lat = start_lat + lat_diff * ((i + 1) / (num_points - 1))
            next_lon = start_lon + lon_diff * ((i + 1) / (num_points - 1))
            heading = int((math.atan2(next_lon - lon, next_lat - lat) * 180 / math.pi + 360) % 360)
        else:
            heading = positions[-1]["heading"] if positions else 90

        timestamp = base_time + timedelta(minutes=i * 2)

        positions.append({
            "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "altitude": alt,
            "groundspeed": speed,
            "heading": heading,
        })

    return positions


def generate_mock_track(fa_flight_id: str) -> dict:
    """Generate mock flight track positions."""
    # Pick random origin
    origin = random.choice([a for a in NEARBY_AIRPORTS if a["distance_nm"] > 10])

    # Decide direction (arrival or departure)
    is_arrival = random.random() > 0.5

    if is_arrival:
        start_lat, start_lon = origin["lat"], origin["lon"]
        end_lat, end_lon = KJPX_LAT, KJPX_LON
    else:
        start_lat, start_lon = KJPX_LAT, KJPX_LON
        end_lat, end_lon = origin["lat"], origin["lon"]

    # More points for longer distances
    num_points = min(50, max(20, int(origin["distance_nm"] / 2)))
    cruise_alt = random.choice([3500, 5000, 7000, 9000, 12000])

    positions = _generate_curved_path(
        start_lat, start_lon, end_lat, end_lon,
        num_points=num_points,
        cruise_altitude=cruise_alt,
    )

    return {
        "fa_flight_id": fa_flight_id,
        "positions": positions,
        "position_count": len(positions),
        "mock": True,
    }


def generate_mock_owner(registration: str) -> dict:
    """Generate mock aircraft owner information."""
    owner_info = random.choice(MOCK_OWNERS)
    return {
        "registration": registration.upper(),
        "owner": owner_info["owner"],
        "location": owner_info["location"],
        "location2": None,
        "website": None,
        "mock": True,
    }


def generate_mock_live_flights(airport: str = "KJPX") -> dict:
    """Generate mock live/scheduled flights at an airport."""
    now = datetime.now(timezone.utc)

    arrivals = []
    departures = []
    scheduled_arrivals = []
    scheduled_departures = []

    # Generate 3-6 arrivals
    for i in range(random.randint(3, 6)):
        aircraft = random.choice(MOCK_AIRCRAFT)
        origin = random.choice([a for a in NEARBY_AIRPORTS if a["distance_nm"] > 10])
        arr_time = now - timedelta(minutes=random.randint(5, 120))

        arrivals.append({
            "ident": aircraft["reg"],
            "fa_flight_id": f"{aircraft['reg']}-{int(arr_time.timestamp())}-schedule-0001",
            "aircraft_type": aircraft["type"],
            "origin": {"code": origin["code"], "name": origin["name"]},
            "destination": {"code": airport, "name": "East Hampton"},
            "actual_on": arr_time.isoformat().replace("+00:00", "Z"),
            "status": "Arrived",
        })

    # Generate 2-5 departures
    for i in range(random.randint(2, 5)):
        aircraft = random.choice(MOCK_AIRCRAFT)
        dest = random.choice([a for a in NEARBY_AIRPORTS if a["distance_nm"] > 10])
        dep_time = now - timedelta(minutes=random.randint(5, 90))

        departures.append({
            "ident": aircraft["reg"],
            "fa_flight_id": f"{aircraft['reg']}-{int(dep_time.timestamp())}-schedule-0001",
            "aircraft_type": aircraft["type"],
            "origin": {"code": airport, "name": "East Hampton"},
            "destination": {"code": dest["code"], "name": dest["name"]},
            "actual_off": dep_time.isoformat().replace("+00:00", "Z"),
            "status": "Departed",
        })

    # Generate 2-4 scheduled arrivals
    for i in range(random.randint(2, 4)):
        aircraft = random.choice(MOCK_AIRCRAFT)
        origin = random.choice([a for a in NEARBY_AIRPORTS if a["distance_nm"] > 10])
        eta = now + timedelta(minutes=random.randint(30, 180))

        scheduled_arrivals.append({
            "ident": aircraft["reg"],
            "fa_flight_id": f"{aircraft['reg']}-{int(eta.timestamp())}-schedule-0001",
            "aircraft_type": aircraft["type"],
            "origin": {"code": origin["code"], "name": origin["name"]},
            "destination": {"code": airport, "name": "East Hampton"},
            "estimated_on": eta.isoformat().replace("+00:00", "Z"),
            "status": "En Route" if random.random() > 0.3 else "Scheduled",
        })

    # Generate 1-3 scheduled departures
    for i in range(random.randint(1, 3)):
        aircraft = random.choice(MOCK_AIRCRAFT)
        dest = random.choice([a for a in NEARBY_AIRPORTS if a["distance_nm"] > 10])
        etd = now + timedelta(minutes=random.randint(30, 120))

        scheduled_departures.append({
            "ident": aircraft["reg"],
            "fa_flight_id": f"{aircraft['reg']}-{int(etd.timestamp())}-schedule-0001",
            "aircraft_type": aircraft["type"],
            "origin": {"code": airport, "name": "East Hampton"},
            "destination": {"code": dest["code"], "name": dest["name"]},
            "estimated_off": etd.isoformat().replace("+00:00", "Z"),
            "status": "Scheduled",
        })

    return {
        "arrivals": arrivals,
        "departures": departures,
        "scheduled_arrivals": scheduled_arrivals,
        "scheduled_departures": scheduled_departures,
        "timestamp": now.isoformat().replace("+00:00", "Z"),
        "mock": True,
    }


def generate_mock_nearby_airports(airport: str = "KJPX", radius: int = 30) -> dict:
    """Generate mock nearby airports list."""
    nearby = [
        {
            "airport_code": a["code"],
            "name": a["name"],
            "distance": a["distance_nm"],
            "heading": random.randint(0, 359),
            "latitude": a["lat"],
            "longitude": a["lon"],
        }
        for a in NEARBY_AIRPORTS
        if 0 < a["distance_nm"] <= radius
    ]

    return {
        "nearby": nearby,
        "center": airport,
        "radius_miles": radius,
        "mock": True,
    }


def generate_mock_airport_info(code: str) -> dict:
    """Generate mock airport information."""
    # Look up in nearby airports first
    for airport in NEARBY_AIRPORTS:
        if airport["code"] == code.upper():
            return {
                "airport_code": airport["code"],
                "name": airport["name"],
                "city": "East Hampton" if code == "KJPX" else airport["name"].split()[0],
                "state": "NY",
                "country_code": "US",
                "latitude": airport["lat"],
                "longitude": airport["lon"],
                "elevation": random.randint(50, 200),
                "timezone": "America/New_York",
                "wiki_url": f"https://en.wikipedia.org/wiki/{airport['name'].replace(' ', '_')}_Airport",
                "mock": True,
            }

    # Default response for KJPX
    return {
        "airport_code": code.upper(),
        "name": "East Hampton Airport",
        "city": "East Hampton",
        "state": "NY",
        "country_code": "US",
        "latitude": KJPX_LAT,
        "longitude": KJPX_LON,
        "elevation": 55,
        "timezone": "America/New_York",
        "wiki_url": "https://en.wikipedia.org/wiki/East_Hampton_Airport",
        "mock": True,
    }


def generate_mock_flight_counts(airport: str = "KJPX") -> dict:
    """Generate mock flight count snapshot."""
    return {
        "airport_code": airport,
        "departures": random.randint(2, 8),
        "arrivals": random.randint(2, 8),
        "scheduled_departures": random.randint(1, 5),
        "scheduled_arrivals": random.randint(1, 5),
        "en_route": random.randint(0, 4),
        "mock": True,
    }


def generate_mock_search(query: str) -> dict:
    """Generate mock flight search results."""
    flights = []
    num_results = random.randint(3, 10)
    now = datetime.now(timezone.utc)

    for i in range(num_results):
        aircraft = random.choice(MOCK_AIRCRAFT)
        origin = random.choice(NEARBY_AIRPORTS)
        dest = random.choice([a for a in NEARBY_AIRPORTS if a["code"] != origin["code"]])
        dep_time = now - timedelta(hours=random.randint(1, 24))

        flights.append({
            "ident": aircraft["reg"],
            "fa_flight_id": f"{aircraft['reg']}-{int(dep_time.timestamp())}-schedule-0001",
            "aircraft_type": aircraft["type"],
            "origin": {"code": origin["code"], "name": origin["name"]},
            "destination": {"code": dest["code"], "name": dest["name"]},
            "departure_time": dep_time.isoformat().replace("+00:00", "Z"),
            "status": random.choice(["Arrived", "Departed", "En Route", "Scheduled"]),
        })

    return {
        "flights": flights,
        "total": len(flights),
        "query": query,
        "mock": True,
    }
