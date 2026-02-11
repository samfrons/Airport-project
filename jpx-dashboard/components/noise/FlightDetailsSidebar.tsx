'use client';

import { X, Plane, User, Volume2, Navigation, MapPin, TreePine, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import {
  generateAltitudeProfile,
  getDbLevelColor,
  formatAltitude,
  getNoiseLabel,
} from './NoiseCalculator';
import { evaluateFlight } from '@/lib/biodiversityViolationEngine';
import { getImpactSeverityColor } from '@/types/biodiversity';
import type { Flight } from '@/types/flight';

interface FlightDetailsSidebarProps {
  flight: Flight | null;
  onClose: () => void;
}

export function FlightDetailsSidebar({ flight, onClose }: FlightDetailsSidebarProps) {
  if (!flight) return null;

  const profile = getAircraftNoiseProfile(flight.aircraft_type);
  const baseDb = flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
  const altitudeProfile = generateAltitudeProfile(baseDb);
  const thresholds = useFlightStore((s) => s.thresholds);
  const bioViolation = useMemo(() => evaluateFlight(flight, thresholds), [flight, thresholds]);

  const maxDb = 100;
  const minDb = 65;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] flex items-center gap-1.5">
          <Plane size={10} />
          Flight Details
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Registration - Prominent */}
        <div>
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-1">
            Registration
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 text-center">
            <span className="text-xl font-bold text-zinc-100 tracking-wider">
              {flight.registration || flight.ident}
            </span>
          </div>
        </div>

        {/* Operator */}
        <div>
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-1 flex items-center gap-1">
            <User size={10} />
            Operator
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-zinc-200">
              {flight.operator || 'Private'}
            </span>
            {flight.operator_iata && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {flight.operator_iata}
              </span>
            )}
          </div>
        </div>

        {/* Aircraft */}
        <div>
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-1 flex items-center gap-1">
            <Plane size={10} />
            Aircraft
          </div>
          <div className="space-y-1">
            <div className="text-[13px] text-zinc-200">{flight.aircraft_type}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 capitalize">
                {flight.aircraft_category.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-zinc-600">•</span>
              <span
                className="text-[10px] font-medium uppercase"
                style={{ color: getDbLevelColor(baseDb) }}
              >
                {getNoiseLabel(baseDb)}
              </span>
            </div>
          </div>
        </div>

        {/* Noise Profile */}
        <div>
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1">
            <Volume2 size={10} />
            Noise by Altitude
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3 space-y-2">
            {altitudeProfile.map(({ altitude, db }) => {
              const barWidth = ((db - minDb) / (maxDb - minDb)) * 100;
              return (
                <div key={altitude} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-10 text-right tabular-nums">
                    {formatAltitude(altitude)}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-800 relative">
                    <div
                      className="h-full"
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
          <div className="mt-2 flex justify-between text-[10px]">
            <span className="text-zinc-600">Takeoff</span>
            <span className="text-zinc-400">{profile.takeoffDb} dB @ 1,000'</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-600">Approach</span>
            <span className="text-zinc-400">{profile.approachDb} dB @ 1,000'</span>
          </div>
        </div>

        {/* Route */}
        <div>
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1">
            <Navigation size={10} />
            Route
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-center">
                <div className="text-[13px] font-bold text-zinc-200">
                  {flight.origin_code}
                </div>
                <div className="text-[10px] text-zinc-500">{flight.origin_city}</div>
              </div>
              <div className="flex-1 flex items-center justify-center px-3">
                <div className="h-px flex-1 bg-zinc-700" />
                <span className="px-2 text-[10px] text-zinc-500">
                  {flight.direction === 'arrival' ? '→' : '←'}
                </span>
                <div className="h-px flex-1 bg-zinc-700" />
              </div>
              <div className="text-center">
                <div className="text-[13px] font-bold text-zinc-200">
                  {flight.destination_code}
                </div>
                <div className="text-[10px] text-zinc-500">{flight.destination_city}</div>
              </div>
            </div>
            <div className="flex justify-center">
              <span
                className={`text-[10px] font-medium uppercase px-2 py-0.5 ${
                  flight.direction === 'arrival'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {flight.direction}
              </span>
            </div>
          </div>
        </div>

        {/* Timing */}
        <div>
          <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-1 flex items-center gap-1">
            <MapPin size={10} />
            Operation Details
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Date</span>
              <span className="text-zinc-300">{flight.operation_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Hour (ET)</span>
              <span className="text-zinc-300">
                {flight.operation_hour_et}:00
              </span>
            </div>
            {flight.is_curfew_period && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Curfew</span>
                <span className="text-amber-400 font-medium">Yes</span>
              </div>
            )}
          </div>
        </div>

        {/* Biodiversity Impact */}
        {bioViolation && (
          <div>
            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1">
              <TreePine size={10} />
              Wildlife Impact
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-3 space-y-2.5">
              {/* Severity */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Severity</span>
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: getImpactSeverityColor(bioViolation.overallSeverity) }}
                >
                  {bioViolation.overallSeverity}
                </span>
              </div>

              {/* Thresholds violated */}
              <div>
                <div className="text-[9px] text-zinc-600 mb-1">Thresholds Violated</div>
                <div className="space-y-1">
                  {bioViolation.violatedThresholds.map((t) => (
                    <div
                      key={t.thresholdId}
                      className="flex items-start gap-1.5 text-[9px]"
                    >
                      <AlertTriangle
                        size={8}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: getImpactSeverityColor(t.severity) }}
                      />
                      <span className="text-zinc-400 leading-relaxed">
                        {t.thresholdLabel}
                        {t.exceedanceDb != null && (
                          <span className="text-red-400 ml-1">+{t.exceedanceDb} dB</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Protected species */}
              {bioViolation.speciesAffected.filter((s) => s.conservationStatus).length > 0 && (
                <div>
                  <div className="text-[9px] text-red-500 mb-1">Protected Species Affected</div>
                  <div className="flex flex-wrap gap-1">
                    {bioViolation.speciesAffected
                      .filter((s) => s.conservationStatus)
                      .map((sp) => (
                        <span
                          key={sp.speciesId}
                          className="text-[8px] px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-900/20"
                        >
                          {sp.commonName}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Species count */}
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Species affected</span>
                <span className="text-zinc-300">{bioViolation.speciesAffected.length}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Habitats impacted</span>
                <span className="text-zinc-300">{bioViolation.habitatsAffected.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
