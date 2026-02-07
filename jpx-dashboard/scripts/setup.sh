#!/usr/bin/env bash
#
# JPX Dashboard — Project Setup
# Run once after cloning: ./scripts/setup.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "╔══════════════════════════════════════════════════════╗"
echo "║  JPX Dashboard — Project Setup                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Python virtual environment ────────────────────────────────────
echo "→ Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  ✓ Created venv/"
else
    echo "  · venv/ already exists, skipping"
fi

echo "→ Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "  ✓ Dependencies installed"

# ── 2. Data directory ────────────────────────────────────────────────
echo "→ Creating data directory..."
mkdir -p data
echo "  ✓ data/ ready"

# ── 3. Database initialization ───────────────────────────────────────
echo "→ Initializing SQLite database..."
if [ ! -f "data/jpx_flights.db" ]; then
    sqlite3 data/jpx_flights.db < src/db/schema.sql
    echo "  ✓ Database created at data/jpx_flights.db"
else
    echo "  · Database already exists, skipping"
fi

# ── 4. Environment file ─────────────────────────────────────────────
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "⚠  Created .env from template."
    echo "   Edit .env and add your FlightAware API key:"
    echo ""
    echo "     AEROAPI_KEY=your-actual-key-here"
    echo ""
else
    echo "  · .env already exists"
fi

# ── 5. Verify API key ───────────────────────────────────────────────
source .env 2>/dev/null || true
if [ "${AEROAPI_KEY:-}" = "your-api-key-here" ] || [ -z "${AEROAPI_KEY:-}" ]; then
    echo ""
    echo "⚠  No API key configured yet."
    echo "   Edit .env and set AEROAPI_KEY before running scripts."
else
    echo "→ Testing API connection..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-apikey: $AEROAPI_KEY" \
        "https://aeroapi.flightaware.com/aeroapi/airports/KJPX" 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ]; then
        echo "  ✓ API connection successful (KJPX recognized)"
    elif [ "$RESPONSE" = "401" ]; then
        echo "  ✗ API key rejected (401). Check your key in .env"
    elif [ "$RESPONSE" = "000" ]; then
        echo "  · Could not reach API (network issue). Key will be tested on first run."
    else
        echo "  · API returned status $RESPONSE. May need investigation."
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Setup complete! Next steps:"
echo ""
echo "  1. source venv/bin/activate"
echo "  2. Edit .env with your API key (if not done)"
echo "  3. python scripts/daily_pull.py --date 2025-08-15"
echo "════════════════════════════════════════════════════════"
