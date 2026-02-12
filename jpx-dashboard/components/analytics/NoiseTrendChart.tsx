/**
 * Noise Trend Chart
 *
 * Time-series visualization of noise impact data showing:
 * - Daily noise exposure (total dB-seconds per day)
 * - Weekly comparison (this week vs last week)
 * - Rolling averages (7-day and 30-day)
 * - Quietest/loudest day indicators
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DailyNoiseSummary {
  date: string;
  dayOfWeek: string;
  totalFlights: number;
  helicopterFlights: number;
  jetFlights: number;
  fixedWingFlights: number;
  totalDbSeconds: number;
  avgMaxDb: number;
  peakDb: number;
  loudEvents: number;
  curfewViolations: number;
  avgAltitudeFt: number;
  weatherConditions: 'normal' | 'amplified' | 'reduced';
}

interface WeeklyComparison {
  dayOfWeek: string;
  thisWeek: {
    totalDbSeconds: number;
    totalFlights: number;
    avgMaxDb: number;
  };
  lastWeek: {
    totalDbSeconds: number;
    totalFlights: number;
    avgMaxDb: number;
  };
  change: {
    dbSecondsPercent: number;
    flightsPercent: number;
    dbPercent: number;
  };
}

interface TrendStatistics {
  totalDays: number;
  totalFlights: number;
  totalDbSeconds: number;
  avgDailyFlights: number;
  avgDailyDbSeconds: number;
  loudestDay: { date: string; totalDbSeconds: number; totalFlights: number };
  quietestDay: { date: string; totalDbSeconds: number; totalFlights: number };
  peakHour: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
}

interface NoiseTrendChartProps {
  className?: string;
  dateRange?: { start: string; end: string };
  chartType?: 'daily' | 'weekly' | 'rolling';
  metric?: 'dbSeconds' | 'flights' | 'avgDb' | 'loudEvents';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NoiseTrendChart({
  className = '',
  dateRange,
  chartType = 'daily',
  metric = 'dbSeconds',
}: NoiseTrendChartProps) {
  const [dailyData, setDailyData] = useState<DailyNoiseSummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyComparison[]>([]);
  const [rollingData, setRollingData] = useState<{ date: string; avg7Day: number; avg30Day: number }[]>([]);
  const [stats, setStats] = useState<TrendStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'daily' | 'weekly' | 'rolling'>(chartType);
  const [activeMetric, setActiveMetric] = useState(metric);

  // Fetch trend data
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateRange) {
          params.set('startDate', dateRange.start);
          params.set('endDate', dateRange.end);
        }

        const response = await fetch(`/api/analytics/trends?${params}`);
        const data = await response.json();

        if (data.success) {
          setDailyData(data.dailySummaries || []);
          setWeeklyData(data.weeklyComparison || []);
          setRollingData(data.rollingAverages || []);
          setStats(data.statistics || null);
          setError(null);
        } else {
          setError(data.error || 'Failed to load trend data');
        }
      } catch (err) {
        setError('Network error loading trend data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [dateRange]);

  // Processed chart data
  const chartData = useMemo(() => {
    return dailyData.map((day) => ({
      date: day.date.slice(5), // MM-DD format
      fullDate: day.date,
      dayOfWeek: day.dayOfWeek.slice(0, 3),
      dbSeconds: day.totalDbSeconds,
      flights: day.totalFlights,
      avgDb: day.avgMaxDb,
      loudEvents: day.loudEvents,
      helicopters: day.helicopterFlights,
      jets: day.jetFlights,
      weather: day.weatherConditions,
    }));
  }, [dailyData]);

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const formatYAxis = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toString();
  };

  const getMetricLabel = (m: string): string => {
    switch (m) {
      case 'dbSeconds': return 'dB-Seconds';
      case 'flights': return 'Total Flights';
      case 'avgDb': return 'Avg Max dB';
      case 'loudEvents': return 'Loud Events (>85 dB)';
      default: return m;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 text-sm">
        <div className="font-medium text-white mb-2">
          {data.dayOfWeek} {data.fullDate}
        </div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="text-white font-mono">
              {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
            </span>
          </div>
        ))}
        {data.weather !== 'normal' && (
          <div className="mt-2 text-xs text-yellow-400">
            Weather: {data.weather}
          </div>
        )}
      </div>
    );
  };

  // ─── Statistics Summary ─────────────────────────────────────────────────

  const renderStats = () => {
    if (!stats) return null;

    const trendColor = stats.trend === 'increasing' ? 'text-red-400' :
                       stats.trend === 'decreasing' ? 'text-green-400' :
                       'text-gray-400';

    const trendIcon = stats.trend === 'increasing' ? '▲' :
                      stats.trend === 'decreasing' ? '▼' : '─';

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-3">
          <div className="text-gray-400 text-xs">Avg Daily Flights</div>
          <div className="text-white text-xl font-bold">{stats.avgDailyFlights}</div>
        </div>
        <div className="bg-gray-800 p-3">
          <div className="text-gray-400 text-xs">Avg Daily Exposure</div>
          <div className="text-white text-xl font-bold">
            {formatYAxis(stats.avgDailyDbSeconds)} dB·s
          </div>
        </div>
        <div className="bg-gray-800 p-3">
          <div className="text-gray-400 text-xs">Loudest Day</div>
          <div className="text-red-400 text-sm font-medium">{stats.loudestDay.date}</div>
          <div className="text-white text-sm">{stats.loudestDay.totalFlights} flights</div>
        </div>
        <div className="bg-gray-800 p-3">
          <div className="text-gray-400 text-xs">Trend</div>
          <div className={`${trendColor} text-xl font-bold flex items-center gap-2`}>
            {trendIcon} {Math.abs(stats.trendPercentage).toFixed(1)}%
          </div>
          <div className="text-gray-400 text-xs capitalize">{stats.trend}</div>
        </div>
      </div>
    );
  };

  // ─── Chart Tabs ─────────────────────────────────────────────────────────

  const renderTabs = () => (
    <div className="flex gap-1 mb-4">
      {(['daily', 'weekly', 'rolling'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveChart(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors
            ${activeChart === tab
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );

  // ─── Metric Selector ────────────────────────────────────────────────────

  const renderMetricSelector = () => (
    <div className="flex gap-2 mb-4">
      {(['dbSeconds', 'flights', 'avgDb', 'loudEvents'] as const).map((m) => (
        <button
          key={m}
          onClick={() => setActiveMetric(m)}
          className={`px-3 py-1 text-xs font-medium transition-colors
            ${activeMetric === m
              ? 'bg-gray-700 text-white'
              : 'bg-gray-800/50 text-gray-500 hover:text-white'
            }`}
        >
          {getMetricLabel(m)}
        </button>
      ))}
    </div>
  );

  // ─── Charts ─────────────────────────────────────────────────────────────

  const renderDailyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <YAxis
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickFormatter={formatYAxis}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={activeMetric}
          name={getMetricLabel(activeMetric)}
          stroke="#3b82f6"
          fill="url(#colorValue)"
          strokeWidth={2}
        />
        {stats && (
          <ReferenceLine
            y={activeMetric === 'dbSeconds' ? stats.avgDailyDbSeconds :
               activeMetric === 'flights' ? stats.avgDailyFlights : undefined}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Avg', fill: '#f59e0b', fontSize: 10 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderWeeklyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={weeklyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="dayOfWeek"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <YAxis
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend />
        <Bar
          dataKey="thisWeek.totalDbSeconds"
          name="This Week"
          fill="#3b82f6"
        />
        <Bar
          dataKey="lastWeek.totalDbSeconds"
          name="Last Week"
          fill="#6b7280"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderRollingChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rollingData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickFormatter={(val) => val.slice(5)}
        />
        <YAxis
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="avg7Day"
          name="7-Day Avg"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="avg30Day"
          name="30-Day Avg"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // ─── Main Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 w-48 mb-4"></div>
          <div className="h-64 bg-gray-800"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 border border-red-700 p-6 ${className}`}>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">
          Noise Impact Trends
        </h3>
      </div>

      <div className="p-4">
        {renderStats()}
        {renderTabs()}
        {activeChart === 'daily' && renderMetricSelector()}

        {activeChart === 'daily' && renderDailyChart()}
        {activeChart === 'weekly' && renderWeeklyChart()}
        {activeChart === 'rolling' && renderRollingChart()}
      </div>
    </div>
  );
}

export default NoiseTrendChart;
