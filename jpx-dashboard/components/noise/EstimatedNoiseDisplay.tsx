'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';

interface EstimatedNoiseDisplayProps {
  value: number;
  /** Format: 'dB' | 'short' - 'dB' shows "Est. 81 dB", 'short' shows "~81" */
  format?: 'dB' | 'short';
  className?: string;
  showTooltip?: boolean;
}

const NOISE_METHODOLOGY_TOOLTIP = `Noise estimates based on aircraft type certification data.

Actual ground-level noise varies with:
• Altitude and distance
• Atmospheric conditions
• Aircraft configuration

No physical noise monitors currently installed at JPX.`;

export function EstimatedNoiseDisplay({
  value,
  format = 'dB',
  className = '',
  showTooltip = true,
}: EstimatedNoiseDisplayProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const displayValue = format === 'dB' ? `Est. ${value} dB` : `~${value}`;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <span>{displayValue}</span>
      {showTooltip && (
        <span className="relative">
          <Info size={10} className="text-zinc-400 cursor-help" />
          {isTooltipVisible && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 whitespace-pre-line z-50 shadow-lg">
              {NOISE_METHODOLOGY_TOOLTIP}
            </div>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * Simple text-only estimated noise label
 * Use this for inline text where a component isn't practical
 */
export function formatEstimatedNoise(value: number, format: 'dB' | 'short' = 'dB'): string {
  return format === 'dB' ? `Est. ${value} dB` : `~${value}`;
}

/**
 * Noise methodology disclaimer text
 * Add this to any section showing noise data
 */
export const NOISE_ESTIMATE_DISCLAIMER =
  'Noise values are estimates based on aircraft type certification data, not physical measurements.';
