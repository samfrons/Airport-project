import { NextRequest, NextResponse } from 'next/server';
import { getComplaints, getComplaintStats, Complaint } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const municipality = searchParams.get('municipality') || undefined;
    const aircraftType = searchParams.get('aircraft_type') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 1000;

    const complaints = await getComplaints({
      start,
      end,
      municipality,
      aircraftType,
      limit,
    });

    // Build municipality counts for filtering UI
    const municipalityCounts: Record<string, number> = {};
    complaints.forEach((c: Complaint) => {
      if (c.municipality) {
        municipalityCounts[c.municipality] = (municipalityCounts[c.municipality] || 0) + 1;
      }
    });

    const municipalities = Object.entries(municipalityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Build aircraft type counts
    const aircraftTypeCounts: Record<string, number> = {};
    complaints.forEach((c: Complaint) => {
      const type = c.aircraft_type || 'Unknown';
      aircraftTypeCounts[type] = (aircraftTypeCounts[type] || 0) + 1;
    });

    const aircraftTypes = Object.entries(aircraftTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      complaints,
      municipalities,
      aircraftTypes,
      total: complaints.length,
    });
  } catch (err) {
    console.error('Complaints API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
