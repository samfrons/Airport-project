'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getTypeColor } from '@/lib/mobile/colors';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';

interface OperatorRowProps {
  name: string;
  flights: Flight[];
  violations: number;
  isRepeat?: boolean;
  primaryCategory: string;
}

export function OperatorRow({
  name,
  flights,
  violations,
  isRepeat,
  primaryCategory,
}: OperatorRowProps) {
  const [expanded, setExpanded] = useState(false);

  const typeColor = getTypeColor(primaryCategory);
  const flightCount = flights.length;

  // Get unique aircraft types operated
  const types = [...new Set(flights.map((f) => f.aircraft_category))];
  const typeLabels = types
    .map((t) => {
      if (t === 'helicopter') return 'Heli';
      if (t === 'jet') return 'Jet';
      return 'Prop';
    })
    .join(', ');

  // Get recent flights for expanded view
  const recentFlights = flights.slice(0, 3);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
          expanded ? 'bg-green-50 dark:bg-green-900/20' : 'bg-surface hover:bg-raised'
        }`}
      >
        {/* Type indicator bar */}
        <div
          className="w-1 h-9 flex-shrink-0"
          style={{ backgroundColor: typeColor }}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary truncate">
              {name}
            </span>
            {isRepeat && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-orange-500 text-white">
                Repeat
              </span>
            )}
          </div>
          <div className="text-[10px] text-tertiary mt-0.5">{typeLabels}</div>
        </div>

        {/* Flight count */}
        <div className="text-right">
          <div className="text-sm font-extrabold text-primary tabular-nums">
            {flightCount}
          </div>
          <div className="text-[9px] text-tertiary">flights</div>
        </div>

        {/* Violations badge */}
        {violations > 0 && (
          <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            ⚠️ {violations}
          </span>
        )}

        {/* Chevron */}
        {expanded ? (
          <ChevronUp size={14} className="text-tertiary flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-tertiary flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="bg-green-50 dark:bg-green-900/20 px-4 py-3 border-t border-green-200 dark:border-green-800">
          <div className="text-[10px] text-tertiary mb-2">Recent flights</div>
          {recentFlights.map((f) => (
            <div
              key={f.id}
              className="text-[10px] text-primary py-1 border-b border-green-200 dark:border-green-800 last:border-0"
            >
              {f.registration || f.ident} · {f.operation_date}{' '}
              {formatTime(f.actual_on || f.actual_off)} · ~{getNoiseDb(f)} dB
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });
  } catch {
    return '';
  }
}
