'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronDown,
  Plane,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  AlertTriangle,
  Clock,
  Volume2,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import type { Flight } from '@/types/flight';

// ─── Constants ──────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SPEED_OPTIONS = [1, 2, 5, 10] as const;
type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

/** Interval in ms for a single "minute" tick at 1x speed. */
const BASE_TICK_MS = 100;

/** Curfew: 8 PM (20) through 7 AM (< 8). */
function isCurfewHour(hour: number): boolean {
  return hour >= 20 || hour < 8;
}

/** Category color mapping (matches design spec). */
const CATEGORY_COLORS: Record<string, string> = {
  helicopter: '#f59e0b', // amber-500
  jet: '#ef4444',        // red-500
  fixed_wing: '#3b82f6', // blue-500
  unknown: '#a1a1aa',    // zinc-400
};

const CATEGORY_LABELS: Record<string, string> = {
  helicopter: 'Helicopter',
  jet: 'Jet',
  fixed_wing: 'Fixed Wing',
  unknown: 'Unknown',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface FlightWithNoise extends Flight {
  noiseDb: number;
  noiseCategory: string;
}

function enrichFlightNoise(flight: Flight): FlightWithNoise {
  const profile = getAircraftNoiseProfile(flight.aircraft_type);
  const noiseDb =
    flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
  return { ...flight, noiseDb, noiseCategory: profile.noiseCategory };
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h} ${suffix}`;
}

function formatTimeDisplay(hour: number, minute: number): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${hh}:${mm} ET`;
}

/** Get unique dates from flights that fall within dateRange. */
function getAvailableDates(
  flights: Flight[],
  start: string,
  end: string
): string[] {
  const set = new Set<string>();
  flights.forEach((f) => {
    if (f.operation_date >= start && f.operation_date <= end) {
      set.add(f.operation_date);
    }
  });
  return Array.from(set).sort();
}

// ─── Per-hour stats type ────────────────────────────────────────────────────

interface HourStats {
  hour: number;
  operations: number;
  arrivals: number;
  departures: number;
  helicopters: number;
  jets: number;
  fixedWing: number;
  avgNoiseDb: number;
  peakNoiseDb: number;
  isCurfew: boolean;
}

function computeHourStats(flights: FlightWithNoise[]): HourStats[] {
  return HOURS.map((hour) => {
    const hourFlights = flights.filter((f) => f.operation_hour_et === hour);
    const noiseValues = hourFlights.map((f) => f.noiseDb);
    const avg =
      noiseValues.length > 0
        ? Math.round(noiseValues.reduce((s, v) => s + v, 0) / noiseValues.length)
        : 0;
    const peak = noiseValues.length > 0 ? Math.max(...noiseValues) : 0;

    return {
      hour,
      operations: hourFlights.length,
      arrivals: hourFlights.filter((f) => f.direction === 'arrival').length,
      departures: hourFlights.filter((f) => f.direction === 'departure').length,
      helicopters: hourFlights.filter(
        (f) => f.aircraft_category === 'helicopter'
      ).length,
      jets: hourFlights.filter((f) => f.aircraft_category === 'jet').length,
      fixedWing: hourFlights.filter(
        (f) => f.aircraft_category === 'fixed_wing'
      ).length,
      avgNoiseDb: avg,
      peakNoiseDb: peak,
      isCurfew: isCurfewHour(hour),
    };
  });
}

// ─── Running cumulative stats ───────────────────────────────────────────────

interface RunningStats {
  totalOps: number;
  arrivals: number;
  departures: number;
  curfewViolations: number;
  peakNoiseDb: number;
  peakNoiseIdent: string;
  categoryBreakdown: Record<string, number>;
}

function computeRunningStats(
  flights: FlightWithNoise[],
  currentHour: number
): RunningStats {
  const passed = flights.filter((f) => f.operation_hour_et <= currentHour);
  const breakdown: Record<string, number> = {
    helicopter: 0,
    jet: 0,
    fixed_wing: 0,
    unknown: 0,
  };
  let peakDb = 0;
  let peakIdent = '';

  passed.forEach((f) => {
    breakdown[f.aircraft_category] = (breakdown[f.aircraft_category] || 0) + 1;
    if (f.noiseDb > peakDb) {
      peakDb = f.noiseDb;
      peakIdent = f.ident;
    }
  });

  return {
    totalOps: passed.length,
    arrivals: passed.filter((f) => f.direction === 'arrival').length,
    departures: passed.filter((f) => f.direction === 'departure').length,
    curfewViolations: passed.filter((f) => f.is_curfew_period).length,
    peakNoiseDb: peakDb,
    peakNoiseIdent: peakIdent,
    categoryBreakdown: breakdown,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FlightPathReplay() {
  const { flights, dateRange } = useFlightStore();

  // ── Date selector state ──────────────────────────────────────────────────
  const availableDates = useMemo(
    () => getAvailableDates(flights, dateRange.start, dateRange.end),
    [flights, dateRange.start, dateRange.end]
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Auto-select first available date
  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // ── Playback state ───────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived flight data ──────────────────────────────────────────────────
  const dayFlights = useMemo(() => {
    if (!selectedDate) return [];
    return flights
      .filter((f) => f.operation_date === selectedDate)
      .map(enrichFlightNoise);
  }, [flights, selectedDate]);

  const activeFlights = useMemo(() => {
    return dayFlights
      .filter((f) => f.operation_hour_et === currentHour)
      .sort((a, b) => b.noiseDb - a.noiseDb);
  }, [dayFlights, currentHour]);

  const hourStats = useMemo(() => computeHourStats(dayFlights), [dayFlights]);

  const runningStats = useMemo(
    () => computeRunningStats(dayFlights, currentHour),
    [dayFlights, currentHour]
  );

  // ── Playback controls ────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      setCurrentMinute((prevMin) => {
        const nextMin = prevMin + 5;
        if (nextMin >= 60) {
          setCurrentHour((prevHour) => {
            if (prevHour >= 23) {
              // End of day — stop playback
              setTimeout(() => stopPlayback(), 0);
              return 23;
            }
            return prevHour + 1;
          });
          return 0;
        }
        return nextMin;
      });
    }, BASE_TICK_MS / speed);
  }, [speed, stopPlayback]);

  // Restart interval when speed changes during playback
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      // If at end, reset first
      if (currentHour === 23 && currentMinute >= 55) {
        setCurrentHour(0);
        setCurrentMinute(0);
      }
      startPlayback();
    }
  }, [isPlaying, currentHour, currentMinute, startPlayback, stopPlayback]);

  const stepForward = useCallback(() => {
    stopPlayback();
    setCurrentMinute(0);
    setCurrentHour((h) => Math.min(h + 1, 23));
  }, [stopPlayback]);

  const stepBackward = useCallback(() => {
    stopPlayback();
    setCurrentMinute(0);
    setCurrentHour((h) => Math.max(h - 1, 0));
  }, [stopPlayback]);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    setCurrentHour(0);
    setCurrentMinute(0);
  }, [stopPlayback]);

  const seekToHour = useCallback(
    (hour: number) => {
      stopPlayback();
      setCurrentHour(hour);
      setCurrentMinute(0);
    },
    [stopPlayback]
  );

  // ── Playhead position as percentage ──────────────────────────────────────
  const playheadPercent = ((currentHour * 60 + currentMinute) / (24 * 60)) * 100;

  // ── No data state ────────────────────────────────────────────────────────
  if (flights.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8">
        <div className="text-center text-zinc-500 text-sm">
          <Plane size={24} className="mx-auto mb-3 text-zinc-600" />
          <p>No flight data available.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Load flights using the date range filter to enable replay.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* ── Header & Date Selector ──────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Flight Activity Replay
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            KJPX &middot; 24-hour timeline playback
          </p>
        </div>

        {/* Date picker dropdown */}
        <div className="relative">
          <button
            onClick={() => setDateDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-medium hover:border-zinc-600 transition-colors"
          >
            <Clock size={12} className="text-zinc-500" />
            {selectedDate || 'Select date'}
            <ChevronDown size={12} className="text-zinc-500" />
          </button>
          {dateDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-700 shadow-xl max-h-56 overflow-y-auto min-w-[160px]">
              {availableDates.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-zinc-500">
                  No dates in range
                </div>
              )}
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setDateDropdownOpen(false);
                    resetPlayback();
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    date === selectedDate
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 24-Hour Timeline Bar ────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-3">
        {/* Timeline track */}
        <div className="relative h-14">
          {/* Background bar with curfew shading */}
          <div className="absolute inset-x-0 top-6 h-6 flex">
            {HOURS.map((hour) => {
              const isCurfew = isCurfewHour(hour);
              const hourFlights = dayFlights.filter(
                (f) => f.operation_hour_et === hour
              );
              const isPassed = hour < currentHour;
              const isCurrent = hour === currentHour;

              return (
                <button
                  key={hour}
                  onClick={() => seekToHour(hour)}
                  className="flex-1 relative group border-r border-zinc-800/50 last:border-r-0 transition-colors"
                  style={{
                    backgroundColor: isCurrent
                      ? 'rgba(59, 130, 246, 0.15)'
                      : isCurfew
                        ? 'rgba(245, 158, 11, 0.06)'
                        : 'rgba(39, 39, 42, 0.3)',
                    opacity: isPassed && !isCurrent ? 0.5 : 1,
                  }}
                  title={`${formatHour(hour)} — ${hourFlights.length} ops`}
                >
                  {/* Flight event dots stacked vertically */}
                  {hourFlights.slice(0, 4).map((f, i) => (
                    <div
                      key={f.id}
                      className="absolute left-1/2 -translate-x-1/2 rounded-full"
                      style={{
                        width: 5,
                        height: 5,
                        top: 2 + i * 6,
                        backgroundColor:
                          CATEGORY_COLORS[f.aircraft_category] || CATEGORY_COLORS.unknown,
                      }}
                    />
                  ))}
                  {hourFlights.length > 4 && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 font-medium">
                      +{hourFlights.length - 4}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hour labels */}
          <div className="absolute inset-x-0 top-0 h-5 flex">
            {HOURS.map((hour) => (
              <div key={hour} className="flex-1 text-center">
                {hour % 3 === 0 && (
                  <span className="text-[9px] text-zinc-600 tabular-nums">
                    {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Curfew region markers */}
          <div className="absolute left-0 top-[22px] h-[28px] pointer-events-none" style={{ width: `${(8 / 24) * 100}%` }}>
            <div className="absolute inset-0 border-b-2 border-amber-500/20" />
          </div>
          <div className="absolute right-0 top-[22px] h-[28px] pointer-events-none" style={{ width: `${(4 / 24) * 100}%` }}>
            <div className="absolute inset-0 border-b-2 border-amber-500/20" />
          </div>

          {/* Playhead */}
          <div
            className="absolute top-[20px] h-[32px] w-px bg-blue-500 z-10 pointer-events-none transition-[left] duration-100 ease-linear"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45" />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[9px] font-semibold text-blue-400 tabular-nums">
                {formatTimeDisplay(currentHour, currentMinute)}
              </span>
            </div>
          </div>
        </div>

        {/* Curfew label */}
        <div className="flex items-center justify-between mt-5 mb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-500/30" />
              <span className="text-[9px] text-zinc-600">Curfew 8p&ndash;8a</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500/30" />
              <span className="text-[9px] text-zinc-600">Current hour</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium tabular-nums">
            {dayFlights.length} operations on {selectedDate}
          </span>
        </div>
      </div>

      {/* ── Playback Controls ───────────────────────────────────────────── */}
      <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={resetPlayback}
            className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Reset to beginning"
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={stepBackward}
            className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Step back 1 hour"
          >
            <SkipBack size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={togglePlayback}
            className={`p-2 mx-1 transition-colors ${
              isPlaying
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={16} strokeWidth={2} />
            ) : (
              <Play size={16} strokeWidth={2} />
            )}
          </button>
          <button
            onClick={stepForward}
            className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Step forward 1 hour"
          >
            <SkipForward size={14} strokeWidth={1.8} />
          </button>
        </div>

        {/* Current time display */}
        <div className="text-center">
          <span className="text-lg font-semibold text-zinc-100 tabular-nums tracking-tight">
            {formatTimeDisplay(currentHour, currentMinute)}
          </span>
        </div>

        {/* Speed selector */}
        <div className="relative">
          <button
            onClick={() => setSpeedDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            {speed}x
            <ChevronDown size={10} className="text-zinc-500" />
          </button>
          {speedDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-1 z-20 bg-zinc-900 border border-zinc-700 shadow-xl">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSpeed(s);
                    setSpeedDropdownOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-1.5 text-xs transition-colors ${
                    s === speed
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Running Stats Bar ───────────────────────────────────────────── */}
      <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total ops */}
          <div>
            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.1em] mb-1">
              Operations
            </div>
            <div className="text-lg font-semibold text-zinc-100 tabular-nums">
              {runningStats.totalOps}
            </div>
          </div>

          {/* Arrivals / Departures */}
          <div>
            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.1em] mb-1">
              Arr / Dep
            </div>
            <div className="text-sm tabular-nums">
              <span className="text-emerald-400 font-semibold">
                {runningStats.arrivals}
              </span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-blue-400 font-semibold">
                {runningStats.departures}
              </span>
            </div>
          </div>

          {/* Curfew violations */}
          <div>
            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.1em] mb-1">
              Curfew Violations
            </div>
            <div className="flex items-center gap-1.5">
              {runningStats.curfewViolations > 0 && (
                <AlertTriangle size={12} className="text-amber-500" />
              )}
              <span
                className={`text-lg font-semibold tabular-nums ${
                  runningStats.curfewViolations > 0
                    ? 'text-amber-400'
                    : 'text-zinc-500'
                }`}
              >
                {runningStats.curfewViolations}
              </span>
            </div>
          </div>

          {/* Peak noise */}
          <div>
            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.1em] mb-1">
              Peak Noise
            </div>
            <div className="flex items-center gap-1.5">
              {runningStats.peakNoiseDb > 0 && (
                <Volume2 size={12} className="text-red-400" />
              )}
              <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                {runningStats.peakNoiseDb > 0
                  ? `${runningStats.peakNoiseDb} dB`
                  : '—'}
              </span>
              {runningStats.peakNoiseIdent && (
                <span className="text-[10px] text-zinc-500">
                  ({runningStats.peakNoiseIdent})
                </span>
              )}
            </div>
          </div>

          {/* Category breakdown — mini bar */}
          <div className="col-span-2">
            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.1em] mb-1">
              Category Breakdown
            </div>
            {runningStats.totalOps > 0 ? (
              <div>
                <div className="flex h-3 overflow-hidden bg-zinc-800">
                  {Object.entries(runningStats.categoryBreakdown)
                    .filter(([, count]) => count > 0)
                    .map(([cat, count]) => (
                      <div
                        key={cat}
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${(count / runningStats.totalOps) * 100}%`,
                          backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown,
                        }}
                        title={`${CATEGORY_LABELS[cat] || cat}: ${count}`}
                      />
                    ))}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {Object.entries(runningStats.categoryBreakdown)
                    .filter(([, count]) => count > 0)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown,
                          }}
                        />
                        <span className="text-[9px] text-zinc-500 tabular-nums">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <span className="text-sm text-zinc-600">&mdash;</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Active Flights Panel ────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.1em]">
            Active Flights &middot; {formatHour(currentHour)}
          </h4>
          <span className="text-[11px] text-zinc-600 tabular-nums">
            {activeFlights.length} operation{activeFlights.length !== 1 ? 's' : ''}
          </span>
        </div>

        {activeFlights.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600">
            No flights active at this hour
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        )}
      </div>

      {/* ── Hour-by-Hour Summary Table ──────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.1em] mb-3">
          Hour-by-Hour Summary
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Hour
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Ops
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Arr
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Dep
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Heli
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Jets
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Fixed
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Avg dB
                </th>
                <th className="text-right py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Peak dB
                </th>
                <th className="text-center py-2 px-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Curfew
                </th>
                <th className="text-center py-2 px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {hourStats.map((row) => {
                const isPassed = row.hour < currentHour;
                const isCurrent = row.hour === currentHour;

                return (
                  <tr
                    key={row.hour}
                    onClick={() => seekToHour(row.hour)}
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-blue-600/10'
                        : isPassed
                          ? 'opacity-50'
                          : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <td className="py-1.5 px-2 font-medium text-zinc-300 tabular-nums whitespace-nowrap">
                      {formatHour(row.hour)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-zinc-300 tabular-nums font-semibold">
                      {row.operations || <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-emerald-400/80 tabular-nums">
                      {row.arrivals || <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-blue-400/80 tabular-nums">
                      {row.departures || <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-amber-400/80 tabular-nums">
                      {row.helicopters || <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-red-400/80 tabular-nums">
                      {row.jets || <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-blue-400/80 tabular-nums">
                      {row.fixedWing || <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-zinc-400 tabular-nums">
                      {row.avgNoiseDb > 0 ? row.avgNoiseDb : <span className="text-zinc-700">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {row.peakNoiseDb > 0 ? (
                        <span
                          className={
                            row.peakNoiseDb >= 85
                              ? 'text-red-400 font-semibold'
                              : row.peakNoiseDb >= 75
                                ? 'text-amber-400'
                                : 'text-zinc-400'
                          }
                        >
                          {row.peakNoiseDb}
                        </span>
                      ) : (
                        <span className="text-zinc-700">&mdash;</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {row.isCurfew ? (
                        row.operations > 0 ? (
                          <AlertTriangle
                            size={11}
                            className="inline text-amber-500"
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-600">curfew</span>
                        )
                      ) : (
                        <span className="text-zinc-700">&mdash;</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      {isPassed && (
                        <Check size={11} className="inline text-zinc-600" />
                      )}
                      {isCurrent && (
                        <div className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Flight Card Sub-component ──────────────────────────────────────────────

function FlightCard({ flight }: { flight: FlightWithNoise }) {
  const isArrival = flight.direction === 'arrival';
  const categoryColor =
    CATEGORY_COLORS[flight.aircraft_category] || CATEGORY_COLORS.unknown;

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-3 transition-all hover:border-zinc-700">
      {/* Top row: ident + direction */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <span className="text-xs font-semibold text-zinc-100 tracking-wide">
            {flight.ident}
          </span>
          {flight.registration && flight.registration !== flight.ident && (
            <span className="text-[10px] text-zinc-500">
              {flight.registration}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isArrival ? (
            <ArrowDownLeft size={12} className="text-emerald-400" />
          ) : (
            <ArrowUpRight size={12} className="text-blue-400" />
          )}
          <span
            className={`text-[10px] font-medium ${
              isArrival ? 'text-emerald-400' : 'text-blue-400'
            }`}
          >
            {isArrival ? 'ARR' : 'DEP'}
          </span>
        </div>
      </div>

      {/* Operator & type */}
      <div className="text-[10px] text-zinc-500 mb-1.5 truncate">
        {flight.operator || 'Private'} &middot;{' '}
        <span className="text-zinc-400">{flight.aircraft_type}</span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-2">
        <span className="font-medium">{flight.origin_code || '???'}</span>
        <span className="text-zinc-600">&rarr;</span>
        <span className="font-medium">{flight.destination_code || '???'}</span>
      </div>

      {/* Noise estimate */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
          Est. Noise
        </span>
        <span
          className={`text-[11px] font-semibold tabular-nums ${
            flight.noiseDb >= 85
              ? 'text-red-400'
              : flight.noiseDb >= 75
                ? 'text-amber-400'
                : 'text-zinc-300'
          }`}
        >
          {flight.noiseDb} dB
        </span>
      </div>
    </div>
  );
}
