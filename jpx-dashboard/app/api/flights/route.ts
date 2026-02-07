import { NextRequest, NextResponse } from 'next/server';
import { getDb, AIRPORT_COORDS } from '@/lib/db';

export async function GET(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const category = searchParams.get('category');
    const direction = searchParams.get('direction');

    let query = 'SELECT * FROM flights WHERE 1=1';
    const params: string[] = [];

    if (start) {
      query += ' AND operation_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND operation_date <= ?';
      params.push(end);
    }
    if (category && category !== 'all') {
      query += ' AND aircraft_category = ?';
      params.push(category);
    }
    if (direction && direction !== 'all') {
      query += ' AND direction = ?';
      params.push(direction);
    }

    query += ' ORDER BY operation_date DESC, actual_on DESC, actual_off DESC';

    const flights = db.prepare(query).all(...params) as Record<string, unknown>[];

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

    db.close();

    return NextResponse.json({ flights, airports, total: flights.length });
  } catch (err) {
    db.close();
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
