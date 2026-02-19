'use client';

import { useMemo, useState } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { MobileHeader } from '../MobileHeader';
import { DataFreshnessChip } from '../shared/DataFreshnessChip';
import { HeroStat } from '../shared/HeroStat';
import { ComparisonToggle, ComparisonPeriod } from '../shared/ComparisonToggle';
import { HourlyChart } from '../shared/HourlyChart';
import { AircraftTypeBar } from '../shared/AircraftTypeBar';
import { CURFEW } from '@/lib/constants/curfew';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import { NAVY, NOISE_COLORS } from '@/lib/mobile/colors';

export function TodayTab() {
  const { flights, dateRange } = useFlightStore();
  const [comparison, setComparison] = useState<ComparisonPeriod>(null);

  // Filter to today's flights
  const todayFlights = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return flights.filter((f) => f.operation_date === today);
  }, [flights]);

  // Use all flights if no today flights (for demo purposes)
  const displayFlights = todayFlights.length > 0 ? todayFlights : flights.slice(0, 20);

  // Stats calculations
  const stats = useMemo(() => {
    const total = displayFlights.length;
    const arrivals = displayFlights.filter((f) => f.direction === 'arrival').length;
    const departures = displayFlights.filter((f) => f.direction === 'departure').length;

    // Calculate average and peak noise
    let totalDb = 0;
    let peakDb = 0;
    for (const f of displayFlights) {
      const db = getNoiseDb(f);
      totalDb += db;
      if (db > peakDb) peakDb = db;
    }
    const avgDb = total > 0 ? Math.round(totalDb / total) : 0;

    // Curfew violations
    const curfewViolations = displayFlights.filter((f) =>
      CURFEW.isCurfewHour(f.operation_hour_et)
    ).length;

    return { total, arrivals, departures, avgDb, peakDb, curfewViolations };
  }, [displayFlights]);

  // Format today's date
  const todayDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Current hour for chart highlight
  const currentHour = new Date().getHours();

  // Get noise color based on average
  const noiseColor =
    stats.avgDb >= 85
      ? NOISE_COLORS.veryLoud
      : stats.avgDb >= 75
        ? NOISE_COLORS.loud
        : stats.avgDb >= 65
          ? NOISE_COLORS.moderate
          : NOISE_COLORS.quiet;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <MobileHeader
        title="KJPX · East Hampton"
        subtitle={todayDate}
        right={<DataFreshnessChip />}
      />

      {/* Curfew alert banner */}
      {stats.curfewViolations > 0 && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            {stats.curfewViolations} curfew violation{stats.curfewViolations !== 1 ? 's' : ''} today
          </span>
          <span className="ml-auto text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
            See all →
          </span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Hero stats */}
        <div className="flex gap-3 p-4">
          <HeroStat
            label="Ops Today"
            value={stats.total}
            subtitle={`${stats.arrivals} arr · ${stats.departures} dep`}
            color={NAVY}
            delta={comparison ? '+18%' : null}
            deltaBetter={false}
          />
          <HeroStat
            label="Avg Noise (Est.)"
            value={stats.avgDb}
            unit="dB"
            subtitle={`Peak: ${stats.peakDb} dB`}
            color={noiseColor}
            delta={comparison ? '+2 dB' : null}
            deltaBetter={false}
          />
        </div>

        {/* Comparison toggle */}
        <ComparisonToggle selected={comparison} onSelect={setComparison} />

        {/* Hourly chart */}
        <div className="mt-4">
          <HourlyChart flights={displayFlights} currentHour={currentHour} />
        </div>

        {/* Divider */}
        <div className="h-px bg-subtle mx-4 my-4" />

        {/* Aircraft type breakdown */}
        <AircraftTypeBar flights={displayFlights} />
      </div>

      {/* Fixed CTA button */}
      <div className="p-4 border-t border-subtle">
        <button className="w-full bg-red-600 text-white py-3 text-[13px] font-extrabold shadow-lg">
          📢 File a Noise Complaint
        </button>
      </div>
    </div>
  );
}
