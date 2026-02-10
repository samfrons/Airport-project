'use client';

import { useEffect } from 'react';
import { TowerControl, RefreshCw, Radio } from 'lucide-react';
import { AirportMap } from '@/components/AirportMap';
import { StatsCards } from '@/components/StatsCards';
import { FlightTable } from '@/components/FlightTable';
import { CurfewChart } from '@/components/CurfewChart';
import { TimeFilter } from '@/components/TimeFilter';
import { AircraftBreakdownPanel, FlightDetailsSidebar } from '@/components/noise';
import { BiodiversityPanel, BiodiversityViolationsPanel } from '@/components/biodiversity';
import { useFlightStore } from '@/store/flightStore';

export default function DashboardPage() {
  const { loading, error, fetchFlights, fetchSummary, loadNoiseData, selectedFlight, setSelectedFlight } = useFlightStore();

  useEffect(() => {
    fetchFlights();
    fetchSummary();
    loadNoiseData();
  }, []);

  const handleRefresh = () => {
    fetchFlights();
    fetchSummary();
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-2.5">
                <TowerControl className="text-white" size={20} strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <h1 className="text-lg font-semibold text-zinc-50 tracking-tight">
                    JPX Dashboard
                  </h1>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                    East Hampton
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Airport operations monitoring for KJPX
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Radio size={12} />
                <span className="text-[10px] uppercase tracking-widest font-medium">
                  Live Data
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium hover:border-zinc-700 hover:text-zinc-200 transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 px-5 py-4">
            <p className="text-sm text-red-300">
              <span className="font-semibold">Connection error</span>
              <span className="mx-2 text-red-800">|</span>
              {error}
            </p>
          </div>
        )}

        {/* Time Range */}
        <TimeFilter />

        {/* Stats */}
        <StatsCards />

        {/* Interactive Map */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Flight Routes</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 h-[480px] lg:h-[580px]">
            <AirportMap />
          </div>
        </section>

        {/* Aircraft Noise Breakdown */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Aircraft Type Breakdown</h2>
          </div>
          <AircraftBreakdownPanel />
        </section>

        {/* Biodiversity Threshold Violations */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Biodiversity Threshold Violations</h2>
          </div>
          <BiodiversityViolationsPanel />
        </section>

        {/* Biodiversity & Wildlife Impact */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Biodiversity & Wildlife Impact</h2>
          </div>
          <BiodiversityPanel />
        </section>

        {/* Curfew Chart */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Hourly Distribution</h2>
          </div>
          <CurfewChart />
        </section>

        {/* Flight Table */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Flight Log</h2>
          </div>
          <FlightTable />
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-[11px] text-zinc-600 uppercase tracking-wider">
            <p>Data via FlightAware AeroAPI</p>
            <p>Wainscott Citizens Advisory Committee</p>
          </div>
        </div>
      </footer>

      {/* Flight Details Sidebar */}
      <FlightDetailsSidebar
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
      />
    </div>
  );
}
