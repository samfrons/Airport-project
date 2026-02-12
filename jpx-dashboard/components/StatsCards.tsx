'use client';

import { useMemo } from 'react';
import { PlaneLanding, PlaneTakeoff, Gauge, ShieldAlert, TreePine } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { evaluateAllFlights } from '@/lib/biodiversityViolationEngine';
import { getImpactSeverityColor } from '@/types/biodiversity';

export function StatsCards() {
  const { flights } = useFlightStore();

  const totalFlights = flights.length;
  const arrivals = flights.filter(f => f.direction === 'arrival').length;
  const departures = flights.filter(f => f.direction === 'departure').length;
  const helicopters = flights.filter(f => f.aircraft_category === 'helicopter').length;
  const jets = flights.filter(f => f.aircraft_category === 'jet').length;
  const fixedWing = flights.filter(f => f.aircraft_category === 'fixed_wing').length;
  const curfewOps = flights.filter(f => f.is_curfew_period).length;
  const uniqueAircraft = new Set(flights.map(f => f.registration)).size;

  const thresholds = useFlightStore((s) => s.thresholds);
  const bioViolations = useMemo(() => evaluateAllFlights(flights, thresholds), [flights, thresholds]);
  const bioViolationCount = bioViolations.length;
  const criticalCount = bioViolations.filter(v => v.overallSeverity === 'critical').length;
  const protectedSpeciesCount = bioViolations.filter(v =>
    v.speciesAffected.some(s => s.conservationStatus)
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800">
      {/* Total Operations */}
      <div className="bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Total Operations</p>
            <p className="stat-number mt-2">{totalFlights}</p>
          </div>
          <Gauge className="text-zinc-300 dark:text-zinc-700" size={20} strokeWidth={1.5} />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-6">
          <div className="flex items-center gap-2">
            <PlaneLanding size={13} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.8} />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{arrivals}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-600">arr</span>
          </div>
          <div className="flex items-center gap-2">
            <PlaneTakeoff size={13} className="text-blue-500 dark:text-blue-400" strokeWidth={1.8} />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{departures}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-600">dep</span>
          </div>
        </div>
      </div>

      {/* Aircraft Breakdown */}
      <div className="bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Unique Aircraft</p>
            <p className="stat-number mt-2">{uniqueAircraft}</p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{helicopters}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-600">heli</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{jets}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-600">jet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{fixedWing}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-600">prop</span>
          </div>
        </div>
      </div>

      {/* Curfew Operations */}
      <div className={`bg-white dark:bg-zinc-900 p-6 ${curfewOps > 0 ? 'border-l-2 border-l-amber-500' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Curfew Period</p>
            <p className="stat-number mt-2">{curfewOps}</p>
          </div>
          <ShieldAlert
            className={curfewOps > 0 ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'}
            size={20}
            strokeWidth={1.5}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-600">8 PM - 8 AM ET</span>
            <span className={`text-sm font-semibold tabular-nums ${
              curfewOps > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {totalFlights > 0 ? ((curfewOps / totalFlights) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      </div>

      {/* Biodiversity Violations */}
      <div className={`bg-white dark:bg-zinc-900 p-6 ${criticalCount > 0 ? 'border-l-2' : ''}`} style={criticalCount > 0 ? { borderLeftColor: getImpactSeverityColor('critical') } : {}}>
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Wildlife Violations</p>
            <p className="stat-number mt-2">{bioViolationCount}</p>
          </div>
          <TreePine
            className={bioViolationCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-300 dark:text-zinc-700'}
            size={20}
            strokeWidth={1.5}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="text-[10px] text-red-500 dark:text-red-400 tabular-nums font-medium">{criticalCount} critical</span>
              )}
              {protectedSpeciesCount > 0 && (
                <span className="text-[10px] text-amber-500 dark:text-amber-400 tabular-nums font-medium">{protectedSpeciesCount} protected</span>
              )}
              {bioViolationCount === 0 && (
                <span className="text-xs text-zinc-500 dark:text-zinc-600">No violations</span>
              )}
            </div>
            <span className={`text-sm font-semibold tabular-nums ${
              bioViolationCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {totalFlights > 0 ? ((bioViolationCount / totalFlights) * 100).toFixed(0) : '0'}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
