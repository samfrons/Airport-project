/**
 * Operator Noise Ranking Table
 *
 * Displays a ranked list of operators by noise impact with sortable columns
 * and visual indicators for trends and violations.
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OperatorNoiseStats {
  operatorId: string;
  operatorName: string;
  totalFlights: number;
  helicopterFlights: number;
  jetFlights: number;
  fixedWingFlights: number;
  avgAltitudeFt: number;
  minAltitudeFt: number;
  totalDbSeconds: number;
  avgMaxDb: number;
  peakDb: number;
  loudEvents: number;
  curfewViolations: number;
  noiseScore: number;
  rank: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastFlightDate: string;
}

interface OperatorRankingTableProps {
  className?: string;
  onOperatorSelect?: (operatorId: string) => void;
  dateRange?: { start: string; end: string };
  limit?: number;
}

type SortKey = keyof OperatorNoiseStats;
type SortDirection = 'asc' | 'desc';

// ─── Component ──────────────────────────────────────────────────────────────

export function OperatorRankingTable({
  className = '',
  onOperatorSelect,
  dateRange,
  limit = 10,
}: OperatorRankingTableProps) {
  const [operators, setOperators] = useState<OperatorNoiseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('noiseScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch operator data
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          sortBy: sortKey,
          sortOrder: sortDirection,
        });
        if (dateRange) {
          params.set('startDate', dateRange.start);
          params.set('endDate', dateRange.end);
        }

        const response = await fetch(`/api/analytics/operators?${params}`);
        const data = await response.json();

        if (data.success) {
          setOperators(data.operators.slice(0, limit));
          setError(null);
        } else {
          setError(data.error || 'Failed to load operator data');
        }
      } catch (err) {
        setError('Network error loading operator data');
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, [sortKey, sortDirection, dateRange, limit]);

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Sorted data (client-side fallback)
  const sortedOperators = useMemo(() => {
    return [...operators].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [operators, sortKey, sortDirection]);

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-gray-600 ml-1">⇅</span>;
    return sortDirection === 'asc' ? (
      <span className="text-blue-400 ml-1">↑</span>
    ) : (
      <span className="text-blue-400 ml-1">↓</span>
    );
  };

  const renderTrendIndicator = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <span className="text-red-400" title="Increasing noise impact">▲</span>;
      case 'decreasing':
        return <span className="text-green-400" title="Decreasing noise impact">▼</span>;
      default:
        return <span className="text-gray-500" title="Stable">─</span>;
    }
  };

  const renderNoiseScoreBar = (score: number) => {
    const color =
      score >= 70 ? 'bg-red-500' :
      score >= 40 ? 'bg-yellow-500' :
      'bg-green-500';

    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-gray-700">
          <div
            className={`h-full ${color}`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
        <span className="text-xs w-8">{score}</span>
      </div>
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-700 w-48"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 border border-red-700 p-4 ${className}`}>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">
          Operator Noise Rankings
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Ranked by noise impact score (higher = more impact)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-white"
                onClick={() => handleSort('operatorName')}
              >
                Operator {renderSortIcon('operatorName')}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('totalFlights')}
              >
                Flights {renderSortIcon('totalFlights')}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('avgAltitudeFt')}
              >
                Avg Alt {renderSortIcon('avgAltitudeFt')}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('avgMaxDb')}
              >
                Avg dB {renderSortIcon('avgMaxDb')}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('loudEvents')}
              >
                Loud {renderSortIcon('loudEvents')}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('curfewViolations')}
              >
                Curfew {renderSortIcon('curfewViolations')}
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-white"
                onClick={() => handleSort('noiseScore')}
              >
                Score {renderSortIcon('noiseScore')}
              </th>
              <th className="px-4 py-3 text-center">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedOperators.map((op, index) => (
              <tr
                key={op.operatorId}
                className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => onOperatorSelect?.(op.operatorId)}
              >
                <td className="px-4 py-3 text-gray-500 font-mono">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="text-white font-medium">{op.operatorName}</div>
                  <div className="text-xs text-gray-500">
                    {op.helicopterFlights > 0 && `${op.helicopterFlights} heli`}
                    {op.jetFlights > 0 && ` · ${op.jetFlights} jet`}
                    {op.fixedWingFlights > 0 && ` · ${op.fixedWingFlights} fw`}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {op.totalFlights}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      op.avgAltitudeFt < 1500 ? 'text-red-400' :
                      op.avgAltitudeFt < 2000 ? 'text-yellow-400' :
                      'text-green-400'
                    }
                  >
                    {op.avgAltitudeFt.toLocaleString()} ft
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      op.avgMaxDb > 80 ? 'text-red-400' :
                      op.avgMaxDb > 70 ? 'text-yellow-400' :
                      'text-white'
                    }
                  >
                    {op.avgMaxDb.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={op.loudEvents > 10 ? 'text-red-400' : 'text-white'}>
                    {op.loudEvents}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={op.curfewViolations > 0 ? 'text-red-400 font-medium' : 'text-gray-500'}>
                    {op.curfewViolations}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {renderNoiseScoreBar(op.noiseScore)}
                </td>
                <td className="px-4 py-3 text-center">
                  {renderTrendIndicator(op.trend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400 flex gap-4">
        <span>Loud: &gt;85 dB at ground</span>
        <span>Curfew: 8 PM - 8 AM violations</span>
        <span>Score: 0-100 (higher = more impact)</span>
      </div>
    </div>
  );
}

export default OperatorRankingTable;
