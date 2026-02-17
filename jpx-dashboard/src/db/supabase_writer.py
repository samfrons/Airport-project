"""
Supabase Writer for JPX Dashboard
==================================

Provides direct Python→Supabase writes for flight data.
Replaces SQLite as the primary data store for production.

Usage:
    from src.db.supabase_writer import SupabaseWriter

    writer = SupabaseWriter()
    writer.insert_flight(flight_dict)
    writer.batch_insert_flights(flights_list)
    writer.upsert_daily_summary("2024-08-15", summary_dict)

Environment Variables:
    SUPABASE_URL - Supabase project URL
    SUPABASE_SERVICE_KEY - Service role key (for server-side writes)
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger(__name__)


class SupabaseWriter:
    """
    Writes flight data directly to Supabase.
    """

    def __init__(self, url: str = None, key: str = None):
        """
        Initialize Supabase client.

        Args:
            url: Supabase URL (defaults to SUPABASE_URL env var)
            key: Service key (defaults to SUPABASE_SERVICE_KEY env var)
        """
        try:
            from supabase import create_client
        except ImportError:
            raise ImportError("supabase-py not installed. Run: pip install supabase")

        self.url = url or os.environ.get("SUPABASE_URL")
        self.key = key or os.environ.get("SUPABASE_SERVICE_KEY")

        if not self.url or not self.key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required. "
                "Or pass url and key parameters directly."
            )

        self.client = create_client(self.url, self.key)
        log.info(f"SupabaseWriter initialized for {self.url}")

    def insert_flight(self, flight: dict) -> bool:
        """
        Insert a single flight record.

        Args:
            flight: Dict with flight data (should have derived fields like
                    aircraft_category, is_curfew_period, etc.)

        Returns:
            True if inserted, False if duplicate or error
        """
        # Prepare record for Supabase
        record = self._prepare_flight_record(flight)

        try:
            # Use upsert to handle duplicates gracefully
            response = self.client.table("flights").upsert(
                record,
                on_conflict="fa_flight_id"
            ).execute()

            return len(response.data) > 0

        except Exception as e:
            log.error(f"Error inserting flight {flight.get('fa_flight_id')}: {e}")
            return False

    def batch_insert_flights(self, flights: list, batch_size: int = 100) -> int:
        """
        Insert multiple flights in batches.

        Args:
            flights: List of flight dicts
            batch_size: Number of records per batch (default 100)

        Returns:
            Number of successfully inserted records
        """
        inserted = 0

        # Prepare all records
        records = [self._prepare_flight_record(f) for f in flights]

        # Deduplicate by fa_flight_id (keep first occurrence)
        # This handles cases where a flight appears in both arrivals and departures
        seen_ids = set()
        unique_records = []
        for record in records:
            flight_id = record.get("fa_flight_id")
            if flight_id and flight_id not in seen_ids:
                seen_ids.add(flight_id)
                unique_records.append(record)

        if len(unique_records) < len(records):
            log.debug(f"Deduplicated {len(records) - len(unique_records)} duplicate flight IDs")

        # Process in batches
        for i in range(0, len(unique_records), batch_size):
            batch = unique_records[i:i + batch_size]

            try:
                response = self.client.table("flights").upsert(
                    batch,
                    on_conflict="fa_flight_id"
                ).execute()

                inserted += len(response.data)
                log.debug(f"Batch {i // batch_size + 1}: inserted {len(response.data)} records")

            except Exception as e:
                log.error(f"Error in batch {i // batch_size + 1}: {e}")

        log.info(f"Batch insert complete: {inserted}/{len(unique_records)} records")
        return inserted

    def upsert_daily_summary(self, date: str, summary: dict = None) -> bool:
        """
        Update or insert daily summary for a date.

        If summary is None, recalculates from flight data.

        Args:
            date: Date string (YYYY-MM-DD)
            summary: Optional summary dict with counts

        Returns:
            True if successful
        """
        if summary is None:
            summary = self._calculate_daily_summary(date)

        if not summary:
            log.warning(f"No flights found for {date}, skipping summary")
            return False

        try:
            # Add date and timestamp
            summary["operation_date"] = date
            summary["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.client.table("daily_summary").upsert(
                summary,
                on_conflict="operation_date"
            ).execute()

            return len(response.data) > 0

        except Exception as e:
            log.error(f"Error upserting daily summary for {date}: {e}")
            return False

    def log_ingestion(
        self,
        pull_date: str,
        flights_fetched: int = 0,
        flights_inserted: int = 0,
        flights_skipped: int = 0,
        api_requests: int = 0,
        status: str = "success",
        error_message: str = None
    ) -> int:
        """
        Log an ingestion run.

        Returns:
            Log entry ID
        """
        record = {
            "pull_date": pull_date,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "flights_fetched": flights_fetched,
            "flights_inserted": flights_inserted,
            "flights_skipped": flights_skipped,
            "api_requests_made": api_requests,
            "status": status,
            "error_message": error_message,
        }

        try:
            response = self.client.table("ingestion_log").insert(record).execute()
            return response.data[0]["id"] if response.data else None
        except Exception as e:
            log.error(f"Error logging ingestion: {e}")
            return None

    def _prepare_flight_record(self, flight: dict) -> dict:
        """
        Prepare a flight dict for Supabase insertion.
        Removes SQLite-specific fields and ensures proper types.
        """
        # Fields to include
        fields = [
            "fa_flight_id", "ident", "registration", "direction",
            "aircraft_type", "aircraft_category", "operator", "operator_iata",
            "origin_code", "origin_name", "origin_city",
            "destination_code", "destination_name", "destination_city",
            "scheduled_off", "actual_off", "scheduled_on", "actual_on",
            "operation_date", "operation_hour_et", "is_curfew_period", "is_weekend",
        ]

        record = {k: flight.get(k) for k in fields if k in flight}

        # Ensure booleans
        if "is_curfew_period" in record:
            record["is_curfew_period"] = bool(record["is_curfew_period"])
        if "is_weekend" in record:
            record["is_weekend"] = bool(record["is_weekend"])

        # Store raw_json if present (optional, can be large)
        if flight.get("raw_json"):
            record["raw_json"] = flight["raw_json"]

        return record

    def _calculate_daily_summary(self, date: str) -> dict:
        """
        Calculate daily summary from flight records.
        """
        try:
            response = self.client.table("flights").select("*").eq(
                "operation_date", date
            ).execute()

            flights = response.data
            if not flights:
                return None

            # Calculate summary
            arrivals = sum(1 for f in flights if f.get("direction") == "arrival")
            departures = sum(1 for f in flights if f.get("direction") == "departure")
            helicopters = sum(1 for f in flights if f.get("aircraft_category") == "helicopter")
            fixed_wing = sum(1 for f in flights if f.get("aircraft_category") == "fixed_wing")
            jets = sum(1 for f in flights if f.get("aircraft_category") == "jet")
            unknown = sum(1 for f in flights if f.get("aircraft_category") == "unknown")
            curfew_ops = sum(1 for f in flights if f.get("is_curfew_period"))
            unique_aircraft = len(set(f.get("registration") for f in flights if f.get("registration")))

            # Day of week
            from datetime import datetime as dt
            dow = dt.strptime(date, "%Y-%m-%d").strftime("%A")

            return {
                "total_operations": len(flights),
                "arrivals": arrivals,
                "departures": departures,
                "helicopters": helicopters,
                "fixed_wing": fixed_wing,
                "jets": jets,
                "unknown_type": unknown,
                "curfew_operations": curfew_ops,
                "unique_aircraft": unique_aircraft,
                "day_of_week": dow,
            }

        except Exception as e:
            log.error(f"Error calculating daily summary: {e}")
            return None

    def get_flight_count(self, date: str = None) -> int:
        """Get total flight count, optionally for a specific date."""
        try:
            query = self.client.table("flights").select("id", count="exact")
            if date:
                query = query.eq("operation_date", date)
            response = query.execute()
            return response.count or 0
        except Exception as e:
            log.error(f"Error getting flight count: {e}")
            return 0

    def flight_exists(self, fa_flight_id: str) -> bool:
        """Check if a flight already exists."""
        try:
            response = self.client.table("flights").select("id").eq(
                "fa_flight_id", fa_flight_id
            ).execute()
            return len(response.data) > 0
        except Exception as e:
            log.error(f"Error checking flight existence: {e}")
            return False


    # ============================================================
    # Complaint Operations
    # ============================================================

    def insert_complaint(self, complaint: dict) -> bool:
        """
        Insert a single complaint record.

        Args:
            complaint: Dict with complaint data (should have derived fields like
                       is_curfew_period, geocoded coordinates, etc.)

        Returns:
            True if inserted, False if error
        """
        record = self._prepare_complaint_record(complaint)

        try:
            response = self.client.table("complaints").insert(record).execute()
            return len(response.data) > 0
        except Exception as e:
            log.error(f"Error inserting complaint {complaint.get('source_id')}: {e}")
            return False

    def batch_insert_complaints(self, complaints: list, batch_size: int = 100) -> int:
        """
        Insert multiple complaints in batches.

        Args:
            complaints: List of complaint dicts
            batch_size: Number of records per batch (default 100)

        Returns:
            Number of successfully inserted records
        """
        inserted = 0
        records = [self._prepare_complaint_record(c) for c in complaints]

        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]

            try:
                response = self.client.table("complaints").insert(batch).execute()
                inserted += len(response.data)
                log.debug(f"Complaint batch {i // batch_size + 1}: inserted {len(response.data)} records")
            except Exception as e:
                log.error(f"Error in complaint batch {i // batch_size + 1}: {e}")

        log.info(f"Complaint batch insert complete: {inserted}/{len(records)} records")
        return inserted

    def upsert_complaint_daily_summary(self, date: str, summary: dict) -> bool:
        """
        Update or insert complaint daily summary for a date.

        Args:
            date: Date string (YYYY-MM-DD)
            summary: Summary dict with complaint counts

        Returns:
            True if successful
        """
        try:
            summary["date"] = date
            summary["created_at"] = datetime.now(timezone.utc).isoformat()

            response = self.client.table("complaint_daily_summary").upsert(
                summary,
                on_conflict="date"
            ).execute()

            return len(response.data) > 0
        except Exception as e:
            log.error(f"Error upserting complaint summary for {date}: {e}")
            return False

    def upsert_complaint_hotspots(self, hotspots: list) -> int:
        """
        Upsert complaint hotspot records.

        Args:
            hotspots: List of hotspot dicts with street_name, municipality, etc.

        Returns:
            Number of successfully upserted records
        """
        upserted = 0

        try:
            response = self.client.table("complaint_hotspots").upsert(
                hotspots,
                on_conflict="street_name,municipality"
            ).execute()
            upserted = len(response.data)
        except Exception as e:
            log.error(f"Error upserting complaint hotspots: {e}")

        return upserted

    def _prepare_complaint_record(self, complaint: dict) -> dict:
        """
        Prepare a complaint dict for Supabase insertion.
        Ensures proper types and field names.
        """
        fields = [
            "source_id", "event_date", "event_time", "event_datetime_utc",
            "event_hour_et", "is_curfew_period", "is_weekend",
            "street_name", "municipality", "zip_code", "latitude", "longitude",
            "airport", "complaint_types", "aircraft_type", "aircraft_description",
            "flight_direction", "comments",
            "matched_flight_id", "matched_confidence", "matched_registration", "matched_operator",
            "submission_date",
        ]

        record = {k: complaint.get(k) for k in fields if k in complaint}

        # Ensure booleans
        if "is_curfew_period" in record:
            record["is_curfew_period"] = bool(record["is_curfew_period"])
        if "is_weekend" in record:
            record["is_weekend"] = bool(record["is_weekend"])

        return record

    def get_complaints(
        self,
        start: str = None,
        end: str = None,
        municipality: str = None,
        aircraft_type: str = None,
        limit: int = 1000
    ) -> list:
        """
        Query complaints with optional filters.

        Args:
            start: Start date (YYYY-MM-DD)
            end: End date (YYYY-MM-DD)
            municipality: Filter by municipality
            aircraft_type: Filter by aircraft type
            limit: Max records to return

        Returns:
            List of complaint dicts
        """
        try:
            query = self.client.table("complaints").select("*")

            if start:
                query = query.gte("event_date", start)
            if end:
                query = query.lte("event_date", end)
            if municipality:
                query = query.eq("municipality", municipality)
            if aircraft_type:
                query = query.eq("aircraft_type", aircraft_type)

            query = query.order("event_date", desc=True).limit(limit)
            response = query.execute()

            return response.data
        except Exception as e:
            log.error(f"Error querying complaints: {e}")
            return []

    def get_complaint_summary(self, start: str = None, end: str = None) -> list:
        """
        Get complaint daily summaries for a date range.

        Args:
            start: Start date (YYYY-MM-DD)
            end: End date (YYYY-MM-DD)

        Returns:
            List of summary dicts
        """
        try:
            query = self.client.table("complaint_daily_summary").select("*")

            if start:
                query = query.gte("date", start)
            if end:
                query = query.lte("date", end)

            query = query.order("date", desc=True)
            response = query.execute()

            return response.data
        except Exception as e:
            log.error(f"Error querying complaint summary: {e}")
            return []

    def get_complaint_hotspots(self, min_complaints: int = 1) -> list:
        """
        Get complaint hotspots with at least min_complaints.

        Args:
            min_complaints: Minimum complaint count to include

        Returns:
            List of hotspot dicts
        """
        try:
            query = self.client.table("complaint_hotspots").select("*")
            query = query.gte("total_complaints", min_complaints)
            query = query.order("total_complaints", desc=True)
            response = query.execute()

            return response.data
        except Exception as e:
            log.error(f"Error querying complaint hotspots: {e}")
            return []


# Convenience function for one-off operations
def get_supabase_writer() -> SupabaseWriter:
    """Get a SupabaseWriter instance using environment variables."""
    return SupabaseWriter()
