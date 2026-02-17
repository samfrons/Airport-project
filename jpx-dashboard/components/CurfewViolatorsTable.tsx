'use client';

import { useMemo } from 'react';
import { AlertTriangle, Repeat } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import type { Flight } from '@/types/flight';

interface CurfewViolation {
  flight: Flight;
  formattedTime: string;
  isRepeatOffender: boolean;
  violationCount: number;
}

export function CurfewViolatorsTable() {
  const { flights } = useFlightStore();

  const violations = useMemo(() => {
    // Find all curfew violations (9 PM - 7 AM, hours 21-6)
    const curfewFlights = flights.filter(f => {
      const hour = f.operation_hour_et;
      return hour >= 21 || hour < 7;
    });

    // Count violations per tail number to identify repeat offenders
    const tailCounts = new Map<string, number>();
    curfewFlights.forEach(f => {
      const count = tailCounts.get(f.registration) || 0;
      tailCounts.set(f.registration, count + 1);
    });

    // Map to violation objects with repeat offender info
    const violationList: CurfewViolation[] = curfewFlights.map(flight => {
      const count = tailCounts.get(flight.registration) || 1;
      // Use actual_off/actual_on or scheduled_off/scheduled_on based on direction
      const timestamp = flight.direction === 'departure'
        ? (flight.actual_off || flight.scheduled_off)
        : (flight.actual_on || flight.scheduled_on);
      const date = new Date(timestamp || flight.operation_date);
      const formattedTime = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        flight,
        formattedTime,
        isRepeatOffender: count > 1,
        violationCount: count,
      };
    });

    // Sort by time descending (most recent first)
    return violationList.sort((a, b) => {
      const getTime = (f: Flight) => {
        const ts = f.direction === 'departure'
          ? (f.actual_off || f.scheduled_off)
          : (f.actual_on || f.scheduled_on);
        return new Date(ts || f.operation_date).getTime();
      };
      return getTime(b.flight) - getTime(a.flight);
    });
  }, [flights]);

  if (violations.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <div className="text-emerald-500 dark:text-emerald-400 mb-2">
          <AlertTriangle size={24} className="mx-auto opacity-50" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No curfew violations during this period
        </p>
      </div>
    );
  }

  // Count unique repeat offenders
  const repeatOffenderCount = new Set(
    violations.filter(v => v.isRepeatOffender).map(v => v.flight.registration)
  ).size;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {violations.length} Curfew Violations
          </span>
        </div>
        {repeatOffenderCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
            <Repeat size={12} />
            <span>{repeatOffenderCount} repeat offender{repeatOffenderCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Tail #
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Operator
              </th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {violations.slice(0, 20).map((violation, idx) => (
              <tr
                key={`${violation.flight.registration}-${idx}`}
                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                  violation.isRepeatOffender ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                }`}
              >
                <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  {violation.formattedTime}
                </td>
                <td className="px-4 py-2.5">
                  {/* Colors match AIRCRAFT_COLORS: orange=helicopter, blue=jet, teal=fixed_wing */}
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    violation.flight.aircraft_category === 'helicopter'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : violation.flight.aircraft_category === 'jet'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                  }`}>
                    {violation.flight.aircraft_category === 'helicopter' ? 'Heli' :
                     violation.flight.aircraft_category === 'jet' ? 'Jet' : 'Prop'}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {violation.flight.registration || '—'}
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                  {violation.flight.operator || '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {violation.isRepeatOffender ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-medium">
                      <Repeat size={10} />
                      {violation.violationCount}x
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer if more than 20 violations */}
      {violations.length > 20 && (
        <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <span className="text-[11px] text-zinc-500">
            Showing 20 of {violations.length} violations
          </span>
        </div>
      )}
    </div>
  );
}
