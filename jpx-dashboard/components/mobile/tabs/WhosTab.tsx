'use client';

import { useMemo, useState } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { MobileHeader } from '../MobileHeader';
import { OperatorRow } from '../shared/OperatorRow';
import { CURFEW } from '@/lib/constants/curfew';
import { TYPE_COLORS, UI_COLORS } from '@/lib/mobile/colors';
import type { Flight } from '@/types/flight';

type FilterType = 'All' | 'Heli' | 'Jet' | 'Prop';

interface OperatorData {
  name: string;
  flights: Flight[];
  violations: number;
  primaryCategory: string;
  isRepeat: boolean;
}

export function WhosTab() {
  const { flights, dateRange } = useFlightStore();
  const [filter, setFilter] = useState<FilterType>('All');

  // Group flights by operator
  const operatorData = useMemo(() => {
    const groups = new Map<string, {
      flights: typeof flights;
      violations: number;
      categories: Map<string, number>;
    }>();

    for (const f of flights) {
      const name = f.operator || 'Private / Unknown';
      let group = groups.get(name);

      if (!group) {
        group = { flights: [], violations: 0, categories: new Map() };
        groups.set(name, group);
      }

      group.flights.push(f);

      // Count violations
      if (CURFEW.isCurfewHour(f.operation_hour_et)) {
        group.violations++;
      }

      // Track categories
      const catCount = group.categories.get(f.aircraft_category) || 0;
      group.categories.set(f.aircraft_category, catCount + 1);
    }

    // Convert to array and sort by flight count
    const operators: OperatorData[] = [];
    for (const [name, data] of groups) {
      // Determine primary category
      let primaryCategory = 'fixed_wing';
      let maxCount = 0;
      for (const [cat, count] of data.categories) {
        if (count > maxCount) {
          maxCount = count;
          primaryCategory = cat;
        }
      }

      operators.push({
        name,
        flights: data.flights,
        violations: data.violations,
        primaryCategory,
        isRepeat: data.violations >= 2,
      });
    }

    return operators.sort((a, b) => b.flights.length - a.flights.length);
  }, [flights]);

  // Filter operators
  const filteredOperators = useMemo(() => {
    if (filter === 'All') return operatorData;

    const categoryMap: Record<FilterType, string> = {
      All: '',
      Heli: 'helicopter',
      Jet: 'jet',
      Prop: 'fixed_wing',
    };

    const targetCategory = categoryMap[filter];
    return operatorData.filter((op) =>
      op.flights.some((f) => f.aircraft_category === targetCategory)
    );
  }, [operatorData, filter]);

  // Total operations count
  const totalOps = flights.length;

  // Date range for subtitle
  const dateRangeStr = `${formatShortDate(dateRange.start)}–${formatShortDate(dateRange.end)}`;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <MobileHeader
        title="Who's Flying"
        subtitle={`${dateRangeStr} · ${totalOps} operations`}
      />

      {/* Filter pills */}
      <div className="flex gap-2 px-4 py-3 border-b border-subtle">
        {(['All', 'Heli', 'Jet', 'Prop'] as FilterType[]).map((f) => {
          const isActive = filter === f;
          const color =
            f === 'Heli'
              ? TYPE_COLORS.helicopter
              : f === 'Jet'
                ? TYPE_COLORS.jet
                : f === 'Prop'
                  ? TYPE_COLORS.fixed_wing
                  : UI_COLORS.teal;

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-[10px] font-bold transition-colors"
              style={{
                border: `1px solid ${isActive ? color : '#D1D5DB'}`,
                backgroundColor: isActive ? color : 'transparent',
                color: isActive ? '#fff' : UI_COLORS.grey,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Operator list */}
      <div className="flex-1 overflow-y-auto">
        {filteredOperators.map((op, i) => (
          <div key={op.name}>
            <OperatorRow
              name={op.name}
              flights={op.flights}
              violations={op.violations}
              isRepeat={op.isRepeat}
              primaryCategory={op.primaryCategory}
            />
            {i < filteredOperators.length - 1 && (
              <div className="h-px bg-raised" />
            )}
          </div>
        ))}

        {filteredOperators.length === 0 && (
          <div className="text-center py-8 text-tertiary text-sm">
            No operators found
          </div>
        )}
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
