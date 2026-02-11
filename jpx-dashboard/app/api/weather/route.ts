import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (15 minutes for weather data)
const CACHE_TTL = 900;

// In-memory cache for weather data
let weatherCache: { data: unknown; timestamp: number; airport: string } | null = null;

function getCachedWeather(airport: string): unknown | null {
  if (
    weatherCache &&
    weatherCache.airport === airport &&
    Date.now() - weatherCache.timestamp < CACHE_TTL * 1000
  ) {
    return weatherCache.data;
  }
  weatherCache = null;
  return null;
}

function setCachedWeather(airport: string, data: unknown): void {
  weatherCache = { data, timestamp: Date.now(), airport };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const airport = searchParams.get('airport') || 'KJPX';

  // Check cache first
  const cached = getCachedWeather(airport);
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
    const response = await fetch(`${PYTHON_API_URL}/weather?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch weather data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    setCachedWeather(airport, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    console.error('Weather API error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to weather API', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
