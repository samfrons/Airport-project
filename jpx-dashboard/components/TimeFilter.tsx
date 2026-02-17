'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarDays, Clock, RefreshCw } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';

const quickRanges = [
  { label: 'This Month', getRange: () => getMonthRange(0) },
  { label: 'Last Month', getRange: () => getMonthRange(-1) },
  { label: '90 Days', getRange: () => getDaysAgo(90) },
  { label: 'This Year', getRange: () => getYearRange(0) },
  { label: 'Last Year', getRange: () => getYearRange(-1) },
];

function getMonthRange(monthOffset: number) {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getYearRange(yearOffset: number) {
  const year = new Date().getFullYear() + yearOffset;
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

function getDaysAgo(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function TimeFilter() {
  const { dateRange, setDateRange, fetchFlights, fetchSummary, lastUpdated, loading } = useFlightStore();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Auto-refresh when date range changes (debounced)
  const triggerRefresh = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchFlights();
      fetchSummary();
    }, 300);
  }, [fetchFlights, fetchSummary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Check if a quick range button matches the current date range
  const isActiveRange = (getRange: () => { start: string; end: string }) => {
    const range = getRange();
    return range.start === dateRange.start && range.end === dateRange.end;
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const newRange = { ...dateRange, [field]: value };
    if (newRange.end < newRange.start) {
      setDateError('End date must be after start date');
      return;
    }
    setDateError(null);
    setDateRange(newRange);
    triggerRefresh();
  };

  const setQuickRange = (getRange: () => { start: string; end: string }) => {
    const range = getRange();
    setDateError(null);
    setDateRange(range);
    triggerRefresh();
  };

  // Format last updated timestamp
  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    const date = new Date(lastUpdated);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Quick Range Buttons */}
      <div className="flex flex-wrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5">
        {quickRanges.map(range => (
          <button
            key={range.label}
            onClick={() => setQuickRange(range.getRange)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              isActiveRange(range.getRange)
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

      {/* Custom Date Range */}
      <div className="flex items-center gap-2">
        <CalendarDays size={14} className="text-zinc-500 dark:text-zinc-600" strokeWidth={1.5} />
        <input
          type="date"
          value={dateRange.start}
          onChange={e => handleDateChange('start', e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium focus:outline-none focus:border-blue-600 transition-colors"
        />
        <span className="text-zinc-500 dark:text-zinc-600 text-xs">&ndash;</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={e => handleDateChange('end', e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium focus:outline-none focus:border-blue-600 transition-colors"
        />
        {dateError && (
          <span className="text-red-600 text-[10px] font-medium">{dateError}</span>
        )}
      </div>

      {/* Loading Indicator / Last Updated Timestamp */}
      {loading ? (
        <>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-500">
            <RefreshCw size={12} className="animate-spin" />
            <span className="text-[10px] uppercase tracking-wide">
              Loading...
            </span>
          </div>
        </>
      ) : formatLastUpdated() && (
        <>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-600">
            <Clock size={12} />
            <span className="text-[10px] uppercase tracking-wide">
              Updated {formatLastUpdated()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
