import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'jpx_flights.db');

export function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

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
