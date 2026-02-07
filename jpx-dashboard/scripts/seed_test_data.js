#!/usr/bin/env node
// seed_test_data.js — Generate realistic test flight data for JPX Dashboard
// Usage: cd jpx-dashboard && node scripts/seed_test_data.js

import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- paths ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");
const DB_PATH = resolve(PROJECT_ROOT, "data", "jpx_flights.db");
const SCHEMA_PATH = resolve(PROJECT_ROOT, "src", "db", "schema.sql");

// ---------- ensure data directory exists ----------
mkdirSync(dirname(DB_PATH), { recursive: true });

// ---------- open / create database ----------
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- run schema ----------
const schema = readFileSync(SCHEMA_PATH, "utf-8");
db.exec(schema);
console.log(`Schema applied from ${SCHEMA_PATH}`);

// ---------- seed data configuration ----------

const AIRPORTS = [
  { code: "KJFK", name: "John F Kennedy Intl", city: "New York" },
  { code: "KLGA", name: "LaGuardia", city: "New York" },
  { code: "KTEB", name: "Teterboro", city: "Teterboro" },
  { code: "KHPN", name: "Westchester County", city: "White Plains" },
  { code: "KFRG", name: "Republic", city: "Farmingdale" },
  { code: "KISP", name: "Long Island MacArthur", city: "Ronkonkoma" },
  { code: "KBDR", name: "Igor I Sikorsky Meml", city: "Bridgeport" },
  { code: "KBOS", name: "Gen Edward Lawrence Logan Intl", city: "Boston" },
  { code: "KPHL", name: "Philadelphia Intl", city: "Philadelphia" },
  { code: "KMTP", name: "Montauk", city: "Montauk" },
  { code: "KFOK", name: "Francis S Gabreski", city: "Westhampton Beach" },
];

const AIRCRAFT = [
  // Helicopters
  { type: "R44",  category: "helicopter", reg: () => nNumber("H") },
  { type: "R44",  category: "helicopter", reg: () => nNumber("H") },
  { type: "EC35", category: "helicopter", reg: () => nNumber("H") },
  { type: "EC35", category: "helicopter", reg: () => nNumber("H") },
  // Jets
  { type: "GLF5", category: "jet",        reg: () => nNumber("J") },
  { type: "CL60", category: "jet",        reg: () => nNumber("J") },
  { type: "GLF5", category: "jet",        reg: () => nNumber("J") },
  // Fixed-wing
  { type: "C172", category: "fixed_wing", reg: () => nNumber("F") },
  { type: "PA28", category: "fixed_wing", reg: () => nNumber("F") },
  { type: "C172", category: "fixed_wing", reg: () => nNumber("F") },
  { type: "PA28", category: "fixed_wing", reg: () => nNumber("F") },
];

// Pre-generate a fixed pool of registrations so some repeat across flights
const REGISTRATIONS = [
  "N44RH", "N117EC", "N503RH", "N881EC", "N22HB",  // helicopters
  "N550GV", "N777CL", "N900GV",                      // jets
  "N7345C", "N8291P", "N4512C", "N6183P",            // fixed-wing
];

// Map registrations to their aircraft profiles
const REG_AIRCRAFT = {
  N44RH:  { type: "R44",  category: "helicopter" },
  N117EC: { type: "EC35", category: "helicopter" },
  N503RH: { type: "R44",  category: "helicopter" },
  N881EC: { type: "EC35", category: "helicopter" },
  N22HB:  { type: "EC35", category: "helicopter" },
  N550GV: { type: "GLF5", category: "jet" },
  N777CL: { type: "CL60", category: "jet" },
  N900GV: { type: "GLF5", category: "jet" },
  N7345C: { type: "C172", category: "fixed_wing" },
  N8291P: { type: "PA28", category: "fixed_wing" },
  N4512C: { type: "C172", category: "fixed_wing" },
  N6183P: { type: "PA28", category: "fixed_wing" },
};

// ---------- helpers ----------

function nNumber(prefix) {
  // Not actually used for generation; we pull from REGISTRATIONS
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `N${num}${prefix}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Return a Date object for a random time on the given date at the given ET hour */
function buildDateET(dateStr, hourET) {
  // dateStr is YYYY-MM-DD, hourET is 0-23 in America/New_York
  // We'll approximate ET as UTC-5 (EST) for simplicity in test data
  const minute = randomInt(0, 59);
  const utcHour = hourET + 5; // EST offset
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(utcHour, minute, randomInt(0, 59));
  return d;
}

function toISO(d) {
  return d.toISOString().replace("T", "T").slice(0, 19) + "Z";
}

function dayOfWeek(dateStr) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(dateStr + "T12:00:00Z");
  return days[d.getUTCDay()];
}

function isWeekend(dateStr) {
  const dow = dayOfWeek(dateStr);
  return dow === "Saturday" || dow === "Sunday" ? 1 : 0;
}

function isCurfew(hour) {
  // Curfew: 8 PM (20) to 8 AM (7) inclusive  =>  hours 20-23, 0-7
  return (hour >= 20 || hour <= 7) ? 1 : 0;
}

function generateFaFlightId() {
  // Simulates a FlightAware flight ID
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "JPX";
  for (let i = 0; i < 10; i++) id += chars[randomInt(0, chars.length - 1)];
  return id + "-" + Date.now().toString(36) + randomInt(100, 999);
}

// ---------- generate dates for the last 7 days ----------

function last7Days() {
  const dates = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

// ---------- generate flights ----------

function generateFlights() {
  const dates = last7Days();
  const flights = [];

  // Weighted hour distribution — mostly daytime, some curfew
  // Daytime hours (8-19) have heavier weight; curfew hours get a few flights
  const hourWeights = [];
  for (let h = 0; h < 24; h++) {
    if (h >= 8 && h <= 18) {
      hourWeights.push(h, h, h, h, h); // heavy weight for daytime
    } else if (h >= 6 && h <= 7) {
      hourWeights.push(h, h); // early morning — light
    } else if (h >= 19 && h <= 21) {
      hourWeights.push(h, h); // evening — moderate
    } else {
      hourWeights.push(h); // late night / very early — rare
    }
  }

  for (const dateStr of dates) {
    // 3-6 flights per day
    const numFlights = randomInt(3, 6);
    for (let i = 0; i < numFlights; i++) {
      const direction = pick(["arrival", "departure"]);
      const reg = pick(REGISTRATIONS);
      const ac = REG_AIRCRAFT[reg];
      const airport = pick(AIRPORTS);
      const hourET = pick(hourWeights);
      const ts = buildDateET(dateStr, hourET);

      let origin, destination;
      if (direction === "arrival") {
        origin = { code: airport.code, name: airport.name, city: airport.city };
        destination = { code: "KJPX", name: "East Hampton", city: "East Hampton" };
      } else {
        origin = { code: "KJPX", name: "East Hampton", city: "East Hampton" };
        destination = { code: airport.code, name: airport.name, city: airport.city };
      }

      // Build scheduled time ~5-15 min before actual
      const schedOffset = randomInt(5, 15) * 60 * 1000;
      const schedTs = new Date(ts.getTime() - schedOffset);

      flights.push({
        fa_flight_id: generateFaFlightId(),
        ident: reg,
        registration: reg,
        direction,
        aircraft_type: ac.type,
        aircraft_category: ac.category,
        operator: null,
        operator_iata: null,
        origin_code: origin.code,
        origin_name: origin.name,
        origin_city: origin.city,
        destination_code: destination.code,
        destination_name: destination.name,
        destination_city: destination.city,
        scheduled_off: direction === "departure" ? toISO(schedTs) : null,
        actual_off: direction === "departure" ? toISO(ts) : null,
        scheduled_on: direction === "arrival" ? toISO(schedTs) : null,
        actual_on: direction === "arrival" ? toISO(ts) : null,
        operation_date: dateStr,
        operation_hour_et: hourET,
        is_curfew_period: isCurfew(hourET),
        is_weekend: isWeekend(dateStr),
      });
    }
  }

  return flights;
}

// ---------- insert flights ----------

const flights = generateFlights();

console.log(`Generated ${flights.length} test flights.`);

const insertFlight = db.prepare(`
  INSERT INTO flights (
    fa_flight_id, ident, registration, direction,
    aircraft_type, aircraft_category, operator, operator_iata,
    origin_code, origin_name, origin_city,
    destination_code, destination_name, destination_city,
    scheduled_off, actual_off, scheduled_on, actual_on,
    operation_date, operation_hour_et, is_curfew_period, is_weekend
  ) VALUES (
    @fa_flight_id, @ident, @registration, @direction,
    @aircraft_type, @aircraft_category, @operator, @operator_iata,
    @origin_code, @origin_name, @origin_city,
    @destination_code, @destination_name, @destination_city,
    @scheduled_off, @actual_off, @scheduled_on, @actual_on,
    @operation_date, @operation_hour_et, @is_curfew_period, @is_weekend
  )
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    insertFlight.run(row);
  }
});

insertMany(flights);
console.log(`Inserted ${flights.length} flights into ${DB_PATH}`);

// ---------- compute and insert daily_summary ----------

const summaryQuery = db.prepare(`
  SELECT
    operation_date,
    COUNT(*)                                          AS total_operations,
    SUM(CASE WHEN direction = 'arrival' THEN 1 ELSE 0 END)   AS arrivals,
    SUM(CASE WHEN direction = 'departure' THEN 1 ELSE 0 END) AS departures,
    SUM(CASE WHEN aircraft_category = 'helicopter' THEN 1 ELSE 0 END)  AS helicopters,
    SUM(CASE WHEN aircraft_category = 'fixed_wing' THEN 1 ELSE 0 END)  AS fixed_wing,
    SUM(CASE WHEN aircraft_category = 'jet' THEN 1 ELSE 0 END)         AS jets,
    SUM(CASE WHEN aircraft_category = 'unknown' THEN 1 ELSE 0 END)     AS unknown_type,
    SUM(CASE WHEN is_curfew_period = 1 THEN 1 ELSE 0 END)              AS curfew_operations,
    COUNT(DISTINCT registration)                                         AS unique_aircraft,
    is_weekend
  FROM flights
  GROUP BY operation_date
  ORDER BY operation_date
`);

const insertSummary = db.prepare(`
  INSERT OR REPLACE INTO daily_summary (
    operation_date, total_operations, arrivals, departures,
    helicopters, fixed_wing, jets, unknown_type,
    curfew_operations, unique_aircraft, day_of_week
  ) VALUES (
    @operation_date, @total_operations, @arrivals, @departures,
    @helicopters, @fixed_wing, @jets, @unknown_type,
    @curfew_operations, @unique_aircraft, @day_of_week
  )
`);

const summaries = summaryQuery.all();
const insertSummaries = db.transaction((rows) => {
  for (const row of rows) {
    insertSummary.run({
      ...row,
      day_of_week: dayOfWeek(row.operation_date),
    });
  }
});

insertSummaries(summaries);
console.log(`Inserted ${summaries.length} daily_summary rows.`);

// ---------- also insert an ingestion_log entry ----------

db.prepare(`
  INSERT INTO ingestion_log (pull_date, completed_at, flights_fetched, flights_inserted, flights_skipped, api_requests_made, status)
  VALUES (?, datetime('now'), ?, ?, 0, 0, 'success')
`).run(new Date().toISOString().slice(0, 10), flights.length, flights.length);

console.log("Inserted ingestion_log entry.");

// ---------- done ----------

db.close();
console.log("\nSeed complete. Database ready at:", DB_PATH);
