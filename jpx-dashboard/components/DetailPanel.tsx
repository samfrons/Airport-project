'use client';

import { X, Download, ArrowUpDown, Repeat } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Flight } from '@/types/flight';
import { exportFlightsCsv } from '@/lib/exportUtils';
import { AIRCRAFT_COLORS, getAircraftCategoryColor } from '@/lib/constants/colors';
import { CURFEW } from '@/lib/constants/curfew';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  flights: Flight[];
  dateRange: { start: string; end: string };
  type: 'all' | 'helicopter' | 'curfew' | 'noise';
}

type SortField = 'date' | 'time' | 'type' | 'operator' | 'noise';
type SortDirection = 'asc' | 'desc';

const categoryLabels: Record<string, string> = {
  helicopter: 'Heli',
  jet: 'Jet',
  fixed_wing: 'Prop',
  unknown: '—',
};

export function DetailPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  flights,
  dateRange,
  type,
}: DetailPanelProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Compute operator subtotals for helicopter view
  const operatorStats = useMemo(() => {
    if (type !== 'helicopter') return null;
    const counts = new Map<string, number>();
    for (const f of flights) {
      const op = f.operator || 'Private/Unknown';
      counts.set(op, (counts.get(op) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [flights, type]);

  // Compute repeat offenders for curfew view
  const repeatOffenders = useMemo(() => {
    if (type !== 'curfew') return null;
    const counts = new Map<string, number>();
    for (const f of flights) {
      const key = f.registration || f.ident;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [flights, type]);

  // Sort flights
  const sortedFlights = useMemo(() => {
    return [...flights].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'date':
          aVal = a.operation_date + String(a.operation_hour_et).padStart(2, '0');
          bVal = b.operation_date + String(b.operation_hour_et).padStart(2, '0');
          break;
        case 'time':
          aVal = a.operation_hour_et;
          bVal = b.operation_hour_et;
          break;
        case 'type':
          aVal = a.aircraft_category;
          bVal = b.aircraft_category;
          break;
        case 'operator':
          aVal = a.operator || '';
          bVal = b.operator || '';
          break;
        case 'noise':
          // Simple noise approximation - helicopters are typically louder
          aVal = a.aircraft_category === 'helicopter' ? 3 : a.aircraft_category === 'jet' ? 2 : 1;
          bVal = b.aircraft_category === 'helicopter' ? 3 : b.aircraft_category === 'jet' ? 2 : 1;
          break;
        default:
          aVal = '';
          bVal = '';
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [flights, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    const suffix = type === 'all' ? 'operations' :
                   type === 'helicopter' ? 'helicopters' :
                   type === 'curfew' ? 'curfew-violations' : 'high-noise';
    exportFlightsCsv(flights, dateRange, suffix);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-600 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <Download size={10} />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Operator subtotals for helicopter view */}
        {type === 'helicopter' && operatorStats && operatorStats.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-2">
              Top Operators
            </div>
            <div className="flex flex-wrap gap-2">
              {operatorStats.map(([operator, count]) => (
                <span
                  key={operator}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-medium"
                >
                  {operator.length > 15 ? operator.slice(0, 13) + '...' : operator}
                  <span className="bg-orange-200 dark:bg-orange-800/50 px-1 py-0.5 text-[9px] font-bold">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {flights.length} flights
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-600">
            {dateRange.start} to {dateRange.end}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900/80 backdrop-blur">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th
                  className="px-4 py-2 text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown size={10} className={sortField === 'date' ? 'text-blue-500' : ''} />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center gap-1">
                    Time
                    <ArrowUpDown size={10} className={sortField === 'time' ? 'text-blue-500' : ''} />
                  </div>
                </th>
                <th
                  className="px-4 py-2 text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    <ArrowUpDown size={10} className={sortField === 'type' ? 'text-blue-500' : ''} />
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
                  Tail #
                </th>
                <th
                  className="px-4 py-2 text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300"
                  onClick={() => handleSort('operator')}
                >
                  <div className="flex items-center gap-1">
                    Operator
                    <ArrowUpDown size={10} className={sortField === 'operator' ? 'text-blue-500' : ''} />
                  </div>
                </th>
                {type === 'curfew' && (
                  <th className="px-4 py-2 text-center text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {sortedFlights.map((flight, idx) => {
                const colors = getAircraftCategoryColor(flight.aircraft_category);
                const isRepeatOffender = type === 'curfew' && repeatOffenders &&
                  (repeatOffenders.get(flight.registration || flight.ident) || 0) >= 3;
                const isCurfewHour = CURFEW.isCurfewHour(flight.operation_hour_et);

                return (
                  <tr
                    key={`${flight.fa_flight_id}-${idx}`}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                      isRepeatOffender ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap tabular-nums">
                      {formatDate(flight.operation_date)}
                    </td>
                    <td className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${
                      isCurfewHour ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {formatHour(flight.operation_hour_et)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.primary,
                        }}
                      >
                        {categoryLabels[flight.aircraft_category] || flight.aircraft_category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {flight.registration || flight.ident || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-[150px] truncate">
                      {flight.operator || 'Private'}
                    </td>
                    {type === 'curfew' && (
                      <td className="px-4 py-2.5 text-center">
                        {isRepeatOffender ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-medium">
                            <Repeat size={10} />
                            {repeatOffenders?.get(flight.registration || flight.ident)}x
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {flights.length === 0 && (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-600">
              No flights found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
