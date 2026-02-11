import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (1 hour for TAF)
const CACHE_TTL = 3600;

// In-memory cache
let tafCache: { data: unknown; timestamp: number; airport: string } | null = null;

function getCachedTaf(airport: string): unknown | null {
  if (
    tafCache &&
    tafCache.airport === airport &&
    Date.now() - tafCache.timestamp < CACHE_TTL * 1000
  ) {
    return tafCache.data;
  }
  return null;
}

function setCachedTaf(airport: string, data: unknown): void {
  tafCache = { data, timestamp: Date.now(), airport };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const airport = searchParams.get('airport') || 'KJPX';

  const cached = getCachedTaf(airport);
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
    const response = await fetch(`${PYTHON_API_URL}/weather/taf?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch TAF' },
        { status: response.status }
      );
    }

    const data = await response.json();
    setCachedTaf(airport, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    console.error('TAF API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch TAF', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
