'use client';

import { ChevronDown } from 'lucide-react';
import { useNavStore } from '@/store/navStore';
import { NavItem } from './NavItem';
import type { NavGroup as NavGroupType } from './navConfig';

interface NavGroupProps {
  group: NavGroupType;
}

export function NavGroup({ group }: NavGroupProps) {
  const isExpanded = useNavStore((state) => state.isExpanded);
  const isMobileOpen = useNavStore((state) => state.isMobileOpen);
  const expandedGroups = useNavStore((state) => state.expandedGroups);
  const toggleGroup = useNavStore((state) => state.toggleGroup);

  const isGroupExpanded = expandedGroups.has(group.id);
  // Show full labels on mobile when menu is open, or on desktop when expanded
  const showLabels = isExpanded || isMobileOpen;

  // In collapsed mode (desktop only), show items directly without group headers
  if (!showLabels) {
    return (
      <div className="py-1 border-b border-zinc-800/40">
        {group.items.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
      <button
        onClick={() => toggleGroup(group.id)}
        aria-expanded={isGroupExpanded}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-medium text-zinc-500 uppercase tracking-widest hover:text-zinc-400 transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${
            isGroupExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isGroupExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {group.items.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </div>
    </div>
  );
}
