'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plane } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import { getDbLevelColor } from './NoiseCalculator';

interface AircraftTypeStats {
  aircraftType: string;
  count: number;
  avgDb: number;
  operators: string[];
}

interface CategoryStats {
  category: string;
  label: string;
  count: number;
  avgDb: number;
  aircraftTypes: AircraftTypeStats[];
}

const CATEGORY_LABELS: Record<string, string> = {
  helicopter: 'Helicopters',
  jet: 'Jets',
  fixed_wing: 'Fixed Wing',
  unknown: 'Unknown',
};

const CATEGORY_ORDER = ['helicopter', 'jet', 'fixed_wing', 'unknown'];

export function AircraftBreakdownPanel() {
  const { flights } = useFlightStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['helicopter', 'jet', 'fixed_wing'])
  );

  const categoryStats = useMemo(() => {
    const stats: Record<string, CategoryStats> = {};

    flights.forEach((flight) => {
      const category = flight.aircraft_category;
      const avgDb = getNoiseDb(flight);

      if (!stats[category]) {
        stats[category] = {
          category,
          label: CATEGORY_LABELS[category] || category,
          count: 0,
          avgDb: 0,
          aircraftTypes: [],
        };
      }

      stats[category].count++;

      // Find or create aircraft type entry
      let typeStats = stats[category].aircraftTypes.find(
        (t) => t.aircraftType === flight.aircraft_type
      );
      if (!typeStats) {
        typeStats = {
          aircraftType: flight.aircraft_type,
          count: 0,
          avgDb,
          operators: [],
        };
        stats[category].aircraftTypes.push(typeStats);
      }
      typeStats.count++;
      if (flight.operator && !typeStats.operators.includes(flight.operator)) {
        typeStats.operators.push(flight.operator);
      }
    });

    // Calculate category averages
    Object.values(stats).forEach((cat) => {
      if (cat.aircraftTypes.length > 0) {
        cat.avgDb =
          cat.aircraftTypes.reduce((sum, t) => sum + t.avgDb * t.count, 0) / cat.count;
      }
      // Sort by dB descending
      cat.aircraftTypes.sort((a, b) => b.avgDb - a.avgDb);
    });

    return CATEGORY_ORDER.filter((c) => stats[c]).map((c) => stats[c]);
  }, [flights]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (flights.length === 0) {
    return null;
  }

  // Max dB for bar scaling
  const maxDb = 95;
  const minDb = 65;

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-3 w-full">
      <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
        <Plane size={10} />
        Aircraft Type Breakdown
      </div>

      <div className="space-y-2">
        {categoryStats.map((cat) => (
          <div key={cat.category}>
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(cat.category)}
              className="w-full flex items-center justify-between px-2 py-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedCategories.has(cat.category) ? (
                  <ChevronDown size={12} className="text-zinc-500" />
                ) : (
                  <ChevronRight size={12} className="text-zinc-500" />
                )}
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {cat.label}
                </span>
                <span className="text-[10px] text-zinc-500">({cat.count})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">avg</span>
                <span
                  className="text-[11px] font-medium tabular-nums"
                  style={{ color: getDbLevelColor(cat.avgDb) }}
                >
                  {Math.round(cat.avgDb)} dB
                </span>
              </div>
            </button>

            {/* Aircraft Types List */}
            {expandedCategories.has(cat.category) && (
              <div className="mt-1 space-y-1 pl-4">
                {cat.aircraftTypes.map((type) => {
                  const barWidth = ((type.avgDb - minDb) / (maxDb - minDb)) * 100;
                  return (
                    <div key={type.aircraftType} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400 w-10 font-mono">
                        {type.aircraftType}
                      </span>
                      <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 relative">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.max(5, Math.min(100, barWidth))}%`,
                            backgroundColor: getDbLevelColor(type.avgDb),
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 w-4 text-right tabular-nums">
                        {type.count}
                      </span>
                      <span
                        className="text-[10px] font-medium w-12 text-right tabular-nums"
                        style={{ color: getDbLevelColor(type.avgDb) }}
                      >
                        {Math.round(type.avgDb)} dB
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[10px]">
        <span className="text-zinc-500 dark:text-zinc-600">Total Operations</span>
        <span className="text-zinc-600 dark:text-zinc-400 tabular-nums">{flights.length}</span>
      </div>
    </div>
  );
}
