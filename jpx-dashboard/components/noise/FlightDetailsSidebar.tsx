'use client';

import { X, Plane, User, Volume2, Navigation, MapPin, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import {
  generateAltitudeProfile,
  getDbLevelColor,
  formatAltitude,
  getNoiseLabel,
} from './NoiseCalculator';
import { NoiseConfidenceBadge, NoiseSourceIndicator } from './NoiseConfidenceBadge';
import { formatEstimatedNoise, NOISE_ESTIMATE_DISCLAIMER } from './EstimatedNoiseDisplay';
import type { Flight } from '@/types/flight';

// Extended Flight type with EASA noise profile data
interface FlightWithNoiseProfile extends Flight {
  noise_profile?: {
    takeoff_db: number;
    approach_db: number;
    effective_db: number;
    noise_category: string;
    lateral_epnl: number | null;
    flyover_epnl: number | null;
    approach_epnl: number | null;
    manufacturer: string | null;
    model: string | null;
    data_source: 'EASA_CERTIFIED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
    confidence: 'high' | 'medium' | 'low';
    altitude_profile: Array<{ altitude_ft: number; db: number }>;
  };
}

interface FlightDetailsSidebarProps {
  flight: FlightWithNoiseProfile | null;
  onClose: () => void;
}

export function FlightDetailsSidebar({ flight, onClose }: FlightDetailsSidebarProps) {
  if (!flight) return null;

  // Use EASA-based profile from API if available, otherwise fall back to local profiles
  const hasEASAProfile = !!flight.noise_profile;
  const profile = hasEASAProfile
    ? {
        aircraftType: flight.aircraft_type,
        category: flight.aircraft_category,
        noiseCategory: flight.noise_profile!.noise_category,
        takeoffDb: flight.noise_profile!.takeoff_db,
        approachDb: flight.noise_profile!.approach_db,
      }
    : getAircraftNoiseProfile(flight.aircraft_type);

  const baseDb = flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;

  // Use EASA altitude profile if available
  const altitudeProfile = hasEASAProfile && flight.noise_profile!.altitude_profile
    ? flight.noise_profile!.altitude_profile.map(({ altitude_ft, db }) => ({ altitude: altitude_ft, db }))
    : generateAltitudeProfile(baseDb);

  const maxDb = 100;
  const minDb = 65;

  // Extract EASA certification data
  const easaData = flight.noise_profile;
  const dataSource = easaData?.data_source || 'UNVERIFIED';
  const confidence = easaData?.confidence || 'low';

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] flex items-center gap-1.5">
          <Plane size={10} />
          Flight Details
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Registration - Prominent */}
        <div>
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-1">
            Registration
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-center">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
              {flight.registration || flight.ident}
            </span>
          </div>
        </div>

        {/* Operator */}
        <div>
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-1 flex items-center gap-1">
            <User size={10} />
            Operator
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-zinc-800 dark:text-zinc-200">
              {flight.operator || 'Private'}
            </span>
            {flight.operator_iata && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {flight.operator_iata}
              </span>
            )}
          </div>
        </div>

        {/* Aircraft - Enhanced with EASA data */}
        <div>
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-1 flex items-center gap-1">
            <Plane size={10} />
            Aircraft
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-[13px] text-zinc-800 dark:text-zinc-200">{flight.aircraft_type}</div>
              <NoiseConfidenceBadge
                source={dataSource}
                confidence={confidence}
                aircraftType={flight.aircraft_type}
                manufacturer={easaData?.manufacturer ?? undefined}
                model={easaData?.model ?? undefined}
                compact
              />
            </div>

            {/* EASA Aircraft Identification */}
            {easaData?.manufacturer && (
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {easaData.manufacturer} {easaData.model}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 capitalize">
                {flight.aircraft_category.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">•</span>
              <span
                className="text-[10px] font-medium uppercase"
                style={{ color: getDbLevelColor(baseDb) }}
              >
                {getNoiseLabel(baseDb)}
              </span>
            </div>
          </div>
        </div>

        {/* EASA Certification Data (when available) */}
        {easaData && dataSource === 'EASA_CERTIFIED' && (
          <div>
            <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1">
              <CheckCircle size={10} className="text-green-500" />
              EASA Certification
            </div>
            <div className="bg-green-500/10 dark:bg-green-950/30 border border-green-500/20 dark:border-green-900/40 p-3 space-y-2">
              {easaData.flyover_epnl && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-green-600 dark:text-green-400">Flyover EPNL</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {easaData.flyover_epnl.toFixed(1)} EPNdB
                  </span>
                </div>
              )}
              {easaData.lateral_epnl && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-green-600 dark:text-green-400">Lateral EPNL</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {easaData.lateral_epnl.toFixed(1)} EPNdB
                  </span>
                </div>
              )}
              {easaData.approach_epnl && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-green-600 dark:text-green-400">Approach EPNL</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {easaData.approach_epnl.toFixed(1)} EPNdB
                  </span>
                </div>
              )}
              <div className="pt-1 border-t border-green-500/20 text-[9px] text-green-600/80 dark:text-green-400/60">
                Official EASA certification values at 1,000ft reference
              </div>
            </div>
          </div>
        )}

        {/* Unverified Data Warning */}
        {dataSource === 'UNVERIFIED' && (
          <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              No EASA certification data for {flight.aircraft_type}. Using category average estimate.
            </span>
          </div>
        )}

        {/* Noise Profile */}
        <div>
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1">
            <Volume2 size={10} />
            Noise by Altitude
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
            {altitudeProfile.map(({ altitude, db }) => {
              const barWidth = ((db - minDb) / (maxDb - minDb)) * 100;
              return (
                <div key={altitude} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-10 text-right tabular-nums">
                    {formatAltitude(altitude)}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 relative">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.max(10, Math.min(100, barWidth))}%`,
                        backgroundColor: getDbLevelColor(db),
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-medium w-14 text-right tabular-nums"
                    style={{ color: getDbLevelColor(db) }}
                  >
                    {formatEstimatedNoise(Math.round(db), 'short')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px]">
            <span className="text-zinc-500 dark:text-zinc-600">Takeoff</span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {formatEstimatedNoise(profile.takeoffDb)} @ 1,000'
              {dataSource === 'EASA_CERTIFIED' && (
                <span className="ml-1 text-green-500 text-[8px]">EASA</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-500 dark:text-zinc-600">Approach</span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {formatEstimatedNoise(profile.approachDb)} @ 1,000'
              {dataSource === 'EASA_CERTIFIED' && (
                <span className="ml-1 text-green-500 text-[8px]">EASA</span>
              )}
            </span>
          </div>
        </div>

        {/* Route */}
        <div>
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2 flex items-center gap-1">
            <Navigation size={10} />
            Route
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-center">
                <div className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">
                  {flight.origin_code}
                </div>
                <div className="text-[10px] text-zinc-500">{flight.origin_city}</div>
              </div>
              <div className="flex-1 flex items-center justify-center px-3">
                <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                <span className="px-2 text-[10px] text-zinc-500">
                  {flight.direction === 'arrival' ? '→' : '←'}
                </span>
                <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <div className="text-center">
                <div className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">
                  {flight.destination_code}
                </div>
                <div className="text-[10px] text-zinc-500">{flight.destination_city}</div>
              </div>
            </div>
            <div className="flex justify-center">
              <span
                className={`text-[10px] font-medium uppercase px-2 py-0.5 ${
                  flight.direction === 'arrival'
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                {flight.direction}
              </span>
            </div>
          </div>
        </div>

        {/* Timing */}
        <div>
          <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-1 flex items-center gap-1">
            <MapPin size={10} />
            Operation Details
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Date</span>
              <span className="text-zinc-700 dark:text-zinc-300">{flight.operation_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Hour (ET)</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {flight.operation_hour_et}:00
              </span>
            </div>
            {flight.is_curfew_period && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Curfew</span>
                <span className="text-amber-500 dark:text-amber-400 font-medium">Yes</span>
              </div>
            )}
          </div>
        </div>

        {/* Data Source Footer */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-600">
            <span>Noise Data Source</span>
            <NoiseSourceIndicator source={dataSource} confidence={confidence} />
          </div>
          <div className="text-[8px] text-zinc-400 dark:text-zinc-600 leading-relaxed">
            {NOISE_ESTIMATE_DISCLAIMER}
          </div>
        </div>
      </div>
    </div>
  );
}
