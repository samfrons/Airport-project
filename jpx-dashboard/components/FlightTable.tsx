'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  PlaneLanding,
  PlaneTakeoff,
  ShieldAlert,
  TreePine,
  X,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { evaluateAllFlights } from '@/lib/biodiversityViolationEngine';
import { getImpactSeverityColor } from '@/types/biodiversity';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import { exportFlightsCsv, exportViolationsCsv } from '@/lib/exportUtils';
import { TableSkeleton } from '@/components/LoadingSkeleton';

type SortField = 'operation_date' | 'ident' | 'aircraft_category' | 'direction';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 50;

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
  const { flights, loading, selectedAirport, setSelectedAirport, setSelectedFlight, dateRange } = useFlightStore();
  const [sortField, setSortField] = useState<SortField>('operation_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [violationFilter, setViolationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const thresholds = useFlightStore((s) => s.thresholds);

  // Build violation map
  const { violationMap, allViolations } = useMemo(() => {
    const violations = evaluateAllFlights(flights, thresholds);
    const map = new Map<string, { severity: string; count: number; hasProtected: boolean; noiseDb: number }>();
    for (const v of violations) {
      map.set(v.flightId, {
        severity: v.overallSeverity,
        count: v.violatedThresholds.length,
        hasProtected: v.speciesAffected.some((s) => s.conservationStatus),
        noiseDb: v.estimatedNoiseDb,
      });
    }
    return { violationMap: map, allViolations: violations };
  }, [flights, thresholds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  };

  // Filter flights
  const filteredFlights = useMemo(() => {
    return flights.filter((f) => {
      if (categoryFilter !== 'all' && f.aircraft_category !== categoryFilter) return false;
      if (directionFilter !== 'all' && f.direction !== directionFilter) return false;
      if (selectedAirport && f.origin_code !== selectedAirport && f.destination_code !== selectedAirport) return false;

      // Violation filter
      if (violationFilter !== 'all') {
        const v = violationMap.get(f.fa_flight_id);
        if (violationFilter === 'violations' && !v) return false;
        if (violationFilter === 'clean' && v) return false;
        if (violationFilter === 'critical' && v?.severity !== 'critical') return false;
        if (violationFilter === 'curfew' && !f.is_curfew_period) return false;
        if (violationFilter === 'protected' && !v?.hasProtected) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (f.ident || '').toLowerCase().includes(q) ||
          (f.registration || '').toLowerCase().includes(q) ||
          (f.operator || '').toLowerCase().includes(q) ||
          (f.aircraft_type || '').toLowerCase().includes(q) ||
          (f.origin_code || '').toLowerCase().includes(q) ||
          (f.destination_code || '').toLowerCase().includes(q) ||
          (f.origin_city || '').toLowerCase().includes(q) ||
          (f.destination_city || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [flights, categoryFilter, directionFilter, violationFilter, selectedAirport, searchQuery, violationMap]);

  const sortedFlights = useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredFlights, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedFlights.length / PAGE_SIZE);
  const pagedFlights = sortedFlights.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  const handleExportFlights = () => exportFlightsCsv(filteredFlights, dateRange);
  const handleExportViolations = () => {
    const filteredViolations = allViolations.filter((v) =>
      filteredFlights.some((f) => f.fa_flight_id === v.flightId),
    );
    exportViolationsCsv(filteredViolations, dateRange);
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* Search bar */}
      <div className="px-5 py-3 border-b border-zinc-800/60 flex items-center gap-3">
        <Search size={14} className="text-zinc-600 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          placeholder="Search by tail number, operator, aircraft type, route..."
          className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-zinc-300">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-zinc-200 tabular-nums">
            {filteredFlights.length}
          </span>
          <span className="text-xs text-zinc-600">flights</span>

          {selectedAirport && (
            <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-medium px-2 py-0.5">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium px-2 py-1.5 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="all">All types</option>
            <option value="helicopter">Helicopter</option>
            <option value="jet">Jet</option>
            <option value="fixed_wing">Fixed wing</option>
            <option value="unknown">Unknown</option>
          </select>

          {/* Direction */}
          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(0); }}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium px-2 py-1.5 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="all">All directions</option>
            <option value="arrival">Arrivals</option>
            <option value="departure">Departures</option>
          </select>

          {/* Violation filter */}
          <select
            value={violationFilter}
            onChange={(e) => { setViolationFilter(e.target.value); setPage(0); }}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium px-2 py-1.5 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="all">All status</option>
            <option value="violations">With violations</option>
            <option value="critical">Critical only</option>
            <option value="protected">Protected species</option>
            <option value="curfew">Curfew period</option>
            <option value="clean">Clean only</option>
          </select>

          {/* Export */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={handleExportFlights}
              className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800/50 text-zinc-500 text-[10px] font-medium border border-zinc-700/40 hover:text-zinc-200 transition-colors"
              title="Export flights CSV"
            >
              <Download size={10} />
              Flights
            </button>
            <button
              onClick={handleExportViolations}
              className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800/50 text-zinc-500 text-[10px] font-medium border border-zinc-700/40 hover:text-zinc-200 transition-colors"
              title="Export violations CSV"
            >
              <Download size={10} />
              Violations
            </button>
          </div>
        </div>
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
              <th className="px-5 py-3 text-center text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                dB
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedFlights.map((flight) => {
              const bioViolation = violationMap.get(flight.fa_flight_id);
              const noiseProfile = getAircraftNoiseProfile(flight.aircraft_type);
              const noiseDb = flight.direction === 'arrival' ? noiseProfile.approachDb : noiseProfile.takeoffDb;

              return (
                <tr
                  key={flight.fa_flight_id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedFlight(flight)}
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

                  {/* Noise dB */}
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    <span className={`text-[12px] font-medium tabular-nums ${
                      noiseDb >= 85 ? 'text-red-400' : noiseDb >= 75 ? 'text-amber-400' : noiseDb >= 65 ? 'text-yellow-500' : 'text-zinc-500'
                    }`}>
                      {noiseDb}
                    </span>
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
            No flights found for the selected filters
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[11px] text-zinc-600 tabular-nums">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedFlights.length)} of {sortedFlights.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 text-[10px] font-medium tabular-nums transition-colors ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
