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
import { useFlightStore } from '../store/flightStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function CurfewChart() {
  const { flights } = useFlightStore();

  const chartData = useMemo(() => {
    // Count flights by hour
    const hourCounts = Array(24).fill(0);
    const curfewCounts = Array(24).fill(0);

    flights.forEach(flight => {
      const hour = flight.operation_hour_et;
      if (hour >= 0 && hour < 24) {
        hourCounts[hour]++;
        if (flight.is_curfew_period) {
          curfewCounts[hour]++;
        }
      }
    });

    const labels = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const suffix = i < 12 ? 'AM' : 'PM';
      return `${hour}${suffix}`;
    });

    // Determine bar colors: orange for curfew hours (8PM-8AM), sky for daytime
    const backgroundColor = labels.map((_, i) => {
      const isCurfewHour = i >= 20 || i < 8;
      return isCurfewHour ? 'rgba(249, 115, 22, 0.8)' : 'rgba(14, 165, 233, 0.8)';
    });

    const borderColor = labels.map((_, i) => {
      const isCurfewHour = i >= 20 || i < 8;
      return isCurfewHour ? 'rgb(249, 115, 22)' : 'rgb(14, 165, 233)';
    });

    return {
      labels,
      datasets: [
        {
          label: 'Operations',
          data: hourCounts,
          backgroundColor,
          borderColor,
          borderWidth: 1,
        },
      ],
    };
  }, [flights]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Operations by Hour (Eastern Time)',
        color: '#9ca3af',
        font: {
          size: 14,
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const hour = context.dataIndex;
            const isCurfewHour = hour >= 20 || hour < 8;
            return isCurfewHour ? '(Curfew Period)' : '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
  };

  const curfewTotal = flights.filter(f => f.is_curfew_period).length;
  const curfewPercentage =
    flights.length > 0 ? ((curfewTotal / flights.length) * 100).toFixed(1) : '0';

  return (
    <div className="bg-gray-900 border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Hourly Distribution</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-sky-500" />
            <span className="text-xs text-gray-400">Daytime</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500" />
            <span className="text-xs text-gray-400">Curfew (8PM-8AM)</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          <span className="text-white font-medium">{curfewTotal}</span> operations during curfew hours
        </div>
        <div className="text-sm text-gray-400">
          <span className={`font-medium ${curfewTotal > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {curfewPercentage}%
          </span>{' '}
          of total operations
        </div>
      </div>
    </div>
  );
}
