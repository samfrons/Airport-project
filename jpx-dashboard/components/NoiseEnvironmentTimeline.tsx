'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  CalendarDays,
  Volume2,
  TrendingUp,
  BarChart3,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
);

// ─── Types ──────────────────────────────────────────────────────────────────

interface DayBucket {
  date: string;
  label: string;
  flights: Flight[];
  totalOps: number;
  arrivals: number;
  departures: number;
  helicopters: number;
  jets: number;
  fixedWing: number;
  avgNoise: number;
  peakNoise: number;
  curfewOps: number;
  loudOps: number;
}

interface HourCell {
  date: string;
  hour: number;
  count: number;
  avgNoise: number;
}

type ViewMode = 'trends' | 'heatmap';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getAllDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Use canonical getNoiseDb from lib/noise/getNoiseDb.ts
const getFlightNoise = getNoiseDb;

function buildDayBuckets(
  flights: Flight[],
  dateRange: { start: string; end: string },
): DayBucket[] {
  const allDates = getAllDatesInRange(dateRange.start, dateRange.end);
  const byDate = new Map<string, Flight[]>();

  for (const f of flights) {
    const existing = byDate.get(f.operation_date) ?? [];
    existing.push(f);
    byDate.set(f.operation_date, existing);
  }

  return allDates.map((date) => {
    const dayFlights = byDate.get(date) ?? [];
    const noises = dayFlights.map(getFlightNoise);
    const avgNoise = noises.length > 0 ? Math.round(noises.reduce((a, b) => a + b, 0) / noises.length) : 0;
    const peakNoise = noises.length > 0 ? Math.max(...noises) : 0;

    return {
      date,
      label: formatShortDate(date),
      flights: dayFlights,
      totalOps: dayFlights.length,
      arrivals: dayFlights.filter((f) => f.direction === 'arrival').length,
      departures: dayFlights.filter((f) => f.direction === 'departure').length,
      helicopters: dayFlights.filter((f) => f.aircraft_category === 'helicopter').length,
      jets: dayFlights.filter((f) => f.aircraft_category === 'jet').length,
      fixedWing: dayFlights.filter((f) => f.aircraft_category === 'fixed_wing').length,
      avgNoise,
      peakNoise,
      curfewOps: dayFlights.filter((f) => f.is_curfew_period).length,
      loudOps: dayFlights.filter((f) => getFlightNoise(f) >= 85).length,
    };
  });
}

function buildHourCells(
  flights: Flight[],
  dateRange: { start: string; end: string },
): { cells: HourCell[]; dates: string[] } {
  const dates = getAllDatesInRange(dateRange.start, dateRange.end);
  const cells: HourCell[] = [];

  for (const date of dates) {
    for (let hour = 0; hour < 24; hour++) {
      const matching = flights.filter(
        (f) => f.operation_date === date && f.operation_hour_et === hour,
      );
      const noises = matching.map(getFlightNoise);

      cells.push({
        date,
        hour,
        count: matching.length,
        avgNoise: noises.length > 0 ? Math.round(noises.reduce((a, b) => a + b, 0) / noises.length) : 0,
      });
    }
  }

  return { cells, dates };
}

// ─── Preset Ranges ──────────────────────────────────────────────────────────

const presets = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

// ─── Chart styling ──────────────────────────────────────────────────────────

const chartFont = { family: 'Inter, system-ui, sans-serif' };

const commonScaleOpts = {
  grid: { color: 'rgba(39, 39, 42, 0.5)', lineWidth: 1 },
  border: { display: false },
  ticks: { color: '#52525b', font: { ...chartFont, size: 10 } },
};

const tooltipOpts = {
  backgroundColor: '#18181b',
  borderColor: '#27272a',
  borderWidth: 1,
  titleColor: '#fafafa',
  bodyColor: '#a1a1aa',
  titleFont: { ...chartFont, size: 12, weight: 600 as const },
  bodyFont: { ...chartFont, size: 11 },
  padding: { x: 12, y: 8 },
  cornerRadius: 0,
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  color,
  subValue,
}: {
  label: string;
  value: string | number;
  color?: string;
  subValue?: string;
}) {
  return (
    <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-3 py-2">
      <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold tabular-nums" style={{ color: color ?? '#27272a' }}>
        {value}
      </div>
      {subValue && <div className="text-[9px] text-zinc-500 dark:text-zinc-600 mt-0.5">{subValue}</div>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function NoiseEnvironmentTimeline() {
  const flights = useFlightStore((s) => s.flights);

  const globalDateRange = useFlightStore((s) => s.dateRange);

  const [viewMode, setViewMode] = useState<ViewMode>('trends');
  const [localStart, setLocalStart] = useState(globalDateRange.start);
  const [localEnd, setLocalEnd] = useState(globalDateRange.end);

  // Sync local state when global date range changes
  useEffect(() => {
    setLocalStart(globalDateRange.start);
    setLocalEnd(globalDateRange.end);
  }, [globalDateRange.start, globalDateRange.end]);

  // Range used for computation
  const dateRange = useMemo(
    () => ({ start: localStart, end: localEnd }),
    [localStart, localEnd],
  );

  // Preset range setter
  const applyPreset = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalStart(start.toISOString().split('T')[0]);
    setLocalEnd(end.toISOString().split('T')[0]);
  }, []);

  // Shift range forward/backward
  const shiftRange = useCallback(
    (direction: 'prev' | 'next') => {
      const s = new Date(localStart + 'T12:00:00');
      const e = new Date(localEnd + 'T12:00:00');
      const span = e.getTime() - s.getTime();
      const shift = direction === 'next' ? span : -span;
      const ns = new Date(s.getTime() + shift);
      const ne = new Date(e.getTime() + shift);
      setLocalStart(ns.toISOString().split('T')[0]);
      setLocalEnd(ne.toISOString().split('T')[0]);
    },
    [localStart, localEnd],
  );

  // ─── Computed Data ──────────────────────────────────────────────────

  const dayBuckets = useMemo(
    () => buildDayBuckets(flights, dateRange),
    [flights, dateRange],
  );

  const heatmapData = useMemo(
    () => (viewMode === 'heatmap' ? buildHourCells(flights, dateRange) : null),
    [flights, dateRange, viewMode],
  );

  // Aggregate stats
  const aggStats = useMemo(() => {
    const totalOps = dayBuckets.reduce((s, d) => s + d.totalOps, 0);
    const curfewOps = dayBuckets.reduce((s, d) => s + d.curfewOps, 0);
    const loudOps = dayBuckets.reduce((s, d) => s + d.loudOps, 0);
    const peakNoise = Math.max(...dayBuckets.map((d) => d.peakNoise), 0);
    const avgNoise =
      totalOps > 0
        ? Math.round(
            dayBuckets.reduce((s, d) => s + d.avgNoise * d.totalOps, 0) / totalOps,
          )
        : 0;
    return { totalOps, curfewOps, loudOps, peakNoise, avgNoise };
  }, [dayBuckets]);

  // ─── Trend Charts Data ────────────────────────────────────────────

  const labels = dayBuckets.map((d) => d.label);

  const opsChartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Helicopter',
          data: dayBuckets.map((d) => d.helicopters),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          stack: 'ops',
        },
        {
          label: 'Jet',
          data: dayBuckets.map((d) => d.jets),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          stack: 'ops',
        },
        {
          label: 'Fixed Wing',
          data: dayBuckets.map((d) => d.fixedWing),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          stack: 'ops',
        },
      ],
    }),
    [dayBuckets, labels],
  );

  const noiseChartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Peak dB',
          data: dayBuckets.map((d) => d.peakNoise || null),
          borderColor: 'rgba(239, 68, 68, 0.8)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 1.5,
        },
        {
          label: 'Avg dB',
          data: dayBuckets.map((d) => d.avgNoise || null),
          borderColor: 'rgba(59, 130, 246, 0.8)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 1.5,
        },
      ],
    }),
    [dayBuckets, labels],
  );

  const complianceChartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Curfew Ops',
          data: dayBuckets.map((d) => d.curfewOps),
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          stack: 'compliance',
        },
        {
          label: 'Loud Ops (\u226585 dB)',
          data: dayBuckets.map((d) => d.loudOps),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          stack: 'compliance',
        },
      ],
    }),
    [dayBuckets, labels],
  );

  // ─── Chart Options ────────────────────────────────────────────────

  const stackedBarOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { color: '#71717a', font: { ...chartFont, size: 10 }, boxWidth: 8, padding: 12 },
        },
        tooltip: tooltipOpts,
      },
      scales: {
        x: {
          ...commonScaleOpts,
          stacked: true,
          grid: { display: false },
          border: { color: '#27272a' },
        },
        y: { ...commonScaleOpts, stacked: true, beginAtZero: true },
      },
    }),
    [],
  );

  const lineOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { color: '#71717a', font: { ...chartFont, size: 10 }, boxWidth: 8, padding: 12 },
        },
        tooltip: tooltipOpts,
      },
      scales: {
        x: {
          ...commonScaleOpts,
          grid: { display: false },
          border: { color: '#27272a' },
        },
        y: { ...commonScaleOpts, beginAtZero: false },
      },
    }),
    [],
  );

  // ─── Heatmap ──────────────────────────────────────────────────────

  const heatmapMaxCount = useMemo(() => {
    if (!heatmapData) return 1;
    return Math.max(...heatmapData.cells.map((c) => c.count), 1);
  }, [heatmapData]);

  function heatmapColor(count: number, maxCount: number): string {
    if (count === 0) return 'rgba(39, 39, 42, 0.3)';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'rgba(239, 68, 68, 0.8)';
    if (intensity > 0.5) return 'rgba(245, 158, 11, 0.7)';
    if (intensity > 0.25) return 'rgba(59, 130, 246, 0.6)';
    return 'rgba(59, 130, 246, 0.3)';
  }

  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    return `${h}${i < 12 ? 'a' : 'p'}`;
  });

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5">
              <TrendingUp size={16} className="text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Noise & Environment Impact Timeline
              </h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                Explore aircraft noise and compliance trends over time
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex bg-zinc-200 dark:bg-zinc-800 p-0.5">
            <button
              onClick={() => setViewMode('trends')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                viewMode === 'trends'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <BarChart3 size={10} />
              Trends
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Grid3X3 size={10} />
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* ─── Date Range Picker ──────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3">
        {/* Navigation arrows */}
        <button
          onClick={() => shiftRange('prev')}
          className="p-1.5 bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => shiftRange('next')}
          className="p-1.5 bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>

        {/* Presets */}
        <div className="flex bg-zinc-100/60 dark:bg-zinc-950/60 p-0.5">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="px-3 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />

        {/* Date inputs */}
        <div className="flex items-center gap-2">
          <CalendarDays size={12} className="text-zinc-500 dark:text-zinc-600" />
          <input
            type="date"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            className="px-2 py-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium focus:outline-none focus:border-purple-600 transition-colors"
          />
          <span className="text-zinc-500 dark:text-zinc-600 text-[10px]">&ndash;</span>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            className="px-2 py-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium focus:outline-none focus:border-purple-600 transition-colors"
          />
        </div>

        {/* Range summary */}
        <span className="text-[10px] text-zinc-500 dark:text-zinc-600 ml-auto">
          {dayBuckets.length} days · {aggStats.totalOps} operations
        </span>
      </div>

      {/* ─── Aggregate Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-200/60 dark:bg-zinc-800/60">
        <MiniStat label="Total Ops" value={aggStats.totalOps} />
        <MiniStat label="Est. Avg Noise" value={`${aggStats.avgNoise} dB`} color="#3b82f6" />
        <MiniStat label="Est. Peak Noise" value={`${aggStats.peakNoise} dB`} color="#ef4444" />
        <MiniStat
          label="Curfew Ops"
          value={aggStats.curfewOps}
          color={aggStats.curfewOps > 0 ? '#f59e0b' : '#10b981'}
        />
        <MiniStat
          label="Loud Ops (\u226585 dB)"
          value={aggStats.loudOps}
          color={aggStats.loudOps > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      {/* ─── Content ────────────────────────────────────────────── */}
      <div className="p-5 space-y-6">
        {viewMode === 'trends' && (
          <>
            {/* Operations by Aircraft Type */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Volume2 size={12} className="text-zinc-500 dark:text-zinc-500" />
                <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Daily Operations by Aircraft Type
                </h4>
              </div>
              <div className="h-48">
                <Bar data={opsChartData} options={stackedBarOpts} />
              </div>
            </div>

            {/* Noise Levels Over Time */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Volume2 size={12} className="text-zinc-500 dark:text-zinc-500" />
                <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Daily Noise Levels (dB)
                </h4>
              </div>
              <div className="h-48">
                <Line data={noiseChartData} options={lineOpts} />
              </div>
            </div>

            {/* Curfew & Loud Ops */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Volume2 size={12} className="text-zinc-500 dark:text-zinc-500" />
                <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Daily Curfew & Loud Operations
                </h4>
              </div>
              <div className="h-48">
                <Bar data={complianceChartData} options={stackedBarOpts} />
              </div>
            </div>
          </>
        )}

        {viewMode === 'heatmap' && heatmapData && (
          <>
            {/* Operations Heatmap */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Grid3X3 size={12} className="text-zinc-500 dark:text-zinc-500" />
                <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Operations Heatmap (Date x Hour)
                </h4>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-3 h-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }} />
                    <div className="w-3 h-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }} />
                    <div className="w-3 h-3" style={{ backgroundColor: 'rgba(245, 158, 11, 0.7)' }} />
                    <div className="w-3 h-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
                  </div>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-600">Low → High</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Hour header */}
                  <div className="flex">
                    <div className="w-16 flex-shrink-0" />
                    {hourLabels.map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 text-center text-[8px] pb-1 ${
                          i >= 20 || i < 8 ? 'text-amber-600' : 'text-zinc-600'
                        }`}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {/* Date rows */}
                  {heatmapData.dates.map((date) => (
                    <div key={date} className="flex">
                      <div className="w-16 flex-shrink-0 text-[9px] text-zinc-500 flex items-center pr-1 justify-end">
                        <span className="text-zinc-600 mr-1">{formatDayOfWeek(date)}</span>
                        {formatShortDate(date)}
                      </div>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell = heatmapData.cells.find(
                          (c) => c.date === date && c.hour === hour,
                        );
                        const count = cell?.count ?? 0;
                        return (
                          <div
                            key={hour}
                            className="flex-1 aspect-square m-[1px] relative group"
                            style={{ backgroundColor: heatmapColor(count, heatmapMaxCount) }}
                          >
                            {count > 0 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white/70 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {count}
                              </span>
                            )}
                            {/* Custom tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-[9px] px-2 py-1 whitespace-nowrap rounded shadow-lg">
                                <div className="font-medium">{formatShortDate(date)} {hour}:00–{hour + 1}:00</div>
                                <div>{count} operation{count !== 1 ? 's' : ''}{cell?.avgNoise ? ` · Est. avg ${cell.avgNoise} dB` : ''}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </>
        )}
      </div>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <div className="text-[10px] text-zinc-500 dark:text-zinc-600">
          Showing {formatShortDate(localStart)} – {formatShortDate(localEnd)}
        </div>
        <div className="flex items-center gap-3 text-[9px] text-zinc-500 dark:text-zinc-600">
          <span>Est. noise from EASA/FAA type-certification data at 1,000 ft reference distance</span>
        </div>
      </div>
    </div>
  );
}
