import { NextRequest, NextResponse } from 'next/server';
import { getDb, AIRPORT_COORDS } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const category = searchParams.get('category');
    const direction = searchParams.get('direction');

    let query = 'SELECT * FROM flights WHERE 1=1';
    const conditions: string[] = [];

    if (start) {
      conditions.push(`operation_date >= '${start}'`);
    }
    if (end) {
      conditions.push(`operation_date <= '${end}'`);
    }
    if (category && category !== 'all') {
      conditions.push(`aircraft_category = '${category}'`);
    }
    if (direction && direction !== 'all') {
      conditions.push(`direction = '${direction}'`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY operation_date DESC, actual_on DESC, actual_off DESC';

    const result = db.exec(query);

    // Convert sql.js result to array of objects
    const flights: Record<string, unknown>[] = [];
    if (result.length > 0) {
      const { columns, values } = result[0];
      for (const row of values) {
        const flight: Record<string, unknown> = {};
        columns.forEach((col: string, i: number) => {
          flight[col] = row[i];
        });
        flights.push(flight);
      }
    }

    // Count flights by airport for mapping
    const airportCounts: Record<string, number> = {};
    flights.forEach((f) => {
      const code = (f.direction === 'arrival' ? f.origin_code : f.destination_code) as string;
      if (code) {
        airportCounts[code] = (airportCounts[code] || 0) + 1;
      }
    });

    const airports = Object.entries(airportCounts)
      .map(([code, count]) => {
        const coords = AIRPORT_COORDS[code];
        return {
          code,
          name: coords?.name || code,
          city: coords?.city || '',
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          flight_count: count,
        };
      })
      .filter((a) => a.lat && a.lng);

    return NextResponse.json({ flights, airports, total: flights.length });
  } catch (err) {
    console.error('Flights API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
