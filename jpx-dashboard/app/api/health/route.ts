import { NextResponse } from 'next/server';
import { getFlightCount } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = await getFlightCount();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      provider: 'supabase',
      flight_count: count,
    });
  } catch (err) {
    console.error('Health API error:', err);
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
