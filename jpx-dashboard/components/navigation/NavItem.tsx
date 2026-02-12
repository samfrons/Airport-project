'use client';

import Link from 'next/link';
import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react';
import { useNavStore } from '@/store/navStore';

interface NavItemProps {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
}

export function NavItem({ id, label, icon: Icon, href }: NavItemProps) {
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

  const baseClassName = `
    w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors duration-150
    ${isActive
      ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 -ml-[2px]'
      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border-l-2 border-transparent -ml-[2px]'
    }
  `;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
        {showLabel && <span className="truncate">{label}</span>}
      </div>
      {showLabel && (
        href ? (
          <ExternalLink
            size={12}
            className="shrink-0 text-zinc-400 dark:text-zinc-600"
          />
        ) : (
          <ChevronRight
            size={14}
            className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-600'}`}
          />
        )
      )}
    </>
  );

  // If href is provided, render as a Link
  if (href) {
    return (
      <Link
        href={href}
        className={baseClassName}
        title={!showLabel ? label : undefined}
        onClick={() => setMobileOpen(false)}
      >
        {content}
      </Link>
    );
  }

  // Otherwise render as a button for scroll behavior
  return (
    <button
      onClick={scrollTo}
      aria-current={isActive ? 'true' : undefined}
      className={baseClassName}
      title={!showLabel ? label : undefined}
    >
      {content}
    </button>
  );
}
