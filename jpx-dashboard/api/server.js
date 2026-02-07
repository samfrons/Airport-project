import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Database path
const DB_PATH = join(__dirname, '..', 'data', 'jpx_flights.db');

// Middleware
app.use(cors());
app.use(express.json());

// Database connection helper
function getDb() {
  try {
    return new Database(DB_PATH, { readonly: true });
  } catch (err) {
    console.error('Database connection error:', err.message);
    return null;
  }
}

// Known airport coordinates (for mapping)
// Major airports that appear frequently in JPX traffic
const AIRPORT_COORDS = {
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

// GET /api/flights - Flight operations with filtering
app.get('/api/flights', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    const { start, end, category, direction } = req.query;

    let query = 'SELECT * FROM flights WHERE 1=1';
    const params = [];

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

    const flights = db.prepare(query).all(...params);

    // Count flights by airport for mapping
    const airportCounts = {};
    flights.forEach(f => {
      const code = f.direction === 'arrival' ? f.origin_code : f.destination_code;
      if (code) {
        airportCounts[code] = (airportCounts[code] || 0) + 1;
      }
    });

    // Build airport list with coordinates
    const airports = Object.entries(airportCounts).map(([code, count]) => {
      const coords = AIRPORT_COORDS[code];
      return {
        code,
        name: coords?.name || code,
        city: coords?.city || '',
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        flight_count: count,
      };
    }).filter(a => a.lat && a.lng);

    db.close();

    res.json({
      flights,
      airports,
      total: flights.length,
    });
  } catch (err) {
    db.close();
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

// GET /api/summary - Daily summary statistics
app.get('/api/summary', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    const { start, end } = req.query;

    let query = 'SELECT * FROM daily_summary WHERE 1=1';
    const params = [];

    if (start) {
      query += ' AND operation_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND operation_date <= ?';
      params.push(end);
    }

    query += ' ORDER BY operation_date DESC';

    const summary = db.prepare(query).all(...params);
    db.close();

    res.json(summary);
  } catch (err) {
    db.close();
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

// GET /api/stats - Aggregate statistics
app.get('/api/stats', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    const stats = db.prepare(`
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
    `).get();

    db.close();
    res.json(stats);
  } catch (err) {
    db.close();
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ status: 'error', message: 'Database not available' });
  }

  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM flights').get();
    db.close();
    res.json({
      status: 'ok',
      database: 'connected',
      flight_count: count.count,
    });
  } catch (err) {
    db.close();
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`JPX Dashboard API running on http://localhost:${PORT}`);
  console.log(`Database path: ${DB_PATH}`);
});
