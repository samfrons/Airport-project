'use client';

import { useEffect, useRef } from 'react';
import { useNavStore } from '@/store/navStore';
import { allSectionIds } from '@/components/navigation/navConfig';

export function useActiveSection() {
  const setActiveSection = useNavStore((state) => state.setActiveSection);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleSections = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.id;
        if (entry.isIntersecting) {
          visibleSections.current.add(sectionId);
        } else {
          visibleSections.current.delete(sectionId);
        }
      });

      // Find the first visible section (topmost in DOM order)
      const orderedVisibleSections = allSectionIds.filter((id) =>
        visibleSections.current.has(id)
      );

      if (orderedVisibleSections.length > 0) {
        const activeId = orderedVisibleSections[0];
        setActiveSection(activeId);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: '-10% 0px -70% 0px',
      threshold: 0,
    });

    // Observe all sections
    allSectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [setActiveSection]);
}
