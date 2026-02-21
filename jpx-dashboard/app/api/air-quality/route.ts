import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Default location: KJPX (East Hampton, NY)
const DEFAULT_LAT = 40.9596;
const DEFAULT_LON = -72.2517;

// Cache TTL in seconds (1 hour for AQI)
const CACHE_TTL = 3600;

// In-memory cache
let aqiCache: { data: unknown; timestamp: number; key: string } | null = null;

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
}

function getCachedAqi(lat: number, lon: number): unknown | null {
  const key = getCacheKey(lat, lon);
  if (aqiCache && aqiCache.key === key && Date.now() - aqiCache.timestamp < CACHE_TTL * 1000) {
    return aqiCache.data;
  }
  return null;
}

function setCachedAqi(lat: number, lon: number, data: unknown): void {
  aqiCache = { data, timestamp: Date.now(), key: getCacheKey(lat, lon) };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') || String(DEFAULT_LAT));
  const lon = parseFloat(searchParams.get('lon') || String(DEFAULT_LON));
  const distance = searchParams.get('distance') || '100';  // Larger radius for East Hampton

  // Validate lat/lon are valid numbers
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude parameter' },
      { status: 400 }
    );
  }

  const cached = getCachedAqi(lat, lon);
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
      lat: String(lat),
      lon: String(lon),
      distance,
    });
    const response = await fetch(`${PYTHON_API_URL}/air-quality?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch air quality data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    setCachedAqi(lat, lon, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    console.error('Air quality API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
