'use client';

import { useState, useEffect } from 'react';
import { Wind, AlertTriangle, Loader2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AQIPollutant {
  aqi: number;
  category: string;
  category_number: number;
}

interface AQIData {
  overall_aqi: number;
  category: string;
  category_number: number;
  main_pollutant: string;
  reporting_area: string;
  state: string;
  date_observed: string;
  hour_observed: number;
  pollutants: Record<string, AQIPollutant>;
}

interface AirQualityResponse {
  parsed: AQIData;
  cached: boolean;
  stale: boolean;
  error?: string;
}

// ── AQI Category Styling ─────────────────────────────────────────────────────

const aqiCategories: Record<number, { label: string; color: string; bgColor: string; textColor: string }> = {
  1: { label: 'Good', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', textColor: '#22c55e' },
  2: { label: 'Moderate', color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)', textColor: '#eab308' },
  3: { label: 'Unhealthy for Sensitive', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)', textColor: '#f97316' },
  4: { label: 'Unhealthy', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', textColor: '#ef4444' },
  5: { label: 'Very Unhealthy', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)', textColor: '#a855f7' },
  6: { label: 'Hazardous', color: '#7c2d12', bgColor: 'rgba(124, 45, 18, 0.25)', textColor: '#dc2626' },
};

// ── Component ────────────────────────────────────────────────────────────────

interface AirQualityBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export function AirQualityBadge({ className = '', showDetails = false }: AirQualityBadgeProps) {
  const [data, setData] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAQI() {
      try {
        const response = await fetch('/api/air-quality');

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch air quality data');
        }

        const result: AirQualityResponse = await response.json();

        if (mounted) {
          if (result.parsed) {
            setData(result.parsed);
            setError(null);
          } else if (result.error) {
            setError(result.error);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchAQI();

    // Refresh every hour
    const interval = setInterval(fetchAQI, 3600000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 size={14} className="animate-spin text-zinc-500" />
        <span className="text-[10px] text-zinc-500">Loading AQI...</span>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertTriangle size={14} className="text-zinc-600" />
        <span className="text-[10px] text-zinc-500" title={error || undefined}>
          AQI unavailable
        </span>
      </div>
    );
  }

  const category = aqiCategories[data.category_number] || aqiCategories[1];

  // Compact badge
  if (!showDetails) {
    return (
      <div
        className={`flex items-center gap-2 px-2 py-1 ${className}`}
        style={{ backgroundColor: category.bgColor }}
        title={`${data.category} - Main pollutant: ${data.main_pollutant}`}
      >
        <Wind size={12} style={{ color: category.color }} />
        <span className="text-[11px] font-medium tabular-nums" style={{ color: category.textColor }}>
          AQI {data.overall_aqi}
        </span>
        <span className="text-[9px] text-zinc-500">{category.label}</span>
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`bg-zinc-900 border border-zinc-800 ${className}`}>
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5"
            style={{ backgroundColor: category.bgColor }}
          >
            <Wind size={14} style={{ color: category.color }} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Air Quality Index</h4>
            <p className="text-[10px] text-zinc-500">{data.reporting_area}, {data.state}</p>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: category.textColor }}
          >
            {data.overall_aqi}
          </div>
          <div
            className="text-[10px] font-medium"
            style={{ color: category.color }}
          >
            {category.label}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">Main Pollutant</span>
          <span className="text-[11px] text-zinc-300 font-medium">{data.main_pollutant}</span>
        </div>

        {Object.entries(data.pollutants).length > 1 && (
          <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
            {Object.entries(data.pollutants).map(([name, pollutant]) => {
              const pollutantCategory = aqiCategories[pollutant.category_number] || aqiCategories[1];
              return (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">{name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] tabular-nums font-medium"
                      style={{ color: pollutantCategory.textColor }}
                    >
                      {pollutant.aqi}
                    </span>
                    <div
                      className="w-2 h-2"
                      style={{ backgroundColor: pollutantCategory.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
          <span className="text-[9px] text-zinc-600">
            Observed: {data.date_observed} {data.hour_observed}:00
          </span>
          <span className="text-[9px] text-zinc-600">EPA AirNow</span>
        </div>
      </div>
    </div>
  );
}

// ── Inline Badge (for headers) ───────────────────────────────────────────────

export function AirQualityInlineBadge({ className = '' }: { className?: string }) {
  const [data, setData] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchAQI() {
      try {
        const response = await fetch('/api/air-quality');
        if (response.ok) {
          const result: AirQualityResponse = await response.json();
          if (mounted && result.parsed) {
            setData(result.parsed);
          }
        }
      } catch {
        // Silently fail for inline badge
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAQI();
    const interval = setInterval(fetchAQI, 3600000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !data) return null;

  const category = aqiCategories[data.category_number] || aqiCategories[1];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium ${className}`}
      style={{ backgroundColor: category.bgColor, color: category.textColor }}
      title={`Air Quality: ${category.label} (${data.main_pollutant})`}
    >
      AQI {data.overall_aqi}
    </span>
  );
}
