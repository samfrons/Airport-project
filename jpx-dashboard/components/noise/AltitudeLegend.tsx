'use client';

import { Mountain } from 'lucide-react';
import {
  STANDARD_ALTITUDES,
  calculateDbAtAltitude,
  getDbLevelColor,
  formatAltitude,
} from './NoiseCalculator';

interface AltitudeLegendProps {
  referenceDb?: number;
}

export function AltitudeLegend({ referenceDb = 85 }: AltitudeLegendProps) {
  const maxDb = 95;
  const minDb = 65;

  const altitudeData = STANDARD_ALTITUDES.map((alt) => ({
    altitude: alt,
    db: calculateDbAtAltitude(referenceDb, alt),
  }));

  return (
    <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-3 min-w-[180px]">
      <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
        <Mountain size={10} />
        Altitude vs Noise
      </div>

      <div className="text-[9px] text-zinc-500 mb-2">
        Reference: {referenceDb} dB @ 1,000'
      </div>

      <div className="space-y-1.5">
        {altitudeData.map(({ altitude, db }) => {
          const barWidth = ((db - minDb) / (maxDb - minDb)) * 100;
          return (
            <div key={altitude} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-10 text-right tabular-nums">
                {formatAltitude(altitude)}
              </span>
              <div className="flex-1 h-1.5 bg-zinc-800 relative">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.max(10, Math.min(100, barWidth))}%`,
                    backgroundColor: getDbLevelColor(db),
                  }}
                />
              </div>
              <span
                className="text-[10px] font-medium w-12 text-right tabular-nums"
                style={{ color: getDbLevelColor(db) }}
              >
                {Math.round(db)} dB
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-zinc-800">
        <p className="text-[9px] text-zinc-600 leading-relaxed">
          Sound decreases ~6 dB per doubling of altitude
        </p>
      </div>
    </div>
  );
}
