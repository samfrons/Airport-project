'use client';

import { useEffect } from 'react';
import { TowerControl, RefreshCw, Radio } from 'lucide-react';
import { AirportMap } from '@/components/AirportMap';
import { StatsCards } from '@/components/StatsCards';
import { FlightTable } from '@/components/FlightTable';
import { CurfewChart } from '@/components/CurfewChart';
import { TimeFilter } from '@/components/TimeFilter';
import { AircraftBreakdownPanel, FlightDetailsSidebar } from '@/components/noise';
import { BiodiversityPanel, BiodiversityViolationsPanel, ThresholdManager } from '@/components/biodiversity';
import { NoiseEnvironmentTimeline } from '@/components/NoiseEnvironmentTimeline';
import { OperatorScorecard } from '@/components/OperatorScorecard';
import { ComplaintForm } from '@/components/ComplaintForm';
import { WeatherCorrelation } from '@/components/WeatherCorrelation';
import { FlightPathReplay } from '@/components/FlightPathReplay';
import { AlertNotificationSystem } from '@/components/AlertNotificationSystem';
import { ComplianceDashboard } from '@/components/ComplianceDashboard';
import {
  ErrorBoundary,
  StatsCardsSkeleton,
  MapSkeleton,
  ChartSkeleton,
  PanelSkeleton,
  TableSkeleton,
} from '@/components/LoadingSkeleton';
import { MobileNav } from '@/components/MobileNav';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-blue-600 p-2 sm:p-2.5">
                <TowerControl className="text-white" size={18} strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex items-baseline gap-2 sm:gap-3">
                  <h1 className="text-base sm:text-lg font-semibold text-zinc-50 tracking-tight">
                    JPX Dashboard
                  </h1>
                  <span className="hidden sm:inline text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                    East Hampton
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                  Airport operations monitoring for KJPX
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-zinc-600">
                <Radio size={12} />
                <span className="text-[10px] uppercase tracking-widest font-medium">
                  Live Data
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs sm:text-sm font-medium hover:border-zinc-700 hover:text-zinc-200 transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
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
        <div id="stats">
        <ErrorBoundary sectionName="Statistics" fallback={<StatsCardsSkeleton />}>
          <StatsCards />
        </ErrorBoundary>
        </div>

        {/* Interactive Map */}
        <section id="map">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Flight Routes</h2>
          </div>
          <ErrorBoundary sectionName="Flight Map" fallback={<MapSkeleton />}>
            <div className="bg-zinc-900 border border-zinc-800 h-[480px] lg:h-[580px]">
              <AirportMap />
            </div>
          </ErrorBoundary>
        </section>

        {/* Noise & Environment Impact Timeline */}
        <section id="timeline">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Noise & Environment Impact Timeline</h2>
          </div>
          <ErrorBoundary sectionName="Timeline" fallback={<ChartSkeleton />}>
            <NoiseEnvironmentTimeline />
          </ErrorBoundary>
        </section>

        {/* Aircraft Noise Breakdown */}
        <section id="breakdown">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Aircraft Type Breakdown</h2>
          </div>
          <ErrorBoundary sectionName="Aircraft Breakdown" fallback={<PanelSkeleton />}>
            <AircraftBreakdownPanel />
          </ErrorBoundary>
        </section>

        {/* Operator Scorecards */}
        <section id="scorecards">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Operator Scorecards</h2>
          </div>
          <ErrorBoundary sectionName="Operator Scorecards" fallback={<PanelSkeleton />}>
            <OperatorScorecard />
          </ErrorBoundary>
        </section>

        {/* Weather Correlation */}
        <section id="weather">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Weather Correlation</h2>
          </div>
          <ErrorBoundary sectionName="Weather" fallback={<ChartSkeleton />}>
            <WeatherCorrelation />
          </ErrorBoundary>
        </section>

        {/* Flight Path Replay */}
        <section id="replay">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Flight Activity Replay</h2>
          </div>
          <ErrorBoundary sectionName="Flight Replay" fallback={<PanelSkeleton />}>
            <FlightPathReplay />
          </ErrorBoundary>
        </section>

        {/* Alerts & Notifications */}
        <section id="alerts">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Alerts & Notifications</h2>
          </div>
          <ErrorBoundary sectionName="Alerts" fallback={<PanelSkeleton />}>
            <AlertNotificationSystem />
          </ErrorBoundary>
        </section>

        {/* Compliance Dashboard */}
        <section id="compliance">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Compliance Dashboard</h2>
          </div>
          <ErrorBoundary sectionName="Compliance" fallback={<ChartSkeleton />}>
            <ComplianceDashboard />
          </ErrorBoundary>
        </section>

        {/* Threshold Administration */}
        <section id="thresholds">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Threshold Administration</h2>
          </div>
          <ErrorBoundary sectionName="Threshold Manager" fallback={<PanelSkeleton />}>
            <ThresholdManager />
          </ErrorBoundary>
        </section>

        {/* Biodiversity Threshold Violations */}
        <section id="violations">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Biodiversity Threshold Violations</h2>
          </div>
          <ErrorBoundary sectionName="Violations" fallback={<PanelSkeleton />}>
            <BiodiversityViolationsPanel />
          </ErrorBoundary>
        </section>

        {/* Biodiversity & Wildlife Impact */}
        <section id="biodiversity">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Biodiversity & Wildlife Impact</h2>
          </div>
          <ErrorBoundary sectionName="Biodiversity" fallback={<PanelSkeleton />}>
            <BiodiversityPanel />
          </ErrorBoundary>
        </section>

        {/* Community Noise Reports */}
        <section id="complaints">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Community Noise Reports</h2>
          </div>
          <ErrorBoundary sectionName="Noise Reports" fallback={<PanelSkeleton />}>
            <ComplaintForm />
          </ErrorBoundary>
        </section>

        {/* Curfew Chart */}
        <section id="curfew">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Hourly Distribution</h2>
          </div>
          <ErrorBoundary sectionName="Curfew Chart" fallback={<ChartSkeleton />}>
            <CurfewChart />
          </ErrorBoundary>
        </section>

        {/* Flight Table */}
        <section id="flights">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Flight Log</h2>
          </div>
          <ErrorBoundary sectionName="Flight Table" fallback={<TableSkeleton />}>
            <FlightTable />
          </ErrorBoundary>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600 uppercase tracking-wider">
            <p>Data via FlightAware AeroAPI</p>
            <p>Wainscott Citizens Advisory Committee</p>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Flight Details Sidebar */}
      <FlightDetailsSidebar
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
      />
    </div>
  );
}
