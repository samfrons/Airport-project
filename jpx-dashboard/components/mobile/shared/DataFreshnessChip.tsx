'use client';

import { useFlightStore } from '@/store/flightStore';

interface DataFreshnessChipProps {
  className?: string;
}

export function DataFreshnessChip({ className = '' }: DataFreshnessChipProps) {
  const { lastUpdated, loading } = useFlightStore();

  // Check if data is stale (more than 1 hour old)
  const isStale = (() => {
    if (!lastUpdated) return true;
    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 1;
  })();

  if (loading) {
    return (
      <div
        className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1
          bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
          border border-blue-200 dark:border-blue-700 ${className}`}
      >
        <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse" />
        Loading...
      </div>
    );
  }

  if (isStale) {
    const staleDate = lastUpdated
      ? new Date(lastUpdated).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'Unknown';

    return (
      <div
        className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1
          bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300
          border border-amber-200 dark:border-amber-700 ${className}`}
      >
        <span className="w-1.5 h-1.5 bg-amber-500" />
        Data through {staleDate}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1
        bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300
        border border-green-200 dark:border-green-700 ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-green-500" />
      Live data
    </div>
  );
}
