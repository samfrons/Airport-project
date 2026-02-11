import { NextResponse } from 'next/server';
import { getStats } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
