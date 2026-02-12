'use client';

import { CalendarDays } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';

const quickRanges = [
  { label: 'Today', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export function TimeFilter() {
  const { dateRange, setDateRange, fetchFlights, fetchSummary } = useFlightStore();

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange({ ...dateRange, [field]: value });
  };

  const handleApply = () => {
    fetchFlights();
    fetchSummary();
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });

    setTimeout(() => {
      fetchFlights();
      fetchSummary();
    }, 100);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Quick Range Segmented Control */}
      <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5">
        {quickRanges.map(range => (
          <button
            key={range.label}
            onClick={() => setQuickRange(range.days)}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />

      {/* Date Range */}
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
        <button
          onClick={handleApply}
          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
