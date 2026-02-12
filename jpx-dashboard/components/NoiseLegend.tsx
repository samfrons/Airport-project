'use client';

import { useFlightStore } from '@/store/flightStore';

const sensorScale = [
  { dB: '<55', color: '#22c55e', label: 'Quiet' },
  { dB: '55-65', color: '#84cc16', label: 'Normal' },
  { dB: '65-75', color: '#eab308', label: 'Moderate' },
  { dB: '75-85', color: '#f97316', label: 'Elevated' },
  { dB: '>85', color: '#ef4444', label: 'High' },
];

const aircraftCategories = [
  { category: 'Quiet', color: '#22c55e' },
  { category: 'Moderate', color: '#eab308' },
  { category: 'Loud', color: '#f97316' },
  { category: 'Very Loud', color: '#ef4444' },
];

const complaintSeverity = [
  { level: 1, color: '#fbbf24', label: 'Minor' },
  { level: 3, color: '#f97316', label: 'Mod' },
  { level: 5, color: '#dc2626', label: 'Severe' },
];

const biodiversityZones = [
  { severity: 'Critical', color: '#dc2626', range: '>85 dB' },
  { severity: 'High', color: '#ea580c', range: '70-85 dB' },
  { severity: 'Moderate', color: '#d97706', range: '55-70 dB' },
  { severity: 'Low', color: '#65a30d', range: '45-55 dB' },
  { severity: 'Minimal', color: '#16a34a', range: '35-45 dB' },
];

export function NoiseLegend() {
  const { noiseSettings, biodiversitySettings } = useFlightStore();

  const hasVisibleLayer = Object.values(noiseSettings.visibility).some(Boolean);
  const hasAnyVisible = hasVisibleLayer || biodiversitySettings.visible;

  if (!hasAnyVisible) return null;

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-3 min-w-[140px]">
      {noiseSettings.visibility.sensors && (
        <div className="mb-3">
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2">
            Sensor Levels (dB)
          </div>
          <div className="flex flex-col gap-1">
            {sensorScale.map((item) => (
              <div key={item.dB} className="flex items-center gap-2">
                <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 tabular-nums w-10">{item.dB}</span>
                <span className="text-[10px] text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {noiseSettings.visibility.aircraftNoise && (
        <div
          className={
            noiseSettings.visibility.sensors ? 'pt-3 border-t border-zinc-200 dark:border-zinc-800 mb-3' : 'mb-3'
          }
        >
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2">
            Aircraft Noise
          </div>
          <div className="flex flex-col gap-1">
            {aircraftCategories.map((item) => (
              <div key={item.category} className="flex items-center gap-2">
                <div className="w-3 h-0.5" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {noiseSettings.visibility.complaints && (
        <div
          className={
            noiseSettings.visibility.sensors || noiseSettings.visibility.aircraftNoise
              ? 'pt-3 border-t border-zinc-200 dark:border-zinc-800 mb-3'
              : 'mb-3'
          }
        >
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2">
            Complaint Severity
          </div>
          <div className="flex items-center gap-3">
            {complaintSeverity.map((item) => (
              <div key={item.level} className="flex items-center gap-1">
                <div className="w-2 h-2" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {biodiversitySettings.visible && (
        <div
          className={
            hasVisibleLayer
              ? 'pt-3 border-t border-zinc-200 dark:border-zinc-800'
              : ''
          }
        >
          <div className="text-[9px] font-medium text-emerald-600 uppercase tracking-[0.12em] mb-2">
            Biodiversity Impact
          </div>
          <div className="flex flex-col gap-1">
            {biodiversityZones.map((item) => (
              <div key={item.severity} className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: item.color, opacity: 0.6 }}
                />
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 w-14">{item.severity}</span>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 tabular-nums">{item.range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
