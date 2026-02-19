'use client';

import { ReactNode } from 'react';
import { NAVY } from '@/lib/mobile/colors';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function MobileHeader({ title, subtitle, right }: MobileHeaderProps) {
  return (
    <header
      className="px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: NAVY }}
    >
      <div>
        <h1 className="text-[13px] font-extrabold text-white tracking-wide">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] text-white/60 mt-0.5">{subtitle}</p>
        )}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
