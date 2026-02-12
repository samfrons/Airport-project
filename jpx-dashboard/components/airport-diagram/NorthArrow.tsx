'use client';

interface NorthArrowProps {
  x: number;
  y: number;
}

export function NorthArrow({ x, y }: NorthArrowProps) {
  return (
    <g className="north-arrow pointer-events-none">
      {/* Background circle */}
      <circle
        cx={x}
        cy={y}
        r="24"
        fill="var(--bg-surface)"
        stroke="var(--border-subtle)"
        strokeWidth="1"
        opacity="0.9"
      />

      {/* North arrow */}
      <polygon
        points={`${x},${y - 16} ${x - 6},${y + 4} ${x},${y - 2} ${x + 6},${y + 4}`}
        fill="var(--text-primary)"
      />

      {/* South half (outline) */}
      <polygon
        points={`${x},${y - 2} ${x - 6},${y + 4} ${x},${y + 16} ${x + 6},${y + 4}`}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="1.5"
      />

      {/* N label */}
      <text
        x={x}
        y={y - 20}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize="8"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        N
      </text>
    </g>
  );
}
