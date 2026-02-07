import { useEffect } from 'react';
import { Plane, RefreshCw } from 'lucide-react';
import { AirportMap } from './components/AirportMap';
import { StatsCards } from './components/StatsCards';
import { FlightTable } from './components/FlightTable';
import { CurfewChart } from './components/CurfewChart';
import { TimeFilter } from './components/TimeFilter';
import { useFlightStore } from './store/flightStore';
import './index.css';

function App() {
  const { loading, error, fetchFlights, fetchSummary } = useFlightStore();

  useEffect(() => {
    // Initial data fetch
    fetchFlights();
    fetchSummary();
  }, []);

  const handleRefresh = () => {
    fetchFlights();
    fetchSummary();
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-sky-600 p-2">
                <Plane className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">JPX Airport Dashboard</h1>
                <p className="text-sm text-gray-400">East Hampton Town Airport (KJPX)</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 p-4 text-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Time Filter */}
        <TimeFilter />

        {/* Stats Cards */}
        <StatsCards />

        {/* Map and Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-gray-900 border border-gray-700 h-96 lg:h-[500px]">
            <AirportMap />
          </div>

          {/* Curfew Chart */}
          <CurfewChart />
        </div>

        {/* Flight Table */}
        <FlightTable />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Data source: FlightAware AeroAPI</p>
            <p>Wainscott Citizens Advisory Committee (WCAC)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
