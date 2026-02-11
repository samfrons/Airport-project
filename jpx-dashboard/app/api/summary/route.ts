import { NextRequest, NextResponse } from 'next/server';
import { getSummary } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const summary = await getSummary({ start, end });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Summary API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
