'use client';

import { useState } from 'react';
import { MobileTabBar, TabId } from './MobileTabBar';
import { TodayTab } from './tabs/TodayTab';
import { WhosTab } from './tabs/WhosTab';
import { ViolationsTab } from './tabs/ViolationsTab';
import { ReportTab } from './tabs/ReportTab';
import { ComplaintForm, ComplaintData } from './ComplaintForm';
import type { Flight } from '@/types/flight';

type View = 'tabs' | 'complaint';

export function MobileDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [view, setView] = useState<View>('tabs');
  const [complaintFlight, setComplaintFlight] = useState<Flight | null>(null);

  const handleOpenComplaint = (flight?: Flight) => {
    setComplaintFlight(flight || null);
    setView('complaint');
  };

  const handleCloseComplaint = () => {
    setView('tabs');
    setComplaintFlight(null);
  };

  const handleSubmitComplaint = (data: ComplaintData) => {
    // In production, this would POST to your API
    console.log('Complaint submitted:', data);

    // Could also store locally or send to an API endpoint
    // fetch('/api/complaints', { method: 'POST', body: JSON.stringify(data) });
  };

  // Show complaint form
  if (view === 'complaint') {
    return (
      <ComplaintForm
        flight={complaintFlight}
        onBack={handleCloseComplaint}
        onSubmit={handleSubmitComplaint}
      />
    );
  }

  // Show main tabs
  const renderTab = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayTab
            onNavigateToViolations={() => setActiveTab('violations')}
            onFileComplaint={() => handleOpenComplaint()}
          />
        );
      case 'whos':
        return <WhosTab />;
      case 'violations':
        return (
          <ViolationsTab
            onFileComplaint={(flight) => handleOpenComplaint(flight)}
          />
        );
      case 'report':
        return (
          <ReportTab
            onFileComplaint={(flight) => handleOpenComplaint(flight)}
          />
        );
      default:
        return (
          <TodayTab
            onNavigateToViolations={() => setActiveTab('violations')}
            onFileComplaint={() => handleOpenComplaint()}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-page">
      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {renderTab()}
      </div>

      {/* Fixed bottom tab bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
