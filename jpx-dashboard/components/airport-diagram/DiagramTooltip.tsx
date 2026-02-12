'use client';

import { useEffect, useRef, useState } from 'react';

interface DiagramTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  details: string[];
}

export function DiagramTooltip({ visible, x, y, title, details }: DiagramTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (!visible || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position if tooltip would go off-screen
    if (x + rect.width / 2 > viewportWidth - 10) {
      adjustedX = viewportWidth - rect.width / 2 - 10;
    } else if (x - rect.width / 2 < 10) {
      adjustedX = rect.width / 2 + 10;
    }

    // Adjust vertical position if tooltip would go off-screen
    if (y - rect.height - 10 < 10) {
      adjustedY = y + rect.height + 20; // Show below instead
    }

    setPosition({ x: adjustedX, y: adjustedY });
  }, [visible, x, y]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-2 shadow-lg">
        <div className="text-xs font-semibold text-[var(--text-primary)]">
          {title}
        </div>
        {details.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {details.map((detail, index) => (
              <div
                key={index}
                className="text-[10px] text-[var(--text-tertiary)]"
              >
                {detail}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Tooltip arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          top: '100%',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid var(--border-subtle)',
        }}
      />
    </div>
  );
}
