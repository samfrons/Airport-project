import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (1 hour for flight tracks)
const CACHE_TTL = 3600;

// In-memory cache for flight tracks
const trackCache = new Map<string, { data: unknown; timestamp: number }>();

function getCachedTrack(faFlightId: string): unknown | null {
  const cached = trackCache.get(faFlightId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.data;
  }
  trackCache.delete(faFlightId);
  return null;
}

function setCachedTrack(faFlightId: string, data: unknown): void {
  // Limit cache size
  if (trackCache.size > 100) {
    const oldest = trackCache.keys().next().value;
    if (oldest) trackCache.delete(oldest);
  }
  trackCache.set(faFlightId, { data, timestamp: Date.now() });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: faFlightId } = await params;

  if (!faFlightId) {
    return NextResponse.json(
      { error: 'Flight ID is required' },
      { status: 400 }
    );
  }

  // Check cache first
  const cached = getCachedTrack(faFlightId);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  }

  try {
    const response = await fetch(`${PYTHON_API_URL}/track/${encodeURIComponent(faFlightId)}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch flight track' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the result
    setCachedTrack(faFlightId, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cost-Estimate': String(data.cost_estimate || 0),
      },
    });
  } catch (err) {
    console.error('Flight track API error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to API server', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
