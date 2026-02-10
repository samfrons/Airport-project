import { evaluateFlight, evaluateAllFlights, generateViolationSummary } from '@/lib/biodiversityViolationEngine';
import type { Flight } from '@/types/flight';
import type { BiodiversityThreshold } from '@/types/biodiversityThresholds';

// ─── Test Fixtures ─────────────────────────────────────────────────────────

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 1,
    fa_flight_id: 'test-flight-001',
    ident: 'N12345',
    registration: 'N12345',
    direction: 'departure',
    aircraft_type: 'GLF5', // very loud jet: takeoff 92dB, approach 88dB
    aircraft_category: 'jet',
    operator: 'Test Operator',
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

function makeThreshold(overrides: Partial<BiodiversityThreshold> = {}): BiodiversityThreshold {
  return {
    id: 'test-threshold-1',
    label: 'Test Noise Threshold',
    description: 'Test threshold for unit tests',
    enabled: true,
    type: 'noise_level',
    noiseThresholdDb: 85,
    violationSeverity: 'high',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('evaluateFlight', () => {
  it('returns a violation when noise exceeds threshold', () => {
    const flight = makeFlight({ aircraft_type: 'GLF5', direction: 'departure' }); // 92dB
    const thresholds = [makeThreshold({ noiseThresholdDb: 85 })];

    const result = evaluateFlight(flight, thresholds);

    expect(result).not.toBeNull();
    expect(result!.estimatedNoiseDb).toBe(92);
    expect(result!.violatedThresholds).toHaveLength(1);
    expect(result!.violatedThresholds[0].exceedanceDb).toBe(7);
  });

  it('returns null when noise is below threshold', () => {
    const flight = makeFlight({ aircraft_type: 'C172', direction: 'departure' }); // 75dB
    const thresholds = [makeThreshold({ noiseThresholdDb: 85 })];

    const result = evaluateFlight(flight, thresholds);

    expect(result).toBeNull();
  });

  it('skips disabled thresholds', () => {
    const flight = makeFlight({ aircraft_type: 'GLF5' }); // 92dB
    const thresholds = [makeThreshold({ enabled: false, noiseThresholdDb: 50 })];

    const result = evaluateFlight(flight, thresholds);

    expect(result).toBeNull();
  });

  it('respects aircraft category filtering', () => {
    const flight = makeFlight({ aircraft_type: 'GLF5', aircraft_category: 'jet' }); // 92dB
    const thresholds = [
      makeThreshold({
        noiseThresholdDb: 85,
        applicableAircraftCategories: ['helicopter'],
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).toBeNull(); // jet should not match helicopter-only threshold
  });

  it('includes flight when category matches', () => {
    const flight = makeFlight({ aircraft_type: 'GLF5', aircraft_category: 'jet' }); // 92dB
    const thresholds = [
      makeThreshold({
        noiseThresholdDb: 85,
        applicableAircraftCategories: ['jet'],
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).not.toBeNull();
  });

  it('respects direction filtering', () => {
    const flight = makeFlight({ direction: 'arrival' });
    const thresholds = [
      makeThreshold({
        noiseThresholdDb: 85,
        applicableDirections: ['departure'],
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).toBeNull(); // arrival should not match departure-only threshold
  });

  it('detects time_of_day violations', () => {
    const flight = makeFlight({ operation_hour_et: 22 }); // 10 PM
    const thresholds = [
      makeThreshold({
        type: 'time_of_day',
        activeHours: { start: 20, end: 8 }, // 8PM–8AM curfew
        violationSeverity: 'critical',
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).not.toBeNull();
    expect(result!.overallSeverity).toBe('critical');
  });

  it('detects time_of_day violations with midnight wrap', () => {
    const flight = makeFlight({ operation_hour_et: 3 }); // 3 AM
    const thresholds = [
      makeThreshold({
        type: 'time_of_day',
        activeHours: { start: 20, end: 8 }, // wraps midnight
        violationSeverity: 'critical',
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).not.toBeNull();
  });

  it('does not trigger time_of_day outside window', () => {
    const flight = makeFlight({ operation_hour_et: 14 }); // 2 PM
    const thresholds = [
      makeThreshold({
        type: 'time_of_day',
        activeHours: { start: 20, end: 8 },
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).toBeNull();
  });

  it('detects seasonal violations when in active month and noisy', () => {
    const flight = makeFlight({
      aircraft_type: 'GLF5', // 92dB
      operation_date: '2024-05-15', // May = month 5
    });
    const thresholds = [
      makeThreshold({
        type: 'seasonal',
        activeMonths: [4, 5, 6], // Apr–Jun
        noiseThresholdDb: 70,
        violationSeverity: 'high',
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).not.toBeNull();
  });

  it('does not trigger seasonal when outside active months', () => {
    const flight = makeFlight({
      aircraft_type: 'GLF5',
      operation_date: '2024-01-15', // Jan = month 1
    });
    const thresholds = [
      makeThreshold({
        type: 'seasonal',
        activeMonths: [4, 5, 6],
        noiseThresholdDb: 70,
      }),
    ];

    const result = evaluateFlight(flight, thresholds);
    expect(result).toBeNull();
  });

  it('uses approach dB for arrivals and takeoff dB for departures', () => {
    // GLF5: takeoff=92, approach=88
    const arrival = makeFlight({ direction: 'arrival', aircraft_type: 'GLF5' });
    const departure = makeFlight({ direction: 'departure', aircraft_type: 'GLF5' });
    const thresholds = [makeThreshold({ noiseThresholdDb: 50 })];

    const arrResult = evaluateFlight(arrival, thresholds);
    const depResult = evaluateFlight(departure, thresholds);

    expect(arrResult!.estimatedNoiseDb).toBe(88);
    expect(depResult!.estimatedNoiseDb).toBe(92);
  });

  it('populates affected species and habitats', () => {
    const flight = makeFlight({ aircraft_type: 'GLF5' }); // 92dB — very loud
    const thresholds = [makeThreshold({ noiseThresholdDb: 50 })];

    const result = evaluateFlight(flight, thresholds);

    expect(result).not.toBeNull();
    expect(result!.speciesAffected.length).toBeGreaterThan(0);
    expect(result!.habitatsAffected.length).toBeGreaterThan(0);
  });
});

describe('evaluateAllFlights', () => {
  it('evaluates multiple flights and filters nulls', () => {
    const flights = [
      makeFlight({ fa_flight_id: 'f1', aircraft_type: 'GLF5' }), // 92dB — will violate
      makeFlight({ fa_flight_id: 'f2', aircraft_type: 'C150' }), // 70dB — won't violate
      makeFlight({ fa_flight_id: 'f3', aircraft_type: 'S76' }),  // 88dB — will violate
    ];
    const thresholds = [makeThreshold({ noiseThresholdDb: 85 })];

    const violations = evaluateAllFlights(flights, thresholds);

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.flightId)).toEqual(['f1', 'f3']);
  });

  it('returns empty array when no flights violate', () => {
    const flights = [
      makeFlight({ aircraft_type: 'C150' }), // quiet
      makeFlight({ aircraft_type: 'P28A' }), // quiet
    ];
    const thresholds = [makeThreshold({ noiseThresholdDb: 85 })];

    const violations = evaluateAllFlights(flights, thresholds);

    expect(violations).toHaveLength(0);
  });
});

describe('generateViolationSummary', () => {
  it('generates correct summary from violations', () => {
    const flights = [
      makeFlight({ fa_flight_id: 'f1', aircraft_type: 'GLF5', registration: 'N111' }),
      makeFlight({ fa_flight_id: 'f2', aircraft_type: 'S76', registration: 'N222', aircraft_category: 'helicopter' }),
      makeFlight({ fa_flight_id: 'f3', aircraft_type: 'GLF5', registration: 'N111' }), // repeat offender
    ];
    const thresholds = [makeThreshold({ noiseThresholdDb: 80 })];

    const violations = evaluateAllFlights(flights, thresholds);
    const summary = generateViolationSummary(violations);

    expect(summary.totalViolations).toBe(3);
    expect(summary.totalFlightsWithViolations).toBe(3);
    expect(summary.byAircraftCategory['jet']).toBe(2);
    expect(summary.byAircraftCategory['helicopter']).toBe(1);
    expect(summary.topOffenders[0].registration).toBe('N111');
    expect(summary.topOffenders[0].violationCount).toBe(2);
  });

  it('handles empty violations array', () => {
    const summary = generateViolationSummary([]);

    expect(summary.totalViolations).toBe(0);
    expect(summary.totalFlightsWithViolations).toBe(0);
    expect(summary.topOffenders).toHaveLength(0);
  });
});
