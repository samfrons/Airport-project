import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:3003';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');
  const maxPages = searchParams.get('max_pages') || '1';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      q: query,
      max_pages: maxPages,
    });

    const response = await fetch(`${PYTHON_API_URL}/search?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Search failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Cost-Estimate': String(data.cost_estimate || 0),
      },
    });
  } catch (err) {
    console.error('Flight search API error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to API server', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
