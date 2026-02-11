import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

// Cache TTL in seconds (24 hours for owner info - changes rarely)
const CACHE_TTL = 86400;

// In-memory cache for owner lookups
const ownerCache = new Map<string, { data: unknown; timestamp: number }>();

function getCachedOwner(registration: string): unknown | null {
  const key = registration.toUpperCase();
  const cached = ownerCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.data;
  }
  ownerCache.delete(key);
  return null;
}

function setCachedOwner(registration: string, data: unknown): void {
  const key = registration.toUpperCase();
  // Limit cache size
  if (ownerCache.size > 200) {
    const oldest = ownerCache.keys().next().value;
    if (oldest) ownerCache.delete(oldest);
  }
  ownerCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reg: string }> }
) {
  const { reg: registration } = await params;

  if (!registration) {
    return NextResponse.json(
      { error: 'Registration is required' },
      { status: 400 }
    );
  }

  // Check cache first
  const cached = getCachedOwner(registration);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  }

  try {
    const response = await fetch(`${PYTHON_API_URL}/owner/${encodeURIComponent(registration.toUpperCase())}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch owner info' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the result
    setCachedOwner(registration, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cost-Estimate': String(data.cost_estimate || 0),
      },
    });
  } catch (err) {
    console.error('Aircraft owner API error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to API server', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
