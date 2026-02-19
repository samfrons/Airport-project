/**
 * Export utilities for CSV generation and file download
 */

import type { Flight } from '@/types/flight';
import type { BiodiversityViolation } from '@/types/biodiversityThresholds';

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCsv).join(',');
}

// ─── Flight Export ──────────────────────────────────────────────────────────

export function exportFlightsCsv(flights: Flight[], dateRange?: { start: string; end: string }) {
  const header = [
    'Date', 'Hour (ET)', 'Ident', 'Registration', 'Operator',
    'Aircraft Type', 'Category', 'Direction',
    'Origin', 'Origin City', 'Destination', 'Destination City',
    'Curfew Period', 'Weekend',
  ];

  const rows = flights.map((f) => toCsvRow([
    f.operation_date,
    f.operation_hour_et,
    f.ident,
    f.registration,
    f.operator,
    f.aircraft_type,
    f.aircraft_category,
    f.direction,
    f.origin_code,
    f.origin_city,
    f.destination_code,
    f.destination_city,
    f.is_curfew_period,
    f.is_weekend,
  ]));

  const csv = [toCsvRow(header), ...rows].join('\n');
  const suffix = dateRange ? `_${dateRange.start}_${dateRange.end}` : '';
  downloadCsv(csv, `jpx_flights${suffix}.csv`);
}

// ─── Violations Export ──────────────────────────────────────────────────────

export function exportViolationsCsv(
  violations: BiodiversityViolation[],
  dateRange?: { start: string; end: string },
) {
  const header = [
    'Date', 'Hour (ET)', 'Registration', 'Operator',
    'Aircraft Type', 'Category', 'Direction',
    'Estimated dB', 'Overall Severity',
    'Thresholds Violated', 'Threshold Details',
    'Species Affected', 'Protected Species',
    'Habitats Impacted',
  ];

  const rows = violations.map((v) => toCsvRow([
    v.operationDate,
    v.operationHour,
    v.registration,
    v.operator,
    v.aircraftType,
    v.aircraftCategory,
    v.direction,
    v.estimatedNoiseDb,
    v.overallSeverity,
    v.violatedThresholds.length,
    v.violatedThresholds.map((t) => t.thresholdLabel).join('; '),
    v.speciesAffected.length,
    v.speciesAffected.filter((s) => s.conservationStatus).map((s) => s.commonName).join('; '),
    v.habitatsAffected.map((h) => `${h.habitatName} (${h.habitatType})`).join('; '),
  ]));

  const csv = [toCsvRow(header), ...rows].join('\n');
  const suffix = dateRange ? `_${dateRange.start}_${dateRange.end}` : '';
  downloadCsv(csv, `jpx_violations${suffix}.csv`);
}

// ─── Operator Report Export ─────────────────────────────────────────────────

export interface OperatorReport {
  operator: string;
  registrations: string[];
  aircraftTypes: string[];
  totalFlights: number;
  curfewViolations: number;
  noiseExceedances: number;
  avgNoiseDb: number;
}

export function exportOperatorReportCsv(reports: OperatorReport[]) {
  const header = [
    'Operator', 'Registrations', 'Aircraft Types',
    'Total Flights', 'Curfew Violations', 'Noise Exceedances (85+ dB)',
    'Avg Noise dB',
  ];

  const rows = reports.map((r) => toCsvRow([
    r.operator,
    r.registrations.join('; '),
    r.aircraftTypes.join('; '),
    r.totalFlights,
    r.curfewViolations,
    r.noiseExceedances,
    r.avgNoiseDb,
  ]));

  const csv = [toCsvRow(header), ...rows].join('\n');
  downloadCsv(csv, `jpx_operator_report.csv`);
}
