'use client';

import { Menu, X, PanelLeftClose, PanelLeft, ExternalLink, Plane } from 'lucide-react';
import Link from 'next/link';
import { useNavStore } from '@/store/navStore';
import { navItems } from './navConfig';
import { QuickActions } from './QuickActions';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function SideNav() {
  const isExpanded = useNavStore((state) => state.isExpanded);
  const isMobileOpen = useNavStore((state) => state.isMobileOpen);
  const toggleExpanded = useNavStore((state) => state.toggleExpanded);
  const toggleMobileOpen = useNavStore((state) => state.toggleMobileOpen);
  const setMobileOpen = useNavStore((state) => state.setMobileOpen);
  const activeSection = useNavStore((state) => state.activeSection);

  // Initialize hooks
  useActiveSection();
  useKeyboardNav();

  const showLabels = isExpanded || isMobileOpen;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button - top left */}
      <button
        onClick={toggleMobileOpen}
        className="fixed top-4 left-4 z-50 md:hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
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
          fixed top-0 left-0 h-full z-40 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/60
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
        <div className="flex items-center justify-between h-[65px] px-3 border-b border-zinc-200 dark:border-zinc-800/60">
          {showLabels && (
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">
                Navigation
              </p>
            </div>
          )}

          {/* Desktop collapse/expand toggle */}
          <button
            onClick={toggleExpanded}
            className="hidden md:flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors ml-auto"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isExpanded ? 'Collapse [ ]' : 'Expand [ ]'}
          >
            {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Flat Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 -ml-[2px]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border-l-2 border-transparent -ml-[2px]'
                  }
                `}
                title={!showLabels ? item.label : undefined}
              >
                <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {showLabels && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Airport Diagram - External Link */}
          <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/40">
            <Link
              href="/airport-diagram"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors duration-150"
              title={!showLabels ? 'Airport Diagram' : undefined}
            >
              <Plane size={16} className="shrink-0" />
              {showLabels && (
                <>
                  <span className="truncate">Airport Diagram</span>
                  <ExternalLink size={12} className="shrink-0 ml-auto text-zinc-400 dark:text-zinc-600" />
                </>
              )}
            </Link>
          </div>
        </div>

        {/* Keyboard shortcuts hint (expanded only, desktop only) */}
        {isExpanded && (
          <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800/60 hidden md:block">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-600">
              <kbd className="px-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">[</kbd> collapse
              <span className="mx-1.5">·</span>
              <kbd className="px-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">]</kbd> expand
            </p>
          </div>
        )}
      </nav>
    </>
  );
}
