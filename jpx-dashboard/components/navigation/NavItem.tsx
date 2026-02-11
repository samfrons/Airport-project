'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useNavStore } from '@/store/navStore';

interface NavItemProps {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function NavItem({ id, label, icon: Icon }: NavItemProps) {
  const isExpanded = useNavStore((state) => state.isExpanded);
  const isMobileOpen = useNavStore((state) => state.isMobileOpen);
  const activeSection = useNavStore((state) => state.activeSection);
  const setMobileOpen = useNavStore((state) => state.setMobileOpen);

  const isActive = activeSection === id;
  // Always show labels on mobile when menu is open, or on desktop when expanded
  const showLabel = isExpanded || isMobileOpen;

  const scrollTo = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Close mobile menu after navigation
    setMobileOpen(false);
  };

  return (
    <button
      onClick={scrollTo}
      aria-current={isActive ? 'true' : undefined}
      className={`
        w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors duration-150
        ${isActive
          ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 -ml-[2px]'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border-l-2 border-transparent -ml-[2px]'
        }
      `}
      title={!showLabel ? label : undefined}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
        {showLabel && <span className="truncate">{label}</span>}
      </div>
      {showLabel && (
        <ChevronRight
          size={14}
          className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-600'}`}
        />
      )}
    </button>
  );
}
