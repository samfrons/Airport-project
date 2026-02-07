import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  let db;
  try {
    db = getDb();
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_operations,
        SUM(CASE WHEN direction = 'arrival' THEN 1 ELSE 0 END) as arrivals,
        SUM(CASE WHEN direction = 'departure' THEN 1 ELSE 0 END) as departures,
        SUM(CASE WHEN aircraft_category = 'helicopter' THEN 1 ELSE 0 END) as helicopters,
        SUM(CASE WHEN aircraft_category = 'jet' THEN 1 ELSE 0 END) as jets,
        SUM(CASE WHEN aircraft_category = 'fixed_wing' THEN 1 ELSE 0 END) as fixed_wing,
        SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END) as curfew_operations,
        COUNT(DISTINCT registration) as unique_aircraft,
        MIN(operation_date) as earliest_date,
        MAX(operation_date) as latest_date
      FROM flights
    `).get();

    db.close();
    return NextResponse.json(stats);
  } catch (err) {
    db.close();
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
