import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (24 hours for nearby airports - static data)
const CACHE_TTL = 86400;

// In-memory cache for nearby airports
const nearbyCache = new Map<string, { data: unknown; timestamp: number }>();

function getCacheKey(airport: string, radius: number): string {
  return `${airport.toUpperCase()}-${radius}`;
}

function getCachedNearby(airport: string, radius: number): unknown | null {
  const key = getCacheKey(airport, radius);
  const cached = nearbyCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.data;
  }
  nearbyCache.delete(key);
  return null;
}

function setCachedNearby(airport: string, radius: number, data: unknown): void {
  const key = getCacheKey(airport, radius);
  // Limit cache size
  if (nearbyCache.size > 50) {
    const oldest = nearbyCache.keys().next().value;
    if (oldest) nearbyCache.delete(oldest);
  }
  nearbyCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const airport = searchParams.get('airport') || 'KJPX';
  const radius = parseInt(searchParams.get('radius') || '30', 10);

  // Validate radius is a number
  if (isNaN(radius)) {
    return NextResponse.json(
      { error: 'Invalid radius parameter' },
      { status: 400 }
    );
  }

  // Validate radius range
  if (radius < 5 || radius > 100) {
    return NextResponse.json(
      { error: 'Radius must be between 5 and 100 miles' },
      { status: 400 }
    );
  }

  // Check cache first
  const cached = getCachedNearby(airport, radius);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  }

  try {
    const params = new URLSearchParams({
      airport,
      radius: String(radius),
    });

    const response = await fetch(`${PYTHON_API_URL}/nearby?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch nearby airports' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the result
    setCachedNearby(airport, radius, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cost-Estimate': String(data.cost_estimate || 0),
      },
    });
  } catch (err) {
    console.error('Nearby airports API error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to API server', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
