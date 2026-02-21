'use client';

import { useMemo, useState } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { MobileHeader } from '../MobileHeader';
import { FlightRow } from '../shared/FlightRow';
import { Phone, Mail, ExternalLink } from 'lucide-react';

interface ReportTabProps {
  onFileComplaint?: () => void;
}

export function ReportTab({ onFileComplaint }: ReportTabProps) {
  const { flights } = useFlightStore();
  const [showCount, setShowCount] = useState(10);

  // Get recent flights (sorted by most recent, limited by showCount)
  const recentFlights = useMemo(() => {
    return [...flights]
      .sort((a, b) => {
        const aTime = a.actual_on || a.actual_off || '';
        const bTime = b.actual_on || b.actual_off || '';
        return bTime.localeCompare(aTime);
      })
      .slice(0, showCount);
  }, [flights, showCount]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <MobileHeader
        title="Report Noise"
        subtitle="Complaints go to East Hampton Town"
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Alert card */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-4">
          <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
            Hear a noisy aircraft?
          </div>
          <div className="text-[11px] text-red-800 dark:text-red-300 leading-relaxed mb-3">
            Every complaint creates an official record of community impact. Your
            report will be pre-filled with the current time and your location.
          </div>
          <button
            onClick={onFileComplaint}
            className="w-full bg-red-600 text-white py-3 text-[13px] font-extrabold shadow-lg flex items-center justify-center gap-2"
          >
            📢 File a Complaint Now
            <ExternalLink size={14} />
          </button>
          <div className="text-[9px] text-center text-muted mt-2 leading-relaxed">
            You'll be taken to PlaneNoise, East Hampton Town's official noise reporting system.
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-surface border border-subtle p-3 mb-4">
          <div className="text-[10px] font-bold text-primary mb-2">
            Other Ways to Report
          </div>
          <div className="space-y-2 text-[10px]">
            <a
              href="tel:+16313243774"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Phone size={12} />
              <span>Town Hall: (631) 324-3774</span>
            </a>
            <a
              href="mailto:airport@ehamptonny.gov"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Mail size={12} />
              <span>airport@ehamptonny.gov</span>
            </a>
          </div>
        </div>

        {/* Recent flights section */}
        <div className="mb-2">
          <div className="text-[11px] font-bold text-primary mb-1">
            Recent flights at JPX
          </div>
          <div className="text-[10px] text-tertiary mb-3">
            Tap a flight to see details, or tap Report to file a complaint
          </div>
        </div>

        {/* Flight list */}
        {recentFlights.map((f) => (
          <FlightRow
            key={f.id}
            flight={f}
            onReport={onFileComplaint}
          />
        ))}

        {/* Load More button */}
        {flights.length > showCount && (
          <button
            onClick={() => setShowCount(prev => prev + 20)}
            className="w-full text-center py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400 border-b border-subtle hover:bg-raised"
          >
            Browse earlier flights ({flights.length - showCount} more)
          </button>
        )}

        {recentFlights.length === 0 && (
          <div className="text-center py-4 text-tertiary text-sm">
            No recent flights
          </div>
        )}

        {/* Coming soon note */}
        <div className="text-[10px] text-muted text-center italic py-2">
          Complaint map coming soon
        </div>
      </div>
    </div>
  );
}
