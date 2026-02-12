'use client';

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
  Bird,
  TreePine,
  Clock,
  Volume2,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { evaluateAllFlights, generateViolationSummary } from '@/lib/biodiversityViolationEngine';
import type { BiodiversityViolation, ViolationSummary } from '@/types/biodiversityThresholds';
import type { ImpactSeverity } from '@/types/biodiversity';
import { getImpactSeverityColor } from '@/types/biodiversity';

const severityBadge: Record<ImpactSeverity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-950/60', text: 'text-red-400', label: 'Critical' },
  high: { bg: 'bg-orange-950/60', text: 'text-orange-400', label: 'High' },
  moderate: { bg: 'bg-amber-950/60', text: 'text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-lime-950/60', text: 'text-lime-400', label: 'Low' },
  minimal: { bg: 'bg-green-950/60', text: 'text-green-400', label: 'Minimal' },
};

const categoryLabels: Record<string, string> = {
  helicopter: 'Heli',
  jet: 'Jet',
  fixed_wing: 'Prop',
  unknown: '—',
};

function ViolationCard({
  violation,
  onSelectFlight,
}: {
  violation: BiodiversityViolation;
  onSelectFlight: (flightId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = severityBadge[violation.overallSeverity];
  const protectedSpecies = violation.speciesAffected.filter((s) => s.conservationStatus);

  return (
    <div
      className="border bg-white/40 dark:bg-zinc-900/40"
      style={{ borderColor: `${getImpactSeverityColor(violation.overallSeverity)}30` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-8 flex-shrink-0"
            style={{ backgroundColor: getImpactSeverityColor(violation.overallSeverity) }}
          />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 tracking-wide">
                {violation.registration}
              </span>
              <span className="text-[10px] text-zinc-500">
                {violation.aircraftType} · {categoryLabels[violation.aircraftCategory] || violation.aircraftCategory}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-zinc-500 tabular-nums">
                {violation.operationDate} · {violation.operationHour}:00 ET
              </span>
              <span className="text-[10px] text-zinc-600">·</span>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 tabular-nums font-medium">
                {violation.estimatedNoiseDb} dB
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {protectedSpecies.length > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 bg-red-950/50 text-red-400 border border-red-900/30 uppercase tracking-wider">
              Protected
            </span>
          )}
          <span
            className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}
          >
            {badge.label}
          </span>
          <span className="text-[9px] text-zinc-600 tabular-nums w-4 text-right">
            {violation.violatedThresholds.length}
          </span>
          {expanded ? (
            <ChevronDown size={10} className="text-zinc-600" />
          ) : (
            <ChevronRight size={10} className="text-zinc-600" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-200/40 dark:border-zinc-800/40 space-y-3 pt-2">
          {/* Violated Thresholds */}
          <div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">
              Thresholds Violated ({violation.violatedThresholds.length})
            </div>
            <div className="space-y-1">
              {violation.violatedThresholds.map((t) => (
                <div
                  key={t.thresholdId}
                  className="flex items-start gap-2 bg-zinc-100/50 dark:bg-zinc-950/50 px-2 py-1.5"
                >
                  <AlertTriangle
                    size={10}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: getImpactSeverityColor(t.severity) }}
                  />
                  <div className="flex-1">
                    <div className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                      {t.thresholdLabel}
                      {t.exceedanceDb != null && (
                        <span className="text-red-400 ml-1.5">+{t.exceedanceDb} dB</span>
                      )}
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">{t.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Species Affected */}
          {violation.speciesAffected.length > 0 && (
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">
                Species Affected ({violation.speciesAffected.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {violation.speciesAffected.slice(0, 8).map((sp) => (
                  <span
                    key={sp.speciesId}
                    className={`text-[9px] px-1.5 py-0.5 ${
                      sp.conservationStatus
                        ? 'bg-red-950/40 text-red-400 border border-red-900/20'
                        : 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-500'
                    }`}
                  >
                    {sp.commonName}
                    <span className="ml-1 opacity-60">+{sp.exceedanceDb}dB</span>
                  </span>
                ))}
                {violation.speciesAffected.length > 8 && (
                  <span className="text-[9px] text-zinc-600 px-1.5 py-0.5">
                    +{violation.speciesAffected.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Habitats Affected */}
          {violation.habitatsAffected.length > 0 && (
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">
                Habitats Impacted ({violation.habitatsAffected.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {violation.habitatsAffected.map((h) => (
                  <span
                    key={h.habitatId}
                    className="text-[9px] px-1.5 py-0.5 bg-emerald-950/30 text-emerald-500 border border-emerald-900/20"
                  >
                    {h.habitatName}
                    <span className="ml-1 opacity-60 capitalize">{h.habitatType}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <button
            onClick={() => onSelectFlight(violation.flightId)}
            className="w-full text-[10px] text-center py-1.5 bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50 transition-colors"
          >
            View Flight Details
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryBar({ summary }: { summary: ViolationSummary }) {
  const total = summary.totalViolations;
  if (total === 0) return null;

  const segments = ([
    { severity: 'critical' as ImpactSeverity, count: summary.bySeverity.critical },
    { severity: 'high' as ImpactSeverity, count: summary.bySeverity.high },
    { severity: 'moderate' as ImpactSeverity, count: summary.bySeverity.moderate },
    { severity: 'low' as ImpactSeverity, count: summary.bySeverity.low },
    { severity: 'minimal' as ImpactSeverity, count: summary.bySeverity.minimal },
  ]).filter((s) => s.count > 0);

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
        {segments.map(({ severity, count }) => (
          <div
            key={severity}
            style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: getImpactSeverityColor(severity),
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map(({ severity, count }) => (
          <div key={severity} className="flex items-center gap-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: getImpactSeverityColor(severity) }}
            />
            <span className="text-[9px] text-zinc-500 capitalize">{severity}</span>
            <span className="text-[9px] text-zinc-600 dark:text-zinc-400 tabular-nums font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BiodiversityViolationsPanel() {
  const { flights, setSelectedFlight } = useFlightStore();
  const thresholds = useFlightStore((s) => s.thresholds);
  const toggleThreshold = useFlightStore((s) => s.toggleThreshold);
  const [severityFilter, setSeverityFilter] = useState<ImpactSeverity | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'violations' | 'thresholds' | 'offenders'>('violations');

  const violations = useMemo(() => evaluateAllFlights(flights, thresholds), [flights, thresholds]);
  const summary = useMemo(() => generateViolationSummary(violations), [violations]);

  const filteredViolations = useMemo(() => {
    if (severityFilter === 'all') return violations;
    return violations.filter((v) => v.overallSeverity === severityFilter);
  }, [violations, severityFilter]);

  // Sort: critical first, then by date desc
  const sortedViolations = useMemo(() => {
    const order: Record<ImpactSeverity, number> = { critical: 0, high: 1, moderate: 2, low: 3, minimal: 4 };
    return [...filteredViolations].sort((a, b) => {
      const sevDiff = order[a.overallSeverity] - order[b.overallSeverity];
      if (sevDiff !== 0) return sevDiff;
      return b.operationDate.localeCompare(a.operationDate);
    });
  }, [filteredViolations]);

  const handleSelectFlight = (flightId: string) => {
    const flight = flights.find((f) => f.fa_flight_id === flightId);
    if (flight) setSelectedFlight(flight);
  };

  const tabs = [
    { key: 'violations' as const, label: 'Alerts' },
    { key: 'thresholds' as const, label: 'Thresholds' },
    { key: 'offenders' as const, label: 'Top Offenders' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-red-900/30 p-1.5">
            <Shield size={16} className="text-red-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Biodiversity Threshold Violations
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Aircraft operations exceeding ecological protection thresholds
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {summary.totalViolations}
            </div>
            <div className="text-[9px] text-zinc-600">violations</div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-px bg-zinc-200/60 dark:bg-zinc-800/60">
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1">Critical</div>
          <div className="text-lg font-bold tabular-nums" style={{ color: getImpactSeverityColor('critical') }}>
            {summary.bySeverity.critical}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1">Protected Spp.</div>
          <div className="text-lg font-bold text-red-400 tabular-nums">
            {summary.protectedSpeciesViolations}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1">Habitats</div>
          <div className="text-lg font-bold text-emerald-400 tabular-nums">
            {summary.habitatViolations}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1">% of Flights</div>
          <div className="text-lg font-bold text-amber-400 tabular-nums">
            {flights.length > 0
              ? ((summary.totalFlightsWithViolations / flights.length) * 100).toFixed(0)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Severity Distribution Bar */}
      <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <SummaryBar summary={summary} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200/60 dark:border-zinc-800/60">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
              activeTab === key
                ? 'text-red-400 border-b-2 border-red-400 bg-red-950/10'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* ─── Violations Tab ───────────────────────────────────────── */}
        {activeTab === 'violations' && (
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex items-center gap-2">
              <Filter size={10} className="text-zinc-600" />
              <div className="flex gap-1">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    severityFilter === 'all'
                      ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
                  }`}
                >
                  All ({violations.length})
                </button>
                {(['critical', 'high', 'moderate'] as ImpactSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                      severityFilter === sev
                        ? 'text-zinc-800 dark:text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
                    }`}
                    style={
                      severityFilter === sev
                        ? { backgroundColor: `${getImpactSeverityColor(sev)}30` }
                        : {}
                    }
                  >
                    {sev} ({summary.bySeverity[sev]})
                  </button>
                ))}
              </div>
            </div>

            {/* Violations list */}
            {sortedViolations.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-zinc-600">
                No violations found for current filters
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {sortedViolations.slice(0, 50).map((violation) => (
                  <ViolationCard
                    key={violation.id}
                    violation={violation}
                    onSelectFlight={handleSelectFlight}
                  />
                ))}
                {sortedViolations.length > 50 && (
                  <div className="text-center text-[10px] text-zinc-600 py-2">
                    Showing 50 of {sortedViolations.length} violations
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Thresholds Tab ──────────────────────────────────────── */}
        {activeTab === 'thresholds' && (
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Active ecological protection thresholds. Each threshold defines conditions
              under which aircraft operations are flagged as violations.
            </p>
            <div className="space-y-2">
              {thresholds.map((threshold) => {
                const count = summary.byThreshold[threshold.label] || 0;
                const badge = severityBadge[threshold.violationSeverity];
                const typeIcons: Record<string, React.ReactNode> = {
                  noise_level: <Volume2 size={10} className="text-zinc-500" />,
                  time_of_day: <Clock size={10} className="text-zinc-500" />,
                  seasonal: <Bird size={10} className="text-zinc-500" />,
                  habitat_proximity: <TreePine size={10} className="text-zinc-500" />,
                };

                const categoryLabelsMap: Record<string, string> = {
                  helicopter: 'Heli',
                  jet: 'Jet',
                  fixed_wing: 'Prop',
                  unknown: 'Unknown',
                };

                return (
                  <div
                    key={threshold.id}
                    className={`border bg-white/40 dark:bg-zinc-900/40 px-3 py-2.5 ${threshold.enabled ? 'border-zinc-200/60 dark:border-zinc-800/60' : 'border-zinc-200/30 dark:border-zinc-800/30 opacity-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleThreshold(threshold.id)}
                          className={`w-7 h-4 rounded-full transition-colors relative flex-shrink-0 ${
                            threshold.enabled ? 'bg-emerald-600' : 'bg-zinc-700'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              threshold.enabled ? 'left-3.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        {typeIcons[threshold.type]}
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                          {threshold.label}
                        </span>
                        {threshold.isCustom && (
                          <span className="text-[8px] px-1 py-0.5 bg-blue-950/50 text-blue-400 uppercase tracking-wider">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}
                        >
                          {badge.label}
                        </span>
                        <span
                          className={`text-[10px] tabular-nums font-medium ${
                            count > 0 ? 'text-red-400' : 'text-zinc-600'
                          }`}
                        >
                          {count} violations
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {threshold.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {threshold.noiseThresholdDb && (
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                          Limit: {threshold.noiseThresholdDb} dB
                        </span>
                      )}
                      {threshold.activeHours && (
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                          Hours: {threshold.activeHours.start}:00-{threshold.activeHours.end}:00
                        </span>
                      )}
                      {threshold.activeMonths && (
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                          Months: {threshold.activeMonths.join(', ')}
                        </span>
                      )}
                      {threshold.protectedGroups && (
                        <span className="text-[9px] text-emerald-600 bg-emerald-950/30 px-1.5 py-0.5">
                          Protects: {threshold.protectedGroups.join(', ')}
                        </span>
                      )}
                      {threshold.applicableAircraftCategories && threshold.applicableAircraftCategories.length > 0 && (
                        <span className="text-[9px] text-blue-500 bg-blue-950/30 px-1.5 py-0.5">
                          Aircraft: {threshold.applicableAircraftCategories.map(c => categoryLabelsMap[c] || c).join(', ')}
                        </span>
                      )}
                      {threshold.applicableDirections && threshold.applicableDirections.length > 0 && (
                        <span className="text-[9px] text-purple-500 bg-purple-950/30 px-1.5 py-0.5">
                          {threshold.applicableDirections.map(d => d === 'arrival' ? 'Arrivals' : 'Departures').join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Top Offenders Tab ────────────────────────────────────── */}
        {activeTab === 'offenders' && (
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Aircraft with the most biodiversity threshold violations in the selected period,
              ranked by violation count.
            </p>

            {/* By aircraft category */}
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">
                Violations by Aircraft Type
              </div>
              <div className="flex gap-3">
                {Object.entries(summary.byAircraftCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center gap-1.5 bg-zinc-200/40 dark:bg-zinc-800/40 px-2 py-1.5">
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400 capitalize">
                        {categoryLabels[category] || category}
                      </span>
                      <span className="text-[11px] text-zinc-800 dark:text-zinc-200 font-semibold tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top offenders table */}
            {summary.topOffenders.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-zinc-600">
                No violations detected in the current period
              </div>
            ) : (
              <div className="border border-zinc-200/60 dark:border-zinc-800/60">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200/60 dark:border-zinc-800/60">
                      <th className="px-3 py-2 text-left text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                        Registration
                      </th>
                      <th className="px-3 py-2 text-left text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                        Operator
                      </th>
                      <th className="px-3 py-2 text-left text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 py-2 text-right text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                        Violations
                      </th>
                      <th className="px-3 py-2 text-right text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                        Worst
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topOffenders.map((offender, idx) => {
                      const badge = severityBadge[offender.worstSeverity];
                      return (
                        <tr
                          key={offender.registration}
                          className="border-b border-zinc-200/30 dark:border-zinc-800/30 hover:bg-zinc-200/20 dark:hover:bg-zinc-800/20 transition-colors"
                        >
                          <td className="px-3 py-2 text-[10px] text-zinc-600 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 tracking-wide">
                            {offender.registration}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-zinc-400">
                            {offender.operator}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-zinc-500">
                            {offender.aircraftType}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-[11px] font-semibold text-red-400 tabular-nums">
                              {offender.violationCount}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Most violated thresholds */}
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp size={10} />
                Most Violated Thresholds
              </div>
              <div className="space-y-1.5">
                {Object.entries(summary.byThreshold)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([label, count]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-2 py-1.5 bg-zinc-100/40 dark:bg-zinc-950/40"
                    >
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800">
                          <div
                            className="h-full bg-red-500/60"
                            style={{
                              width: `${Math.min(
                                (count / Math.max(...Object.values(summary.byThreshold))) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 tabular-nums font-medium w-6 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
