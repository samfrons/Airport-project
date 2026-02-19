'use client';

import { useMemo } from 'react';
import { BarChart3, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import type { ComplaintCategory } from '@/types/noise';

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  helicopter: 'Helicopter',
  jet: 'Jet Noise',
  low_flying: 'Low Flying',
  early_morning: 'Early Morning',
  late_night: 'Late Night',
  frequency: 'Frequency',
  other: 'Other',
};

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Minor',
  2: 'Moderate',
  3: 'Significant',
  4: 'Severe',
  5: 'Extreme',
};

const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  4: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  5: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function ComplaintsSummary() {
  const complaints = useFlightStore((s) => s.noiseComplaints);

  const stats = useMemo(() => {
    if (complaints.length === 0) return null;

    // By category
    const byCategory = new Map<ComplaintCategory, number>();
    complaints.forEach((c) => {
      byCategory.set(c.category, (byCategory.get(c.category) || 0) + 1);
    });
    const categorySorted = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1]);

    // By neighborhood
    const byNeighborhood = new Map<string, number>();
    complaints.forEach((c) => {
      const n = c.location.neighborhood || 'Unknown';
      byNeighborhood.set(n, (byNeighborhood.get(n) || 0) + 1);
    });
    const neighborhoodSorted = [...byNeighborhood.entries()]
      .sort((a, b) => b[1] - a[1]);

    // Average severity
    const avgSeverity = complaints.reduce((sum, c) => sum + c.severity, 0) / complaints.length;

    // Severity distribution
    const bySeverity = new Map<number, number>();
    complaints.forEach((c) => {
      bySeverity.set(c.severity, (bySeverity.get(c.severity) || 0) + 1);
    });

    // Recent complaints (last 10)
    const recent = complaints.slice(0, 10);

    // Time range
    const newest = new Date(complaints[0].timestamp);
    const oldest = new Date(complaints[complaints.length - 1].timestamp);

    return {
      total: complaints.length,
      avgSeverity,
      bySeverity,
      categorySorted,
      neighborhoodSorted,
      recent,
      newest,
      oldest,
    };
  }, [complaints]);

  if (!stats) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-center">
        <p className="text-xs text-zinc-500">No complaint data loaded.</p>
      </div>
    );
  }

  const maxCategoryCount = stats.categorySorted[0]?.[1] || 1;
  const maxNeighborhoodCount = stats.neighborhoodSorted[0]?.[1] || 1;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Complaint Analysis
          </h3>
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {stats.total} reports &middot;{' '}
          {stats.oldest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' – '}
          {stats.newest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800">
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {stats.total}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Reports</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {stats.avgSeverity.toFixed(1)}
            <span className="text-xs text-zinc-400 font-normal">/5</span>
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Severity</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {stats.neighborhoodSorted.length}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Neighborhoods</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {stats.categorySorted.length}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Categories</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
        {/* By Category */}
        <div className="p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">
            By Category
          </div>
          <div className="space-y-2">
            {stats.categorySorted.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 w-24 truncate">
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 relative">
                  <div
                    className="h-full bg-indigo-500/70 dark:bg-indigo-400/50"
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 tabular-nums w-8 text-right">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Neighborhood */}
        <div className="p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">
            By Neighborhood
          </div>
          <div className="space-y-2">
            {stats.neighborhoodSorted.slice(0, 8).map(([hood, count]) => (
              <div key={hood} className="flex items-center gap-3">
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 w-32 truncate">
                  {hood}
                </div>
                <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 relative">
                  <div
                    className="h-full bg-amber-500/60 dark:bg-amber-400/40"
                    style={{ width: `${(count / maxNeighborhoodCount) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 tabular-nums w-8 text-right">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="px-4 py-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">
          Severity Distribution
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => {
            const count = stats.bySeverity.get(level) || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={level} className="flex-1 text-center">
                <div className="h-16 flex items-end justify-center mb-1">
                  <div
                    className={`w-full ${SEVERITY_COLORS[level].split(' ')[0]}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <div className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400">{count}</div>
                <div className="text-[8px] text-zinc-400 dark:text-zinc-600">{SEVERITY_LABELS[level]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Complaints Table */}
      <div className="border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-2">
          <Clock size={11} className="text-zinc-400" />
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
            Recent Reports
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-1.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-1.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-1.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Neighborhood</th>
                <th className="px-4 py-1.5 text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-1.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {stats.recent.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 capitalize">
                    {c.category.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={9} className="text-zinc-400" />
                      {c.location.neighborhood || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[c.severity]}`}>
                      {c.severity}/5
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[11px] text-zinc-500 dark:text-zinc-500 max-w-[250px] truncate hidden sm:table-cell">
                    {c.description || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <p className="text-[9px] text-zinc-400 dark:text-zinc-600">
          Complaint data shown from community noise reports. Enable the Complaints layer on the Flight Map to see geographic distribution.
        </p>
      </div>
    </div>
  );
}
