'use client';

import { useState } from 'react';
import { MobileTabBar, TabId } from './MobileTabBar';
import { TodayTab } from './tabs/TodayTab';
import { WhosTab } from './tabs/WhosTab';
import { ViolationsTab } from './tabs/ViolationsTab';
import { ReportTab } from './tabs/ReportTab';

export function MobileDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const renderTab = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayTab
            onNavigateToViolations={() => setActiveTab('violations')}
          />
        );
      case 'whos':
        return <WhosTab />;
      case 'violations':
        return <ViolationsTab />;
      case 'report':
        return <ReportTab />;
      default:
        return (
          <TodayTab
            onNavigateToViolations={() => setActiveTab('violations')}
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
