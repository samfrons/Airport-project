import { createClient } from './server';

// ─── Mock Data Flag ──────────────────────────────────────────────────────────
// Set to true to use mock data for preview, false for production
const USE_MOCK_COMPLAINTS_FALLBACK = true;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Flight {
  id: number;
  fa_flight_id: string;
  ident: string | null;
  registration: string | null;
  direction: 'arrival' | 'departure';
  aircraft_type: string | null;
  aircraft_category: string | null;
  operator: string | null;
  operator_iata: string | null;
  origin_code: string | null;
  origin_name: string | null;
  origin_city: string | null;
  destination_code: string | null;
  destination_name: string | null;
  destination_city: string | null;
  scheduled_off: string | null;
  actual_off: string | null;
  scheduled_on: string | null;
  actual_on: string | null;
  operation_date: string | null;
  operation_hour_et: number | null;
  is_curfew_period: boolean;
  is_weekend: boolean;
  fetched_at: string;
  raw_json: Record<string, unknown> | null;
}

export interface DailySummary {
  operation_date: string;
  total_operations: number;
  arrivals: number;
  departures: number;
  helicopters: number;
  fixed_wing: number;
  jets: number;
  unknown_type: number;
  curfew_operations: number;
  unique_aircraft: number;
  day_of_week: string | null;
  updated_at: string;
}

// ─── Query Functions ────────────────────────────────────────────────────────

export async function getFlights(options: {
  start?: string;
  end?: string;
  category?: string;
  direction?: string;
}): Promise<Flight[]> {
  const supabase = await createClient();

  // Note: Supabase has a default 1000-row limit per query.
  // We set a higher limit to ensure date filters return complete results.
  let query = supabase
    .from('flights')
    .select('*', { count: 'exact' })
    .order('operation_date', { ascending: false })
    .order('actual_on', { ascending: false, nullsFirst: false })
    .order('actual_off', { ascending: false, nullsFirst: false })
    .limit(50000);

  if (options.start) {
    query = query.gte('operation_date', options.start);
  }
  if (options.end) {
    query = query.lte('operation_date', options.end);
  }
  if (options.category && options.category !== 'all') {
    query = query.eq('aircraft_category', options.category);
  }
  if (options.direction && options.direction !== 'all') {
    query = query.eq('direction', options.direction);
  }

  const { data, error, count } = await query;

  if (count !== null && count !== undefined) {
    console.log(`[getFlights] Returned ${data?.length || 0} of ${count} total flights for date range`);
  }

  if (error) {
    throw new Error(`Failed to fetch flights: ${error.message}`);
  }

  return data || [];
}

export async function getSummary(options: {
  start?: string;
  end?: string;
}): Promise<DailySummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('daily_summary')
    .select('*')
    .order('operation_date', { ascending: false });

  if (options.start) {
    query = query.gte('operation_date', options.start);
  }
  if (options.end) {
    query = query.lte('operation_date', options.end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch summary: ${error.message}`);
  }

  return data || [];
}

export async function getStats(): Promise<{
  total_operations: number;
  arrivals: number;
  departures: number;
  helicopters: number;
  jets: number;
  fixed_wing: number;
  curfew_operations: number;
  unique_aircraft: number;
  earliest_date: string | null;
  latest_date: string | null;
}> {
  const supabase = await createClient();

  // Get aggregated stats
  const { data: flights, error } = await supabase
    .from('flights')
    .select('direction, aircraft_category, is_curfew_period, registration, operation_date');

  if (error) {
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const allFlights = flights || [];
  const registrations = new Set(allFlights.map(f => f.registration).filter(Boolean));
  const dates = allFlights.map(f => f.operation_date).filter(Boolean).sort();

  return {
    total_operations: allFlights.length,
    arrivals: allFlights.filter(f => f.direction === 'arrival').length,
    departures: allFlights.filter(f => f.direction === 'departure').length,
    helicopters: allFlights.filter(f => f.aircraft_category === 'helicopter').length,
    jets: allFlights.filter(f => f.aircraft_category === 'jet').length,
    fixed_wing: allFlights.filter(f => f.aircraft_category === 'fixed_wing').length,
    curfew_operations: allFlights.filter(f => f.is_curfew_period).length,
    unique_aircraft: registrations.size,
    earliest_date: dates[0] || null,
    latest_date: dates[dates.length - 1] || null,
  };
}

export async function getFlightCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('flights')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to get flight count: ${error.message}`);
  }

  return count || 0;
}

// ─── Airport Coordinates (for mapping) ──────────────────────────────────────

// ─── Complaint Types ────────────────────────────────────────────────────────

export interface Complaint {
  id: number;
  source_id: string | null;
  event_date: string;
  event_time: string | null;
  event_datetime_utc: string | null;
  event_hour_et: number | null;
  is_curfew_period: boolean;
  is_weekend: boolean;
  street_name: string | null;
  municipality: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  airport: string;
  complaint_types: string | null;
  aircraft_type: string | null;
  aircraft_description: string | null;
  flight_direction: string | null;
  comments: string | null;
  matched_flight_id: string | null;
  matched_confidence: string | null;
  matched_registration: string | null;
  matched_operator: string | null;
  submission_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintDailySummary {
  date: string;
  total_complaints: number;
  helicopter_complaints: number;
  jet_complaints: number;
  prop_complaints: number;
  seaplane_complaints: number;
  unknown_complaints: number;
  curfew_complaints: number;
  excessive_noise: number;
  low_altitude: number;
  too_early_late: number;
  sleep_disturbance: number;
  unique_streets: number;
  unique_municipalities: number;
  created_at: string;
}

export interface ComplaintHotspot {
  street_name: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  total_complaints: number;
  helicopter_complaints: number;
  curfew_complaints: number;
  date_first: string | null;
  date_last: string | null;
}

// ─── Complaint Query Functions ──────────────────────────────────────────────

export async function getComplaints(options: {
  start?: string;
  end?: string;
  municipality?: string;
  aircraftType?: string;
  limit?: number;
}): Promise<Complaint[]> {
  const supabase = await createClient();

  let query = supabase
    .from('complaints')
    .select('*')
    .order('event_date', { ascending: false })
    .order('event_time', { ascending: false, nullsFirst: false });

  if (options.start) {
    query = query.gte('event_date', options.start);
  }
  if (options.end) {
    query = query.lte('event_date', options.end);
  }
  if (options.municipality) {
    query = query.eq('municipality', options.municipality);
  }
  if (options.aircraftType) {
    query = query.eq('aircraft_type', options.aircraftType);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`Supabase complaints query failed: ${error.message}`);
  }

  // If no data and fallback is enabled, return mock data
  if (USE_MOCK_COMPLAINTS_FALLBACK && (!data || data.length === 0)) {
    const { getMockComplaints } = await import('@/data/noise/mockComplaintsDb');
    let mockData = getMockComplaints();

    // Apply filters to mock data
    if (options.start) {
      mockData = mockData.filter(c => c.event_date >= options.start!);
    }
    if (options.end) {
      mockData = mockData.filter(c => c.event_date <= options.end!);
    }
    if (options.municipality) {
      mockData = mockData.filter(c => c.municipality === options.municipality);
    }
    if (options.aircraftType) {
      mockData = mockData.filter(c => c.aircraft_type === options.aircraftType);
    }
    if (options.limit) {
      mockData = mockData.slice(0, options.limit);
    }

    return mockData;
  }

  return data || [];
}

export async function getComplaintSummary(options: {
  start?: string;
  end?: string;
}): Promise<ComplaintDailySummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('complaint_daily_summary')
    .select('*')
    .order('date', { ascending: false });

  if (options.start) {
    query = query.gte('date', options.start);
  }
  if (options.end) {
    query = query.lte('date', options.end);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`Supabase complaint summary query failed: ${error.message}`);
  }

  // If no data and fallback is enabled, return mock summary
  if (USE_MOCK_COMPLAINTS_FALLBACK && (!data || data.length === 0)) {
    const { getMockComplaintSummary } = await import('@/data/noise/mockComplaintsDb');
    let mockData = getMockComplaintSummary();

    // Apply filters to mock data
    if (options.start) {
      mockData = mockData.filter(s => s.date >= options.start!);
    }
    if (options.end) {
      mockData = mockData.filter(s => s.date <= options.end!);
    }

    return mockData;
  }

  return data || [];
}

export async function getComplaintHotspots(options: {
  minComplaints?: number;
}): Promise<ComplaintHotspot[]> {
  const supabase = await createClient();

  let query = supabase
    .from('complaint_hotspots')
    .select('*')
    .order('total_complaints', { ascending: false });

  if (options.minComplaints && options.minComplaints > 1) {
    query = query.gte('total_complaints', options.minComplaints);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`Supabase complaint hotspots query failed: ${error.message}`);
  }

  // If no data and fallback is enabled, return mock hotspots
  if (USE_MOCK_COMPLAINTS_FALLBACK && (!data || data.length === 0)) {
    const { getMockHotspots } = await import('@/data/noise/mockComplaintsDb');
    let mockData = getMockHotspots();

    // Apply filters to mock data
    if (options.minComplaints && options.minComplaints > 1) {
      mockData = mockData.filter(h => h.total_complaints >= options.minComplaints!);
    }

    return mockData;
  }

  return data || [];
}

export async function getComplaintStats(): Promise<{
  total_complaints: number;
  helicopter_complaints: number;
  jet_complaints: number;
  curfew_complaints: number;
  unique_locations: number;
  matched_to_flights: number;
  earliest_date: string | null;
  latest_date: string | null;
}> {
  const supabase = await createClient();

  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('aircraft_type, is_curfew_period, municipality, matched_flight_id, event_date');

  if (error) {
    console.warn(`Supabase complaint stats query failed: ${error.message}`);
  }

  // If no data and fallback is enabled, calculate stats from mock data
  if (USE_MOCK_COMPLAINTS_FALLBACK && (!complaints || complaints.length === 0)) {
    const { getMockComplaints } = await import('@/data/noise/mockComplaintsDb');
    const mockData = getMockComplaints();
    const municipalities = new Set(mockData.map(c => c.municipality).filter(Boolean));
    const dates = mockData.map(c => c.event_date).filter(Boolean).sort();

    return {
      total_complaints: mockData.length,
      helicopter_complaints: mockData.filter(c => c.aircraft_type === 'Helicopter').length,
      jet_complaints: mockData.filter(c => c.aircraft_type === 'Jet').length,
      curfew_complaints: mockData.filter(c => c.is_curfew_period).length,
      unique_locations: municipalities.size,
      matched_to_flights: mockData.filter(c => c.matched_flight_id).length,
      earliest_date: dates[0] || null,
      latest_date: dates[dates.length - 1] || null,
    };
  }

  const all = complaints || [];
  const municipalities = new Set(all.map(c => c.municipality).filter(Boolean));
  const dates = all.map(c => c.event_date).filter(Boolean).sort();

  return {
    total_complaints: all.length,
    helicopter_complaints: all.filter(c => c.aircraft_type === 'Helicopter').length,
    jet_complaints: all.filter(c => c.aircraft_type === 'Jet').length,
    curfew_complaints: all.filter(c => c.is_curfew_period).length,
    unique_locations: municipalities.size,
    matched_to_flights: all.filter(c => c.matched_flight_id).length,
    earliest_date: dates[0] || null,
    latest_date: dates[dates.length - 1] || null,
  };
}

// ─── Airport Coordinates (for mapping) ──────────────────────────────────────

export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; name: string; city: string }> = {
  'KJFK': { lat: 40.6413, lng: -73.7781, name: 'John F. Kennedy International', city: 'New York' },
  'KLGA': { lat: 40.7769, lng: -73.8740, name: 'LaGuardia', city: 'New York' },
  'KEWR': { lat: 40.6895, lng: -74.1745, name: 'Newark Liberty International', city: 'Newark' },
  'KTEB': { lat: 40.8501, lng: -74.0608, name: 'Teterboro', city: 'Teterboro' },
  'KHPN': { lat: 41.0670, lng: -73.7076, name: 'Westchester County', city: 'White Plains' },
  'KFRG': { lat: 40.7288, lng: -73.4134, name: 'Republic', city: 'Farmingdale' },
  'KISP': { lat: 40.7952, lng: -73.1002, name: 'Long Island MacArthur', city: 'Islip' },
  'KBDR': { lat: 41.1635, lng: -73.1262, name: 'Igor I. Sikorsky Memorial', city: 'Bridgeport' },
  'KMMU': { lat: 40.7994, lng: -74.4149, name: 'Morristown Municipal', city: 'Morristown' },
  'KCDW': { lat: 40.8752, lng: -74.2814, name: 'Essex County', city: 'Caldwell' },
  'KFOK': { lat: 40.8437, lng: -72.6318, name: 'Francis S. Gabreski', city: 'Westhampton Beach' },
  'KMTP': { lat: 41.0765, lng: -71.9208, name: 'Montauk', city: 'Montauk' },
  'KBOS': { lat: 42.3656, lng: -71.0096, name: 'Boston Logan International', city: 'Boston' },
  'KPHL': { lat: 39.8721, lng: -75.2411, name: 'Philadelphia International', city: 'Philadelphia' },
  'KDCA': { lat: 38.8512, lng: -77.0402, name: 'Ronald Reagan Washington National', city: 'Washington' },
  'KIAD': { lat: 38.9531, lng: -77.4565, name: 'Washington Dulles International', city: 'Dulles' },
  'KMIA': { lat: 25.7959, lng: -80.2870, name: 'Miami International', city: 'Miami' },
  'KPBI': { lat: 26.6832, lng: -80.0956, name: 'Palm Beach International', city: 'West Palm Beach' },
  'KJPX': { lat: 40.9594, lng: -72.2518, name: 'East Hampton Town Airport', city: 'East Hampton' },
  'KHTO': { lat: 40.9594, lng: -72.2518, name: 'East Hampton (old code)', city: 'East Hampton' },
};
