import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (15 minutes for METAR)
const CACHE_TTL = 900;

// In-memory cache
let metarCache: { data: unknown; timestamp: number; airport: string } | null = null;

function getCachedMetar(airport: string): unknown | null {
  if (
    metarCache &&
    metarCache.airport === airport &&
    Date.now() - metarCache.timestamp < CACHE_TTL * 1000
  ) {
    return metarCache.data;
  }
  return null;
}

function setCachedMetar(airport: string, data: unknown): void {
  metarCache = { data, timestamp: Date.now(), airport };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const airport = searchParams.get('airport') || 'KJPX';

  const cached = getCachedMetar(airport);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  }

  try {
    const params = new URLSearchParams({ airport });
    const response = await fetch(`${PYTHON_API_URL}/weather/metar?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch METAR' },
        { status: response.status }
      );
    }

    const data = await response.json();
    setCachedMetar(airport, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    console.error('METAR API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch METAR', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
