"""
FlightAware AeroAPI v4 Client
==============================

Base URL:  https://aeroapi.flightaware.com/aeroapi
Auth:      x-apikey header (API key only, no username)
Docs:      https://www.flightaware.com/aeroapi/portal/documentation
Spec:      https://flightaware.com/commercial/aeroapi/resources/aeroapi-openapi.yml

Pagination: Up to 15 records per page. Billed per page per query.
            Use max_pages parameter to control costs.

Tiers:
  Personal  — current data only, no history
  Standard  — history back to 2011-01-01, no Foresight ($100/mo)
  Premium   — history + Foresight predictions
"""

import os
import time
import logging
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

BASE_URL = "https://aeroapi.flightaware.com/aeroapi"
API_KEY = os.environ.get("AEROAPI_KEY", "")

# East Hampton Airport
AIRPORT_KJPX = "KJPX"   # Current ICAO code (since May 2022)
AIRPORT_KHTO = "KHTO"    # Former ICAO code (pre-May 2022)


class AeroAPIError(Exception):
    """Raised when the API returns an error response."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"AeroAPI {status_code}: {detail}")


class AeroAPIClient:
    """
    Client for FlightAware AeroAPI v4.

    Usage:
        client = AeroAPIClient()           # reads AEROAPI_KEY from env
        client = AeroAPIClient("your-key") # or pass explicitly

        info = client.airport_info("KJPX")
        flights = client.airport_flights("KJPX", flight_type="arrivals")
        history = client.airport_flights_history("KJPX", start="2025-08-01T00:00:00Z", end="2025-08-02T00:00:00Z")
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or API_KEY
        if not self.api_key:
            raise ValueError(
                "No API key provided. Set AEROAPI_KEY in .env or pass to constructor."
            )
        self.session = requests.Session()
        self.session.headers.update({
            "x-apikey": self.api_key,
            "Accept": "application/json; charset=UTF-8",
        })
        self._request_count = 0

    def _get(self, endpoint: str, params: dict = None) -> dict:
        """Make a GET request. Returns parsed JSON."""
        url = f"{BASE_URL}{endpoint}"
        log.debug(f"GET {url} params={params}")

        resp = self.session.get(url, params=params, timeout=30)
        self._request_count += 1

        if resp.status_code != 200:
            try:
                err = resp.json()
                detail = err.get("detail", err.get("reason", resp.text))
            except Exception:
                detail = resp.text
            raise AeroAPIError(resp.status_code, detail)

        return resp.json()

    # ── Airport Endpoints ────────────────────────────────────────────

    def airport_info(self, airport_id: str = AIRPORT_KJPX) -> dict:
        """
        GET /airports/{id}
        Returns: name, city, state, timezone, lat/lon, elevation, wiki_url, etc.
        """
        return self._get(f"/airports/{airport_id}")

    def airport_flights(
        self,
        airport_id: str = AIRPORT_KJPX,
        flight_type: str = "all",
        max_pages: int = 2,
        airline: str = None,
        aircraft_type: str = None,
    ) -> dict:
        """
        GET /airports/{id}/flights[/arrivals|/departures|/scheduled_*]

        flight_type: "all", "arrivals", "departures",
                     "scheduled_arrivals", "scheduled_departures"
        """
        suffix = "" if flight_type == "all" else f"/{flight_type}"
        params = {"max_pages": max_pages}
        if airline:
            params["airline"] = airline
        if aircraft_type:
            params["type"] = aircraft_type
        return self._get(f"/airports/{airport_id}/flights{suffix}", params)

    def airport_flight_counts(self, airport_id: str = AIRPORT_KJPX) -> dict:
        """GET /airports/{id}/flights/counts — snapshot of current activity."""
        return self._get(f"/airports/{airport_id}/flights/counts")

    def nearby_airports(self, airport_id: str = AIRPORT_KJPX, radius: int = 30) -> dict:
        """GET /airports/{id}/nearby — airports within radius (statute miles)."""
        return self._get(f"/airports/{airport_id}/nearby", {"radius": radius})

    # ── Flight Endpoints ─────────────────────────────────────────────

    def flight_info(self, ident: str) -> dict:
        """
        GET /flights/{ident}
        Look up by tail number (N12345) or flight ident (AAL100).
        """
        return self._get(f"/flights/{ident}")

    def flight_track(self, fa_flight_id: str) -> dict:
        """
        GET /flights/{fa_flight_id}/track
        Returns position reports: lat, lon, alt, groundspeed, heading, timestamp.
        """
        return self._get(f"/flights/{fa_flight_id}/track")

    def search_flights(self, query: str, max_pages: int = 1) -> dict:
        """
        GET /flights/search

        Simplified query syntax:
          -origin KJPX
          -destination KJPX
          -originOrDestination KJPX
          -type H60             (ICAO aircraft type)
          -idents N12345        (tail number)
          -filter ga            (general aviation only)
        """
        return self._get("/flights/search", {"query": query, "max_pages": max_pages})

    # ── History Endpoints (Standard/Premium tier) ────────────────────

    def airport_flights_history(
        self,
        airport_id: str = AIRPORT_KJPX,
        start: str = None,
        end: str = None,
        flight_type: str = "all",
        max_pages: int = 5,
    ) -> dict:
        """
        GET /history/airports/{id}/flights[/arrivals|/departures]

        Date params in ISO 8601: "2025-08-01T00:00:00Z"
        History available back to 2011-01-01.

        This is the primary endpoint for the daily batch job.
        """
        suffix = "" if flight_type == "all" else f"/{flight_type}"
        params = {"max_pages": max_pages}
        if start:
            params["start"] = start
        if end:
            params["end"] = end
        return self._get(f"/history/airports/{airport_id}/flights{suffix}", params)

    def flight_history(self, ident: str, start: str = None, end: str = None) -> dict:
        """
        GET /history/flights/{ident}
        Historical flights for a specific tail number or ident.
        """
        params = {}
        if start:
            params["start"] = start
        if end:
            params["end"] = end
        return self._get(f"/history/flights/{ident}", params or None)

    # ── Aircraft / Owner Endpoints ───────────────────────────────────

    def aircraft_owner(self, registration: str) -> dict:
        """
        GET /aircraft/{ident}/owner
        Returns owner info for US-registered aircraft.
        """
        return self._get(f"/aircraft/{registration}/owner")

    # ── Pagination Helper ────────────────────────────────────────────

    def fetch_all_pages(
        self,
        endpoint: str,
        params: dict = None,
        max_pages: int = 10,
        result_key: str = None,
    ) -> list:
        """
        Fetch multiple pages from a paginated endpoint.

        AeroAPI returns a `links.next` URL with a cursor for the next page.
        Each page = up to 15 records. You're charged per page.

        result_key: the JSON key containing the array (e.g., "flights", "arrivals").
                    If None, auto-detected from first response.
        """
        all_results = []
        params = dict(params or {})
        params["max_pages"] = 1  # fetch one at a time for control

        for page_num in range(max_pages):
            data = self._get(endpoint, params)

            # Auto-detect the result array key
            if result_key is None:
                for candidate in ["flights", "arrivals", "departures", "positions"]:
                    if candidate in data:
                        result_key = candidate
                        break

            if result_key and result_key in data:
                all_results.extend(data[result_key])

            # Check for next page
            next_url = (data.get("links") or {}).get("next")
            if not next_url or "cursor=" not in next_url:
                break
            params["cursor"] = next_url.split("cursor=")[-1].split("&")[0]

        log.info(f"Fetched {page_num + 1} pages, {len(all_results)} records from {endpoint}")
        return all_results

    @property
    def request_count(self) -> int:
        """Number of API requests made by this client instance."""
        return self._request_count
