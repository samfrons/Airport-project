'use client';

import { ReactNode } from 'react';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function MobileHeader({ title, subtitle, right }: MobileHeaderProps) {
  return (
    <header className="px-4 py-3 flex items-center justify-between bg-surface border-b border-subtle">
      <div>
        <h1 className="text-[13px] font-extrabold text-primary tracking-wide">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] text-tertiary mt-0.5">{subtitle}</p>
        )}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
