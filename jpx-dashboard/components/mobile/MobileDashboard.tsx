'use client';

import { useState } from 'react';
import { MobileTabBar, TabId } from './MobileTabBar';
import { TodayTab } from './tabs/TodayTab';
import { WhosTab } from './tabs/WhosTab';
import { ViolationsTab } from './tabs/ViolationsTab';
import { ReportTab } from './tabs/ReportTab';

// PlaneNoise complaint portal for KHTO (East Hampton)
const COMPLAINT_URL = 'https://www.planenoise.com/khtomobile';

export function MobileDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const handleOpenComplaint = () => {
    window.open(COMPLAINT_URL, '_blank', 'noopener,noreferrer');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayTab
            onNavigateToViolations={() => setActiveTab('violations')}
            onFileComplaint={handleOpenComplaint}
          />
        );
      case 'whos':
        return <WhosTab />;
      case 'violations':
        return (
          <ViolationsTab
            onFileComplaint={handleOpenComplaint}
          />
        );
      case 'report':
        return (
          <ReportTab
            onFileComplaint={handleOpenComplaint}
          />
        );
      default:
        return (
          <TodayTab
            onNavigateToViolations={() => setActiveTab('violations')}
            onFileComplaint={handleOpenComplaint}
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
