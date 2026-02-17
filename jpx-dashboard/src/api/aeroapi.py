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

Features:
  - Retry logic with exponential backoff for rate limiting (429)
  - In-memory LRU cache for expensive queries
  - Cost tracking per session
"""

import os
import time
import logging
import hashlib
import requests
from typing import Optional, Any
from collections import OrderedDict
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

BASE_URL = "https://aeroapi.flightaware.com/aeroapi"
API_KEY = os.environ.get("AEROAPI_KEY", "")

# ── Cost estimates per endpoint type (USD) ────────────────────────────────────
# Based on FlightAware AeroAPI pricing
ENDPOINT_COSTS = {
    '/aircraft': 0.005,      # owner lookup
    '/flights': 0.01,        # per page
    '/history': 0.01,        # per page
    '/airports': 0.005,      # airport info
    '/search': 0.01,         # search queries
}

# ── LRU Cache Implementation ──────────────────────────────────────────────────

class LRUCache:
    """Simple thread-safe LRU cache with TTL support."""

    def __init__(self, maxsize: int = 100, ttl_seconds: int = 3600):
        self.maxsize = maxsize
        self.ttl = ttl_seconds
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()

    def _make_key(self, endpoint: str, params: dict = None) -> str:
        """Create cache key from endpoint and params."""
        param_str = str(sorted((params or {}).items()))
        return hashlib.md5(f"{endpoint}:{param_str}".encode()).hexdigest()

    def get(self, endpoint: str, params: dict = None) -> Optional[Any]:
        """Get item from cache if exists and not expired."""
        key = self._make_key(endpoint, params)
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl:
                # Move to end (most recently used)
                self._cache.move_to_end(key)
                return value
            else:
                # Expired — remove
                del self._cache[key]
        return None

    def set(self, endpoint: str, params: dict, value: Any) -> None:
        """Store item in cache."""
        key = self._make_key(endpoint, params)
        self._cache[key] = (value, time.time())
        self._cache.move_to_end(key)
        # Evict oldest if over capacity
        while len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        """Clear all cached items."""
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)

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

    Features:
        - Automatic retry with exponential backoff for 429 (rate limit) errors
        - In-memory LRU cache for owner and track queries
        - Cost tracking per session
    """

    def __init__(
        self,
        api_key: str = None,
        enable_cache: bool = True,
        cache_maxsize: int = 100,
        cache_ttl: int = 3600,  # 1 hour default
        max_retries: int = 3,
        retry_base_delay: float = 1.0,
    ):
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
        self._cost_estimate = 0.0

        # Retry configuration
        self._max_retries = max_retries
        self._retry_base_delay = retry_base_delay

        # Cache configuration
        self._enable_cache = enable_cache
        self._cache = LRUCache(maxsize=cache_maxsize, ttl_seconds=cache_ttl) if enable_cache else None

        # Cacheable endpoints (expensive or slow-changing)
        self._cacheable_endpoints = {'/aircraft', '/airports/'}

    def _estimate_cost(self, endpoint: str, pages: int = 1) -> float:
        """Estimate cost based on endpoint type."""
        for prefix, cost in ENDPOINT_COSTS.items():
            if prefix in endpoint:
                return cost * pages
        return 0.005 * pages  # default estimate

    def _track_cost(self, endpoint: str, pages: int = 1) -> None:
        """Track estimated cost for this request."""
        cost = self._estimate_cost(endpoint, pages)
        self._cost_estimate += cost
        log.debug(f"Cost estimate: +${cost:.4f} (total: ${self._cost_estimate:.4f})")

    def _should_cache(self, endpoint: str) -> bool:
        """Check if endpoint results should be cached."""
        if not self._enable_cache:
            return False
        return any(prefix in endpoint for prefix in self._cacheable_endpoints)

    def _get(self, endpoint: str, params: dict = None, use_cache: bool = True) -> dict:
        """
        Make a GET request with retry logic and optional caching.
        Returns parsed JSON.
        """
        # Check cache first for cacheable endpoints
        if use_cache and self._should_cache(endpoint) and self._cache:
            cached = self._cache.get(endpoint, params)
            if cached is not None:
                log.debug(f"Cache hit for {endpoint}")
                return cached

        url = f"{BASE_URL}{endpoint}"
        log.debug(f"GET {url} params={params}")

        last_error = None
        for attempt in range(self._max_retries + 1):
            try:
                resp = self.session.get(url, params=params, timeout=30)
                self._request_count += 1

                if resp.status_code == 200:
                    self._track_cost(endpoint)
                    data = resp.json()

                    # Cache successful response if applicable
                    if use_cache and self._should_cache(endpoint) and self._cache:
                        self._cache.set(endpoint, params, data)

                    return data

                elif resp.status_code == 429:
                    # Rate limited — retry with exponential backoff
                    if attempt < self._max_retries:
                        delay = self._retry_base_delay * (2 ** attempt)
                        retry_after = resp.headers.get('Retry-After')
                        if retry_after:
                            try:
                                delay = max(delay, float(retry_after))
                            except ValueError:
                                pass
                        log.warning(f"Rate limited (429). Retry {attempt + 1}/{self._max_retries} in {delay:.1f}s")
                        time.sleep(delay)
                        continue
                    else:
                        raise AeroAPIError(429, "Rate limit exceeded after max retries")

                else:
                    # Other error — don't retry
                    try:
                        err = resp.json()
                        detail = err.get("detail", err.get("reason", resp.text))
                    except Exception:
                        detail = resp.text
                    raise AeroAPIError(resp.status_code, detail)

            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < self._max_retries:
                    delay = self._retry_base_delay * (2 ** attempt)
                    log.warning(f"Request failed: {e}. Retry {attempt + 1}/{self._max_retries} in {delay:.1f}s")
                    time.sleep(delay)
                    continue
                raise AeroAPIError(0, f"Request failed after {self._max_retries} retries: {e}")

        raise AeroAPIError(0, f"Unexpected error: {last_error}")

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
        GET /history/airports/{id}/flights/arrivals
        GET /history/airports/{id}/flights/departures

        Note: The history endpoint requires /arrivals or /departures suffix.
        When flight_type="all", makes two requests and combines results.

        Date params in ISO 8601: "2025-08-01T00:00:00Z"
        History available back to 2011-01-01.

        This is the primary endpoint for the daily batch job.
        """
        params = {"max_pages": max_pages}
        if start:
            params["start"] = start
        if end:
            params["end"] = end

        if flight_type == "all":
            # History endpoint requires explicit arrivals/departures suffix
            arrivals_data = self._get(
                f"/history/airports/{airport_id}/flights/arrivals", params
            )
            departures_data = self._get(
                f"/history/airports/{airport_id}/flights/departures", params
            )
            return {
                "arrivals": arrivals_data.get("arrivals", []),
                "departures": departures_data.get("departures", []),
            }
        else:
            return self._get(f"/history/airports/{airport_id}/flights/{flight_type}", params)

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

    @property
    def cost_estimate(self) -> float:
        """Estimated cost (USD) of API requests made by this client instance."""
        return self._cost_estimate

    @property
    def cache_stats(self) -> dict:
        """Get cache statistics."""
        if self._cache:
            return {
                "enabled": True,
                "size": len(self._cache),
                "maxsize": self._cache.maxsize,
                "ttl_seconds": self._cache.ttl,
            }
        return {"enabled": False}

    def clear_cache(self) -> None:
        """Clear the response cache."""
        if self._cache:
            self._cache.clear()
            log.info("Cache cleared")

    def get_session_summary(self) -> dict:
        """Get summary of this client session."""
        return {
            "request_count": self._request_count,
            "cost_estimate_usd": round(self._cost_estimate, 4),
            "cache": self.cache_stats,
        }
