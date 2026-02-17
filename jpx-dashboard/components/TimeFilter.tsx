'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarDays, ChevronDown, Clock, RefreshCw, Check } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';

const quickRanges = [
  { label: 'This Month', getRange: () => getMonthRange(0) },
  { label: 'Last Month', getRange: () => getMonthRange(-1) },
  { label: 'Last 90 Days', getRange: () => getDaysAgo(90) },
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if a quick range matches the current date range
  const getActiveRangeLabel = (): string | null => {
    for (const range of quickRanges) {
      const r = range.getRange();
      if (r.start === dateRange.start && r.end === dateRange.end) {
        return range.label;
      }
    }
    return null;
  };

  const activeLabel = getActiveRangeLabel();
  const displayLabel = isCustom || !activeLabel ? 'Custom Range' : activeLabel;

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
    setIsCustom(false);
    setIsOpen(false);
    triggerRefresh();
  };

  const selectCustomRange = () => {
    setIsCustom(true);
    setIsOpen(false);
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
      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors min-w-[160px] justify-between"
        >
          <span>{displayLabel}</span>
          <ChevronDown
            size={14}
            className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg z-50">
            {quickRanges.map(range => {
              const r = range.getRange();
              const isActive = r.start === dateRange.start && r.end === dateRange.end && !isCustom;
              return (
                <button
                  key={range.label}
                  onClick={() => setQuickRange(range.getRange)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="w-4">
                    {isActive && <Check size={14} className="text-blue-600" />}
                  </span>
                  {range.label}
                </button>
              );
            })}
            {/* Divider */}
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
            {/* Custom Range Option */}
            <button
              onClick={selectCustomRange}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                isCustom
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="w-4">
                {isCustom && <Check size={14} className="text-blue-600" />}
              </span>
              Custom Range...
            </button>
          </div>
        )}
      </div>

      {/* Custom Date Range (shown only when custom is selected) */}
      {isCustom && (
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
      )}

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
