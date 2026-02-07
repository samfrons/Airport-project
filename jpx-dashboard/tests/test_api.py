#!/usr/bin/env python3
"""
Quick smoke test for the AeroAPI client.
Runs a few low-cost queries to verify connectivity and data quality.

Usage:
    python tests/test_api.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.aeroapi import AeroAPIClient, AeroAPIError
from src.analysis.classify import classify_aircraft


def test_classification():
    """Test aircraft type classification (no API calls)."""
    print("── Classification Tests ──")
    tests = [
        ("R44", "helicopter"),
        ("S76", "helicopter"),
        ("EC35", "helicopter"),
        ("B407", "helicopter"),
        ("GLF5", "jet"),
        ("C560", "jet"),
        ("C172", "fixed_wing"),
        ("SR22", "fixed_wing"),
        ("PA28", "fixed_wing"),
        (None, "unknown"),
        ("", "unknown"),
        ("ZZZZ", "unknown"),
    ]

    passed = 0
    for icao_type, expected in tests:
        result = classify_aircraft(icao_type)
        status = "✓" if result == expected else "✗"
        if result != expected:
            print(f"  {status} classify({icao_type!r}) = {result!r}, expected {expected!r}")
        else:
            passed += 1

    print(f"  ✓ {passed}/{len(tests)} classification tests passed\n")


def test_api_connection():
    """Test API connectivity with a single low-cost call."""
    print("── API Connection Test ──")
    try:
        client = AeroAPIClient()
    except ValueError as e:
        print(f"  ✗ No API key configured: {e}")
        return

    try:
        info = client.airport_info("KJPX")
        name = info.get("name", "unknown")
        city = info.get("city", "unknown")
        print(f"  ✓ Connected! KJPX = {name}, {city}")
        print(f"  ✓ Timezone: {info.get('timezone')}")
        print(f"  ✓ Lat/Lon: {info.get('latitude')}, {info.get('longitude')}")
    except AeroAPIError as e:
        print(f"  ✗ API error: {e}")
    except Exception as e:
        print(f"  ✗ Connection error: {e}")

    print(f"  API requests made: {client.request_count}\n")


def test_recent_flights():
    """Fetch a small sample of recent flights."""
    print("── Recent Flights Test ──")
    try:
        client = AeroAPIClient()
        data = client.airport_flights("KJPX", flight_type="arrivals", max_pages=1)

        arrivals = data.get("arrivals", [])
        print(f"  ✓ Got {len(arrivals)} recent arrivals")

        for f in arrivals[:3]:
            atype = f.get("aircraft_type", "?")
            cat = classify_aircraft(atype)
            reg = f.get("registration", "?")
            print(f"    {reg:10s}  type={atype:6s}  category={cat}")

    except AeroAPIError as e:
        print(f"  ✗ API error: {e}")
    except ValueError:
        print(f"  · Skipped (no API key)")
    except Exception as e:
        print(f"  ✗ Error: {e}")

    print()


if __name__ == "__main__":
    print(f"\n{'═' * 50}")
    print(f"  JPX Dashboard — Smoke Tests")
    print(f"{'═' * 50}\n")

    test_classification()
    test_api_connection()
    test_recent_flights()
