'use client';

import { Volume2, Plane, MessageSquare, Eye, EyeOff, Sliders } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import type { NoiseLayerSettings, ComplaintsDisplayMode } from '@/types/noise';

export function NoiseLayerControls() {
  const { noiseSettings, setNoiseSettings, toggleNoiseLayer, setNoiseLayerOpacity } =
    useFlightStore();

  const layers = [
    {
      key: 'sensors' as const,
      label: 'Noise Sensors',
      icon: Volume2,
      description: 'Community monitoring',
    },
    {
      key: 'aircraftNoise' as const,
      label: 'Aircraft Noise',
      icon: Plane,
      description: 'Flight path corridors',
    },
    {
      key: 'complaints' as const,
      label: 'Complaints',
      icon: MessageSquare,
      description: 'Resident reports',
    },
  ];

  const complaintsDisplayModes: { mode: ComplaintsDisplayMode; label: string }[] = [
    { mode: 'markers', label: 'Markers' },
    { mode: 'clusters', label: 'Clusters' },
    { mode: 'heatmap', label: 'Heat' },
  ];

  return (
    <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-3 min-w-[200px]">
      <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
        <Sliders size={10} />
        Noise Layers
      </div>

      <div className="flex flex-col gap-2">
        {layers.map(({ key, label, icon: Icon, description }) => (
          <div key={key} className="space-y-1.5">
            <button
              onClick={() => toggleNoiseLayer(key)}
              className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 transition-colors ${
                noiseSettings.visibility[key]
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={12} strokeWidth={1.5} />
                <span className="text-[11px] font-medium">{label}</span>
              </div>
              {noiseSettings.visibility[key] ? (
                <Eye size={12} className="text-blue-400" />
              ) : (
                <EyeOff size={12} />
              )}
            </button>

            {noiseSettings.visibility[key] && (
              <div className="px-2 pb-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={noiseSettings.opacity[key]}
                  onChange={(e) => setNoiseLayerOpacity(key, parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 appearance-none cursor-pointer accent-blue-500"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      noiseSettings.opacity[key] * 100
                    }%, #3f3f46 ${noiseSettings.opacity[key] * 100}%, #3f3f46 100%)`,
                  }}
                />
                <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                  <span>{description}</span>
                  <span>{Math.round(noiseSettings.opacity[key] * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Complaints display mode selector */}
      {noiseSettings.visibility.complaints && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-[9px] text-zinc-600 mb-1.5">Complaint Display</div>
          <div className="flex gap-px bg-zinc-800 p-0.5">
            {complaintsDisplayModes.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() =>
                  setNoiseSettings({
                    ...noiseSettings,
                    complaintsMode: mode,
                  })
                }
                className={`flex-1 px-2 py-1 text-[10px] font-medium transition-colors ${
                  noiseSettings.complaintsMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
