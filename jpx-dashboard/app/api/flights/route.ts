import { NextRequest, NextResponse } from 'next/server';
import { getDb, AIRPORT_COORDS } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── Noise profiles (mirrors data/noise/aircraftNoiseProfiles.ts) ────────────
// dB at 1000 ft reference altitude
const NOISE_DB: Record<string, { takeoff: number; approach: number; category: string }> = {
  R22:  { takeoff: 78, approach: 76, category: 'moderate' },
  R44:  { takeoff: 82, approach: 80, category: 'loud' },
  R66:  { takeoff: 83, approach: 81, category: 'loud' },
  S76:  { takeoff: 88, approach: 85, category: 'very_loud' },
  EC35: { takeoff: 84, approach: 82, category: 'loud' },
  A109: { takeoff: 85, approach: 83, category: 'loud' },
  B06:  { takeoff: 83, approach: 81, category: 'loud' },
  B407: { takeoff: 84, approach: 82, category: 'loud' },
  AS50: { takeoff: 82, approach: 80, category: 'loud' },
  GLF5: { takeoff: 92, approach: 88, category: 'very_loud' },
  GLF4: { takeoff: 90, approach: 86, category: 'very_loud' },
  GLEX: { takeoff: 91, approach: 87, category: 'very_loud' },
  C56X: { takeoff: 86, approach: 82, category: 'loud' },
  C680: { takeoff: 85, approach: 81, category: 'loud' },
  C525: { takeoff: 80, approach: 76, category: 'moderate' },
  E55P: { takeoff: 82, approach: 78, category: 'moderate' },
  PC12: { takeoff: 78, approach: 75, category: 'moderate' },
  LJ45: { takeoff: 84, approach: 80, category: 'loud' },
  FA50: { takeoff: 85, approach: 81, category: 'loud' },
  C172: { takeoff: 75, approach: 72, category: 'moderate' },
  C182: { takeoff: 76, approach: 73, category: 'moderate' },
  C206: { takeoff: 77, approach: 74, category: 'moderate' },
  PA28: { takeoff: 74, approach: 71, category: 'moderate' },
  PA32: { takeoff: 76, approach: 73, category: 'moderate' },
  BE36: { takeoff: 77, approach: 74, category: 'moderate' },
  SR22: { takeoff: 76, approach: 73, category: 'moderate' },
  P28A: { takeoff: 72, approach: 69, category: 'quiet' },
  C150: { takeoff: 70, approach: 67, category: 'quiet' },
};

const DEFAULT_NOISE = { takeoff: 80, approach: 76, category: 'moderate' };
const REFERENCE_ALT = 1000; // feet AGL
const ALTITUDES = [500, 1000, 2000, 3000];

/** Inverse-square-law noise at a given altitude */
function dbAtAltitude(baseDb: number, altitude: number): number {
  const attenuation = 20 * Math.log10(REFERENCE_ALT / altitude);
  return Math.round((baseDb + attenuation) * 10) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
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

    const stmt = db.prepare(query);
    stmt.bind(params);

    // Collect rows as objects
    const flights: Record<string, unknown>[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();

      // Compute noise profile for this aircraft type
      const type = row.aircraft_type as string;
      const dir = row.direction as string;
      const noise = NOISE_DB[type] || DEFAULT_NOISE;
      const baseDb = dir === 'arrival' ? noise.approach : noise.takeoff;

      // Attach noise data to each flight
      row.noise_profile = {
        takeoff_db: noise.takeoff,
        approach_db: noise.approach,
        noise_category: noise.category,
        effective_db: baseDb,
        altitude_profile: ALTITUDES.map((alt) => ({
          altitude_ft: alt,
          db: dbAtAltitude(baseDb, alt),
        })),
      };

      flights.push(row);
    }
    stmt.free();

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
