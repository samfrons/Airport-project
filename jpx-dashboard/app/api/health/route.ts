import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  let db;
  try {
    db = getDb();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Database not available' }, { status: 500 });
  }

  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM flights').get() as { count: number };
    db.close();
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      flight_count: count.count,
    });
  } catch (err) {
    db.close();
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
