import { createClient } from './server';

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

  let query = supabase
    .from('flights')
    .select('*')
    .order('operation_date', { ascending: false })
    .order('actual_on', { ascending: false, nullsFirst: false })
    .order('actual_off', { ascending: false, nullsFirst: false });

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

  const { data, error } = await query;

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
