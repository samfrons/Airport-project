'use client';

interface HeroStatProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle: string;
  color: string;
  delta?: string | null;
  deltaBetter?: boolean;
}

export function HeroStat({
  label,
  value,
  unit,
  subtitle,
  color,
  delta,
  deltaBetter,
}: HeroStatProps) {
  return (
    <div className="bg-raised flex-1 p-4 relative overflow-hidden">
      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-14 h-14 opacity-10"
        style={{
          background: color,
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
        }}
      />

      <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
        {label}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className="text-4xl font-extrabold leading-none tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-tertiary">{unit}</span>
        )}
      </div>

      <div className="text-[10px] text-tertiary mt-1">{subtitle}</div>

      {delta && (
        <div
          className={`mt-2 text-[10px] font-bold ${
            deltaBetter ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {deltaBetter ? '▼' : '▲'} {delta} vs. comparison
        </div>
      )}
    </div>
  );
}
