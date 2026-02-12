/**
 * Noise Conditions Widget
 *
 * Dashboard indicator showing current noise propagation conditions
 * based on wind direction and temperature inversions.
 *
 * Display levels:
 * - Green: Normal conditions (neutral propagation)
 * - Yellow: Moderate amplification (light inversion OR downwind)
 * - Red: High amplification (strong inversion + downwind)
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  type PropagationConditions,
  getPropagationConditions,
  formatWindDirection,
  type WindConditions,
  type TemperatureProfile,
} from '@/lib/noise/weatherAdjustments';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NoiseConditionsWidgetProps {
  wind?: WindConditions;
  inversion?: TemperatureProfile;
  className?: string;
  compact?: boolean;
  onConditionsChange?: (conditions: PropagationConditions) => void;
}

interface InversionApiResponse {
  success: boolean;
  analysis: {
    surfaceWindDir: number;
    surfaceWindSpeedKt: number;
    inversionPresent: boolean;
    inversionStrength: 'none' | 'weak' | 'moderate' | 'strong';
    strongestInversion: {
      baseAltFt: number;
      topAltFt: number;
    } | null;
    description: string;
    soundingTime: string;
    dataAge: string;
    nextSoundingTime: string;
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NoiseConditionsWidget({
  wind: propWind,
  inversion: propInversion,
  className = '',
  compact = false,
  onConditionsChange,
}: NoiseConditionsWidgetProps) {
  const [conditions, setConditions] = useState<PropagationConditions | null>(null);
  const [wind, setWind] = useState<WindConditions>(propWind || { direction: 0, speed: 0 });
  const [inversion, setInversion] = useState<TemperatureProfile>(
    propInversion || {
      surfaceTemp: 20,
      inversionPresent: false,
      inversionStrength: 'none',
      inversionBaseAlt: 0,
      inversionTopAlt: 0,
    }
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Fetch current conditions if not provided
  useEffect(() => {
    if (propWind && propInversion) {
      // Use provided values
      const newConditions = getPropagationConditions(propWind, propInversion);
      setConditions(newConditions);
      setLoading(false);
      onConditionsChange?.(newConditions);
      return;
    }

    const fetchConditions = async () => {
      try {
        setLoading(true);

        // Fetch from inversion API (includes wind data)
        const response = await fetch('/api/weather/inversion');
        const data: InversionApiResponse = await response.json();

        if (data.success && data.analysis) {
          const windData: WindConditions = {
            direction: data.analysis.surfaceWindDir,
            speed: data.analysis.surfaceWindSpeedKt,
          };

          const inversionData: TemperatureProfile = {
            surfaceTemp: 20, // Not returned by API, use default
            inversionPresent: data.analysis.inversionPresent,
            inversionStrength: data.analysis.inversionStrength,
            inversionBaseAlt: data.analysis.strongestInversion?.baseAltFt || 0,
            inversionTopAlt: data.analysis.strongestInversion?.topAltFt || 0,
          };

          setWind(windData);
          setInversion(inversionData);

          const newConditions = getPropagationConditions(windData, inversionData);
          setConditions(newConditions);
          onConditionsChange?.(newConditions);
          setLastUpdate(data.analysis.dataAge);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch noise conditions:', err);
        setError('Unable to fetch conditions');
        // Use defaults
        const defaultConditions = getPropagationConditions(wind, inversion);
        setConditions(defaultConditions);
      } finally {
        setLoading(false);
      }
    };

    fetchConditions();

    // Refresh every 30 minutes
    const interval = setInterval(fetchConditions, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [propWind, propInversion, onConditionsChange]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 w-32 mb-2"></div>
          <div className="h-8 bg-gray-700 w-full"></div>
        </div>
      </div>
    );
  }

  if (!conditions) {
    return null;
  }

  const colorClasses = {
    green: {
      bg: 'bg-green-900/30',
      border: 'border-green-500',
      text: 'text-green-400',
      dot: 'bg-green-500',
    },
    yellow: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      dot: 'bg-yellow-500',
    },
    red: {
      bg: 'bg-red-900/30',
      border: 'border-red-500',
      text: 'text-red-400',
      dot: 'bg-red-500',
    },
  };

  const colors = colorClasses[conditions.color];

  if (compact) {
    return (
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5
          ${colors.bg} border ${colors.border}
          ${className}
        `}
        title={conditions.description}
      >
        <span className={`w-2 h-2 ${colors.dot} animate-pulse`}></span>
        <span className={`text-sm font-medium ${colors.text}`}>
          {conditions.label}
        </span>
        {conditions.windAdjustment !== 0 && (
          <span className="text-xs text-gray-400">
            ({conditions.windAdjustment > 0 ? '+' : ''}{conditions.windAdjustment} dB wind)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${colors.bg} border ${colors.border} p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 ${colors.dot} animate-pulse`}></span>
          <h3 className={`font-semibold ${colors.text}`}>
            {conditions.label}
          </h3>
        </div>
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4">
        {conditions.description}
      </p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Wind Info */}
        <div className="bg-gray-800/50 p-3">
          <div className="text-gray-400 text-xs mb-1">Wind</div>
          <div className="text-white font-medium">
            {wind.speed > 0 ? (
              <>
                {formatWindDirection(wind.direction)} at {wind.speed} kt
              </>
            ) : (
              'Calm'
            )}
          </div>
          {conditions.windAdjustment !== 0 && (
            <div className={`text-xs mt-1 ${conditions.windAdjustment > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {conditions.windAdjustment > 0 ? '+' : ''}{conditions.windAdjustment} dB
            </div>
          )}
        </div>

        {/* Inversion Info */}
        <div className="bg-gray-800/50 p-3">
          <div className="text-gray-400 text-xs mb-1">Inversion</div>
          <div className="text-white font-medium capitalize">
            {inversion.inversionPresent ? inversion.inversionStrength : 'None'}
          </div>
          {conditions.inversionAdjustment > 0 && (
            <div className="text-xs mt-1 text-red-400">
              +{conditions.inversionAdjustment} dB
            </div>
          )}
        </div>
      </div>

      {/* Total Adjustment */}
      {(conditions.windAdjustment !== 0 || conditions.inversionAdjustment !== 0) && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Net Adjustment</span>
            <span className={`font-bold ${colors.text}`}>
              {conditions.windAdjustment + conditions.inversionAdjustment > 0 ? '+' : ''}
              {conditions.windAdjustment + conditions.inversionAdjustment} dB
            </span>
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="mt-3 text-xs text-gray-500">
          Data: {lastUpdate}
        </div>
      )}
    </div>
  );
}

export default NoiseConditionsWidget;
