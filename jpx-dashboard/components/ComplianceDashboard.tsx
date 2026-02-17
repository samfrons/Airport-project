'use client';

import { useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Shield,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Volume2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import { CURFEW } from '@/lib/constants/curfew';
import type { Flight } from '@/types/flight';

// ─── Chart.js Registration ──────────────────────────────────────────────────

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
);

// ─── Types ──────────────────────────────────────────────────────────────────

interface ComplianceScores {
  curfew: number;
  noise: number;
}

interface DailyCompliance {
  date: string;
  curfew: number;
  noise: number;
}

interface CurfewViolator {
  operator: string;
  ident: string;
  date: string;
  hour: number;
  aircraftType: string;
}

interface RegulatoryRow {
  metric: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
  status: 'pass' | 'warn' | 'fail';
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NOISE_THRESHOLD_DB = 85;
const PASSING_SCORE = 80;

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#18181b',
  borderColor: '#27272a',
  borderWidth: 1,
  titleColor: '#fafafa',
  bodyColor: '#a1a1aa',
  titleFont: { family: 'Inter', size: 12, weight: 600 as const },
  bodyFont: { family: 'Inter', size: 11 },
  padding: { x: 12, y: 8 },
  cornerRadius: 0,
};

const CHART_SCALE_STYLE = {
  grid: { color: 'rgba(39, 39, 42, 0.5)', lineWidth: 1 },
  border: { color: '#27272a' },
  ticks: { color: '#52525b', font: { family: 'Inter', size: 10 } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
}

function getNoiseDb(flight: Flight): number {
  const profile = getAircraftNoiseProfile(flight.aircraft_type);
  return flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
}

function groupFlightsByDate(flights: Flight[]): Map<string, Flight[]> {
  const map = new Map<string, Flight[]>();
  for (const f of flights) {
    const existing = map.get(f.operation_date);
    if (existing) {
      existing.push(f);
    } else {
      map.set(f.operation_date, [f]);
    }
  }
  return map;
}

function computeDayScores(dayFlights: Flight[]): ComplianceScores {
  if (dayFlights.length === 0) {
    return { curfew: 100, noise: 100 };
  }

  // Curfew: % not in curfew
  const nonCurfew = dayFlights.filter((f) => !CURFEW.isCurfewHour(f.operation_hour_et)).length;
  const curfew = (nonCurfew / dayFlights.length) * 100;

  // Noise: % below 85dB
  const belowNoise = dayFlights.filter((f) => getNoiseDb(f) < NOISE_THRESHOLD_DB).length;
  const noise = (belowNoise / dayFlights.length) * 100;

  return {
    curfew: Math.round(curfew * 10) / 10,
    noise: Math.round(noise * 10) / 10,
  };
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
}) {
  const color = getScoreColor(score);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-lg font-bold tabular-nums" style={{ color }}>
          {Math.round(score)}%
        </span>
      </div>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-2">
        {getScoreLabel(score)}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ComplianceDashboard() {
  const flights = useFlightStore((s) => s.flights);
  const dateRange = useFlightStore((s) => s.dateRange);

  const flightsByDate = useMemo(() => groupFlightsByDate(flights), [flights]);

  // ─── Compliance scores ──────────────────────────────────────────────────

  const scores = useMemo<ComplianceScores>(() => {
    return computeDayScores(flights);
  }, [flights]);

  const dailyCompliance = useMemo<DailyCompliance[]>(() => {
    const dates = Array.from(flightsByDate.keys()).sort();
    return dates.map((date) => {
      const dayFlights = flightsByDate.get(date) || [];
      const dayScores = computeDayScores(dayFlights);
      return { date, ...dayScores };
    });
  }, [flightsByDate]);

  // ─── Curfew violators ──────────────────────────────────────────────────

  const curfewViolators = useMemo<CurfewViolator[]>(() => {
    return flights
      .filter((f) => CURFEW.isCurfewHour(f.operation_hour_et))
      .map((f) => ({
        operator: f.operator || 'Private',
        ident: f.ident,
        date: f.operation_date,
        hour: f.operation_hour_et,
        aircraftType: f.aircraft_type,
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.hour - a.hour);
  }, [flights]);

  const curfewOperatorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of curfewViolators) {
      counts.set(v.operator, (counts.get(v.operator) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [curfewViolators]);

  // ─── Noise distribution ─────────────────────────────────────────────────

  const noiseDistribution = useMemo(() => {
    const bands = [
      { label: '<60 dB', min: 0, max: 60, count: 0 },
      { label: '60-65 dB', min: 60, max: 65, count: 0 },
      { label: '65-70 dB', min: 65, max: 70, count: 0 },
      { label: '70-75 dB', min: 70, max: 75, count: 0 },
      { label: '75-80 dB', min: 75, max: 80, count: 0 },
      { label: '80-85 dB', min: 80, max: 85, count: 0 },
      { label: '85-90 dB', min: 85, max: 90, count: 0 },
      { label: '90+ dB', min: 90, max: Infinity, count: 0 },
    ];

    for (const f of flights) {
      const db = getNoiseDb(f);
      const band = bands.find((b) => db >= b.min && db < b.max);
      if (band) band.count++;
    }

    return bands;
  }, [flights]);

  // ─── Regulatory summary ─────────────────────────────────────────────────

  const regulatoryRows = useMemo<RegulatoryRow[]>(() => {
    const totalFlights = flights.length;
    if (totalFlights === 0) return [];

    const curfewViolationCount = curfewViolators.length;
    const curfewRate = ((totalFlights - curfewViolationCount) / totalFlights) * 100;
    const noiseExceedances = flights.filter((f) => getNoiseDb(f) >= NOISE_THRESHOLD_DB).length;

    // Compute trend from first half vs second half of date range
    const dates = Array.from(flightsByDate.keys()).sort();
    const midIdx = Math.floor(dates.length / 2);
    const firstHalfDates = dates.slice(0, midIdx);
    const secondHalfDates = dates.slice(midIdx);

    const firstHalfCurfew = firstHalfDates.reduce((sum, d) => {
      const df = flightsByDate.get(d) || [];
      return sum + df.filter((f) => CURFEW.isCurfewHour(f.operation_hour_et)).length;
    }, 0);
    const secondHalfCurfew = secondHalfDates.reduce((sum, d) => {
      const df = flightsByDate.get(d) || [];
      return sum + df.filter((f) => CURFEW.isCurfewHour(f.operation_hour_et)).length;
    }, 0);

    const curfewTrend: 'up' | 'down' | 'flat' =
      secondHalfCurfew < firstHalfCurfew ? 'down' : secondHalfCurfew > firstHalfCurfew ? 'up' : 'flat';

    // Count repeat offenders (operators with 3+ curfew violations)
    const repeatOffenders = curfewOperatorCounts.filter(([, count]) => count >= 3).length;

    return [
      {
        metric: 'Curfew Compliance Rate',
        value: `${curfewRate.toFixed(1)}%`,
        trend: curfewTrend,
        status: curfewRate >= 95 ? 'pass' : curfewRate >= 85 ? 'warn' : 'fail',
      },
      {
        metric: 'Noise Exceedance Count (Est. ≥85 dB)',
        value: `${noiseExceedances} flights`,
        trend: noiseExceedances === 0 ? 'flat' : 'up',
        status: noiseExceedances === 0 ? 'pass' : noiseExceedances <= 5 ? 'warn' : 'fail',
      },
      {
        metric: 'Repeat Offenders (3+ violations)',
        value: `${repeatOffenders} operators`,
        trend: repeatOffenders === 0 ? 'flat' : 'up',
        status: repeatOffenders === 0 ? 'pass' : repeatOffenders <= 2 ? 'warn' : 'fail',
      },
    ];
  }, [flights, curfewViolators, curfewOperatorCounts, flightsByDate]);

  // ─── Export handler ─────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const header = [
      'Metric',
      'Value',
      'Status',
    ];

    const scoreRows = [
      ['Curfew Compliance', `${Math.round(scores.curfew)}%`, ''],
      ['Noise Compliance (Est.)', `${Math.round(scores.noise)}%`, ''],
      ['', '', ''],
      ['--- Regulatory Summary ---', '', ''],
    ];

    const regRows = regulatoryRows.map((r) => [r.metric, r.value, r.status.toUpperCase()]);

    const violatorHeader = ['', '', ''];
    const violatorSectionHeader = ['--- Curfew Violators ---', '', ''];
    const curfewHeader = ['Operator', 'Ident', 'Date / Hour'];
    const curfewRows = curfewViolators.slice(0, 50).map((v) => [
      v.operator,
      v.ident,
      `${v.date} ${v.hour}:00 ET`,
    ]);

    const allRows = [
      [`KJPX Compliance Report — ${dateRange.start} to ${dateRange.end}`],
      [`Generated: ${new Date().toISOString()}`],
      [''],
      header,
      ...scoreRows,
      ...regRows,
      violatorHeader,
      violatorSectionHeader,
      curfewHeader,
      ...curfewRows,
    ];

    downloadCsv(`kjpx-compliance-${dateRange.start}-to-${dateRange.end}.csv`, allRows);
  }, [scores, regulatoryRows, curfewViolators, dateRange]);

  // ─── Chart data: Compliance Trend ───────────────────────────────────────

  const trendChartData = useMemo(() => {
    const labels = dailyCompliance.map((d) => {
      const parts = d.date.split('-');
      return `${parts[1]}/${parts[2]}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Curfew',
          data: dailyCompliance.map((d) => d.curfew),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
          order: 1,
        },
        {
          label: 'Noise (Est.)',
          data: dailyCompliance.map((d) => d.noise),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
          order: 2,
        },
      ],
    };
  }, [dailyCompliance]);

  const trendChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: '#71717a',
            font: { family: 'Inter', size: 10 },
            boxWidth: 12,
            boxHeight: 2,
            padding: 12,
            usePointStyle: false,
          },
        },
        tooltip: {
          ...CHART_TOOLTIP_STYLE,
          displayColors: true,
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
        annotation: {
          annotations: {
            passingLine: {
              type: 'line' as const,
              yMin: PASSING_SCORE,
              yMax: PASSING_SCORE,
              borderColor: 'rgba(34, 197, 94, 0.4)',
              borderWidth: 1,
              borderDash: [6, 4],
              label: {
                display: true,
                content: 'Passing (80)',
                position: 'start' as const,
                color: '#22c55e',
                backgroundColor: 'rgba(9, 9, 11, 0.8)',
                font: { family: 'Inter', size: 9 },
                padding: 3,
              },
            },
            passingArea: {
              type: 'box' as const,
              yMin: PASSING_SCORE,
              yMax: 100,
              backgroundColor: 'rgba(34, 197, 94, 0.04)',
              borderWidth: 0,
            },
          },
        },
      },
      scales: {
        x: {
          ...CHART_SCALE_STYLE,
          grid: { display: false },
        },
        y: {
          ...CHART_SCALE_STYLE,
          min: 0,
          max: 100,
          ticks: { ...CHART_SCALE_STYLE.ticks, stepSize: 20, callback: (v: any) => `${v}%` },
        },
      },
    }),
    [],
  );

  // ─── Chart data: Curfew Doughnut ────────────────────────────────────────

  const curfewDoughnutData = useMemo(() => {
    const curfewCount = curfewViolators.length;
    const nonCurfewCount = flights.length - curfewCount;
    return {
      labels: ['Outside Curfew', 'During Curfew'],
      datasets: [
        {
          data: [nonCurfewCount, curfewCount],
          backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(245, 158, 11, 0.7)'],
          hoverBackgroundColor: ['rgba(34, 197, 94, 0.9)', 'rgba(245, 158, 11, 0.9)'],
          borderColor: ['rgba(34, 197, 94, 0.3)', 'rgba(245, 158, 11, 0.3)'],
          borderWidth: 1,
        },
      ],
    };
  }, [flights, curfewViolators]);

  const curfewDoughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            color: '#71717a',
            font: { family: 'Inter', size: 10 },
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
          },
        },
        tooltip: {
          ...CHART_TOOLTIP_STYLE,
          displayColors: true,
          callbacks: {
            label: (ctx: any) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
              return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
            },
          },
        },
      },
    }),
    [],
  );

  // ─── Chart data: Curfew Offenders Bar ───────────────────────────────────

  const curfewBarData = useMemo(() => {
    return {
      labels: curfewOperatorCounts.map(([op]) => op.length > 18 ? op.slice(0, 16) + '...' : op),
      datasets: [
        {
          label: 'Curfew Violations',
          data: curfewOperatorCounts.map(([, count]) => count),
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          hoverBackgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderWidth: 0,
          borderSkipped: false,
        },
      ],
    };
  }, [curfewOperatorCounts]);

  const curfewBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      plugins: {
        legend: { display: false },
        tooltip: { ...CHART_TOOLTIP_STYLE, displayColors: false },
      },
      scales: {
        x: {
          ...CHART_SCALE_STYLE,
          grid: { ...CHART_SCALE_STYLE.grid },
          ticks: { ...CHART_SCALE_STYLE.ticks, stepSize: 1 },
          beginAtZero: true,
        },
        y: {
          ...CHART_SCALE_STYLE,
          grid: { display: false },
          ticks: { ...CHART_SCALE_STYLE.ticks, font: { family: 'Inter', size: 9 } },
        },
      },
    }),
    [],
  );

  // ─── Chart data: Noise Histogram ────────────────────────────────────────

  const noiseHistData = useMemo(() => {
    const colors = noiseDistribution.map((b) => {
      if (b.min >= 85) return 'rgba(239, 68, 68, 0.7)';
      if (b.min >= 75) return 'rgba(249, 115, 22, 0.7)';
      if (b.min >= 65) return 'rgba(234, 179, 8, 0.7)';
      return 'rgba(34, 197, 94, 0.7)';
    });

    return {
      labels: noiseDistribution.map((b) => b.label),
      datasets: [
        {
          label: 'Flights',
          data: noiseDistribution.map((b) => b.count),
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => c.replace('0.7', '0.9')),
          borderWidth: 0,
          borderSkipped: false,
        },
      ],
    };
  }, [noiseDistribution]);

  const noiseHistOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_TOOLTIP_STYLE,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const total = flights.length;
              const pct = total > 0 ? ((ctx.parsed.y / total) * 100).toFixed(1) : '0';
              return `${ctx.parsed.y} flights (${pct}%)`;
            },
          },
        },
        annotation: {
          annotations: {
            line65: {
              type: 'line' as const,
              xMin: 2.5,
              xMax: 2.5,
              borderColor: 'rgba(234, 179, 8, 0.5)',
              borderWidth: 1,
              borderDash: [4, 3],
              label: {
                display: true,
                content: '65 dB',
                position: 'start' as const,
                color: '#eab308',
                backgroundColor: 'rgba(9, 9, 11, 0.8)',
                font: { family: 'Inter', size: 8 },
                padding: 2,
              },
            },
            line75: {
              type: 'line' as const,
              xMin: 4.5,
              xMax: 4.5,
              borderColor: 'rgba(249, 115, 22, 0.5)',
              borderWidth: 1,
              borderDash: [4, 3],
              label: {
                display: true,
                content: '75 dB',
                position: 'start' as const,
                color: '#f97316',
                backgroundColor: 'rgba(9, 9, 11, 0.8)',
                font: { family: 'Inter', size: 8 },
                padding: 2,
              },
            },
            line85: {
              type: 'line' as const,
              xMin: 6.5,
              xMax: 6.5,
              borderColor: 'rgba(239, 68, 68, 0.5)',
              borderWidth: 1,
              borderDash: [4, 3],
              label: {
                display: true,
                content: '85 dB',
                position: 'start' as const,
                color: '#ef4444',
                backgroundColor: 'rgba(9, 9, 11, 0.8)',
                font: { family: 'Inter', size: 8 },
                padding: 2,
              },
            },
          },
        },
      },
      scales: {
        x: {
          ...CHART_SCALE_STYLE,
          grid: { display: false },
        },
        y: {
          ...CHART_SCALE_STYLE,
          beginAtZero: true,
          ticks: { ...CHART_SCALE_STYLE.ticks, stepSize: undefined },
        },
      },
    }),
    [flights.length],
  );

  // ─── Noise band percentages ─────────────────────────────────────────────

  const noiseBandPcts = useMemo(() => {
    const total = flights.length;
    if (total === 0) return [];
    return noiseDistribution.map((b) => ({
      label: b.label,
      count: b.count,
      pct: ((b.count / total) * 100).toFixed(1),
    }));
  }, [flights.length, noiseDistribution]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (flights.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <Shield size={24} className="text-zinc-500 dark:text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-zinc-600 dark:text-zinc-500">No flight data available for compliance analysis.</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1">
          Adjust the date range or wait for data to load.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: Compliance Scores (Separate metrics, not combined)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5">
                <Shield size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Compliance Metrics</h3>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                  {dateRange.start} to {dateRange.end} — {flights.length} flights analyzed
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium border border-zinc-300/40 dark:border-zinc-700/40 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <Download size={10} />
              Export Report
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreBar
            label="Curfew Compliance"
            score={scores.curfew}
            icon={<Clock size={16} className="text-amber-500" />}
          />
          <ScoreBar
            label="Noise Compliance (Est.)"
            score={scores.noise}
            icon={<Volume2 size={16} className="text-red-500" />}
          />
        </div>

        <div className="px-5 pb-4">
          <div className="text-[10px] text-zinc-500 dark:text-zinc-600 bg-zinc-100/50 dark:bg-zinc-800/50 p-3 border border-zinc-200/50 dark:border-zinc-700/50">
            <strong>Note:</strong> Noise values are estimates based on aircraft type certification data.
            Actual ground-level noise varies with altitude, distance, and atmospheric conditions.
            No physical noise monitors are currently installed at KJPX.
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: Compliance Trend Chart
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5">
              <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Compliance Trend</h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                Daily compliance scores over the selected period
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="h-64">
            <Line data={trendChartData} options={trendChartOptions} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: Curfew Compliance
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5">
              <Clock size={16} className="text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Curfew Compliance</h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                Voluntary curfew (9 PM – 7 AM ET) adherence — {curfewViolators.length} violations detected
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doughnut */}
          <div>
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-3">
              Curfew Distribution
            </div>
            <div className="h-48">
              <Doughnut data={curfewDoughnutData} options={curfewDoughnutOptions} />
            </div>
          </div>

          {/* Worst offenders bar */}
          <div>
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-3">
              Worst Offending Operators
            </div>
            {curfewOperatorCounts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-600">
                No curfew violations
              </div>
            ) : (
              <div className="h-48">
                <Bar data={curfewBarData} options={curfewBarOptions} />
              </div>
            )}
          </div>

          {/* Violators list */}
          <div>
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-3">
              Curfew Violators
            </div>
            {curfewViolators.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-600">
                No curfew violations detected
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {curfewViolators.slice(0, 30).map((v, i) => (
                  <div
                    key={`${v.ident}-${v.date}-${v.hour}-${i}`}
                    className="flex items-center justify-between px-2 py-1.5 bg-zinc-100/40 dark:bg-zinc-950/40 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-amber-500/60 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">{v.ident}</span>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 ml-1.5">{v.aircraftType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-500 tabular-nums">{v.date}</span>
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-1.5 tabular-nums">{v.hour}:00</span>
                    </div>
                  </div>
                ))}
                {curfewViolators.length > 30 && (
                  <div className="text-center text-[9px] text-zinc-500 dark:text-zinc-600 py-1">
                    +{curfewViolators.length - 30} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: Noise Compliance
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-1.5">
              <Volume2 size={16} className="text-red-600 dark:text-red-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Noise Compliance (Estimated)</h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                Estimated noise distribution across all flights — thresholds at 65, 75, and 85 dB
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Histogram */}
          <div className="lg:col-span-2">
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-3">
              Est. Noise Level Distribution
            </div>
            <div className="h-56">
              <Bar data={noiseHistData} options={noiseHistOptions} />
            </div>
          </div>

          {/* Band percentages */}
          <div>
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-3">
              Flights by Est. Noise Band
            </div>
            <div className="space-y-1.5">
              {noiseBandPcts.map((b) => {
                const isHigh = parseFloat(b.pct) > 0 && (b.label.includes('85') || b.label.includes('90'));
                return (
                  <div
                    key={b.label}
                    className="flex items-center justify-between px-2 py-1.5 bg-zinc-100/40 dark:bg-zinc-950/40"
                  >
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400">{b.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.min(parseFloat(b.pct), 100)}%`,
                            backgroundColor: isHigh ? '#ef4444' : '#3b82f6',
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums font-medium text-zinc-700 dark:text-zinc-300 w-8 text-right">
                        {b.pct}%
                      </span>
                      <span className="text-[9px] tabular-nums text-zinc-500 dark:text-zinc-600 w-6 text-right">
                        {b.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: Regulatory Summary Table
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Regulatory Summary</h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                Key compliance metrics with trend and status indicators
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200/60 dark:border-zinc-800/60">
                <th className="px-5 py-3 text-left text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-5 py-3 text-left text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Current Period
                </th>
                <th className="px-5 py-3 text-center text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-5 py-3 text-center text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {regulatoryRows.map((row) => (
                <tr
                  key={row.metric}
                  className="border-b border-zinc-200/30 dark:border-zinc-800/30 hover:bg-zinc-100/20 dark:hover:bg-zinc-800/20 transition-colors"
                >
                  <td className="px-5 py-3 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                    {row.metric}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">
                    {row.value}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {row.trend === 'up' && (
                      <div className="inline-flex items-center gap-1 text-red-400">
                        <TrendingUp size={12} />
                        <span className="text-[9px]">UP</span>
                      </div>
                    )}
                    {row.trend === 'down' && (
                      <div className="inline-flex items-center gap-1 text-emerald-400">
                        <TrendingDown size={12} />
                        <span className="text-[9px]">DOWN</span>
                      </div>
                    )}
                    {row.trend === 'flat' && (
                      <div className="inline-flex items-center gap-1 text-zinc-500">
                        <Minus size={12} />
                        <span className="text-[9px]">FLAT</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {row.status === 'pass' && (
                      <div className="inline-flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-wider">
                          Pass
                        </span>
                      </div>
                    )}
                    {row.status === 'warn' && (
                      <div className="inline-flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-[9px] font-medium text-amber-400 uppercase tracking-wider">
                          Warn
                        </span>
                      </div>
                    )}
                    {row.status === 'fail' && (
                      <div className="inline-flex items-center gap-1.5">
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-[9px] font-medium text-red-400 uppercase tracking-wider">
                          Fail
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {regulatoryRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[11px] text-zinc-500 dark:text-zinc-600">
                    No data available for regulatory analysis
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
