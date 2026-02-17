"""
Aircraft Type Classification for JPX Dashboard
================================================

Classifies ICAO aircraft type designators into dashboard categories:
  - helicopter:  rotorcraft of all types
  - jet:         turbine-powered fixed-wing (business jets, airliners)
  - fixed_wing:  piston/turboprop fixed-wing (GA aircraft)
  - unknown:     unrecognized or missing type code

ICAO type designators: https://www.icao.int/publications/doc8643/
FlightAware returns these in the `aircraft_type` field.

This list covers the most common types seen at GA airports like JPX.
It will need periodic updates as new types appear in the data.
"""

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# ── Known Helicopter Type Codes ──────────────────────────────────────
# This is the key classification for WCAC — helicopters are the primary
# noise concern at JPX.

HELICOPTER_TYPES = {
    # Robinson
    "R22", "R44", "R66",
    # Airbus Helicopters (formerly Eurocopter)
    "EC20", "EC30", "EC35", "EC45", "EC55", "EC75",
    "AS50", "AS55", "AS65", "AS32", "AS33", "AS35", "AS55", "AS65",
    "H125", "H130", "H135", "H145", "H155", "H160", "H175", "H215", "H225",
    "EC25",  # EC120 sometimes coded this way
    # Bell
    "B06",  "B06T", "B204", "B205", "B206", "B209", "B212", "B214",
    "B222", "B230", "B407", "B412", "B427", "B429", "B430", "B505",
    "B525",
    # Sikorsky
    "S76", "S61", "S70", "S92", "S58", "S64", "S76B", "S76C", "S76D",
    "H60",  # Black Hawk variants
    "S300",
    # Leonardo (AgustaWestland)
    "A109", "A119", "A139", "A149", "A169", "A189",
    "AW09", "AW09", "AW39", "AW69", "AW89",
    # MD Helicopters
    "MD52", "MD60", "EXPL", "NOTR",
    "H369", "H500",
    # Enstrom
    "EN28", "EN48",
    # Schweizer / Hughes
    "S269", "S300", "S333", "H269",
    # Generic helicopter designators
    "HELI",
}

# ── Known Jet Type Codes ─────────────────────────────────────────────
# Business jets commonly seen at East Hampton

JET_TYPES = {
    # Gulfstream
    "GLF2", "GLF3", "GLF4", "GLF5", "GLF6", "GLEX", "G150", "G200",
    "G280", "G350", "G450", "G500", "G550", "G600", "G650", "G700",
    "G800",
    # Bombardier
    "CL30", "CL35", "CL60", "BD70",
    "GL5T", "GL6T", "GL7T", "GLEX",
    "LJ23", "LJ24", "LJ25", "LJ28", "LJ31", "LJ35", "LJ36",
    "LJ40", "LJ45", "LJ55", "LJ60", "LJ70", "LJ75",
    # Cessna Citation
    "C500", "C501", "C510", "C525", "C526", "C550", "C551", "C560",
    "C56X", "C650", "C680", "C700", "C750",
    # Dassault Falcon
    "FA10", "FA20", "FA50", "FA7X", "FA8X", "F900", "F2TH", "FA6X",
    # Embraer
    "E135", "E145", "E170", "E190", "E195", "E50P", "E55P",
    "E35L", "E545", "E550",
    # Pilatus
    "PC24",
    # Honda
    "HDJT",
    # Eclipse
    "EA50",
    # Cirrus Vision
    "SF50",
    # Textron/Beechcraft
    "PRM1", "H25A", "H25B", "H25C",
    # Generic
    "AJET",
}

# ── Fixed-Wing Piston/Turboprop ──────────────────────────────────────
# Not exhaustive — anything not helicopter or jet defaults to fixed_wing
# if it has a type code. These are the common ones at GA airports.

FIXED_WING_TYPES = {
    # Cessna piston
    "C150", "C152", "C170", "C172", "C177", "C180", "C182", "C185",
    "C206", "C207", "C210", "C310", "C320", "C337", "C340", "C402",
    "C414",
    # Cessna turboprop
    "C208", "C441",
    # Piper
    "P28A", "P28B", "P28R", "P28T", "PA18", "PA22", "PA23", "PA24",
    "PA27", "PA28", "PA30", "PA31", "PA32", "PA34", "PA38", "PA44",
    "PA46", "PA60", "PC12",
    # Beechcraft
    "BE33", "BE35", "BE36", "BE55", "BE58", "BE76", "BE9L", "B350",
    "BE20", "BE30", "B200", "B300",
    # Mooney
    "M20J", "M20K", "M20P", "M20R", "M20T", "M20U",
    # Cirrus
    "SR20", "SR22",
    # Diamond
    "DA20", "DA40", "DA42", "DA50", "DA62",
    # Pilatus
    "PC12",
    # TBM
    "TBM7", "TBM8", "TBM9", "TBM",
    # de Havilland
    "DHC2", "DHC3", "DHC6",
    # King Air
    "BE20", "B200", "B300", "B350",
}


def classify_aircraft(icao_type: str) -> str:
    """
    Classify an ICAO aircraft type code into a dashboard category.

    Returns: 'helicopter', 'jet', 'fixed_wing', or 'unknown'
    """
    if not icao_type:
        return "unknown"

    code = icao_type.strip().upper()

    if code in HELICOPTER_TYPES:
        return "helicopter"
    if code in JET_TYPES:
        return "jet"
    if code in FIXED_WING_TYPES:
        return "fixed_wing"

    # Heuristic fallbacks for codes not in our lists:
    # Many helicopter ICAO codes contain common patterns
    # But this is unreliable — better to add to the sets above
    return "unknown"


# ── Time Utilities ───────────────────────────────────────────────────

ET = ZoneInfo("America/New_York")


def utc_to_eastern(iso_utc: str) -> datetime:
    """Convert an ISO 8601 UTC timestamp to Eastern Time."""
    if not iso_utc:
        return None
    dt = datetime.fromisoformat(iso_utc.replace("Z", "+00:00"))
    return dt.astimezone(ET)


def is_curfew_hour(hour_et: int) -> bool:
    """
    Check if an Eastern Time hour falls in the voluntary curfew window.
    Curfew: 9:00 PM (21:00) to 7:00 AM (07:00) Eastern.
    """
    return hour_et >= 21 or hour_et < 7


def is_weekend(date_str: str) -> bool:
    """Check if a YYYY-MM-DD date string is a weekend."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.weekday() >= 5  # 5=Saturday, 6=Sunday


def get_operation_time(flight: dict, direction: str) -> str:
    """
    Get the relevant timestamp for a flight operation.
    For arrivals: actual_on (runway arrival)
    For departures: actual_off (runway departure)
    Falls back to scheduled times if actuals aren't available.
    """
    if direction == "arrival":
        return flight.get("actual_on") or flight.get("scheduled_on") or ""
    else:
        return flight.get("actual_off") or flight.get("scheduled_off") or ""
