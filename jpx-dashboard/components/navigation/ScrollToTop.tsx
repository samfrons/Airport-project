'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useNavStore } from '@/store/navStore';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const isExpanded = useNavStore((state) => state.isExpanded);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed z-40 p-3 bg-zinc-900 border border-zinc-800 text-zinc-400
        hover:border-zinc-700 hover:text-zinc-200 transition-all duration-300
        shadow-lg shadow-black/40
        bottom-4
        ${isExpanded ? 'left-[296px]' : 'left-[80px]'}
        md:block hidden
      `}
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
