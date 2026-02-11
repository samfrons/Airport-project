'use client';

import { RefreshCw, Download, Settings } from 'lucide-react';
import { useNavStore } from '@/store/navStore';
import { useFlightStore } from '@/store/flightStore';

export function QuickActions() {
  const isExpanded = useNavStore((state) => state.isExpanded);
  const isMobileOpen = useNavStore((state) => state.isMobileOpen);
  const setMobileOpen = useNavStore((state) => state.setMobileOpen);
  const { loading, fetchFlights, fetchSummary } = useFlightStore();

  const showLabels = isExpanded || isMobileOpen;

  const handleRefresh = () => {
    fetchFlights();
    fetchSummary();
  };

  const handleExport = () => {
    // Placeholder for export functionality
    console.log('Export report triggered');
  };

  const handleSettings = () => {
    const el = document.getElementById('thresholds');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileOpen(false);
  };

  const actions = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      onClick: handleRefresh,
      isLoading: loading,
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      onClick: handleExport,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: handleSettings,
    },
  ];

  return (
    <div className="px-2 py-2 border-b border-zinc-800/60">
      <div className={`flex ${showLabels ? 'flex-row gap-1' : 'flex-col gap-1'}`}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.isLoading}
            className={`
              flex items-center justify-center gap-2 py-2 text-xs font-medium
              bg-zinc-800/40 border border-zinc-800 text-zinc-400
              hover:border-zinc-700 hover:text-zinc-200 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              ${showLabels ? 'flex-1 px-2' : 'px-3'}
            `}
            title={action.label}
          >
            <action.icon
              size={14}
              className={action.isLoading ? 'animate-spin' : ''}
            />
            {showLabels && <span>{action.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
