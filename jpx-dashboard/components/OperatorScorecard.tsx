'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  TreePine,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Plane,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { evaluateAllFlights } from '@/lib/biodiversityViolationEngine';
import { getImpactSeverityColor } from '@/types/biodiversity';
import type { ImpactSeverity } from '@/types/biodiversity';
import type { Flight } from '@/types/flight';
import type { BiodiversityViolation } from '@/types/biodiversityThresholds';
import { getHighestSeverity } from '@/types/biodiversityThresholds';
import { exportOperatorReportCsv, type OperatorReport } from '@/lib/exportUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OperatorProfile {
  operator: string;
  registrations: Set<string>;
  aircraftTypes: Set<string>;
  categories: Set<string>;
  flights: Flight[];
  violations: BiodiversityViolation[];
  criticalCount: number;
  highCount: number;
  protectedSpeciesEvents: number;
  worstSeverity: ImpactSeverity;
  violationRate: number;
}

type SortKey = 'violations' | 'critical' | 'flights' | 'rate' | 'operator';

const severityBadge: Record<ImpactSeverity, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-950/60', text: 'text-red-400' },
  high: { bg: 'bg-orange-950/60', text: 'text-orange-400' },
  moderate: { bg: 'bg-amber-950/60', text: 'text-amber-400' },
  low: { bg: 'bg-lime-950/60', text: 'text-lime-400' },
  minimal: { bg: 'bg-green-950/60', text: 'text-green-400' },
};

const categoryLabels: Record<string, string> = {
  helicopter: 'Heli',
  jet: 'Jet',
  fixed_wing: 'Prop',
  unknown: '—',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function OperatorScorecard() {
  const flights = useFlightStore((s) => s.flights);
  const thresholds = useFlightStore((s) => s.thresholds);
  const setSelectedFlight = useFlightStore((s) => s.setSelectedFlight);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('violations');
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);

  // Build operator profiles
  const profiles = useMemo(() => {
    const violations = evaluateAllFlights(flights, thresholds);
    const violationByFlight = new Map<string, BiodiversityViolation>();
    for (const v of violations) violationByFlight.set(v.flightId, v);

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
          violations: [],
          criticalCount: 0,
          highCount: 0,
          protectedSpeciesEvents: 0,
          worstSeverity: 'minimal',
          violationRate: 0,
        });
      }
      const profile = map.get(opName)!;
      profile.flights.push(f);
      if (f.registration) profile.registrations.add(f.registration);
      if (f.aircraft_type) profile.aircraftTypes.add(f.aircraft_type);
      profile.categories.add(f.aircraft_category);

      const v = violationByFlight.get(f.fa_flight_id);
      if (v) {
        profile.violations.push(v);
        if (v.overallSeverity === 'critical') profile.criticalCount++;
        if (v.overallSeverity === 'high') profile.highCount++;
        if (v.speciesAffected.some((s) => s.conservationStatus)) profile.protectedSpeciesEvents++;
      }
    }

    for (const profile of map.values()) {
      profile.worstSeverity = profile.violations.length > 0
        ? getHighestSeverity(profile.violations.map((v) => v.overallSeverity))
        : 'minimal';
      profile.violationRate = profile.flights.length > 0
        ? profile.violations.length / profile.flights.length
        : 0;
    }

    return Array.from(map.values());
  }, [flights, thresholds]);

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
      violations: (a, b) => b.violations.length - a.violations.length,
      critical: (a, b) => b.criticalCount - a.criticalCount || b.violations.length - a.violations.length,
      flights: (a, b) => b.flights.length - a.flights.length,
      rate: (a, b) => b.violationRate - a.violationRate,
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
      totalViolations: p.violations.length,
      criticalViolations: p.criticalCount,
      protectedSpeciesEvents: p.protectedSpeciesEvents,
      worstSeverity: p.worstSeverity,
    }));
    exportOperatorReportCsv(reports);
  };

  const toggleExpand = (operator: string) => {
    setExpandedOperator(expandedOperator === operator ? null : operator);
  };

  // Aggregate stats
  const totalOperators = profiles.length;
  const operatorsWithViolations = profiles.filter((p) => p.violations.length > 0).length;
  const repeatOffenders = profiles.filter((p) => p.violations.length >= 3).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-900/30 p-1.5">
              <Users size={16} className="text-amber-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Operator Scorecards</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Violation profiles by operator — {totalOperators} operators, {operatorsWithViolations} with violations, {repeatOffenders} repeat offenders
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 text-zinc-400 text-[10px] font-medium border border-zinc-700/40 hover:text-zinc-200 transition-colors"
          >
            <Download size={10} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-800/60 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={12} className="text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operator, registration, aircraft type..."
            className="flex-1 bg-transparent text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider mr-1">Sort:</span>
          {([
            { key: 'violations' as SortKey, label: 'Violations' },
            { key: 'critical' as SortKey, label: 'Critical' },
            { key: 'rate' as SortKey, label: 'Rate' },
            { key: 'flights' as SortKey, label: 'Flights' },
            { key: 'operator' as SortKey, label: 'Name' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                sortKey === key
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/30'
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
            const badge = severityBadge[profile.worstSeverity];

            return (
              <div
                key={profile.operator}
                className={`border bg-zinc-900/40 ${
                  profile.criticalCount > 0
                    ? 'border-red-900/30'
                    : profile.violations.length > 0
                    ? 'border-amber-900/20'
                    : 'border-zinc-800/60'
                }`}
              >
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(profile.operator)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {profile.violations.length > 0 ? (
                      <div
                        className="w-1 h-10 flex-shrink-0"
                        style={{ backgroundColor: getImpactSeverityColor(profile.worstSeverity) }}
                      />
                    ) : (
                      <div className="w-1 h-10 flex-shrink-0 bg-zinc-800" />
                    )}
                    <div className="text-left">
                      <div className="text-[12px] font-semibold text-zinc-200">
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
                      <div className="text-[11px] font-medium text-zinc-400 tabular-nums">
                        {profile.flights.length} flights
                      </div>
                    </div>
                    <div className="text-right min-w-[60px]">
                      {profile.violations.length > 0 ? (
                        <div
                          className="text-[13px] font-bold tabular-nums"
                          style={{ color: getImpactSeverityColor(profile.worstSeverity) }}
                        >
                          {profile.violations.length}
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-600">Clean</div>
                      )}
                      <div className="text-[9px] text-zinc-600">violations</div>
                    </div>
                    {profile.violations.length > 0 && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}
                      >
                        {profile.worstSeverity}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={12} className="text-zinc-600" />
                    ) : (
                      <ChevronRight size={12} className="text-zinc-600" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-800/40 space-y-3 pt-3">
                    {/* Quick stats */}
                    <div className="grid grid-cols-5 gap-px bg-zinc-800/40">
                      <div className="bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Flights</div>
                        <div className="text-[13px] font-bold text-zinc-200 tabular-nums">{profile.flights.length}</div>
                      </div>
                      <div className="bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Violations</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: profile.violations.length > 0 ? '#ef4444' : '#71717a' }}>
                          {profile.violations.length}
                        </div>
                      </div>
                      <div className="bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Critical</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: profile.criticalCount > 0 ? getImpactSeverityColor('critical') : '#71717a' }}>
                          {profile.criticalCount}
                        </div>
                      </div>
                      <div className="bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Protected</div>
                        <div className="text-[13px] font-bold text-amber-400 tabular-nums">
                          {profile.protectedSpeciesEvents}
                        </div>
                      </div>
                      <div className="bg-zinc-950/50 px-2 py-1.5 text-center">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Rate</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: profile.violationRate > 0.5 ? '#ef4444' : profile.violationRate > 0 ? '#f59e0b' : '#71717a' }}>
                          {(profile.violationRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Fleet */}
                    <div>
                      <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Fleet</div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(profile.registrations).slice(0, 12).map((reg) => (
                          <span key={reg} className="text-[9px] px-1.5 py-0.5 bg-zinc-800/60 text-zinc-400">
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

                    {/* Recent violations */}
                    {profile.violations.length > 0 && (
                      <div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">
                          Recent Violations ({Math.min(profile.violations.length, 5)} of {profile.violations.length})
                        </div>
                        <div className="space-y-1">
                          {profile.violations.slice(0, 5).map((v) => (
                            <button
                              key={v.id}
                              onClick={() => {
                                const flight = flights.find((f) => f.fa_flight_id === v.flightId);
                                if (flight) setSelectedFlight(flight);
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 bg-zinc-950/40 hover:bg-zinc-800/40 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                <Plane size={9} className="text-zinc-600" />
                                <span className="text-[10px] text-zinc-400 tabular-nums">
                                  {v.operationDate}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {v.registration} · {v.estimatedNoiseDb} dB
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-zinc-500 tabular-nums">
                                  {v.violatedThresholds.length} thresholds
                                </span>
                                <span
                                  className="text-[9px] font-medium uppercase"
                                  style={{ color: getImpactSeverityColor(v.overallSeverity) }}
                                >
                                  {v.overallSeverity}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
