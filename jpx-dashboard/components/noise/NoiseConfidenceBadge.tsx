'use client';

import { AlertTriangle, CheckCircle, HelpCircle, Info } from 'lucide-react';

interface NoiseConfidenceBadgeProps {
  source: 'EASA_CERTIFIED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
  confidence: 'high' | 'medium' | 'low';
  aircraftType?: string;
  manufacturer?: string;
  model?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Badge component to indicate noise estimate data source and confidence
 *
 * - EASA_CERTIFIED (high): Green checkmark - Official EASA certification data
 * - CATEGORY_ESTIMATE (medium): Yellow info - Estimated from aircraft category
 * - UNVERIFIED (low): Red warning - No official data, using defaults
 */
export function NoiseConfidenceBadge({
  source,
  confidence,
  aircraftType,
  manufacturer,
  model,
  showDetails = false,
  compact = false,
}: NoiseConfidenceBadgeProps) {
  const config = getConfidenceConfig(source, confidence);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.textColor}`}
        title={config.tooltip}
      >
        <config.icon className="w-3 h-3" />
        {config.shortLabel}
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col gap-1 ${showDetails ? 'min-w-[200px]' : ''}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium ${config.bgColor} ${config.textColor}`}
        title={config.tooltip}
      >
        <config.icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </div>

      {showDetails && (
        <div className="text-xs text-gray-400 pl-1">
          {source === 'EASA_CERTIFIED' ? (
            <>
              <div className="font-medium">{manufacturer} {model}</div>
              <div className="text-gray-500">ICAO: {aircraftType}</div>
            </>
          ) : source === 'CATEGORY_ESTIMATE' ? (
            <>
              <div>Category average used</div>
              <div className="text-gray-500">No data for: {aircraftType}</div>
            </>
          ) : (
            <>
              <div>Using default estimate</div>
              <div className="text-gray-500">Unknown type: {aircraftType}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline text indicator for data source
 */
export function NoiseSourceIndicator({
  source,
  confidence,
}: {
  source: 'EASA_CERTIFIED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
  confidence: 'high' | 'medium' | 'low';
}) {
  const config = getConfidenceConfig(source, confidence);

  return (
    <span className={`inline-flex items-center gap-1 ${config.textColor}`}>
      <config.icon className="w-3 h-3" />
      <span className="text-xs">{config.shortLabel}</span>
    </span>
  );
}

/**
 * Warning banner for unverified noise estimates
 */
export function NoiseDataWarning({
  aircraftType,
  category,
  estimatedDb,
}: {
  aircraftType: string;
  category: string;
  estimatedDb: number;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-medium">Unverified Noise Estimate</div>
        <div className="text-amber-300/80 mt-0.5">
          No EASA certification data available for aircraft type <code className="bg-amber-500/20 px-1">{aircraftType}</code>.
          Using {category} category average ({estimatedDb} dB). Actual noise levels may vary.
        </div>
      </div>
    </div>
  );
}

/**
 * Tooltip content for noise source info
 */
export function NoiseSourceTooltip({
  source,
  confidence,
  manufacturer,
  model,
  epnl,
}: {
  source: 'EASA_CERTIFIED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
  confidence: 'high' | 'medium' | 'low';
  manufacturer?: string | null;
  model?: string | null;
  epnl?: number | null;
}) {
  if (source === 'EASA_CERTIFIED') {
    return (
      <div className="text-xs">
        <div className="font-medium text-green-400">EASA Certified</div>
        <div className="text-gray-300">{manufacturer} {model}</div>
        {epnl && <div className="text-gray-400">EPNL: {epnl.toFixed(1)} dB</div>}
      </div>
    );
  }

  if (source === 'CATEGORY_ESTIMATE') {
    return (
      <div className="text-xs">
        <div className="font-medium text-amber-400">Category Estimate</div>
        <div className="text-gray-300">Based on similar aircraft types</div>
        <div className="text-gray-400">Moderate confidence</div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <div className="font-medium text-red-400">Unverified</div>
      <div className="text-gray-300">Using default noise values</div>
      <div className="text-gray-400">Low confidence - use with caution</div>
    </div>
  );
}

// Helper function to get configuration based on source/confidence
function getConfidenceConfig(
  source: 'EASA_CERTIFIED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED',
  confidence: 'high' | 'medium' | 'low'
) {
  switch (source) {
    case 'EASA_CERTIFIED':
      return {
        icon: CheckCircle,
        label: 'EASA Certified',
        shortLabel: 'Certified',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        tooltip: 'Official EASA certification data - High confidence',
      };

    case 'CATEGORY_ESTIMATE':
      return {
        icon: Info,
        label: 'Category Estimate',
        shortLabel: 'Estimated',
        bgColor: 'bg-amber-500/20',
        textColor: 'text-amber-400',
        tooltip: 'Estimated from aircraft category average - Medium confidence',
      };

    case 'UNVERIFIED':
    default:
      return {
        icon: confidence === 'low' ? AlertTriangle : HelpCircle,
        label: 'Unverified',
        shortLabel: 'Unverified',
        bgColor: confidence === 'low' ? 'bg-red-500/20' : 'bg-gray-500/20',
        textColor: confidence === 'low' ? 'text-red-400' : 'text-gray-400',
        tooltip: 'No official data available - Use with caution',
      };
  }
}

export default NoiseConfidenceBadge;
