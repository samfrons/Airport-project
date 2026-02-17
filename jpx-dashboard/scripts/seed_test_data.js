#!/usr/bin/env node
// seed_test_data.js — Generate realistic East Hampton (JPX) flight data
// Uses sql.js (no native deps). Run from jpx-dashboard/:
//   node scripts/seed_test_data.js
//
// Generates 30 days of flights with all aircraft types from the noise profiles,
// realistic operators, seasonal patterns, and proper hour distributions.

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- paths ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const DB_PATH = resolve(PROJECT_ROOT, 'data', 'jpx_flights.db');
const SCHEMA_PATH = resolve(PROJECT_ROOT, 'src', 'db', 'schema.sql');
const WASM_PATH = join(PROJECT_ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

// ---------- boot sql.js ----------
const wasmBinary = readFileSync(WASM_PATH);
const SQL = await initSqlJs({ wasmBinary });

// ---------- ensure data directory exists ----------
mkdirSync(dirname(DB_PATH), { recursive: true });

// ---------- open fresh database ----------
const db = new SQL.Database();

// ---------- run schema ----------
const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.run(schema);
console.log(`Schema applied from ${SCHEMA_PATH}`);

// ═══════════════════════════════════════════════════════════════════════════════
//  AIRCRAFT FLEET — matches every type in data/noise/aircraftNoiseProfiles.ts
// ═══════════════════════════════════════════════════════════════════════════════

const FLEET = [
  // ─── Helicopters ───────────────────────────────────────────────────────────
  // Robinson R22 — training / light personal
  { type: 'R22', category: 'helicopter', registrations: ['N7022R', 'N803RH'], operator: null, operatorIata: null, weight: 1 },
  // Robinson R44 — most common light helo at East Hampton
  { type: 'R44', category: 'helicopter', registrations: ['N44RH', 'N503RH', 'N144RX', 'N844RA'], operator: null, operatorIata: null, weight: 5 },
  // Robinson R66 — turbine upgrade of R44
  { type: 'R66', category: 'helicopter', registrations: ['N166RB', 'N266RT'], operator: null, operatorIata: null, weight: 2 },
  // Sikorsky S-76 — heavy VIP transport (Blade, charter)
  { type: 'S76', category: 'helicopter', registrations: ['N76BL', 'N176SK', 'N276HF'], operator: 'Blade', operatorIata: 'BLD', weight: 4 },
  // Eurocopter EC135
  { type: 'EC35', category: 'helicopter', registrations: ['N135EC', 'N881EC', 'N535HB'], operator: 'HeliNY', operatorIata: 'HNY', weight: 3 },
  // AgustaWestland AW109
  { type: 'A109', category: 'helicopter', registrations: ['N109AW', 'N209LX'], operator: null, operatorIata: null, weight: 2 },
  // Bell 206 JetRanger
  { type: 'B06', category: 'helicopter', registrations: ['N206BH', 'N306JR'], operator: null, operatorIata: null, weight: 2 },
  // Bell 407
  { type: 'B407', category: 'helicopter', registrations: ['N407BX', 'N507BL'], operator: 'Blade', operatorIata: 'BLD', weight: 2 },
  // Airbus AS350 Ecureuil
  { type: 'AS50', category: 'helicopter', registrations: ['N350AS', 'N450HT'], operator: 'HeliNY', operatorIata: 'HNY', weight: 2 },

  // ─── Jets ──────────────────────────────────────────────────────────────────
  // Gulfstream G550
  { type: 'GLF5', category: 'jet', registrations: ['N550GV', 'N551JP', 'N900GV'], operator: 'NetJets', operatorIata: 'NJA', weight: 3 },
  // Gulfstream G450
  { type: 'GLF4', category: 'jet', registrations: ['N450GA', 'N451WM'], operator: 'NetJets', operatorIata: 'NJA', weight: 2 },
  // Bombardier Global Express
  { type: 'GLEX', category: 'jet', registrations: ['N700BD', 'N701GL'], operator: 'VistaJet', operatorIata: 'VJT', weight: 2 },
  // Cessna Citation Excel
  { type: 'C56X', category: 'jet', registrations: ['N56XC', 'N560EL'], operator: 'Wheels Up', operatorIata: 'UP', weight: 3 },
  // Cessna Citation Sovereign
  { type: 'C680', category: 'jet', registrations: ['N680CS', 'N681JT'], operator: null, operatorIata: null, weight: 2 },
  // Cessna CitationJet CJ1
  { type: 'C525', category: 'jet', registrations: ['N525CJ', 'N526MA'], operator: null, operatorIata: null, weight: 2 },
  // Embraer Phenom 300
  { type: 'E55P', category: 'jet', registrations: ['N300EP', 'N301PH'], operator: 'Flexjet', operatorIata: 'LXJ', weight: 3 },
  // Pilatus PC-12 (turboprop, NOT a jet)
  { type: 'PC12', category: 'fixed_wing', registrations: ['N12PC', 'N912PL', 'N812PT'], operator: 'Surf Air', operatorIata: 'URF', weight: 4 },
  // Learjet 45
  { type: 'LJ45', category: 'jet', registrations: ['N45LJ', 'N145LR'], operator: null, operatorIata: null, weight: 1 },
  // Dassault Falcon 50
  { type: 'FA50', category: 'jet', registrations: ['N50FA', 'N150DF'], operator: null, operatorIata: null, weight: 1 },

  // ─── Fixed Wing (Propeller) ────────────────────────────────────────────────
  // Cessna 172 Skyhawk
  { type: 'C172', category: 'fixed_wing', registrations: ['N7345C', 'N4512C', 'N9283S'], operator: null, operatorIata: null, weight: 4 },
  // Cessna 182 Skylane
  { type: 'C182', category: 'fixed_wing', registrations: ['N182SL', 'N282RK'], operator: null, operatorIata: null, weight: 3 },
  // Cessna 206 Stationair
  { type: 'C206', category: 'fixed_wing', registrations: ['N206SA', 'N306TW'], operator: null, operatorIata: null, weight: 2 },
  // Piper Cherokee
  { type: 'PA28', category: 'fixed_wing', registrations: ['N8291P', 'N6183P', 'N3347W'], operator: null, operatorIata: null, weight: 4 },
  // Piper Saratoga
  { type: 'PA32', category: 'fixed_wing', registrations: ['N32PS', 'N132SR'], operator: null, operatorIata: null, weight: 2 },
  // Beechcraft Bonanza
  { type: 'BE36', category: 'fixed_wing', registrations: ['N36BE', 'N236BN'], operator: null, operatorIata: null, weight: 3 },
  // Cirrus SR22
  { type: 'SR22', category: 'fixed_wing', registrations: ['N22SR', 'N322CX', 'N722SR'], operator: null, operatorIata: null, weight: 4 },
  // Piper PA-28 Archer (variant)
  { type: 'P28A', category: 'fixed_wing', registrations: ['N28AR', 'N128PA'], operator: null, operatorIata: null, weight: 2 },
  // Cessna 150 — training
  { type: 'C150', category: 'fixed_wing', registrations: ['N150CE', 'N250CF'], operator: null, operatorIata: null, weight: 2 },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  AIRPORTS — origins and destinations for East Hampton traffic
// ═══════════════════════════════════════════════════════════════════════════════

const AIRPORTS = [
  // Heavy traffic
  { code: 'KJFK', name: 'John F Kennedy Intl', city: 'New York', weight: 2 },
  { code: 'KTEB', name: 'Teterboro', city: 'Teterboro', weight: 8 },
  { code: 'KHPN', name: 'Westchester County', city: 'White Plains', weight: 6 },
  { code: 'KFRG', name: 'Republic', city: 'Farmingdale', weight: 5 },

  // Moderate traffic
  { code: 'KLGA', name: 'LaGuardia', city: 'New York', weight: 3 },
  { code: 'KISP', name: 'Long Island MacArthur', city: 'Ronkonkoma', weight: 4 },
  { code: 'KFOK', name: 'Francis S Gabreski', city: 'Westhampton Beach', weight: 4 },
  { code: 'KBDR', name: 'Igor I Sikorsky Meml', city: 'Bridgeport', weight: 3 },
  { code: 'KCDW', name: 'Essex County', city: 'Caldwell', weight: 3 },
  { code: 'KMMU', name: 'Morristown Municipal', city: 'Morristown', weight: 3 },
  { code: 'KMTP', name: 'Montauk', city: 'Montauk', weight: 2 },

  // Occasional long-range
  { code: 'KBOS', name: 'Boston Logan Intl', city: 'Boston', weight: 2 },
  { code: 'KPHL', name: 'Philadelphia Intl', city: 'Philadelphia', weight: 1 },
  { code: 'KDCA', name: 'Reagan National', city: 'Washington', weight: 1 },
  { code: 'KPBI', name: 'Palm Beach Intl', city: 'West Palm Beach', weight: 2 },
  { code: 'KMIA', name: 'Miami Intl', city: 'Miami', weight: 1 },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  NOISE PROFILES — dB at 1000 ft reference altitude
//  Matches data/noise/aircraftNoiseProfiles.ts exactly
// ═══════════════════════════════════════════════════════════════════════════════

const NOISE_PROFILES = {
  R22:  { takeoff: 78, approach: 76 },
  R44:  { takeoff: 82, approach: 80 },
  R66:  { takeoff: 83, approach: 81 },
  S76:  { takeoff: 88, approach: 85 },
  EC35: { takeoff: 84, approach: 82 },
  A109: { takeoff: 85, approach: 83 },
  B06:  { takeoff: 83, approach: 81 },
  B407: { takeoff: 84, approach: 82 },
  AS50: { takeoff: 82, approach: 80 },
  GLF5: { takeoff: 92, approach: 88 },
  GLF4: { takeoff: 90, approach: 86 },
  GLEX: { takeoff: 91, approach: 87 },
  C56X: { takeoff: 86, approach: 82 },
  C680: { takeoff: 85, approach: 81 },
  C525: { takeoff: 80, approach: 76 },
  E55P: { takeoff: 82, approach: 78 },
  PC12: { takeoff: 78, approach: 75 },
  LJ45: { takeoff: 84, approach: 80 },
  FA50: { takeoff: 85, approach: 81 },
  C172: { takeoff: 75, approach: 72 },
  C182: { takeoff: 76, approach: 73 },
  C206: { takeoff: 77, approach: 74 },
  PA28: { takeoff: 74, approach: 71 },
  PA32: { takeoff: 76, approach: 73 },
  BE36: { takeoff: 77, approach: 74 },
  SR22: { takeoff: 76, approach: 73 },
  P28A: { takeoff: 72, approach: 69 },
  C150: { takeoff: 70, approach: 67 },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/** Weighted random pick from an array of { ..., weight } objects */
function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** YYYY-MM-DD string for a Date */
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateStr + 'T12:00:00Z').getUTCDay()];
}

function isWeekend(dateStr) {
  const dow = dayOfWeek(dateStr);
  return (dow === 'Saturday' || dow === 'Sunday') ? 1 : 0;
}

function isCurfew(hour) {
  // Curfew: 9 PM (21) through 6:59 AM (< 7)
  return (hour >= 21 || hour < 7) ? 1 : 0;
}

/** Build an ISO 8601 timestamp for a given date + ET hour */
function buildTimestamp(dateStr, hourET) {
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);
  const utcHour = hourET + 5; // EST offset (approximate)
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(utcHour, minute, second);
  return d.toISOString().slice(0, 19) + 'Z';
}

let idCounter = 0;
function generateFaFlightId() {
  idCounter++;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'JPX';
  for (let i = 0; i < 8; i++) id += chars[randomInt(0, chars.length - 1)];
  return `${id}-${idCounter}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GENERATE 30 DAYS OF FLIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

function generateDates(numDays) {
  const dates = [];
  const now = new Date();
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(fmtDate(d));
  }
  return dates;
}

// Hour distribution — East Hampton: busy 8am-6pm, some evening, rare curfew
function pickHour() {
  const r = Math.random();
  if (r < 0.03) return randomInt(0, 5);        // 3% late night / very early
  if (r < 0.08) return randomInt(6, 7);         // 5% early morning
  if (r < 0.75) return randomInt(8, 17);        // 67% daytime peak
  if (r < 0.92) return randomInt(18, 19);       // 17% evening
  return randomInt(20, 23);                      // 8% late evening / curfew
}

function generateFlights() {
  const dates = generateDates(30);
  const flights = [];

  for (const dateStr of dates) {
    const weekend = isWeekend(dateStr);

    // More traffic on weekends (East Hampton pattern)
    const baseFlights = weekend ? randomInt(15, 25) : randomInt(8, 18);

    for (let i = 0; i < baseFlights; i++) {
      const direction = Math.random() < 0.52 ? 'arrival' : 'departure';
      const fleet = weightedPick(FLEET);
      const reg = pick(fleet.registrations);
      const airport = weightedPick(AIRPORTS);
      const hourET = pickHour();
      const ts = buildTimestamp(dateStr, hourET);

      // Scheduled time 3-20 min before actual
      const schedOffset = randomInt(3, 20) * 60 * 1000;
      const schedDate = new Date(new Date(ts).getTime() - schedOffset);
      const schedTs = schedDate.toISOString().slice(0, 19) + 'Z';

      let origin, destination;
      if (direction === 'arrival') {
        origin = { code: airport.code, name: airport.name, city: airport.city };
        destination = { code: 'KJPX', name: 'East Hampton', city: 'East Hampton' };
      } else {
        origin = { code: 'KJPX', name: 'East Hampton', city: 'East Hampton' };
        destination = { code: airport.code, name: airport.name, city: airport.city };
      }

      flights.push({
        fa_flight_id: generateFaFlightId(),
        ident: reg,
        registration: reg,
        direction,
        aircraft_type: fleet.type,
        aircraft_category: fleet.category,
        operator: fleet.operator,
        operator_iata: fleet.operatorIata,
        origin_code: origin.code,
        origin_name: origin.name,
        origin_city: origin.city,
        destination_code: destination.code,
        destination_name: destination.name,
        destination_city: destination.city,
        scheduled_off: direction === 'departure' ? schedTs : null,
        actual_off: direction === 'departure' ? ts : null,
        scheduled_on: direction === 'arrival' ? schedTs : null,
        actual_on: direction === 'arrival' ? ts : null,
        operation_date: dateStr,
        operation_hour_et: hourET,
        is_curfew_period: isCurfew(hourET),
        is_weekend: weekend,
      });
    }
  }

  return flights;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INSERT DATA
// ═══════════════════════════════════════════════════════════════════════════════

const flights = generateFlights();
console.log(`Generated ${flights.length} flights over 30 days.`);

// Print aircraft type distribution
const typeCounts = {};
for (const f of flights) {
  typeCounts[f.aircraft_type] = (typeCounts[f.aircraft_type] || 0) + 1;
}
console.log('\nAircraft type distribution:');
const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
for (const [type, count] of sorted) {
  const profile = NOISE_PROFILES[type];
  console.log(`  ${type.padEnd(5)} ${String(count).padStart(4)} flights  (takeoff ${profile.takeoff} dB / approach ${profile.approach} dB)`);
}

// Insert flights
db.run('BEGIN TRANSACTION');
const stmt = db.prepare(`
  INSERT INTO flights (
    fa_flight_id, ident, registration, direction,
    aircraft_type, aircraft_category, operator, operator_iata,
    origin_code, origin_name, origin_city,
    destination_code, destination_name, destination_city,
    scheduled_off, actual_off, scheduled_on, actual_on,
    operation_date, operation_hour_et, is_curfew_period, is_weekend
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const f of flights) {
  stmt.run([
    f.fa_flight_id, f.ident, f.registration, f.direction,
    f.aircraft_type, f.aircraft_category, f.operator, f.operator_iata,
    f.origin_code, f.origin_name, f.origin_city,
    f.destination_code, f.destination_name, f.destination_city,
    f.scheduled_off, f.actual_off, f.scheduled_on, f.actual_on,
    f.operation_date, f.operation_hour_et, f.is_curfew_period, f.is_weekend,
  ]);
}
stmt.free();
db.run('COMMIT');
console.log(`\nInserted ${flights.length} flights.`);

// ─── Compute and insert daily_summary ────────────────────────────────────────

const summaryResult = db.exec(`
  SELECT
    operation_date,
    COUNT(*)                                                     AS total_operations,
    SUM(CASE WHEN direction = 'arrival' THEN 1 ELSE 0 END)      AS arrivals,
    SUM(CASE WHEN direction = 'departure' THEN 1 ELSE 0 END)    AS departures,
    SUM(CASE WHEN aircraft_category = 'helicopter' THEN 1 ELSE 0 END) AS helicopters,
    SUM(CASE WHEN aircraft_category = 'fixed_wing' THEN 1 ELSE 0 END) AS fixed_wing,
    SUM(CASE WHEN aircraft_category = 'jet' THEN 1 ELSE 0 END)        AS jets,
    0 AS unknown_type,
    SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END)      AS curfew_operations,
    COUNT(DISTINCT registration)                                  AS unique_aircraft
  FROM flights
  GROUP BY operation_date
  ORDER BY operation_date
`);

if (summaryResult.length > 0) {
  const { columns, values } = summaryResult[0];
  db.run('BEGIN TRANSACTION');
  const sumStmt = db.prepare(`
    INSERT OR REPLACE INTO daily_summary (
      operation_date, total_operations, arrivals, departures,
      helicopters, fixed_wing, jets, unknown_type,
      curfew_operations, unique_aircraft, day_of_week
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of values) {
    const dateIdx = columns.indexOf('operation_date');
    const opDate = row[dateIdx];
    sumStmt.run([...row, dayOfWeek(opDate)]);
  }
  sumStmt.free();
  db.run('COMMIT');
  console.log(`Inserted ${values.length} daily_summary rows.`);
}

// ─── Ingestion log entry ─────────────────────────────────────────────────────

db.run(`
  INSERT INTO ingestion_log (pull_date, completed_at, flights_fetched, flights_inserted, flights_skipped, api_requests_made, status)
  VALUES (?, datetime('now'), ?, ?, 0, 0, 'success')
`, [new Date().toISOString().slice(0, 10), flights.length, flights.length]);
console.log('Inserted ingestion_log entry.');

// ─── Save to disk ────────────────────────────────────────────────────────────

const data = db.export();
const buffer = Buffer.from(data);
writeFileSync(DB_PATH, buffer);
db.close();

console.log(`\nSeed complete. Database saved to: ${DB_PATH}`);
console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
