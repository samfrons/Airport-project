'use client';

import { useEffect } from 'react';
import { TowerControl, RefreshCw, LogOut, ExternalLink } from 'lucide-react';
import { AirportMap } from '@/components/AirportMap';
import { StatsCards } from '@/components/StatsCards';
import { CurfewChart } from '@/components/CurfewChart';
import { TimeFilter } from '@/components/TimeFilter';
import { AircraftBreakdownPanel, FlightDetailsSidebar } from '@/components/noise';
import { NoiseEnvironmentTimeline } from '@/components/NoiseEnvironmentTimeline';
import { OperatorScorecard } from '@/components/OperatorScorecard';
import { FlightPathReplay } from '@/components/FlightPathReplay';
import { ComplianceDashboard } from '@/components/ComplianceDashboard';
import { CurfewViolatorsTable } from '@/components/CurfewViolatorsTable';
import { TopCurfewViolators } from '@/components/TopCurfewViolators';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ErrorBoundary,
  StatsCardsSkeleton,
  MapSkeleton,
  ChartSkeleton,
  PanelSkeleton,
} from '@/components/LoadingSkeleton';
import { SideNav, ScrollToTop } from '@/components/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useFlightStore } from '@/store/flightStore';
import { useNavStore } from '@/store/navStore';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { loading, error, fetchFlights, fetchSummary, selectedFlight, setSelectedFlight, lastUpdated } = useFlightStore();
  const isNavExpanded = useNavStore((state) => state.isExpanded);

  useEffect(() => {
    fetchFlights();
    fetchSummary();
  }, []);

  const handleRefresh = () => {
    fetchFlights();
    fetchSummary();
  };

  // Format last updated for header
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Side Navigation */}
      <SideNav />

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Main content wrapper with dynamic margin */}
      <div
        className={`
          transition-all duration-300 ease-out
          md:ml-[64px]
          ${isNavExpanded ? 'md:ml-[280px]' : 'md:ml-[64px]'}
        `}
      >
      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-transparent">
        <div className="px-4 sm:px-6 py-4 sm:py-5 pl-14 md:pl-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-blue-600 p-2 sm:p-2.5 hidden md:block">
                <TowerControl className="text-white" size={18} strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex items-baseline gap-2 sm:gap-3">
                  <h1 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    JPX Dashboard
                  </h1>
                  <span className="hidden sm:inline text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    East Hampton
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                  Airport operations monitoring for KJPX
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {formatLastUpdated() && (
                <div className="hidden sm:flex items-center gap-1.5 text-zinc-500 dark:text-zinc-600">
                  <span className="text-[10px] uppercase tracking-widest font-medium">
                    Updated {formatLastUpdated()}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm font-medium hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {user && (
                <div className="flex items-center gap-2">
                  <span className="hidden lg:inline text-[10px] text-zinc-500 dark:text-zinc-600 truncate max-w-[140px]" title={user.email}>
                    {user.email}
                  </span>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <main className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
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

        {/* ─── 1. Overview ──────────────────────────────────────────── */}
        <section id="overview">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Overview</h2>
          </div>
          <ErrorBoundary sectionName="Overview" fallback={<StatsCardsSkeleton />}>
            <StatsCards />
          </ErrorBoundary>
        </section>

        {/* ─── 2. Operations ────────────────────────────────────────── */}
        <section id="operations">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Operations</h2>
          </div>
          <div className="space-y-6">
            <ErrorBoundary sectionName="Timeline" fallback={<ChartSkeleton />}>
              <NoiseEnvironmentTimeline />
            </ErrorBoundary>
            <ErrorBoundary sectionName="Hourly Distribution" fallback={<ChartSkeleton />}>
              <CurfewChart />
            </ErrorBoundary>
          </div>
        </section>

        {/* ─── 3. Aircraft & Operators ──────────────────────────────── */}
        <section id="aircraft-operators">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Aircraft & Operators</h2>
          </div>
          <div className="space-y-6">
            <ErrorBoundary sectionName="Aircraft Breakdown" fallback={<PanelSkeleton />}>
              <AircraftBreakdownPanel />
            </ErrorBoundary>
            <ErrorBoundary sectionName="Operator Scorecards" fallback={<PanelSkeleton />}>
              <OperatorScorecard />
            </ErrorBoundary>
          </div>
        </section>

        {/* ─── 4. Curfew Compliance ─────────────────────────────────── */}
        <section id="curfew-compliance">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Curfew Compliance</h2>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wide">
              9 PM – 7 AM ET
            </span>
          </div>
          <div className="space-y-6">
            <ErrorBoundary sectionName="Top Curfew Violators" fallback={<PanelSkeleton />}>
              <TopCurfewViolators />
            </ErrorBoundary>
            <ErrorBoundary sectionName="Compliance Dashboard" fallback={<ChartSkeleton />}>
              <ComplianceDashboard />
            </ErrorBoundary>
            <ErrorBoundary sectionName="Curfew Violators" fallback={<PanelSkeleton />}>
              <CurfewViolatorsTable />
            </ErrorBoundary>
          </div>
        </section>

        {/* ─── 5. Flight Map ────────────────────────────────────────── */}
        <section id="flight-map">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Flight Map</h2>
          </div>
          <ErrorBoundary sectionName="Flight Map" fallback={<MapSkeleton />}>
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 h-[480px] lg:h-[580px]">
              <AirportMap />
            </div>
          </ErrorBoundary>
          {/* Flight Replay - Secondary action within Flight Map */}
          <div className="mt-4">
            <ErrorBoundary sectionName="Flight Replay" fallback={<PanelSkeleton />}>
              <FlightPathReplay />
            </ErrorBoundary>
          </div>
        </section>

        {/* ─── 6. Noise & Impact ────────────────────────────────────── */}
        <section id="noise-impact">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Noise & Impact</h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-2">
                Noise monitoring data will appear here when sensors are installed.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                Contact the Wainscott CAC for updates on monitoring deployment.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 7. Complaints ────────────────────────────────────────── */}
        <section id="complaints">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="overline">Complaints</h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="text-center py-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">
                Report noise concerns to East Hampton Town
              </p>
              <a
                href="https://planenoise.com/khto/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
              >
                File a Complaint
                <ExternalLink size={14} />
              </a>
              <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-4">
                Opens planenoise.com in a new tab
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/60 mt-12">
        <div className="px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
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
    </div>
  );
}
