'use client';

import { useMemo } from 'react';
import { CURFEW } from '@/lib/constants/curfew';
import type { Flight } from '@/types/flight';

interface HourlyChartProps {
  flights: Flight[];
  currentHour?: number;
}

export function HourlyChart({ flights, currentHour }: HourlyChartProps) {
  // Count operations by hour
  const opsByHour = useMemo(() => {
    const counts = new Array(24).fill(0);
    for (const f of flights) {
      counts[f.operation_hour_et]++;
    }
    return counts;
  }, [flights]);

  const maxOps = Math.max(...opsByHour, 1);

  return (
    <div className="px-4">
      <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
        Today by Hour
      </div>

      {/* Bar chart */}
      <div className="h-[72px] flex items-end gap-0.5">
        {opsByHour.map((ops, hour) => {
          const isCurfew = CURFEW.isCurfewHour(hour);
          const isCurrent = hour === currentHour;
          const height = ops > 0 ? Math.max((ops / maxOps) * 56, 8) : 4;

          let bgColor: string;
          if (isCurrent) {
            bgColor = '#2563eb'; // blue-600 for current hour (aligned with desktop)
          } else if (isCurfew) {
            bgColor = '#FDE68A'; // yellow for curfew
          } else if (ops > 0) {
            bgColor = '#3b82f6'; // blue-500 for normal ops (aligned with desktop)
          } else {
            bgColor = '#E5E7EB'; // gray for no ops
          }

          return (
            <div key={hour} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full transition-all"
                style={{
                  height: `${height}px`,
                  backgroundColor: bgColor,
                  opacity: ops === 0 && !isCurfew ? 0.4 : 1,
                  boxShadow: isCurrent ? `0 0 8px ${bgColor}66` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1 text-[8px] text-tertiary">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>11p</span>
      </div>
    </div>
  );
}
