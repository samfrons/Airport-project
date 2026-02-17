import { NextRequest, NextResponse } from 'next/server';
import { getComplaintHotspots } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const minComplaintsParam = searchParams.get('min_complaints');
    const minComplaints = minComplaintsParam ? parseInt(minComplaintsParam, 10) : 1;

    const hotspots = await getComplaintHotspots({ minComplaints });

    // Filter to only hotspots with valid coordinates
    const geoHotspots = hotspots.filter(h => h.latitude && h.longitude);

    // GeoJSON format for easy map integration
    const geojson = {
      type: 'FeatureCollection' as const,
      features: geoHotspots.map(h => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [h.longitude, h.latitude],
        },
        properties: {
          street_name: h.street_name,
          municipality: h.municipality,
          total_complaints: h.total_complaints,
          helicopter_complaints: h.helicopter_complaints,
          curfew_complaints: h.curfew_complaints,
          date_first: h.date_first,
          date_last: h.date_last,
        },
      })),
    };

    return NextResponse.json({
      hotspots,
      geojson,
      total: hotspots.length,
      with_coordinates: geoHotspots.length,
    });
  } catch (err) {
    console.error('Complaint hotspots API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
