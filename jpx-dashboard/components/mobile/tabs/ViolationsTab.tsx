'use client';

import { useMemo } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { MobileHeader } from '../MobileHeader';
import { ViolationRow } from '../shared/ViolationRow';
import { CURFEW } from '@/lib/constants/curfew';

interface ViolationsTabProps {
  onFileComplaint?: () => void;
}

export function ViolationsTab({ onFileComplaint }: ViolationsTabProps) {
  const { flights } = useFlightStore();

  // Filter to curfew violations
  const violations = useMemo(() => {
    return flights
      .filter((f) => CURFEW.isCurfewHour(f.operation_hour_et))
      .sort((a, b) => {
        // Sort by date descending, then by time
        const dateCompare = b.operation_date.localeCompare(a.operation_date);
        if (dateCompare !== 0) return dateCompare;
        const aTime = a.actual_on || a.actual_off || '';
        const bTime = b.actual_on || b.actual_off || '';
        return bTime.localeCompare(aTime);
      });
  }, [flights]);

  // Count repeat violators (aircraft with 2+ violations)
  const repeatViolators = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of violations) {
      const key = v.registration || v.ident || 'unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [violations]);

  // Calculate compliance percentage
  const totalOps = flights.length;
  const complianceRate = totalOps > 0
    ? ((totalOps - violations.length) / totalOps) * 100
    : 100;

  // Count unknown operators
  const unknownCount = violations.filter(
    (v) => !v.operator || v.operator === 'Private/Unknown'
  ).length;

  // Get current month for subtitle
  const currentMonth = new Date().toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <MobileHeader
        title="Curfew Violations"
        subtitle={`${CURFEW.DISPLAY_STRING} · ${currentMonth}`}
      />

      {/* Summary panel */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-3">
        <div className="flex gap-4 items-center">
          {/* Violation count */}
          <div>
            <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
              {violations.length}
            </div>
            <div className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold">
              violations
            </div>
          </div>

          {/* Compliance bar */}
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-amber-700 dark:text-amber-400 mb-1">
              <span>Curfew compliance</span>
              <span className="font-bold">{complianceRate.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-amber-200 dark:bg-amber-800">
              <div
                className="h-full bg-amber-600 dark:bg-amber-500 transition-all"
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>
        </div>

        {unknownCount > 0 && (
          <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> {unknownCount} of {violations.length} violations
            have no identified operator.
          </div>
        )}
      </div>

      {/* Violation list */}
      <div className="flex-1 overflow-y-auto">
        {violations.map((v) => {
          const key = v.registration || v.ident || 'unknown';
          const isRepeat = (repeatViolators.get(key) || 0) > 1;

          return (
            <ViolationRow
              key={v.id}
              flight={v}
              isRepeat={isRepeat}
              onReport={onFileComplaint}
            />
          );
        })}

        {violations.length === 0 && (
          <div className="text-center py-8 text-tertiary text-sm">
            No curfew violations in the selected period
          </div>
        )}
      </div>
    </div>
  );
}
