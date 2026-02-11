/**
 * Tests for CSV export utilities.
 *
 * Since the export functions call downloadCsv() which creates DOM elements,
 * we test the internal CSV generation logic by importing the module-level
 * helpers. The public functions are tested via mocking.
 */

// We need to mock the DOM download mechanism
let lastCsvContent = '';
let lastFilename = '';

// Mock the DOM methods used by downloadCsv
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = jest.fn();
  // Mock createElement to capture CSV content
  const origCreateElement = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      const el = origCreateElement('a');
      el.click = jest.fn();
      Object.defineProperty(el, 'download', {
        set(val: string) { lastFilename = val; },
        get() { return lastFilename; },
      });
      return el;
    }
    return origCreateElement(tag);
  });
  // Capture Blob content
  const OrigBlob = global.Blob;
  global.Blob = class MockBlob extends OrigBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      if (parts) {
        lastCsvContent = parts.map(p => String(p)).join('');
      }
    }
  } as typeof Blob;
});

import { exportFlightsCsv, exportViolationsCsv, exportOperatorReportCsv } from '@/lib/exportUtils';
import type { Flight } from '@/types/flight';
import type { BiodiversityViolation } from '@/types/biodiversityThresholds';

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 1,
    fa_flight_id: 'f1',
    ident: 'N123',
    registration: 'N123',
    direction: 'departure',
    aircraft_type: 'GLF5',
    aircraft_category: 'jet',
    operator: 'Test Op',
    operator_iata: 'TST',
    origin_code: 'KJPX',
    origin_name: 'East Hampton',
    origin_city: 'East Hampton',
    destination_code: 'KTEB',
    destination_name: 'Teterboro',
    destination_city: 'Teterboro',
    scheduled_off: '2024-07-15T14:00:00Z',
    actual_off: '2024-07-15T14:05:00Z',
    scheduled_on: '2024-07-15T15:00:00Z',
    actual_on: '2024-07-15T15:05:00Z',
    operation_date: '2024-07-15',
    operation_hour_et: 10,
    is_curfew_period: false,
    is_weekend: false,
    fetched_at: '2024-07-15T14:00:00Z',
    ...overrides,
  };
}

describe('exportFlightsCsv', () => {
  it('generates valid CSV with header and rows', () => {
    const flights = [makeFlight(), makeFlight({ ident: 'N456', registration: 'N456' })];

    exportFlightsCsv(flights);

    const lines = lastCsvContent.split('\n');
    expect(lines[0]).toContain('Date');
    expect(lines[0]).toContain('Ident');
    expect(lines[0]).toContain('Registration');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('N123');
    expect(lines[2]).toContain('N456');
  });

  it('includes date range in filename when provided', () => {
    exportFlightsCsv([makeFlight()], { start: '2024-01-01', end: '2024-01-31' });

    expect(lastFilename).toContain('2024-01-01');
    expect(lastFilename).toContain('2024-01-31');
  });
});

describe('exportViolationsCsv', () => {
  it('generates violation CSV with correct columns', () => {
    const violation: BiodiversityViolation = {
      id: 'v1',
      flightId: 'f1',
      flightIdent: 'N123',
      registration: 'N123',
      operator: 'Test Op',
      aircraftType: 'GLF5',
      aircraftCategory: 'jet',
      direction: 'departure',
      operationDate: '2024-07-15',
      operationHour: 10,
      estimatedNoiseDb: 92,
      violatedThresholds: [
        { thresholdId: 't1', thresholdLabel: 'Noise Limit', severity: 'high', exceedanceDb: 7, reason: 'Test' },
      ],
      overallSeverity: 'high',
      speciesAffected: [],
      habitatsAffected: [],
    };

    exportViolationsCsv([violation]);

    const lines = lastCsvContent.split('\n');
    expect(lines[0]).toContain('Estimated dB');
    expect(lines[0]).toContain('Overall Severity');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('92');
    expect(lines[1]).toContain('high');
  });
});

describe('exportOperatorReportCsv', () => {
  it('generates operator report CSV', () => {
    const reports = [
      {
        operator: 'Test Airlines',
        registrations: ['N111', 'N222'],
        aircraftTypes: ['GLF5'],
        totalFlights: 50,
        totalViolations: 10,
        criticalViolations: 2,
        protectedSpeciesEvents: 3,
        worstSeverity: 'critical',
      },
    ];

    exportOperatorReportCsv(reports);

    const lines = lastCsvContent.split('\n');
    expect(lines[0]).toContain('Operator');
    expect(lines[0]).toContain('Total Violations');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Test Airlines');
    // Registrations should be semicolon-separated and quoted (contains ;)
    expect(lines[1]).toContain('N111');
  });
});
