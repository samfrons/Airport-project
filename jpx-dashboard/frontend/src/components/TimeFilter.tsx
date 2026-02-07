import { Calendar } from 'lucide-react';
import { useFlightStore } from '../store/flightStore';

export function TimeFilter() {
  const { dateRange, setDateRange, fetchFlights, fetchSummary } = useFlightStore();

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange({
      ...dateRange,
      [field]: value,
    });
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

    // Auto-apply after setting quick range
    setTimeout(() => {
      fetchFlights();
      fetchSummary();
    }, 100);
  };

  const quickRanges = [
    { label: 'Today', days: 0 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Quick Range Buttons */}
        <div className="flex gap-2">
          {quickRanges.map(range => (
            <button
              key={range.label}
              onClick={() => setQuickRange(range.days)}
              className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Date Inputs */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="date"
              value={dateRange.start}
              onChange={e => handleDateChange('start', e.target.value)}
              className="pl-10 pr-3 py-1.5 bg-gray-800 border border-gray-600 text-gray-300 text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <span className="text-gray-500">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="date"
              value={dateRange.end}
              onChange={e => handleDateChange('end', e.target.value)}
              className="pl-10 pr-3 py-1.5 bg-gray-800 border border-gray-600 text-gray-300 text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
