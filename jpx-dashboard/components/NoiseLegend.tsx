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

export function NoiseLegend() {
  const { noiseSettings } = useFlightStore();

  const hasVisibleLayer = Object.values(noiseSettings.visibility).some(Boolean);

  if (!hasVisibleLayer) return null;

  return (
    <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-3 min-w-[140px]">
      {noiseSettings.visibility.sensors && (
        <div className="mb-3">
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2">
            Sensor Levels (dB)
          </div>
          <div className="flex flex-col gap-1">
            {sensorScale.map((item) => (
              <div key={item.dB} className="flex items-center gap-2">
                <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-zinc-400 tabular-nums w-10">{item.dB}</span>
                <span className="text-[10px] text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {noiseSettings.visibility.aircraftNoise && (
        <div
          className={
            noiseSettings.visibility.sensors ? 'pt-3 border-t border-zinc-800 mb-3' : 'mb-3'
          }
        >
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2">
            Aircraft Noise
          </div>
          <div className="flex flex-col gap-1">
            {aircraftCategories.map((item) => (
              <div key={item.category} className="flex items-center gap-2">
                <div className="w-3 h-0.5" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-zinc-400">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {noiseSettings.visibility.complaints && (
        <div
          className={
            noiseSettings.visibility.sensors || noiseSettings.visibility.aircraftNoise
              ? 'pt-3 border-t border-zinc-800'
              : ''
          }
        >
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2">
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
    </div>
  );
}
