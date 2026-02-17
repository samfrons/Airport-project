import { NextRequest, NextResponse } from 'next/server';
import { getComplaintSummary, getComplaintStats } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const [summary, stats] = await Promise.all([
      getComplaintSummary({ start, end }),
      getComplaintStats(),
    ]);

    return NextResponse.json({
      summary,
      stats,
      total: summary.length,
    });
  } catch (err) {
    console.error('Complaint summary API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
