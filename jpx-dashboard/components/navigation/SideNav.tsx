'use client';

import { Menu, X, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useNavStore } from '@/store/navStore';
import { navGroups } from './navConfig';
import { NavGroup } from './NavGroup';
import { QuickActions } from './QuickActions';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function SideNav() {
  const isExpanded = useNavStore((state) => state.isExpanded);
  const isMobileOpen = useNavStore((state) => state.isMobileOpen);
  const toggleExpanded = useNavStore((state) => state.toggleExpanded);
  const toggleMobileOpen = useNavStore((state) => state.toggleMobileOpen);
  const setMobileOpen = useNavStore((state) => state.setMobileOpen);

  // Initialize hooks
  useActiveSection();
  useKeyboardNav();

  const showLabels = isExpanded || isMobileOpen;

  return (
    <>
      {/* Mobile hamburger button - top left */}
      <button
        onClick={toggleMobileOpen}
        className="fixed top-4 left-4 z-50 md:hidden bg-zinc-900 border border-zinc-800 p-2.5 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        role="navigation"
        className={`
          fixed top-0 left-0 h-full z-40 bg-zinc-950 border-r border-zinc-800/60
          flex flex-col transition-all duration-300 ease-out

          /* Mobile: full overlay with slide animation */
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[280px]

          /* Desktop: always visible, width changes */
          md:translate-x-0
          ${isExpanded ? 'md:w-[280px]' : 'md:w-[64px]'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[65px] px-3 border-b border-zinc-800/60">
          {showLabels && (
            <div>
              <p className="text-sm font-semibold text-zinc-50 tracking-tight truncate">
                Navigation
              </p>
            </div>
          )}

          {/* Desktop collapse/expand toggle */}
          <button
            onClick={toggleExpanded}
            className="hidden md:flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isExpanded ? 'Collapse [ ]' : 'Expand [ ]'}
          >
            {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-2">
          {navGroups.map((group) => (
            <NavGroup key={group.id} group={group} />
          ))}
        </div>

        {/* Keyboard shortcuts hint (expanded only, desktop only) */}
        {isExpanded && (
          <div className="px-3 py-2 border-t border-zinc-800/60 hidden md:block">
            <p className="text-[10px] text-zinc-600">
              <kbd className="px-1 bg-zinc-800 text-zinc-400">[</kbd> collapse
              <span className="mx-1.5">·</span>
              <kbd className="px-1 bg-zinc-800 text-zinc-400">]</kbd> expand
            </p>
          </div>
        )}
      </nav>
    </>
  );
}
