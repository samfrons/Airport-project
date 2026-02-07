import { PlaneLanding, PlaneTakeoff, Gauge, ShieldAlert } from 'lucide-react';
import { useFlightStore } from '../store/flightStore';

export function StatsCards() {
  const { flights } = useFlightStore();

  const totalFlights = flights.length;
  const arrivals = flights.filter(f => f.direction === 'arrival').length;
  const departures = flights.filter(f => f.direction === 'departure').length;
  const helicopters = flights.filter(f => f.aircraft_category === 'helicopter').length;
  const jets = flights.filter(f => f.aircraft_category === 'jet').length;
  const fixedWing = flights.filter(f => f.aircraft_category === 'fixed_wing').length;
  const curfewOps = flights.filter(f => f.is_curfew_period).length;
  const uniqueAircraft = new Set(flights.map(f => f.registration)).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-800">
      {/* Total Operations */}
      <div className="bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Total Operations</p>
            <p className="stat-number mt-2">{totalFlights}</p>
          </div>
          <Gauge className="text-zinc-700" size={20} strokeWidth={1.5} />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-800 flex gap-6">
          <div className="flex items-center gap-2">
            <PlaneLanding size={13} className="text-emerald-400" strokeWidth={1.8} />
            <span className="text-sm font-semibold text-zinc-200 tabular-nums">{arrivals}</span>
            <span className="text-xs text-zinc-600">arr</span>
          </div>
          <div className="flex items-center gap-2">
            <PlaneTakeoff size={13} className="text-blue-400" strokeWidth={1.8} />
            <span className="text-sm font-semibold text-zinc-200 tabular-nums">{departures}</span>
            <span className="text-xs text-zinc-600">dep</span>
          </div>
        </div>
      </div>

      {/* Aircraft Breakdown */}
      <div className="bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Unique Aircraft</p>
            <p className="stat-number mt-2">{uniqueAircraft}</p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-800 flex gap-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm font-semibold text-zinc-200 tabular-nums">{helicopters}</span>
            <span className="text-xs text-zinc-600">heli</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm font-semibold text-zinc-200 tabular-nums">{jets}</span>
            <span className="text-xs text-zinc-600">jet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold text-zinc-200 tabular-nums">{fixedWing}</span>
            <span className="text-xs text-zinc-600">prop</span>
          </div>
        </div>
      </div>

      {/* Curfew Operations */}
      <div className={`bg-zinc-900 p-6 ${curfewOps > 0 ? 'border-l-2 border-l-amber-500' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="overline">Curfew Period</p>
            <p className="stat-number mt-2">{curfewOps}</p>
          </div>
          <ShieldAlert
            className={curfewOps > 0 ? 'text-amber-500' : 'text-zinc-700'}
            size={20}
            strokeWidth={1.5}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-800">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-600">8 PM - 8 AM ET</span>
            <span className={`text-sm font-semibold tabular-nums ${
              curfewOps > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {totalFlights > 0 ? ((curfewOps / totalFlights) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
