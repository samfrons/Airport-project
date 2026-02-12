import { NextRequest, NextResponse } from 'next/server';
import { getFlights, AIRPORT_COORDS, Flight } from '@/lib/supabase/db';
import {
  getEASANoiseProfile,
  CATEGORY_AVERAGES,
} from '@/data/noise/easa/icaoToEasaMap';

export const dynamic = 'force-dynamic';

// ─── Reference constants ────────────────────────────────────────────────────
const REFERENCE_ALT = 1000; // feet AGL (EASA certification reference)
const STANDARD_ALTITUDES = [500, 1000, 2000, 3000];

/**
 * Calculate noise level at a given altitude using inverse square law
 * This is a simplified calculation for display purposes.
 * For accurate ground-level estimates, use trackNoiseCalculator.ts
 *
 * @param baseDb Reference dB at 1000ft
 * @param altitude Target altitude in feet
 * @returns Adjusted dB level
 */
function dbAtAltitude(baseDb: number, altitude: number): number {
  if (altitude <= 0) return baseDb + 20; // Very loud at ground level
  const attenuation = 20 * Math.log10(altitude / REFERENCE_ALT);
  return Math.round((baseDb - attenuation) * 10) / 10;
}

/**
 * Determine noise category from dB level
 */
function getNoiseCategory(db: number): 'quiet' | 'moderate' | 'loud' | 'very_loud' {
  if (db < 75) return 'quiet';
  if (db < 82) return 'moderate';
  if (db < 88) return 'loud';
  return 'very_loud';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const category = searchParams.get('category') || undefined;
    const direction = searchParams.get('direction') || undefined;

    const rawFlights = await getFlights({ start, end, category, direction });

    // Add EASA-based noise profile to each flight
    const flights = rawFlights.map((flight: Flight) => {
      const icaoType = flight.aircraft_type || '';
      const dir = flight.direction;

      // Get EASA noise profile (falls back to category average if not found)
      const easaProfile = getEASANoiseProfile(icaoType);

      // Select appropriate dB based on direction
      const baseDb = dir === 'arrival' ? easaProfile.approachDb : easaProfile.takeoffDb;

      return {
        ...flight,
        noise_profile: {
          // Core noise data from EASA
          takeoff_db: easaProfile.takeoffDb,
          approach_db: easaProfile.approachDb,
          effective_db: baseDb,
          noise_category: getNoiseCategory(baseDb),

          // EASA certification data (when available)
          lateral_epnl: easaProfile.lateralEpnl,
          flyover_epnl: easaProfile.flyoverEpnl,
          approach_epnl: easaProfile.approachEpnl,

          // Aircraft identification
          manufacturer: easaProfile.easaManufacturer,
          model: easaProfile.easaModel,

          // Data quality indicators
          data_source: easaProfile.dataSource,
          confidence: easaProfile.confidence,

          // Altitude profile for visualization
          altitude_profile: STANDARD_ALTITUDES.map((alt) => ({
            altitude_ft: alt,
            db: dbAtAltitude(baseDb, alt),
          })),
        },
      };
    });

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
