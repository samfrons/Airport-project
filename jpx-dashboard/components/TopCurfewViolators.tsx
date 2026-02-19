'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';

type RankMode = 'operator' | 'tailNumber';

export function TopCurfewViolators() {
  const { flights } = useFlightStore();
  const [mode, setMode] = useState<RankMode>('operator');

  const curfewFlights = useMemo(() => {
    return flights.filter(f => {
      const hour = f.operation_hour_et;
      return hour >= 21 || hour < 7;
    });
  }, [flights]);

  const rankByOperator = useMemo(() => {
    const counts = new Map<string, { count: number; lastDate: string }>();
    for (const f of curfewFlights) {
      const key = f.operator || 'Private/Unknown';
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
        if (f.operation_date > existing.lastDate) existing.lastDate = f.operation_date;
      } else {
        counts.set(key, { count: 1, lastDate: f.operation_date });
      }
    }
    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [curfewFlights]);

  const rankByTail = useMemo(() => {
    const counts = new Map<string, { count: number; lastDate: string; type: string }>();
    for (const f of curfewFlights) {
      const key = f.registration || f.ident || 'Unknown';
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
        if (f.operation_date > existing.lastDate) existing.lastDate = f.operation_date;
      } else {
        counts.set(key, { count: 1, lastDate: f.operation_date, type: f.aircraft_type });
      }
    }
    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [curfewFlights]);

  const rankings = mode === 'operator' ? rankByOperator : rankByTail;
  const maxCount = rankings.length > 0 ? rankings[0].count : 1;

  if (curfewFlights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Top Curfew Violators
              </h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                {curfewFlights.length} curfew-period operations (9 PM – 7 AM ET)
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5">
            <button
              onClick={() => setMode('operator')}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                mode === 'operator'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              By Operator
            </button>
            <button
              onClick={() => setMode('tailNumber')}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                mode === 'tailNumber'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              By Tail Number
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-2">
          {rankings.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 w-5 text-right tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {'type' in item && (
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-600">
                        {item.type as string}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 tabular-nums">
                      last {item.lastDate}
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums ${
                      item.count >= 3 ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {item.count}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.count >= 3 ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
                    }`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {rankings.length === 0 && (
          <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-600 py-4">
            No curfew violations in the selected period
          </p>
        )}
      </div>
    </div>
  );
}
