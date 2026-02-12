'use client';

interface ScaleBarProps {
  x: number;
  y: number;
  length: number; // in feet
}

export function ScaleBar({ x, y, length }: ScaleBarProps) {
  // The scale bar represents `length` feet
  // We'll use a fixed pixel width and show the distance it represents
  const barWidth = 100; // pixels in the SVG coordinate system

  return (
    <g className="scale-bar pointer-events-none">
      {/* Background */}
      <rect
        x={x - 10}
        y={y - 15}
        width={barWidth + 20}
        height="30"
        fill="var(--bg-surface)"
        stroke="var(--border-subtle)"
        strokeWidth="1"
        opacity="0.9"
      />

      {/* Scale bar */}
      <line
        x1={x}
        y1={y}
        x2={x + barWidth}
        y2={y}
        stroke="var(--text-primary)"
        strokeWidth="2"
      />

      {/* End caps */}
      <line
        x1={x}
        y1={y - 5}
        x2={x}
        y2={y + 5}
        stroke="var(--text-primary)"
        strokeWidth="2"
      />
      <line
        x1={x + barWidth}
        y1={y - 5}
        x2={x + barWidth}
        y2={y + 5}
        stroke="var(--text-primary)"
        strokeWidth="2"
      />

      {/* Middle tick */}
      <line
        x1={x + barWidth / 2}
        y1={y - 3}
        x2={x + barWidth / 2}
        y2={y + 3}
        stroke="var(--text-primary)"
        strokeWidth="1"
      />

      {/* Labels */}
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize="8"
        fontFamily="Inter, sans-serif"
      >
        0
      </text>
      <text
        x={x + barWidth}
        y={y - 8}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize="8"
        fontFamily="Inter, sans-serif"
      >
        {length}&apos;
      </text>
    </g>
  );
}
