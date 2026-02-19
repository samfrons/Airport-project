'use client';

import { getNoiseColor } from '@/lib/mobile/colors';

interface NoiseDbBadgeProps {
  db: number;
  size?: 'sm' | 'md' | 'lg';
  showTilde?: boolean;
}

const SIZES = {
  sm: {
    container: 'w-7 h-7',
    text: 'text-[9px]',
  },
  md: {
    container: 'w-9 h-9',
    text: 'text-[11px]',
  },
  lg: {
    container: 'w-11 h-11',
    text: 'text-[13px]',
  },
};

export function NoiseDbBadge({ db, size = 'md', showTilde = false }: NoiseDbBadgeProps) {
  const color = getNoiseColor(db);
  const sizeStyles = SIZES[size];

  return (
    <div
      className={`${sizeStyles.container} flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: `${color}22` }}
    >
      <span
        className={`${sizeStyles.text} font-extrabold tabular-nums`}
        style={{ color }}
      >
        {showTilde && '~'}
        {db}
      </span>
    </div>
  );
}
