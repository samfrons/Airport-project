'use client';

import { Plane, Users, AlertTriangle, Megaphone } from 'lucide-react';

export type TabId = 'today' | 'whos' | 'violations' | 'report';

interface Tab {
  id: TabId;
  icon: React.ElementType;
  label: string;
}

const TABS: Tab[] = [
  { id: 'today', icon: Plane, label: 'Today' },
  { id: 'whos', icon: Users, label: "Who's Flying" },
  { id: 'violations', icon: AlertTriangle, label: 'Violations' },
  { id: 'report', icon: Megaphone, label: 'Report' },
];

interface MobileTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="flex border-t border-subtle bg-surface safe-area-pb">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2 px-1 min-h-[56px] transition-colors"
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={20}
              strokeWidth={1.5}
              className={isActive ? 'text-[#1A6B72]' : 'text-tertiary'}
            />
            <span
              className={`text-[9px] font-bold tracking-wide ${
                isActive ? 'text-[#1A6B72]' : 'text-tertiary'
              }`}
            >
              {tab.label}
            </span>
            {isActive && (
              <div className="w-4 h-0.5 bg-[#1A6B72] mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
