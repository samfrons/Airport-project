import type { ReactNode } from 'react';
import { Plane, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import { useFlightStore } from '../store/flightStore';

interface SubStat {
  label: string;
  value: number;
  icon?: ReactNode;
  color?: string;
}

interface StatCard {
  label: string;
  value: number;
  icon: ReactNode;
  subStats?: SubStat[];
  description?: string;
  highlight?: boolean;
}

export function StatsCards() {
  const { flights } = useFlightStore();

  // Calculate stats from flights
  const totalFlights = flights.length;
  const arrivals = flights.filter(f => f.direction === 'arrival').length;
  const departures = flights.filter(f => f.direction === 'departure').length;
  const helicopters = flights.filter(f => f.aircraft_category === 'helicopter').length;
  const jets = flights.filter(f => f.aircraft_category === 'jet').length;
  const fixedWing = flights.filter(f => f.aircraft_category === 'fixed_wing').length;
  const curfewViolations = flights.filter(f => f.is_curfew_period).length;
  const uniqueAircraft = new Set(flights.map(f => f.registration)).size;

  const stats: StatCard[] = [
    {
      label: 'Total Operations',
      value: totalFlights,
      icon: <Plane className="text-sky-400" size={24} />,
      subStats: [
        { label: 'Arrivals', value: arrivals, icon: <ArrowDown size={14} /> },
        { label: 'Departures', value: departures, icon: <ArrowUp size={14} /> },
      ],
    },
    {
      label: 'Aircraft Types',
      value: uniqueAircraft,
      icon: <Plane className="text-green-400" size={24} />,
      subStats: [
        { label: 'Helicopters', value: helicopters, color: 'text-red-400' },
        { label: 'Jets', value: jets, color: 'text-blue-400' },
        { label: 'Fixed Wing', value: fixedWing, color: 'text-green-400' },
      ],
    },
    {
      label: 'Curfew Period Ops',
      value: curfewViolations,
      icon: <AlertTriangle className="text-orange-400" size={24} />,
      description: '8 PM - 8 AM ET',
      highlight: curfewViolations > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`bg-gray-900 border p-4 ${
            stat.highlight ? 'border-orange-500' : 'border-gray-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              {stat.description && (
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              )}
            </div>
            {stat.icon}
          </div>

          {stat.subStats && (
            <div className="mt-3 pt-3 border-t border-gray-800 flex gap-4">
              {stat.subStats.map((sub, i) => (
                <div key={i} className="flex items-center gap-1">
                  {sub.icon && <span className="text-gray-500">{sub.icon}</span>}
                  <span className={`text-sm font-medium ${sub.color || 'text-gray-300'}`}>
                    {sub.value}
                  </span>
                  <span className="text-xs text-gray-500">{sub.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
