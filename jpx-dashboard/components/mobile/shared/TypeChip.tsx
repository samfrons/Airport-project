'use client';

import { getTypeColor, getCategoryLabel } from '@/lib/mobile/colors';

interface TypeChipProps {
  category: string;
  model?: string;
}

export function TypeChip({ category, model }: TypeChipProps) {
  const color = getTypeColor(category);
  const label = getCategoryLabel(category);

  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5"
      style={{
        backgroundColor: `${color}22`,
        color: color,
      }}
    >
      {label}
      {model && ` · ${model}`}
    </span>
  );
}
