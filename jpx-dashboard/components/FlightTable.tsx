'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  PlaneLanding,
  PlaneTakeoff,
  ShieldAlert,
  TreePine,
  X,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { evaluateAllFlights } from '@/lib/biodiversityViolationEngine';
import { getImpactSeverityColor } from '@/types/biodiversity';

type SortField = 'operation_date' | 'ident' | 'aircraft_category' | 'direction';
type SortDirection = 'asc' | 'desc';

const categoryLabels: Record<string, string> = {
  helicopter: 'Heli',
  jet: 'Jet',
  fixed_wing: 'Prop',
  unknown: '—',
};

const categoryDotColors: Record<string, string> = {
  helicopter: 'bg-red-400',
  jet: 'bg-blue-400',
  fixed_wing: 'bg-emerald-400',
  unknown: 'bg-zinc-500',
};

const severityLabels: Record<string, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  moderate: 'MOD',
  low: 'LOW',
  minimal: 'MIN',
};

export function FlightTable() {
  const { flights, loading, selectedAirport, setSelectedAirport } = useFlightStore();
  const [sortField, setSortField] = useState<SortField>('operation_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Build a lookup map of flight ID -> violation for badge display
  const violationMap = useMemo(() => {
    const violations = evaluateAllFlights(flights);
    const map = new Map<string, { severity: string; count: number; hasProtected: boolean }>();
    for (const v of violations) {
      map.set(v.flightId, {
        severity: v.overallSeverity,
        count: v.violatedThresholds.length,
        hasProtected: v.speciesAffected.some((s) => s.conservationStatus),
      });
    }
    return map;
  }, [flights]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredFlights = flights.filter(f => {
    if (categoryFilter !== 'all' && f.aircraft_category !== categoryFilter) return false;
    if (selectedAirport && f.origin_code !== selectedAirport && f.destination_code !== selectedAirport) return false;
    return true;
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    return (
      <ArrowUpDown
        size={12}
        className={isActive ? 'text-blue-400' : 'text-zinc-700'}
        style={isActive ? { transform: sortDirection === 'asc' ? 'scaleY(-1)' : undefined } : undefined}
      />
    );
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-12 text-center">
        <p className="text-sm text-zinc-500">Loading flights...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-200 tabular-nums">
            {filteredFlights.length}
          </span>
          <span className="text-xs text-zinc-600">flights</span>

          {selectedAirport && (
            <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-medium px-2 py-0.5 ml-2">
              {selectedAirport}
              <button
                onClick={() => setSelectedAirport(null)}
                className="text-amber-500/60 hover:text-amber-300 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 focus:outline-none focus:border-blue-600 transition-colors"
        >
          <option value="all">All types</option>
          <option value="helicopter">Helicopter</option>
          <option value="jet">Jet</option>
          <option value="fixed_wing">Fixed wing</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {([
                { field: 'operation_date' as const, label: 'Date / Time' },
                { field: 'ident' as const, label: 'Ident' },
                { field: 'aircraft_category' as const, label: 'Type' },
                { field: 'direction' as const, label: 'Dir' },
              ] as const).map(({ field, label }) => (
                <th
                  key={field}
                  className="px-5 py-3 text-left text-[10px] font-medium text-zinc-600 uppercase tracking-widest cursor-pointer hover:text-zinc-400 transition-colors"
                  onClick={() => handleSort(field)}
                >
                  <div className="flex items-center gap-1.5">
                    {label}
                    <SortIcon field={field} />
                  </div>
                </th>
              ))}
              <th className="px-5 py-3 text-left text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                Route
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFlights.slice(0, 50).map(flight => {
              const bioViolation = violationMap.get(flight.fa_flight_id);

              return (
                <tr
                  key={flight.fa_flight_id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Date/Time */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[13px] text-zinc-200 font-medium tabular-nums">
                      {formatDate(flight.operation_date)}
                    </div>
                    <div className="text-[11px] text-zinc-600 tabular-nums mt-0.5">
                      {formatTime(flight.actual_on || flight.actual_off || flight.scheduled_on || flight.scheduled_off)}
                    </div>
                  </td>

                  {/* Ident */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[13px] font-semibold text-zinc-200 tracking-wide">
                      {flight.ident || '—'}
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      {flight.registration || '—'}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${categoryDotColors[flight.aircraft_category]}`} />
                      <span className="text-[13px] text-zinc-300">
                        {categoryLabels[flight.aircraft_category]}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5 pl-4">
                      {flight.aircraft_type || '—'}
                    </div>
                  </td>

                  {/* Direction */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    {flight.direction === 'arrival' ? (
                      <PlaneLanding size={14} className="text-emerald-400" strokeWidth={1.8} />
                    ) : (
                      <PlaneTakeoff size={14} className="text-blue-400" strokeWidth={1.8} />
                    )}
                  </td>

                  {/* Route */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[13px] text-zinc-300 font-medium tracking-wide tabular-nums">
                      {flight.direction === 'arrival'
                        ? `${flight.origin_code || '?'} \u2192 KJPX`
                        : `KJPX \u2192 ${flight.destination_code || '?'}`}
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      {flight.direction === 'arrival' ? flight.origin_city : flight.destination_city}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {bioViolation && (
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: getImpactSeverityColor(bioViolation.severity as any) }}
                        >
                          <TreePine size={11} strokeWidth={1.8} />
                          <span className="text-[9px] font-medium uppercase tracking-wider">
                            {severityLabels[bioViolation.severity] || bioViolation.severity}
                          </span>
                          {bioViolation.hasProtected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-0.5" title="Affects protected species" />
                          )}
                        </span>
                      )}
                      {flight.is_curfew_period && (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <ShieldAlert size={12} strokeWidth={1.8} />
                          <span className="text-[10px] font-medium uppercase tracking-wider">Curfew</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedFlights.length === 0 && (
          <div className="p-12 text-center text-sm text-zinc-600">
            No flights found for the selected period
          </div>
        )}

        {sortedFlights.length > 50 && (
          <div className="px-5 py-3 border-t border-zinc-800 text-center text-[11px] text-zinc-600">
            Showing 50 of {sortedFlights.length} flights
          </div>
        )}
      </div>
    </div>
  );
}
