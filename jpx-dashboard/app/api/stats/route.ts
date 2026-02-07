import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const result = db.exec(`
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
    `);

    // Convert sql.js result to object
    if (result.length > 0 && result[0].values.length > 0) {
      const { columns, values } = result[0];
      const stats: Record<string, unknown> = {};
      columns.forEach((col: string, i: number) => {
        stats[col] = values[0][i];
      });
      return NextResponse.json(stats);
    }

    return NextResponse.json({
      total_operations: 0,
      arrivals: 0,
      departures: 0,
      helicopters: 0,
      jets: 0,
      fixed_wing: 0,
      curfew_operations: 0,
      unique_aircraft: 0,
      earliest_date: null,
      latest_date: null,
    });
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
