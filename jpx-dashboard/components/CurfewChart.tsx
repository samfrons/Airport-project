'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useFlightStore } from '@/store/flightStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function CurfewChart() {
  const { flights } = useFlightStore();

  const chartData = useMemo(() => {
    const hourCounts = Array(24).fill(0);

    flights.forEach(flight => {
      const hour = flight.operation_hour_et;
      if (hour >= 0 && hour < 24) {
        hourCounts[hour]++;
      }
    });

    const labels = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const suffix = i < 12 ? 'a' : 'p';
      return `${hour}${suffix}`;
    });

    // Curfew hours: 9 PM (21) to 7 AM (6) per Pilot's Pledge
    const backgroundColor = labels.map((_, i) => {
      const isCurfew = i >= 21 || i < 7;
      return isCurfew ? 'rgba(245, 158, 11, 0.7)' : 'rgba(37, 99, 235, 0.6)';
    });

    const hoverBackgroundColor = labels.map((_, i) => {
      const isCurfew = i >= 21 || i < 7;
      return isCurfew ? 'rgba(245, 158, 11, 0.9)' : 'rgba(37, 99, 235, 0.85)';
    });

    return {
      labels,
      datasets: [
        {
          label: 'Operations',
          data: hourCounts,
          backgroundColor,
          hoverBackgroundColor,
          borderWidth: 0,
          borderSkipped: false,
        },
      ],
    };
  }, [flights]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        borderWidth: 1,
        titleColor: '#fafafa',
        bodyColor: '#a1a1aa',
        titleFont: { family: 'Inter', size: 12, weight: 600 as const },
        bodyFont: { family: 'Inter', size: 11 },
        padding: { x: 12, y: 8 },
        cornerRadius: 0,
        displayColors: false,
        callbacks: {
          title: (items: any) => {
            const i = items[0]?.dataIndex;
            if (i === undefined) return '';
            const hour = i % 12 || 12;
            const suffix = i < 12 ? 'AM' : 'PM';
            return `${hour}:00 ${suffix} ET`;
          },
          label: (ctx: any) => {
            const isCurfew = ctx.dataIndex >= 21 || ctx.dataIndex < 7;
            return `${ctx.raw} ops${isCurfew ? '  (curfew)' : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#27272a' },
        ticks: {
          color: '#52525b',
          font: { family: 'Inter', size: 10 },
        },
      },
      y: {
        grid: {
          color: 'rgba(39, 39, 42, 0.5)',
          lineWidth: 1,
        },
        border: { display: false },
        ticks: {
          color: '#52525b',
          font: { family: 'Inter', size: 10 },
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
  };

  // Curfew violations: 9 PM - 7 AM (hours 21-6)
  const curfewTotal = useMemo(() => {
    return flights.filter(f => {
      const hour = f.operation_hour_et;
      return hour >= 21 || hour < 7;
    }).length;
  }, [flights]);

  const pct = flights.length > 0 ? ((curfewTotal / flights.length) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
      {/* Chart legend */}
      <div className="flex items-center justify-end gap-5 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-blue-600" />
          <span className="text-[11px] text-zinc-500">Daytime</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-amber-500" />
          <span className="text-[11px] text-zinc-500">Curfew 9p–7a</span>
        </div>
      </div>

      <div className="h-56">
        <Bar data={chartData} options={options} />
      </div>

      {/* Summary footer */}
      <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          <span className="text-zinc-800 dark:text-zinc-200 font-semibold tabular-nums">{curfewTotal}</span>
          {' '}operations during curfew hours
        </p>
        <p className="text-xs text-zinc-500">
          <span className={`font-semibold tabular-nums ${
            curfewTotal > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'
          }`}>
            {pct}%
          </span>
          {' '}of total
        </p>
      </div>
    </div>
  );
}
