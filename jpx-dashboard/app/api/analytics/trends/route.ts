/**
 * Historical Noise Trend Analysis API
 *
 * Provides time-series analysis of noise impact data for trend visualization
 * and pattern identification.
 *
 * Charts:
 * - Daily noise exposure (total dB-seconds per day)
 * - Weekly comparison (this week vs last week)
 * - Monthly trend (rolling 30-day average)
 * - Quietest/loudest days identification
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DailyNoiseSummary {
  date: string;
  dayOfWeek: string;
  totalFlights: number;
  helicopterFlights: number;
  jetFlights: number;
  fixedWingFlights: number;
  totalDbSeconds: number;
  avgMaxDb: number;
  peakDb: number;
  loudEvents: number;
  curfewViolations: number;
  avgAltitudeFt: number;
  weatherConditions: 'normal' | 'amplified' | 'reduced';
}

interface WeeklyComparison {
  dayOfWeek: string;
  thisWeek: {
    totalDbSeconds: number;
    totalFlights: number;
    avgMaxDb: number;
  };
  lastWeek: {
    totalDbSeconds: number;
    totalFlights: number;
    avgMaxDb: number;
  };
  change: {
    dbSecondsPercent: number;
    flightsPercent: number;
    dbPercent: number;
  };
}

interface TrendAnalysisResponse {
  success: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  dailySummaries: DailyNoiseSummary[];
  weeklyComparison: WeeklyComparison[];
  statistics: {
    totalDays: number;
    totalFlights: number;
    totalDbSeconds: number;
    avgDailyFlights: number;
    avgDailyDbSeconds: number;
    loudestDay: {
      date: string;
      totalDbSeconds: number;
      totalFlights: number;
    };
    quietestDay: {
      date: string;
      totalDbSeconds: number;
      totalFlights: number;
    };
    peakHour: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendPercentage: number;
  };
  rollingAverages: {
    date: string;
    avg7Day: number;
    avg30Day: number;
  }[];
}

// ─── Mock Data Generator ────────────────────────────────────────────────────

function generateMockDailySummaries(startDate: Date, endDate: Date): DailyNoiseSummary[] {
  const summaries: DailyNoiseSummary[] = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = days[current.getDay()];

    // Weekend traffic is typically higher for KJPX (Hamptons)
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const isFriday = current.getDay() === 5;
    const isSummer = current.getMonth() >= 5 && current.getMonth() <= 8;

    // Base flight count varies by day type
    let baseFlights = 20;
    if (isWeekend) baseFlights = 45;
    if (isFriday) baseFlights = 55; // Friday departures to Hamptons
    if (isSummer) baseFlights *= 1.8; // Summer surge

    // Add some randomness
    const totalFlights = Math.floor(baseFlights + (Math.random() - 0.5) * baseFlights * 0.4);

    // Breakdown by aircraft type
    const helicopterFlights = Math.floor(totalFlights * (0.35 + Math.random() * 0.1));
    const jetFlights = Math.floor(totalFlights * (0.40 + Math.random() * 0.1));
    const fixedWingFlights = totalFlights - helicopterFlights - jetFlights;

    // Noise metrics
    const avgMaxDb = 75 + Math.floor(Math.random() * 10);
    const peakDb = avgMaxDb + 10 + Math.floor(Math.random() * 8);
    const avgDuration = 45; // seconds of elevated noise per flight
    const totalDbSeconds = Math.round(totalFlights * avgDuration * avgMaxDb);

    // Loud events and curfew violations
    const loudEvents = Math.floor(totalFlights * (0.15 + Math.random() * 0.1));
    const curfewViolations = Math.floor(totalFlights * (0.05 + Math.random() * 0.05));

    // Average altitude
    const avgAltitudeFt = 1500 + Math.floor(Math.random() * 800);

    // Weather conditions (mock - would come from weather API)
    const weatherRoll = Math.random();
    const weatherConditions: 'normal' | 'amplified' | 'reduced' =
      weatherRoll > 0.85 ? 'amplified' : weatherRoll > 0.7 ? 'reduced' : 'normal';

    summaries.push({
      date: current.toISOString().split('T')[0],
      dayOfWeek,
      totalFlights,
      helicopterFlights,
      jetFlights,
      fixedWingFlights,
      totalDbSeconds,
      avgMaxDb,
      peakDb,
      loudEvents,
      curfewViolations,
      avgAltitudeFt,
      weatherConditions,
    });

    current.setDate(current.getDate() + 1);
  }

  return summaries;
}

function generateWeeklyComparison(summaries: DailyNoiseSummary[]): WeeklyComparison[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get last 14 days of data
  const last14Days = summaries.slice(-14);
  if (last14Days.length < 14) {
    return [];
  }

  const thisWeek = last14Days.slice(-7);
  const lastWeek = last14Days.slice(0, 7);

  return days.map((day, index) => {
    const thisDay = thisWeek.find((d) => d.dayOfWeek === day) || {
      totalDbSeconds: 0,
      totalFlights: 0,
      avgMaxDb: 0,
    };
    const lastDay = lastWeek.find((d) => d.dayOfWeek === day) || {
      totalDbSeconds: 0,
      totalFlights: 0,
      avgMaxDb: 0,
    };

    const dbSecondsChange = lastDay.totalDbSeconds
      ? ((thisDay.totalDbSeconds - lastDay.totalDbSeconds) / lastDay.totalDbSeconds) * 100
      : 0;
    const flightsChange = lastDay.totalFlights
      ? ((thisDay.totalFlights - lastDay.totalFlights) / lastDay.totalFlights) * 100
      : 0;
    const dbChange = lastDay.avgMaxDb
      ? ((thisDay.avgMaxDb - lastDay.avgMaxDb) / lastDay.avgMaxDb) * 100
      : 0;

    return {
      dayOfWeek: day,
      thisWeek: {
        totalDbSeconds: thisDay.totalDbSeconds,
        totalFlights: thisDay.totalFlights,
        avgMaxDb: thisDay.avgMaxDb,
      },
      lastWeek: {
        totalDbSeconds: lastDay.totalDbSeconds,
        totalFlights: lastDay.totalFlights,
        avgMaxDb: lastDay.avgMaxDb,
      },
      change: {
        dbSecondsPercent: Math.round(dbSecondsChange * 10) / 10,
        flightsPercent: Math.round(flightsChange * 10) / 10,
        dbPercent: Math.round(dbChange * 10) / 10,
      },
    };
  });
}

function calculateRollingAverages(
  summaries: DailyNoiseSummary[]
): { date: string; avg7Day: number; avg30Day: number }[] {
  return summaries.map((summary, index) => {
    // 7-day rolling average
    const last7 = summaries.slice(Math.max(0, index - 6), index + 1);
    const avg7Day = last7.reduce((sum, d) => sum + d.totalDbSeconds, 0) / last7.length;

    // 30-day rolling average
    const last30 = summaries.slice(Math.max(0, index - 29), index + 1);
    const avg30Day = last30.reduce((sum, d) => sum + d.totalDbSeconds, 0) / last30.length;

    return {
      date: summary.date,
      avg7Day: Math.round(avg7Day),
      avg30Day: Math.round(avg30Day),
    };
  });
}

// ─── API Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Date range parameters (default to last 30 days)
  const endDateStr = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const startDateStr = searchParams.get('startDate') ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  try {
    // Generate mock data (in production, query daily_noise_summary table)
    const dailySummaries = generateMockDailySummaries(startDate, endDate);

    // Generate weekly comparison
    const weeklyComparison = generateWeeklyComparison(dailySummaries);

    // Calculate rolling averages
    const rollingAverages = calculateRollingAverages(dailySummaries);

    // Calculate statistics
    const totalFlights = dailySummaries.reduce((sum, d) => sum + d.totalFlights, 0);
    const totalDbSeconds = dailySummaries.reduce((sum, d) => sum + d.totalDbSeconds, 0);

    // Find loudest and quietest days
    const sortedByDb = [...dailySummaries].sort((a, b) => b.totalDbSeconds - a.totalDbSeconds);
    const loudestDay = sortedByDb[0];
    const quietestDay = sortedByDb[sortedByDb.length - 1];

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(dailySummaries.length / 2);
    const firstHalf = dailySummaries.slice(0, midpoint);
    const secondHalf = dailySummaries.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.totalDbSeconds, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.totalDbSeconds, 0) / secondHalf.length;

    const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendPercentage > 5) trend = 'increasing';
    if (trendPercentage < -5) trend = 'decreasing';

    const response: TrendAnalysisResponse = {
      success: true,
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
      dailySummaries,
      weeklyComparison,
      statistics: {
        totalDays: dailySummaries.length,
        totalFlights,
        totalDbSeconds,
        avgDailyFlights: Math.round(totalFlights / dailySummaries.length),
        avgDailyDbSeconds: Math.round(totalDbSeconds / dailySummaries.length),
        loudestDay: {
          date: loudestDay?.date || '',
          totalDbSeconds: loudestDay?.totalDbSeconds || 0,
          totalFlights: loudestDay?.totalFlights || 0,
        },
        quietestDay: {
          date: quietestDay?.date || '',
          totalDbSeconds: quietestDay?.totalDbSeconds || 0,
          totalFlights: quietestDay?.totalFlights || 0,
        },
        peakHour: 17, // 5 PM - would be calculated from actual data
        trend,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
      },
      rollingAverages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Trend analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate trend analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
