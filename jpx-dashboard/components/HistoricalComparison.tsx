'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getNoiseIndex } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';

interface ComparisonMetric {
  label: string;
  current: number;
  prior: number;
  suffix?: string;
}

function formatChange(current: number, prior: number): {
  text: string;
  direction: 'up' | 'down' | 'flat';
  color: string;
} {
  if (prior === 0 && current === 0) return { text: '—', direction: 'flat', color: 'text-zinc-500' };
  if (prior === 0) return { text: 'New', direction: 'up', color: 'text-zinc-500' };
  const pct = ((current - prior) / prior) * 100;
  if (Math.abs(pct) < 1) return { text: '0%', direction: 'flat', color: 'text-zinc-500' };
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(0)}%`,
    direction: pct > 0 ? 'up' : 'down',
    color: pct > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400',
  };
}

export function HistoricalComparison() {
  const { flights, dateRange } = useFlightStore();

  const { metrics, priorLabel, hasPriorData } = useMemo(() => {
    if (flights.length === 0) {
      return { metrics: [], priorLabel: '', hasPriorData: false };
    }

    // Parse current date range
    const startDate = new Date(dateRange.start + 'T00:00:00');
    const endDate = new Date(dateRange.end + 'T23:59:59');
    const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate same range one year prior
    const priorStart = new Date(startDate);
    priorStart.setFullYear(priorStart.getFullYear() - 1);
    const priorEnd = new Date(endDate);
    priorEnd.setFullYear(priorEnd.getFullYear() - 1);
    const priorStartStr = priorStart.toISOString().split('T')[0];
    const priorEndStr = priorEnd.toISOString().split('T')[0];

    const label = `${priorStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

    // Split flights into current and prior
    const currentFlights = flights.filter(f => f.operation_date >= dateRange.start && f.operation_date <= dateRange.end);
    const priorFlights = flights.filter(f => f.operation_date >= priorStartStr && f.operation_date <= priorEndStr);

    const hasData = priorFlights.length > 0;

    const computeMetrics = (flts: Flight[]) => ({
      totalOps: flts.length,
      helicopterOps: flts.filter(f => f.aircraft_category === 'helicopter').length,
      jetOps: flts.filter(f => f.aircraft_category === 'jet').length,
      curfewOps: flts.filter(f => {
        const h = f.operation_hour_et;
        return h >= 21 || h < 7;
      }).length,
      noiseIndex: getNoiseIndex(flts),
    });

    const curr = computeMetrics(currentFlights);
    const prior = computeMetrics(priorFlights);

    const result: ComparisonMetric[] = [
      { label: 'Total Operations', current: curr.totalOps, prior: prior.totalOps },
      { label: 'Helicopter Ops', current: curr.helicopterOps, prior: prior.helicopterOps },
      { label: 'Jet Ops', current: curr.jetOps, prior: prior.jetOps },
      { label: 'Curfew Violations', current: curr.curfewOps, prior: prior.curfewOps },
      { label: 'Noise Index', current: curr.noiseIndex, prior: prior.noiseIndex },
    ];

    return { metrics: result, priorLabel: label, hasPriorData: hasData };
  }, [flights, dateRange]);

  if (flights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Year-over-Year Comparison
          </h3>
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          Current period vs. same dates in {priorLabel || 'prior year'}
        </p>
      </div>

      {!hasPriorData ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            No data available for the prior year comparison period.
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1">
            Historical data needs to be backfilled to enable year-over-year analysis.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {/* Column Headers */}
          <div className="grid grid-cols-4 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Metric</div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-right">Current</div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-right">Prior Year</div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-right">Change</div>
          </div>

          {metrics.map((m) => {
            const change = formatChange(m.current, m.prior);
            return (
              <div key={m.label} className="grid grid-cols-4 px-4 py-2.5 items-center">
                <div className="text-xs text-zinc-700 dark:text-zinc-300">{m.label}</div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums text-right">
                  {m.current.toLocaleString()}{m.suffix || ''}
                </div>
                <div className="text-xs text-zinc-500 tabular-nums text-right">
                  {m.prior.toLocaleString()}{m.suffix || ''}
                </div>
                <div className={`flex items-center justify-end gap-1 text-xs font-medium ${change.color}`}>
                  {change.direction === 'up' && <TrendingUp size={12} />}
                  {change.direction === 'down' && <TrendingDown size={12} />}
                  {change.direction === 'flat' && <Minus size={12} />}
                  <span className="tabular-nums">{change.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="px-4 py-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <p className="text-[9px] text-zinc-400 dark:text-zinc-600">
          For operations metrics, lower numbers generally indicate reduced impact. Noise Index = helicopters + jets &ge;85 dB.
        </p>
      </div>
    </div>
  );
}
