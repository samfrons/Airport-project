'use client';

import { useMemo, useState } from 'react';
import { PlaneLanding, PlaneTakeoff, Gauge, ShieldAlert, Volume2 } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { DetailPanel } from './DetailPanel';
import { CURFEW } from '@/lib/constants/curfew';
import { getNoiseIndexBreakdown } from '@/lib/noise/getNoiseDb';

type PanelType = 'all' | 'helicopter' | 'curfew' | 'noise' | null;

export function StatsCards() {
  const { flights, dateRange } = useFlightStore();
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const totalFlights = flights.length;
  const arrivals = flights.filter(f => f.direction === 'arrival').length;
  const departures = flights.filter(f => f.direction === 'departure').length;
  const helicopters = flights.filter(f => f.aircraft_category === 'helicopter').length;
  const jets = flights.filter(f => f.aircraft_category === 'jet').length;
  const fixedWing = flights.filter(f => f.aircraft_category === 'fixed_wing').length;

  // Curfew violations: flights during 9 PM - 7 AM (hours 21-6)
  const curfewViolations = useMemo(() => {
    return flights.filter(f => CURFEW.isCurfewHour(f.operation_hour_et)).length;
  }, [flights]);

  // Shoulder period: 7-8 AM (hour 7) and 8-9 PM (hour 20)
  const shoulderOps = useMemo(() => {
    return flights.filter(f => {
      const hour = f.operation_hour_et;
      return hour === 7 || hour === 20;
    }).length;
  }, [flights]);

  // Filtered flight lists for detail panels
  const helicopterFlights = useMemo(() =>
    flights.filter(f => f.aircraft_category === 'helicopter'), [flights]);

  const curfewFlights = useMemo(() =>
    flights.filter(f => CURFEW.isCurfewHour(f.operation_hour_et)), [flights]);

  const noiseFlights = useMemo(() =>
    flights.filter(f => f.aircraft_category === 'helicopter' || f.aircraft_category === 'jet'), [flights]);

  // Noise Index: all helicopters + loud jets (≥85 dB)
  // Uses canonical getNoiseIndexBreakdown() for consistency across card, subtitle, and detail panel
  const noiseBreakdown = useMemo(() => getNoiseIndexBreakdown(flights), [flights]);
  const noiseIndex = noiseBreakdown.total;

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800">
      {/* Total Operations */}
      <button
        onClick={() => setActivePanel('all')}
        className="bg-white dark:bg-zinc-900 p-6 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
      >
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
      </button>

      {/* Helicopter Operations */}
      <button
        onClick={() => setActivePanel('helicopter')}
        className={`bg-white dark:bg-zinc-900 p-6 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${helicopters > 0 ? 'border-l-2 border-l-orange-500' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Helicopter Operations</p>
            <p className="stat-number mt-2">{helicopters}</p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-600">of all operations</span>
            <span className={`text-sm font-semibold tabular-nums ${
              helicopters > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-zinc-500'
            }`}>
              {totalFlights > 0 ? Math.round((helicopters / totalFlights) * 100) : 0}%
            </span>
          </div>
        </div>
      </button>

      {/* Curfew Violations */}
      <button
        onClick={() => setActivePanel('curfew')}
        className={`bg-white dark:bg-zinc-900 p-6 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${curfewViolations > 0 ? 'border-l-2 border-l-amber-500' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Curfew Violations</p>
            <p className="stat-number mt-2">{curfewViolations}</p>
          </div>
          <ShieldAlert
            className={curfewViolations > 0 ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'}
            size={20}
            strokeWidth={1.5}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-600">{CURFEW.DISPLAY_STRING}</span>
            <span className={`text-sm font-semibold tabular-nums ${
              curfewViolations > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {totalFlights > 0 ? ((curfewViolations / totalFlights) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          {shoulderOps > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Shoulder hours (7-8a, 8-9p)</span>
              <span className="text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500">
                {shoulderOps}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Noise Index */}
      <button
        onClick={() => setActivePanel('noise')}
        className={`bg-white dark:bg-zinc-900 p-6 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${noiseIndex > 0 ? 'border-l-2 border-l-orange-500' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Noise Index</p>
            <p className="stat-number mt-2">{noiseIndex}</p>
          </div>
          <Volume2
            className={noiseIndex > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-zinc-300 dark:text-zinc-700'}
            size={20}
            strokeWidth={1.5}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-600">Heli + loud jets (est.)</span>
            <span className={`text-sm font-semibold tabular-nums ${
              noiseIndex > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {totalFlights > 0 ? ((noiseIndex / totalFlights) * 100).toFixed(0) : '0'}%
            </span>
          </div>
        </div>
      </button>
    </div>

    {/* Detail Panels */}
    <DetailPanel
      isOpen={activePanel === 'all'}
      onClose={() => setActivePanel(null)}
      title="All Operations"
      subtitle={`${totalFlights} total flights · ${arrivals} arrivals · ${departures} departures`}
      flights={flights}
      dateRange={dateRange}
      type="all"
    />
    <DetailPanel
      isOpen={activePanel === 'helicopter'}
      onClose={() => setActivePanel(null)}
      title="Helicopter Operations"
      subtitle={`${helicopters} helicopter flights · ${totalFlights > 0 ? Math.round((helicopters / totalFlights) * 100) : 0}% of total`}
      flights={helicopterFlights}
      dateRange={dateRange}
      type="helicopter"
    />
    <DetailPanel
      isOpen={activePanel === 'curfew'}
      onClose={() => setActivePanel(null)}
      title="Curfew Violations"
      subtitle={`${curfewViolations} flights during ${CURFEW.DISPLAY_STRING}`}
      flights={curfewFlights}
      dateRange={dateRange}
      type="curfew"
    />
    <DetailPanel
      isOpen={activePanel === 'noise'}
      onClose={() => setActivePanel(null)}
      title="High-Noise Operations"
      subtitle={`${noiseBreakdown.helicopters} helicopters + ${noiseBreakdown.loudJets} loud jets`}
      flights={noiseFlights}
      dateRange={dateRange}
      type="noise"
    />
    </>
  );
}
