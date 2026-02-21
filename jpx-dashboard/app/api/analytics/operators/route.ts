/**
 * Operator Noise Ranking API
 *
 * Aggregates noise impact data by operator (airline/company) to enable
 * comparative analysis and identification of highest-impact operators.
 *
 * Metrics:
 * - Total dB-seconds (cumulative noise exposure)
 * - Average altitude (higher = quieter)
 * - Curfew violation count (8 PM - 8 AM)
 * - Number of "loud" events (>85 dB at ground level)
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OperatorNoiseStats {
  operatorId: string;
  operatorName: string;
  totalFlights: number;
  helicopterFlights: number;
  jetFlights: number;
  fixedWingFlights: number;
  avgAltitudeFt: number;
  minAltitudeFt: number;
  totalDbSeconds: number;
  avgMaxDb: number;
  peakDb: number;
  loudEvents: number; // Events over 85 dB
  curfewViolations: number;
  noiseScore: number; // Normalized score 0-100
  rank: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastFlightDate: string;
}

interface OperatorRankingResponse {
  success: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  totalOperators: number;
  operators: OperatorNoiseStats[];
  summary: {
    totalFlights: number;
    totalCurfewViolations: number;
    totalLoudEvents: number;
    avgAltitudeAllFlights: number;
    worstOffender: string;
    mostImproved: string;
  };
}

// ─── Mock Data Generator ────────────────────────────────────────────────────

function generateMockOperatorData(
  startDate: string,
  endDate: string
): OperatorNoiseStats[] {
  // Sample operators known to operate at KJPX (anonymized)
  const operators = [
    { id: 'blade', name: 'BLADE', type: 'helicopter' as const },
    { id: 'heli-jets', name: 'HeliJets Aviation', type: 'helicopter' as const },
    { id: 'netjets', name: 'NetJets', type: 'jet' as const },
    { id: 'wheels-up', name: 'Wheels Up', type: 'jet' as const },
    { id: 'flexjet', name: 'Flexjet', type: 'jet' as const },
    { id: 'xojet', name: 'XO Jet', type: 'jet' as const },
    { id: 'local-flight', name: 'Local Flight School', type: 'fixed_wing' as const },
    { id: 'sound-heli', name: 'Sound Helicopters', type: 'helicopter' as const },
    { id: 'charter-one', name: 'Charter One Aviation', type: 'jet' as const },
    { id: 'private', name: 'Private Operators', type: 'mixed' as const },
  ];

  return operators.map((op, index) => {
    // Generate realistic statistics based on operator type
    const baseFlights = Math.floor(Math.random() * 100) + 20;
    const isHelicopter = op.type === 'helicopter';
    const isJet = op.type === 'jet';

    const helicopterFlights = isHelicopter ? baseFlights : Math.floor(baseFlights * 0.1);
    const jetFlights = isJet ? baseFlights : Math.floor(baseFlights * 0.2);
    const fixedWingFlights = !isHelicopter && !isJet ? baseFlights : Math.floor(baseFlights * 0.1);
    const totalFlights = helicopterFlights + jetFlights + fixedWingFlights;

    // Helicopters tend to fly lower, jets higher
    const baseAlt = isHelicopter ? 1200 : isJet ? 2500 : 1800;
    const avgAltitudeFt = baseAlt + Math.floor(Math.random() * 500) - 250;
    const minAltitudeFt = Math.max(500, avgAltitudeFt - 600);

    // Noise metrics - helicopters more problematic per flight
    const avgDbPerFlight = isHelicopter ? 82 : isJet ? 78 : 72;
    const avgMaxDb = avgDbPerFlight + Math.floor(Math.random() * 8) - 4;
    const peakDb = avgMaxDb + 8 + Math.floor(Math.random() * 6);

    // Exposure duration estimate (seconds per flight at elevated noise)
    const avgDuration = isHelicopter ? 45 : isJet ? 60 : 30;
    const totalDbSeconds = Math.round(totalFlights * avgDuration * avgMaxDb);

    // Loud events (>85 dB) - more common for helicopters at low altitude
    const loudEventRate = isHelicopter ? 0.4 : isJet ? 0.15 : 0.05;
    const loudEvents = Math.floor(totalFlights * loudEventRate);

    // Curfew violations (8 PM - 8 AM) - random but weighted by operator type
    const curfewRate = isHelicopter ? 0.08 : isJet ? 0.12 : 0.02;
    const curfewViolations = Math.floor(totalFlights * curfewRate);

    // Calculate noise score (0-100, higher = worse)
    // Weight factors: loudEvents (40%), curfew (30%), low altitude (30%)
    const altitudePenalty = Math.max(0, (2000 - avgAltitudeFt) / 20);
    const noiseScore = Math.round(
      Math.min(100,
        (loudEvents / Math.max(1, totalFlights)) * 100 * 0.4 +
        (curfewViolations / Math.max(1, totalFlights)) * 100 * 0.3 +
        altitudePenalty * 0.3
      )
    );

    // Trend - random but slightly weighted toward stable
    const trendRand = Math.random();
    const trend: 'increasing' | 'decreasing' | 'stable' =
      trendRand > 0.7 ? 'increasing' : trendRand > 0.4 ? 'stable' : 'decreasing';

    return {
      operatorId: op.id,
      operatorName: op.name,
      totalFlights,
      helicopterFlights,
      jetFlights,
      fixedWingFlights,
      avgAltitudeFt,
      minAltitudeFt,
      totalDbSeconds,
      avgMaxDb,
      peakDb,
      loudEvents,
      curfewViolations,
      noiseScore,
      rank: 0, // Will be set after sorting
      trend,
      lastFlightDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}

// ─── API Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Date range parameters
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const startDate = searchParams.get('startDate') ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Sorting
  const sortBy = searchParams.get('sortBy') || 'noiseScore';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Filters
  const minFlights = parseInt(searchParams.get('minFlights') || '5', 10);
  const operatorType = searchParams.get('type'); // 'helicopter', 'jet', 'fixed_wing'

  // Validate minFlights is a valid number
  if (isNaN(minFlights) || minFlights < 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid minFlights parameter (must be >= 0)',
      },
      { status: 400 }
    );
  }

  try {
    // In production, this would query the flight_noise_impacts table
    // For now, generate mock data
    let operators = generateMockOperatorData(startDate, endDate);

    // Apply filters
    operators = operators.filter((op) => op.totalFlights >= minFlights);

    if (operatorType) {
      operators = operators.filter((op) => {
        switch (operatorType) {
          case 'helicopter':
            return op.helicopterFlights > op.jetFlights && op.helicopterFlights > op.fixedWingFlights;
          case 'jet':
            return op.jetFlights > op.helicopterFlights && op.jetFlights > op.fixedWingFlights;
          case 'fixed_wing':
            return op.fixedWingFlights > op.helicopterFlights && op.fixedWingFlights > op.jetFlights;
          default:
            return true;
        }
      });
    }

    // Sort operators
    const sortMultiplier = sortOrder === 'desc' ? -1 : 1;
    operators.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy];
      const bVal = (b as unknown as Record<string, unknown>)[sortBy];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortMultiplier;
      }
      return 0;
    });

    // Assign ranks
    operators.forEach((op, index) => {
      op.rank = index + 1;
    });

    // Calculate summary statistics
    const totalFlights = operators.reduce((sum, op) => sum + op.totalFlights, 0);
    const totalCurfewViolations = operators.reduce((sum, op) => sum + op.curfewViolations, 0);
    const totalLoudEvents = operators.reduce((sum, op) => sum + op.loudEvents, 0);
    const avgAltitudeAllFlights =
      operators.reduce((sum, op) => sum + op.avgAltitudeFt * op.totalFlights, 0) / totalFlights;

    // Find worst and most improved
    const sortedByScore = [...operators].sort((a, b) => b.noiseScore - a.noiseScore);
    const worstOffender = sortedByScore[0]?.operatorName || 'N/A';
    const mostImproved = operators.find((op) => op.trend === 'decreasing')?.operatorName || 'N/A';

    const response: OperatorRankingResponse = {
      success: true,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      totalOperators: operators.length,
      operators,
      summary: {
        totalFlights,
        totalCurfewViolations,
        totalLoudEvents,
        avgAltitudeAllFlights: Math.round(avgAltitudeAllFlights),
        worstOffender,
        mostImproved,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Operator ranking error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate operator rankings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
