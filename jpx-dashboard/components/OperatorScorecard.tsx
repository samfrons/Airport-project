'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Plane,
  Clock,
  Volume2,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getNoiseDb, LOUD_THRESHOLD_DB } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';
import { exportOperatorReportCsv, type OperatorReport } from '@/lib/exportUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OperatorProfile {
  operator: string;
  registrations: Set<string>;
  aircraftTypes: Set<string>;
  categories: Set<string>;
  flights: Flight[];
  curfewViolations: number;
  shoulderOps: number;
  noiseExceedances: number;
  avgNoiseDb: number;
}

type SortKey = 'curfew' | 'noise' | 'flights' | 'operator';

const categoryLabels: Record<string, string> = {
  helicopter: 'Heli',
  jet: 'Jet',
  fixed_wing: 'Prop',
  unknown: '—',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function OperatorScorecard() {
  const flights = useFlightStore((s) => s.flights);
  const setSelectedFlight = useFlightStore((s) => s.setSelectedFlight);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('curfew');
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);

  // Build operator profiles based on curfew + noise compliance
  const profiles = useMemo(() => {
    const map = new Map<string, OperatorProfile>();

    for (const f of flights) {
      const opName = f.operator || 'Private / Unknown';
      if (!map.has(opName)) {
        map.set(opName, {
          operator: opName,
          registrations: new Set(),
          aircraftTypes: new Set(),
          categories: new Set(),
          flights: [],
          curfewViolations: 0,
          shoulderOps: 0,
          noiseExceedances: 0,
          avgNoiseDb: 0,
        });
      }
      const profile = map.get(opName)!;
      profile.flights.push(f);
      if (f.registration) profile.registrations.add(f.registration);
      if (f.aircraft_type) profile.aircraftTypes.add(f.aircraft_type);
      profile.categories.add(f.aircraft_category);

      // Curfew: 9 PM - 7 AM
      if (f.is_curfew_period) profile.curfewViolations++;

      // Shoulder: 7-8 AM (hour 7) or 8-9 PM (hour 20)
      const h = f.operation_hour_et;
      if (h === 7 || h === 20) profile.shoulderOps++;

      // Noise exceedance
      if (getNoiseDb(f) >= LOUD_THRESHOLD_DB) profile.noiseExceedances++;
    }

    // Compute avg noise per operator
    for (const profile of map.values()) {
      const totalDb = profile.flights.reduce((sum, f) => sum + getNoiseDb(f), 0);
      profile.avgNoiseDb = profile.flights.length > 0
        ? Math.round((totalDb / profile.flights.length) * 10) / 10
        : 0;
    }

    return Array.from(map.values());
  }, [flights]);

  // Filter & sort
  const filteredProfiles = useMemo(() => {
    let result = profiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.operator.toLowerCase().includes(q) ||
          Array.from(p.registrations).some((r) => r.toLowerCase().includes(q)) ||
          Array.from(p.aircraftTypes).some((t) => t.toLowerCase().includes(q)),
      );
    }

    const sortFns: Record<SortKey, (a: OperatorProfile, b: OperatorProfile) => number> = {
      curfew: (a, b) => b.curfewViolations - a.curfewViolations || b.flights.length - a.flights.length,
      noise: (a, b) => b.noiseExceedances - a.noiseExceedances || b.avgNoiseDb - a.avgNoiseDb,
      flights: (a, b) => b.flights.length - a.flights.length,
      operator: (a, b) => a.operator.localeCompare(b.operator),
    };

    return [...result].sort(sortFns[sortKey]);
  }, [profiles, searchQuery, sortKey]);

  const handleExport = () => {
    const reports: OperatorReport[] = filteredProfiles.map((p) => ({
      operator: p.operator,
      registrations: Array.from(p.registrations),
      aircraftTypes: Array.from(p.aircraftTypes),
      totalFlights: p.flights.length,
      curfewViolations: p.curfewViolations,
      noiseExceedances: p.noiseExceedances,
      avgNoiseDb: p.avgNoiseDb,
    }));
    exportOperatorReportCsv(reports);
  };

  const toggleExpand = (operator: string) => {
    setExpandedOperator(expandedOperator === operator ? null : operator);
  };

  // Aggregate stats
  const totalOperators = profiles.length;
  const operatorsWithCurfew = profiles.filter((p) => p.curfewViolations > 0).length;
  const repeatCurfew = profiles.filter((p) => p.curfewViolations >= 2).length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5">
              <Users size={16} className="text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Operator Scorecards</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {totalOperators} operators — {operatorsWithCurfew} with curfew violations, {repeatCurfew} repeat offenders
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium border border-zinc-300/40 dark:border-zinc-700/40 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <Download size={10} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={12} className="text-zinc-400 dark:text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operator, registration, aircraft type..."
            className="flex-1 bg-transparent text-[11px] text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider mr-1">Sort:</span>
          {([
            { key: 'curfew' as SortKey, label: 'Curfew' },
            { key: 'noise' as SortKey, label: 'Noise' },
            { key: 'flights' as SortKey, label: 'Flights' },
            { key: 'operator' as SortKey, label: 'Name' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                sortKey === key
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Operator List */}
      <div className="p-5 space-y-2">
        {filteredProfiles.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-zinc-600">
            No operators match the search
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const isExpanded = expandedOperator === profile.operator;
            const hasCurfew = profile.curfewViolations > 0;
            const hasNoise = profile.noiseExceedances > 0;

            return (
              <div
                key={profile.operator}
                className={`border bg-zinc-50/40 dark:bg-zinc-900/40 ${
                  profile.curfewViolations >= 2
                    ? 'border-red-200/30 dark:border-red-900/30'
                    : hasCurfew || hasNoise
                    ? 'border-amber-200/20 dark:border-amber-900/20'
                    : 'border-zinc-200/60 dark:border-zinc-800/60'
                }`}
              >
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(profile.operator)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-200/20 dark:hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {hasCurfew ? (
                      <div
                        className="w-1 h-10 flex-shrink-0"
                        style={{ backgroundColor: profile.curfewViolations >= 2 ? '#ef4444' : '#f59e0b' }}
                      />
                    ) : (
                      <div className="w-1 h-10 flex-shrink-0 bg-zinc-200 dark:bg-zinc-800" />
                    )}
                    <div className="text-left">
                      <div className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">
                        {profile.operator}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500">
                          {profile.registrations.size} aircraft
                        </span>
                        <span className="text-[10px] text-zinc-600">·</span>
                        <span className="text-[10px] text-zinc-500">
                          {Array.from(profile.categories).map((c) => categoryLabels[c] || c).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 tabular-nums">
                        {profile.flights.length} flights
                      </div>
                    </div>
                    {hasCurfew && (
                      <div className="flex items-center gap-1 text-right min-w-[50px]">
                        <Clock size={10} className="text-amber-500" />
                        <span className={`text-[11px] font-bold tabular-nums ${
                          profile.curfewViolations >= 2 ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {profile.curfewViolations}
                        </span>
                      </div>
                    )}
                    {hasNoise && (
                      <div className="flex items-center gap-1 text-right min-w-[50px]">
                        <Volume2 size={10} className="text-red-400" />
                        <span className="text-[11px] font-bold tabular-nums text-red-400">
                          {profile.noiseExceedances}
                        </span>
                      </div>
                    )}
                    {!hasCurfew && !hasNoise && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-500 min-w-[50px] text-right">
                        Clean
                      </div>
                    )}
                    <ChevronRight
                      size={12}
                      className={`text-zinc-600 transition-transform duration-200 ease-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                    />
                  </div>
                </button>

                {/* Expanded detail - Animated */}
                <div className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-zinc-200/40 dark:border-zinc-800/40 space-y-3 pt-3">
                    {/* Quick stats */}
                    <div className="grid grid-cols-5 gap-px bg-zinc-200/40 dark:bg-zinc-800/40">
                      <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Flights</div>
                        <div className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{profile.flights.length}</div>
                      </div>
                      <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Curfew</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: profile.curfewViolations > 0 ? '#f59e0b' : '#71717a' }}>
                          {profile.curfewViolations}
                        </div>
                      </div>
                      <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Shoulder</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: profile.shoulderOps > 0 ? '#a855f7' : '#71717a' }}>
                          {profile.shoulderOps}
                        </div>
                      </div>
                      <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Loud</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: profile.noiseExceedances > 0 ? '#ef4444' : '#71717a' }}>
                          {profile.noiseExceedances}
                        </div>
                      </div>
                      <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Est. dB</div>
                        <div className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                          {profile.avgNoiseDb}
                        </div>
                      </div>
                    </div>

                    {/* Fleet */}
                    <div>
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1.5">Fleet</div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(profile.registrations).slice(0, 12).map((reg) => (
                          <span key={reg} className="text-[9px] px-1.5 py-0.5 bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400">
                            {reg}
                          </span>
                        ))}
                        {profile.registrations.size > 12 && (
                          <span className="text-[9px] px-1.5 py-0.5 text-zinc-600">
                            +{profile.registrations.size - 12} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recent curfew violations */}
                    {profile.curfewViolations > 0 && (
                      <div>
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1.5">
                          Recent Curfew Operations ({Math.min(profile.curfewViolations, 5)} of {profile.curfewViolations})
                        </div>
                        <div className="space-y-1">
                          {profile.flights
                            .filter((f) => f.is_curfew_period)
                            .sort((a, b) => b.operation_date.localeCompare(a.operation_date) || b.operation_hour_et - a.operation_hour_et)
                            .slice(0, 5)
                            .map((f) => (
                              <button
                                key={f.fa_flight_id}
                                onClick={() => setSelectedFlight(f)}
                                className="w-full flex items-center justify-between px-2 py-1.5 bg-zinc-100/40 dark:bg-zinc-950/40 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <Plane size={9} className="text-zinc-500 dark:text-zinc-600" />
                                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 tabular-nums">
                                    {f.operation_date}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">
                                    {f.registration || f.ident} · {f.aircraft_type} · {f.operation_hour_et}:00 ET
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-medium text-amber-500">
                                    Est. {getNoiseDb(f)} dB
                                  </span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
