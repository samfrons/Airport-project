'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/store/navStore';
import { allSectionIds } from './navConfig';

export function ScrollProgress() {
  const isExpanded = useNavStore((state) => state.isExpanded);
  const isMobileOpen = useNavStore((state) => state.isMobileOpen);
  const activeSection = useNavStore((state) => state.activeSection);
  const setMobileOpen = useNavStore((state) => state.setMobileOpen);
  const [scrollProgress, setScrollProgress] = useState(0);

  const showLabels = isExpanded || isMobileOpen;

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileOpen(false);
  };

  // Only show in expanded mode or mobile
  if (!showLabels) return null;

  return (
    <div className="px-3 py-3 border-t border-zinc-800/60">
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mb-2">
        Progress
      </p>
      <div className="relative flex items-start gap-2">
        {/* Progress bar background */}
        <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-zinc-800" />

        {/* Progress bar fill */}
        <div
          className="absolute left-[5px] top-0 w-[2px] bg-blue-500 transition-all duration-150"
          style={{ height: `${scrollProgress}%` }}
        />

        {/* Section dots */}
        <div className="flex flex-col gap-1 relative z-10">
          {allSectionIds.map((id) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`
                w-[10px] h-[10px] transition-all duration-150
                ${activeSection === id
                  ? 'bg-blue-500 scale-125'
                  : 'bg-zinc-700 hover:bg-zinc-600'
                }
              `}
              title={id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
