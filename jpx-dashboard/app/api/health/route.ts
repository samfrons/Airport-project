import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const result = db.exec('SELECT COUNT(*) as count FROM flights');

    const count = result.length > 0 && result[0].values.length > 0
      ? result[0].values[0][0] as number
      : 0;

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
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
