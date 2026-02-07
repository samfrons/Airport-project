import { useState } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { useFlightStore } from '../store/flightStore';

type SortField = 'operation_date' | 'ident' | 'aircraft_category' | 'direction';
type SortDirection = 'asc' | 'desc';

const categoryLabels: Record<string, string> = {
  helicopter: 'Helicopter',
  jet: 'Jet',
  fixed_wing: 'Fixed Wing',
  unknown: 'Unknown',
};

const categoryColors: Record<string, string> = {
  helicopter: 'text-red-400',
  jet: 'text-blue-400',
  fixed_wing: 'text-green-400',
  unknown: 'text-gray-400',
};

export function FlightTable() {
  const { flights, loading } = useFlightStore();
  const [sortField, setSortField] = useState<SortField>('operation_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredFlights = flights.filter(
    f => categoryFilter === 'all' || f.aircraft_category === categoryFilter
  );

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-600" />;
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-sky-400" />
    ) : (
      <ArrowDown size={14} className="text-sky-400" />
    );
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 p-8 text-center">
        <div className="text-gray-400">Loading flights...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700">
      {/* Header with filter */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Flight Operations</h3>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-gray-300 text-sm px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          <option value="all">All Types</option>
          <option value="helicopter">Helicopters</option>
          <option value="jet">Jets</option>
          <option value="fixed_wing">Fixed Wing</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800">
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('operation_date')}
              >
                <div className="flex items-center gap-2">
                  Date/Time
                  <SortIcon field="operation_date" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('ident')}
              >
                <div className="flex items-center gap-2">
                  Flight ID
                  <SortIcon field="ident" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('aircraft_category')}
              >
                <div className="flex items-center gap-2">
                  Type
                  <SortIcon field="aircraft_category" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('direction')}
              >
                <div className="flex items-center gap-2">
                  Direction
                  <SortIcon field="direction" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Route
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedFlights.slice(0, 50).map(flight => (
              <tr key={flight.fa_flight_id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-white">{formatDate(flight.operation_date)}</div>
                  <div className="text-xs text-gray-500">
                    {formatTime(flight.actual_on || flight.actual_off || flight.scheduled_on || flight.scheduled_off)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{flight.ident || '-'}</div>
                  <div className="text-xs text-gray-500">{flight.registration || '-'}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-sm font-medium ${categoryColors[flight.aircraft_category]}`}>
                    {categoryLabels[flight.aircraft_category]}
                  </span>
                  <div className="text-xs text-gray-500">{flight.aircraft_type || '-'}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {flight.direction === 'arrival' ? (
                      <ArrowDown size={14} className="text-green-400" />
                    ) : (
                      <ArrowUp size={14} className="text-blue-400" />
                    )}
                    <span className="text-sm text-gray-300 capitalize">{flight.direction}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-300">
                    {flight.direction === 'arrival'
                      ? `${flight.origin_code || '?'} → KJPX`
                      : `KJPX → ${flight.destination_code || '?'}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {flight.direction === 'arrival' ? flight.origin_city : flight.destination_city}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {flight.is_curfew_period && (
                    <div className="flex items-center gap-1 text-orange-400">
                      <AlertTriangle size={14} />
                      <span className="text-xs">Curfew</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedFlights.length === 0 && (
          <div className="p-8 text-center text-gray-500">No flights found for the selected period</div>
        )}

        {sortedFlights.length > 50 && (
          <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-500">
            Showing 50 of {sortedFlights.length} flights
          </div>
        )}
      </div>
    </div>
  );
}
