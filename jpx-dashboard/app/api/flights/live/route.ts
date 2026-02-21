import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (5 minutes for live flights)
const CACHE_TTL = 300;

// In-memory cache for live flights
let liveFlightsCache: { data: unknown; timestamp: number } | null = null;

function getCachedLiveFlights(): unknown | null {
  if (liveFlightsCache && Date.now() - liveFlightsCache.timestamp < CACHE_TTL * 1000) {
    return liveFlightsCache.data;
  }
  liveFlightsCache = null;
  return null;
}

function setCachedLiveFlights(data: unknown): void {
  liveFlightsCache = { data, timestamp: Date.now() };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const airport = searchParams.get('airport') || 'KJPX';
  const maxPagesParam = parseInt(searchParams.get('max_pages') || '2', 10);

  // Validate maxPages to prevent excessive API costs
  if (isNaN(maxPagesParam) || maxPagesParam < 1 || maxPagesParam > 10) {
    return NextResponse.json(
      { error: 'max_pages must be between 1 and 10' },
      { status: 400 }
    );
  }
  const maxPages = String(maxPagesParam);

  // Check cache first (only for default KJPX queries)
  if (airport === 'KJPX') {
    const cached = getCachedLiveFlights();
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
        },
      });
    }
  }

  try {
    const params = new URLSearchParams({
      airport,
      max_pages: maxPages,
    });

    const response = await fetch(`${PYTHON_API_URL}/live?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch live flights' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the result for KJPX
    if (airport === 'KJPX') {
      setCachedLiveFlights(data);
    }

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cost-Estimate': String(data.cost_estimate || 0),
      },
    });
  } catch (err) {
    console.error('Live flights API error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to API server', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
