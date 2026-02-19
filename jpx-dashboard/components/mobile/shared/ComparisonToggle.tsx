'use client';

export type ComparisonPeriod = 'Last Week' | 'Last Month' | 'Last Year' | null;

interface ComparisonToggleProps {
  selected: ComparisonPeriod;
  onSelect: (period: ComparisonPeriod) => void;
}

const OPTIONS: ComparisonPeriod[] = ['Last Week', 'Last Month', 'Last Year'];

export function ComparisonToggle({ selected, onSelect }: ComparisonToggleProps) {
  return (
    <div className="flex gap-1 bg-raised p-1 mx-4">
      {OPTIONS.map((opt) => {
        const isSelected = selected === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(isSelected ? null : opt)}
            className={`flex-1 py-1.5 text-[9px] font-bold transition-colors ${
              isSelected
                ? 'bg-[#1A6B72] text-white'
                : 'text-tertiary hover:text-secondary'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
