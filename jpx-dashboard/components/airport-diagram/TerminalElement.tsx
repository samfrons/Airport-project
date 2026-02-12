'use client';

import type { Terminal } from '@/types/airportDiagram';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';

interface TerminalElementProps {
  terminal: Terminal;
}

export function TerminalElement({ terminal }: TerminalElementProps) {
  const { selection, setSelection, showTooltip, hideTooltip } =
    useAirportDiagramStore();

  const isSelected = selection.type === 'terminal' && selection.id === terminal.id;

  const handleClick = () => {
    if (terminal.type !== 'beacon' && terminal.type !== 'windsock') {
      setSelection({ type: 'terminal', id: terminal.id });
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    showTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      title: terminal.name,
      details: [`Type: ${terminal.type.toUpperCase()}`],
    });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  // Get fill color based on terminal type
  const getFill = () => {
    switch (terminal.type) {
      case 'terminal':
        return 'var(--bg-raised)';
      case 'hangar':
        return 'var(--bg-inset)';
      case 'parking':
        return 'var(--bg-surface)';
      case 'apron':
        return 'var(--bg-inset)';
      case 'beacon':
        return 'var(--curfew-color)';
      case 'windsock':
        return 'var(--status-open)';
      default:
        return 'var(--bg-raised)';
    }
  };

  // Get stroke based on selection and type
  const getStroke = () => {
    if (isSelected) return 'var(--accent)';
    if (terminal.type === 'apron') return 'var(--border-subtle)';
    return 'var(--border-strong)';
  };

  // Parse path to get center for label
  const pathMatch = terminal.path.match(/M\s*([\d.]+)[,\s]+([\d.]+).*?L\s*([\d.]+)/);
  const rectMatch = terminal.path.match(/M\s*([\d.]+)[,\s]+([\d.]+).*?([\d.]+)[,\s]+([\d.]+)\s*Z/i);

  let labelX = 0;
  let labelY = 0;

  if (rectMatch) {
    // It's a rectangle-like path
    const x1 = parseFloat(rectMatch[1]);
    const y1 = parseFloat(rectMatch[2]);
    // Extract width and height from the path
    const coords = terminal.path.match(/[\d.]+/g)?.map(Number) || [];
    if (coords.length >= 4) {
      const xs = coords.filter((_, i) => i % 2 === 0);
      const ys = coords.filter((_, i) => i % 2 === 1);
      labelX = (Math.min(...xs) + Math.max(...xs)) / 2;
      labelY = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
  } else if (terminal.type === 'beacon' || terminal.type === 'windsock') {
    // Circle path - extract center
    const circleMatch = terminal.path.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
    if (circleMatch) {
      labelX = parseFloat(circleMatch[1]);
      labelY = parseFloat(circleMatch[2]);
    }
  }

  return (
    <g className="terminal-element">
      {/* Terminal shape */}
      <path
        d={terminal.path}
        fill={getFill()}
        stroke={getStroke()}
        strokeWidth={isSelected ? 3 : terminal.type === 'apron' ? 1 : 2}
        className={terminal.type !== 'beacon' && terminal.type !== 'windsock' ? 'cursor-pointer' : ''}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        opacity={terminal.type === 'apron' ? 0.6 : 1}
      />

      {/* Label for named terminals */}
      {terminal.label && terminal.type !== 'beacon' && terminal.type !== 'windsock' && (
        <text
          x={labelX}
          y={labelY + 4}
          textAnchor="middle"
          fill="var(--text-tertiary)"
          fontSize="8"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          letterSpacing="0.05em"
          className="pointer-events-none"
        >
          {terminal.label}
        </text>
      )}

      {/* Special icon for beacon */}
      {terminal.type === 'beacon' && (
        <g className="pointer-events-none">
          <circle
            cx={labelX}
            cy={labelY}
            r="4"
            fill="var(--bg-surface)"
          />
          <text
            x={labelX}
            y={labelY + 20}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="7"
            fontWeight="500"
            fontFamily="Inter, sans-serif"
          >
            BCN
          </text>
        </g>
      )}

      {/* Special icon for windsock */}
      {terminal.type === 'windsock' && (
        <g className="pointer-events-none">
          <line
            x1={labelX}
            y1={labelY}
            x2={labelX + 10}
            y2={labelY - 5}
            stroke="var(--status-open)"
            strokeWidth="2"
          />
          <polygon
            points={`${labelX + 10},${labelY - 8} ${labelX + 18},${labelY - 5} ${labelX + 10},${labelY - 2}`}
            fill="var(--curfew-color)"
          />
        </g>
      )}
    </g>
  );
}
