'use client';

import { useEffect } from 'react';
import { useNavStore } from '@/store/navStore';

export function useKeyboardNav() {
  const setExpanded = useNavStore((state) => state.setExpanded);
  const setMobileOpen = useNavStore((state) => state.setMobileOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case '[':
          e.preventDefault();
          setExpanded(false);
          break;
        case ']':
          e.preventDefault();
          setExpanded(true);
          break;
        case 'Escape':
          setMobileOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setExpanded, setMobileOpen]);
}
