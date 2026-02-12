'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  CloudSun,
  Wind,
  Thermometer,
  Eye,
  Droplets,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Radio,
  Loader2,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import { AirQualityInlineBadge } from './AirQualityBadge';
import type { Flight } from '@/types/flight';

// ─── Real Weather Data Types ─────────────────────────────────────────────────

interface RealMetarData {
  icao: string;
  temperature_f: number | null;
  dewpoint_f: number | null;
  humidity: number | null;
  wind_direction: number | null;
  wind_speed_mph: number | null;
  wind_gust_mph: number | null;
  visibility_sm: number | null;
  altimeter_inhg: number | null;
  flight_category: string;
  weather: string;
  raw_text: string;
}

interface RealWeatherResponse {
  timestamp: string;
  airport: string;
  metar?: {
    parsed?: RealMetarData;
    cached?: boolean;
    stale?: boolean;
    error?: string;
  };
  aqi?: {
    overall_aqi?: number;
    category?: string;
    main_pollutant?: string;
    error?: string;
  };
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
);

// ─── Types ──────────────────────────────────────────────────────────────────

type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'rain'
  | 'fog'
  | 'wind_advisory';

interface HourlyWeather {
  hour: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  pressure: number;
  visibility: number;
  precipitationProbability: number;
  condition: WeatherCondition;
}

interface DailyWeather {
  date: string;
  hourly: HourlyWeather[];
  avgTemperature: number;
  avgWindSpeed: number;
  avgHumidity: number;
  avgPressure: number;
  avgVisibility: number;
  dominantCondition: WeatherCondition;
  dominantWindDirection: number;
}

interface DayCorrelation {
  date: string;
  weather: DailyWeather;
  flights: Flight[];
  flightCount: number;
  avgNoiseDb: number;
  isWeekend: boolean;
}

// ─── Weather Condition Display Config ───────────────────────────────────────

const conditionConfig: Record<
  WeatherCondition,
  { label: string; color: string; bgColor: string }
> = {
  clear: { label: 'Clear', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  partly_cloudy: { label: 'Partly Cloudy', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  overcast: { label: 'Overcast', color: '#71717a', bgColor: 'rgba(113, 113, 122, 0.15)' },
  rain: { label: 'Rain', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  fog: { label: 'Fog', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.15)' },
  wind_advisory: { label: 'Wind Advisory', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
};

// ─── Compass Directions ─────────────────────────────────────────────────────

const compassDirections = [
  { label: 'N', min: 337.5, max: 360, min2: 0, max2: 22.5 },
  { label: 'NE', min: 22.5, max: 67.5 },
  { label: 'E', min: 67.5, max: 112.5 },
  { label: 'SE', min: 112.5, max: 157.5 },
  { label: 'S', min: 157.5, max: 202.5 },
  { label: 'SW', min: 202.5, max: 247.5 },
  { label: 'W', min: 247.5, max: 292.5 },
  { label: 'NW', min: 292.5, max: 337.5 },
] as const;

function getCompassIndex(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 0;
  if (normalized >= 22.5 && normalized < 67.5) return 1;
  if (normalized >= 67.5 && normalized < 112.5) return 2;
  if (normalized >= 112.5 && normalized < 157.5) return 3;
  if (normalized >= 157.5 && normalized < 202.5) return 4;
  if (normalized >= 202.5 && normalized < 247.5) return 5;
  if (normalized >= 247.5 && normalized < 292.5) return 6;
  return 7; // NW
}

// ─── Deterministic Weather Generator ────────────────────────────────────────

function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return ((state >>> 0) / 4294967296);
  };
}

function generateWeatherForDate(dateStr: string): DailyWeather {
  const seed = hashDateString(dateStr);
  const rand = seededRandom(seed);

  // Determine season from date for realistic temperature ranges
  const date = new Date(dateStr + 'T12:00:00');
  const month = date.getMonth(); // 0-11
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );

  // Seasonal base temperature for East Hampton, NY (Fahrenheit)
  // Peaks in July (~78F), lowest in January (~32F)
  const seasonalTemp =
    55 + 25 * Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);

  // Determine base weather condition with seasonal weighting
  const conditionRoll = rand();
  const isWinter = month >= 11 || month <= 2;
  const isSummer = month >= 5 && month <= 8;

  let baseCondition: WeatherCondition;
  if (isWinter) {
    if (conditionRoll < 0.15) baseCondition = 'clear';
    else if (conditionRoll < 0.35) baseCondition = 'partly_cloudy';
    else if (conditionRoll < 0.55) baseCondition = 'overcast';
    else if (conditionRoll < 0.75) baseCondition = 'rain';
    else if (conditionRoll < 0.85) baseCondition = 'fog';
    else baseCondition = 'wind_advisory';
  } else if (isSummer) {
    if (conditionRoll < 0.40) baseCondition = 'clear';
    else if (conditionRoll < 0.65) baseCondition = 'partly_cloudy';
    else if (conditionRoll < 0.75) baseCondition = 'overcast';
    else if (conditionRoll < 0.85) baseCondition = 'rain';
    else if (conditionRoll < 0.90) baseCondition = 'fog';
    else baseCondition = 'wind_advisory';
  } else {
    if (conditionRoll < 0.25) baseCondition = 'clear';
    else if (conditionRoll < 0.50) baseCondition = 'partly_cloudy';
    else if (conditionRoll < 0.65) baseCondition = 'overcast';
    else if (conditionRoll < 0.80) baseCondition = 'rain';
    else if (conditionRoll < 0.90) baseCondition = 'fog';
    else baseCondition = 'wind_advisory';
  }

  // Base wind speed influenced by condition
  const baseWindSpeed =
    baseCondition === 'wind_advisory'
      ? 18 + rand() * 17
      : baseCondition === 'rain'
        ? 8 + rand() * 12
        : 2 + rand() * 13;

  // Dominant wind direction (East Hampton: prevailing SW in summer, NW in winter)
  const baseWindDir = isSummer
    ? 200 + rand() * 60
    : isWinter
      ? 290 + rand() * 60
      : 220 + rand() * 100;

  // Base humidity and visibility
  const baseHumidity =
    baseCondition === 'fog'
      ? 90 + rand() * 10
      : baseCondition === 'rain'
        ? 75 + rand() * 20
        : 40 + rand() * 35;

  const baseVisibility =
    baseCondition === 'fog'
      ? 1 + rand() * 2
      : baseCondition === 'rain'
        ? 3 + rand() * 4
        : 6 + rand() * 4;

  const basePressure =
    baseCondition === 'rain' || baseCondition === 'fog'
      ? 29.5 + rand() * 0.4
      : 29.8 + rand() * 0.7;

  const basePrecipProb =
    baseCondition === 'rain'
      ? 60 + rand() * 40
      : baseCondition === 'overcast'
        ? 20 + rand() * 30
        : baseCondition === 'fog'
          ? 10 + rand() * 20
          : rand() * 15;

  // Generate 24 hourly readings with diurnal variation
  const hourly: HourlyWeather[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // Diurnal temperature variation: coolest ~5am, warmest ~3pm
    const diurnalOffset = -8 * Math.cos(((hour - 15) / 24) * 2 * Math.PI);
    const tempVariation = (rand() - 0.5) * 4;
    const temperature = Math.round(
      Math.max(20, Math.min(100, seasonalTemp + diurnalOffset + tempVariation)),
    );

    // Wind varies through the day (typically stronger afternoon)
    const windDiurnal = 1 + 0.3 * Math.sin(((hour - 6) / 24) * 2 * Math.PI);
    const windVariation = (rand() - 0.5) * 4;
    const windSpeed = Math.round(
      Math.max(0, Math.min(35, baseWindSpeed * windDiurnal + windVariation)) * 10,
    ) / 10;

    // Wind direction wobbles
    const windDirVariation = (rand() - 0.5) * 30;
    const windDirection = Math.round(((baseWindDir + windDirVariation) % 360 + 360) % 360);

    // Humidity inversely correlated with temperature
    const humidityDiurnal = 8 * Math.cos(((hour - 15) / 24) * 2 * Math.PI);
    const humidity = Math.round(
      Math.max(40, Math.min(100, baseHumidity + humidityDiurnal + (rand() - 0.5) * 6)),
    );

    const pressure =
      Math.round((basePressure + (rand() - 0.5) * 0.1) * 100) / 100;

    const visibility =
      Math.round(
        Math.max(1, Math.min(10, baseVisibility + (rand() - 0.5) * 2)) * 10,
      ) / 10;

    const precipitationProbability = Math.round(
      Math.max(0, Math.min(100, basePrecipProb + (rand() - 0.5) * 10)),
    );

    // Hourly condition can shift slightly from base
    let condition = baseCondition;
    const shiftRoll = rand();
    if (shiftRoll < 0.15) {
      // Slight condition variation
      if (baseCondition === 'partly_cloudy' && shiftRoll < 0.07) condition = 'clear';
      if (baseCondition === 'overcast' && shiftRoll < 0.07) condition = 'partly_cloudy';
    }

    hourly.push({
      hour,
      temperature,
      windSpeed,
      windDirection,
      humidity,
      pressure,
      visibility,
      precipitationProbability,
      condition,
    });
  }

  // Compute daily averages
  const avgTemperature = Math.round(
    hourly.reduce((s, h) => s + h.temperature, 0) / 24,
  );
  const avgWindSpeed =
    Math.round(
      (hourly.reduce((s, h) => s + h.windSpeed, 0) / 24) * 10,
    ) / 10;
  const avgHumidity = Math.round(
    hourly.reduce((s, h) => s + h.humidity, 0) / 24,
  );
  const avgPressure =
    Math.round(
      (hourly.reduce((s, h) => s + h.pressure, 0) / 24) * 100,
    ) / 100;
  const avgVisibility =
    Math.round(
      (hourly.reduce((s, h) => s + h.visibility, 0) / 24) * 10,
    ) / 10;

  // Dominant wind direction (circular mean)
  const sinSum = hourly.reduce(
    (s, h) => s + Math.sin((h.windDirection * Math.PI) / 180),
    0,
  );
  const cosSum = hourly.reduce(
    (s, h) => s + Math.cos((h.windDirection * Math.PI) / 180),
    0,
  );
  const dominantWindDirection =
    Math.round(
      ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360,
    );

  return {
    date: dateStr,
    hourly,
    avgTemperature,
    avgWindSpeed,
    avgHumidity,
    avgPressure,
    avgVisibility,
    dominantCondition: baseCondition,
    dominantWindDirection,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAllDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getFlightNoise(flight: Flight): number {
  const profile = getAircraftNoiseProfile(flight.aircraft_type);
  return flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
}

function noiseColorForDb(db: number): string {
  if (db < 70) return '#22c55e';
  if (db < 75) return '#84cc16';
  if (db < 80) return '#eab308';
  if (db < 85) return '#f97316';
  return '#ef4444';
}

// ─── Chart Styling ──────────────────────────────────────────────────────────

const chartFont = { family: 'Inter, system-ui, sans-serif' };

const tooltipOpts = {
  backgroundColor: '#18181b',
  borderColor: '#27272a',
  borderWidth: 1,
  titleColor: '#fafafa',
  bodyColor: '#a1a1aa',
  titleFont: { ...chartFont, size: 12, weight: 600 as const },
  bodyFont: { ...chartFont, size: 11 },
  padding: { x: 12, y: 8 },
  cornerRadius: 0,
};

const commonScaleOpts = {
  grid: { color: 'rgba(39, 39, 42, 0.5)', lineWidth: 1 },
  border: { display: false },
  ticks: { color: '#52525b', font: { ...chartFont, size: 10 } },
};

// ─── Linear Regression Helper ───────────────────────────────────────────────

function linearRegression(
  points: { x: number; y: number }[],
): { slope: number; intercept: number } {
  if (points.length < 2) return { slope: 0, intercept: 0 };
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Wind Rose Sub-Component ────────────────────────────────────────────────

interface WindRoseSector {
  label: string;
  count: number;
  avgNoiseDb: number;
  percentage: number;
}

function WindRose({ sectors }: { sectors: WindRoseSector[] }) {
  const maxPercentage = Math.max(...sectors.map((s) => s.percentage), 1);

  // 8 directions, positioned as compass points
  const positions = [
    { label: 'N', angle: 0, x: 50, y: 5 },
    { label: 'NE', angle: 45, x: 82, y: 18 },
    { label: 'E', angle: 90, x: 95, y: 50 },
    { label: 'SE', angle: 135, x: 82, y: 82 },
    { label: 'S', angle: 180, x: 50, y: 95 },
    { label: 'SW', angle: 225, x: 18, y: 82 },
    { label: 'W', angle: 270, x: 5, y: 50 },
    { label: 'NW', angle: 315, x: 18, y: 18 },
  ];

  return (
    <div className="relative w-full max-w-[280px] mx-auto aspect-square">
      {/* Concentric reference circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-[25%] h-[25%] rounded-full border border-zinc-800/60" />
        <div className="absolute w-[50%] h-[50%] rounded-full border border-zinc-800/60" />
        <div className="absolute w-[75%] h-[75%] rounded-full border border-zinc-800/60" />
        <div className="absolute w-[95%] h-[95%] rounded-full border border-zinc-800/40" />
        {/* Cross lines */}
        <div className="absolute w-px h-[95%] bg-zinc-800/40" />
        <div className="absolute w-[95%] h-px bg-zinc-800/40" />
      </div>

      {/* Sector wedges */}
      {sectors.map((sector, i) => {
        const pos = positions[i];
        const normalizedLength = sector.count > 0
          ? Math.max(0.12, (sector.percentage / maxPercentage) * 0.42)
          : 0;
        const color = noiseColorForDb(sector.avgNoiseDb);

        // Calculate wedge points using SVG-style positioning
        const centerX = 50;
        const centerY = 50;
        const angleRad = (pos.angle - 90) * (Math.PI / 180);
        const wedgeHalfAngle = 18 * (Math.PI / 180); // ~36 degrees per sector
        const length = normalizedLength * 100;

        const x1 = centerX + length * Math.cos(angleRad - wedgeHalfAngle);
        const y1 = centerY + length * Math.sin(angleRad - wedgeHalfAngle);
        const x2 = centerX + length * Math.cos(angleRad + wedgeHalfAngle);
        const y2 = centerY + length * Math.sin(angleRad + wedgeHalfAngle);

        return (
          <svg
            key={pos.label}
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
          >
            {sector.count > 0 && (
              <polygon
                points={`${centerX},${centerY} ${x1},${y1} ${x2},${y2}`}
                fill={color}
                fillOpacity={0.5}
                stroke={color}
                strokeWidth={0.5}
                strokeOpacity={0.8}
              />
            )}
          </svg>
        );
      })}

      {/* Direction labels */}
      {positions.map((pos, i) => {
        const sector = sectors[i];
        return (
          <div
            key={pos.label}
            className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <span
              className={`text-[10px] font-semibold ${
                pos.label === 'N'
                  ? 'text-red-400'
                  : sector.count > 0
                    ? 'text-zinc-300'
                    : 'text-zinc-600'
              }`}
            >
              {pos.label}
            </span>
            {sector.count > 0 && (
              <span className="text-[8px] text-zinc-500 tabular-nums">
                {sector.count}
              </span>
            )}
          </div>
        );
      })}

      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-600" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WeatherCorrelation() {
  const flights = useFlightStore((s) => s.flights);
  const dateRange = useFlightStore((s) => s.dateRange);

  const [isExpanded, setIsExpanded] = useState(true);

  // ─── Real Weather Data State ───────────────────────────────────────
  const [realWeather, setRealWeather] = useState<RealWeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isRealData, setIsRealData] = useState(false);

  // Fetch real weather data on mount and every 15 minutes
  useEffect(() => {
    let mounted = true;

    async function fetchRealWeather() {
      try {
        const response = await fetch('/api/weather?airport=KJPX');

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data: RealWeatherResponse = await response.json();

        if (mounted) {
          setRealWeather(data);
          setIsRealData(!data.metar?.error);
          setWeatherError(data.metar?.error || null);
          setWeatherLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setWeatherError(err instanceof Error ? err.message : 'Unknown error');
          setIsRealData(false);
          setWeatherLoading(false);
        }
      }
    }

    fetchRealWeather();

    // Refresh every 15 minutes
    const interval = setInterval(fetchRealWeather, 900000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // ─── Build Correlation Data ───────────────────────────────────────

  const correlationData = useMemo(() => {
    const allDates = getAllDatesInRange(dateRange.start, dateRange.end);
    const flightsByDate = new Map<string, Flight[]>();

    for (const f of flights) {
      const existing = flightsByDate.get(f.operation_date) ?? [];
      existing.push(f);
      flightsByDate.set(f.operation_date, existing);
    }

    return allDates.map((date): DayCorrelation => {
      const weather = generateWeatherForDate(date);
      const dayFlights = flightsByDate.get(date) ?? [];
      const noises = dayFlights.map(getFlightNoise);
      const avgNoiseDb =
        noises.length > 0
          ? Math.round((noises.reduce((a, b) => a + b, 0) / noises.length) * 10) / 10
          : 0;

      return {
        date,
        weather,
        flights: dayFlights,
        flightCount: dayFlights.length,
        avgNoiseDb,
        isWeekend: dayFlights.length > 0
          ? dayFlights[0].is_weekend
          : [0, 6].includes(new Date(date + 'T12:00:00').getDay()),
      };
    });
  }, [flights, dateRange]);

  // ─── Chart 1: Wind Speed vs Noise (Scatter) ──────────────────────

  const windNoiseChartData = useMemo(() => {
    const daysWithOps = correlationData.filter((d) => d.flightCount > 0);

    // Group by condition for coloring
    const datasets = (Object.keys(conditionConfig) as WeatherCondition[]).map(
      (condition) => {
        const points = daysWithOps
          .filter((d) => d.weather.dominantCondition === condition)
          .map((d) => ({ x: d.weather.avgWindSpeed, y: d.avgNoiseDb }));

        return {
          label: conditionConfig[condition].label,
          data: points,
          backgroundColor: conditionConfig[condition].color + 'bb',
          borderColor: conditionConfig[condition].color,
          borderWidth: 1,
          pointRadius: 5,
          pointHoverRadius: 7,
        };
      },
    ).filter((ds) => ds.data.length > 0);

    // Compute trend line across all points
    const allPoints = daysWithOps.map((d) => ({
      x: d.weather.avgWindSpeed,
      y: d.avgNoiseDb,
    }));

    if (allPoints.length >= 2) {
      const { slope, intercept } = linearRegression(allPoints);
      const xMin = Math.min(...allPoints.map((p) => p.x));
      const xMax = Math.max(...allPoints.map((p) => p.x));

      datasets.push({
        label: 'Trend',
        data: [
          { x: xMin, y: slope * xMin + intercept },
          { x: xMax, y: slope * xMax + intercept },
        ],
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        // @ts-expect-error -- Chart.js scatter accepts showLine
        showLine: true,
        borderDash: [6, 3],
      });
    }

    return { datasets };
  }, [correlationData]);

  const windNoiseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: '#71717a',
            font: { ...chartFont, size: 9 },
            boxWidth: 8,
            padding: 8,
            usePointStyle: true,
          },
        },
        tooltip: {
          ...tooltipOpts,
          callbacks: {
            title: () => '',
            label: (ctx: any) => {
              const { x, y } = ctx.raw as { x: number; y: number };
              return `${ctx.dataset.label}: ${x.toFixed(1)} mph wind, ${y.toFixed(1)} dB`;
            },
          },
        },
      },
      scales: {
        x: {
          ...commonScaleOpts,
          title: {
            display: true,
            text: 'Wind Speed (mph)',
            color: '#52525b',
            font: { ...chartFont, size: 10 },
          },
        },
        y: {
          ...commonScaleOpts,
          title: {
            display: true,
            text: 'Avg Noise (dB)',
            color: '#52525b',
            font: { ...chartFont, size: 10 },
          },
        },
      },
    }),
    [],
  );

  // ─── Chart 2: Operations by Weather Condition (Horizontal Bar) ────

  const conditionBarData = useMemo(() => {
    const conditionGroups = new Map<
      WeatherCondition,
      { totalNoise: number; flightCount: number; dayCount: number }
    >();

    for (const day of correlationData) {
      const cond = day.weather.dominantCondition;
      const existing = conditionGroups.get(cond) ?? {
        totalNoise: 0,
        flightCount: 0,
        dayCount: 0,
      };
      existing.dayCount++;
      existing.flightCount += day.flightCount;
      if (day.avgNoiseDb > 0) {
        existing.totalNoise += day.avgNoiseDb * day.flightCount;
      }
      conditionGroups.set(cond, existing);
    }

    const conditions = (Object.keys(conditionConfig) as WeatherCondition[]).filter(
      (c) => conditionGroups.has(c),
    );

    const labels = conditions.map((c) => conditionConfig[c].label);
    const flightCounts = conditions.map(
      (c) => conditionGroups.get(c)!.flightCount,
    );
    const avgNoises = conditions.map((c) => {
      const g = conditionGroups.get(c)!;
      return g.flightCount > 0
        ? Math.round((g.totalNoise / g.flightCount) * 10) / 10
        : 0;
    });
    const colors = conditions.map((c) => conditionConfig[c].color);

    return {
      labels,
      datasets: [
        {
          label: 'Flight Count',
          data: flightCounts,
          backgroundColor: colors.map((c) => c + '99'),
          borderColor: colors,
          borderWidth: 1,
        },
      ],
      avgNoises,
      conditions,
    };
  }, [correlationData]);

  const conditionBarOptions = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipOpts,
            callbacks: {
              label: (ctx: any) => {
                const noise = conditionBarData.avgNoises[ctx.dataIndex];
                return `${ctx.raw} flights, avg ${noise} dB`;
              },
            },
          },
        },
        scales: {
          x: {
            ...commonScaleOpts,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Total Flights',
              color: '#52525b',
              font: { ...chartFont, size: 10 },
            },
          },
          y: {
            ...commonScaleOpts,
            grid: { display: false },
            border: { color: '#27272a' },
          },
        },
      }) as const,
    [conditionBarData.avgNoises],
  );

  // ─── Wind Rose Data ───────────────────────────────────────────────

  const windRoseSectors = useMemo((): WindRoseSector[] => {
    const sectorData = Array.from({ length: 8 }, () => ({
      count: 0,
      totalNoise: 0,
      noiseCount: 0,
    }));

    for (const day of correlationData) {
      if (day.flightCount === 0) continue;
      const idx = getCompassIndex(day.weather.dominantWindDirection);
      sectorData[idx].count += day.flightCount;
      if (day.avgNoiseDb > 0) {
        sectorData[idx].totalNoise += day.avgNoiseDb * day.flightCount;
        sectorData[idx].noiseCount += day.flightCount;
      }
    }

    const totalOps = sectorData.reduce((s, d) => s + d.count, 0);

    return compassDirections.map((dir, i) => ({
      label: dir.label,
      count: sectorData[i].count,
      avgNoiseDb:
        sectorData[i].noiseCount > 0
          ? Math.round(
              (sectorData[i].totalNoise / sectorData[i].noiseCount) * 10,
            ) / 10
          : 0,
      percentage: totalOps > 0 ? (sectorData[i].count / totalOps) * 100 : 0,
    }));
  }, [correlationData]);

  // ─── Chart 3: Temperature vs Operations (Scatter) ─────────────────

  const tempOpsChartData = useMemo(() => {
    const weekdayPoints = correlationData
      .filter((d) => !d.isWeekend && d.flightCount > 0)
      .map((d) => ({ x: d.weather.avgTemperature, y: d.flightCount }));

    const weekendPoints = correlationData
      .filter((d) => d.isWeekend && d.flightCount > 0)
      .map((d) => ({ x: d.weather.avgTemperature, y: d.flightCount }));

    return {
      datasets: [
        {
          label: 'Weekday',
          data: weekdayPoints,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Weekend',
          data: weekendPoints,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [correlationData]);

  const tempOpsOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: '#71717a',
            font: { ...chartFont, size: 9 },
            boxWidth: 8,
            padding: 8,
            usePointStyle: true,
          },
        },
        tooltip: {
          ...tooltipOpts,
          callbacks: {
            title: () => '',
            label: (ctx: any) => {
              const { x, y } = ctx.raw as { x: number; y: number };
              return `${ctx.dataset.label}: ${Math.round(x)}°F, ${y} ops`;
            },
          },
        },
      },
      scales: {
        x: {
          ...commonScaleOpts,
          title: {
            display: true,
            text: 'Temperature (°F)',
            color: '#52525b',
            font: { ...chartFont, size: 10 },
          },
        },
        y: {
          ...commonScaleOpts,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Operations',
            color: '#52525b',
            font: { ...chartFont, size: 10 },
          },
        },
      },
    }),
    [],
  );

  // ─── Key Insights ─────────────────────────────────────────────────

  const insights = useMemo(() => {
    const result: string[] = [];
    const daysWithOps = correlationData.filter((d) => d.flightCount > 0);

    if (daysWithOps.length < 2) {
      result.push(
        'Insufficient data for weather correlation analysis. Select a wider date range with more flight data.',
      );
      return result;
    }

    // 1. Wind speed and noise correlation
    const highWindDays = daysWithOps.filter(
      (d) => d.weather.avgWindSpeed > 15,
    );
    const lowWindDays = daysWithOps.filter(
      (d) => d.weather.avgWindSpeed <= 15,
    );

    if (highWindDays.length > 0 && lowWindDays.length > 0) {
      const highWindNoise =
        highWindDays.reduce((s, d) => s + d.avgNoiseDb, 0) /
        highWindDays.length;
      const lowWindNoise =
        lowWindDays.reduce((s, d) => s + d.avgNoiseDb, 0) /
        lowWindDays.length;
      const diff = Math.abs(highWindNoise - lowWindNoise);

      if (diff >= 0.5) {
        result.push(
          `Noise levels are ${diff.toFixed(1)} dB ${highWindNoise > lowWindNoise ? 'higher' : 'lower'} on days with wind speeds above 15 mph (${highWindDays.length} days observed).`,
        );
      }
    }

    // 2. Clear weather operations increase
    const clearDays = daysWithOps.filter(
      (d) => d.weather.dominantCondition === 'clear',
    );
    const nonClearDays = daysWithOps.filter(
      (d) => d.weather.dominantCondition !== 'clear',
    );

    if (clearDays.length > 0 && nonClearDays.length > 0) {
      const clearAvgOps =
        clearDays.reduce((s, d) => s + d.flightCount, 0) / clearDays.length;
      const nonClearAvgOps =
        nonClearDays.reduce((s, d) => s + d.flightCount, 0) /
        nonClearDays.length;
      if (nonClearAvgOps > 0) {
        const pctChange =
          ((clearAvgOps - nonClearAvgOps) / nonClearAvgOps) * 100;
        if (Math.abs(pctChange) >= 5) {
          result.push(
            `Operations ${pctChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(pctChange).toFixed(0)}% on clear weather days compared to other conditions (${clearDays.length} clear days observed).`,
          );
        }
      }
    }

    // 3. Fog impact
    const fogDays = correlationData.filter(
      (d) => d.weather.dominantCondition === 'fog',
    );
    if (fogDays.length > 0) {
      const fogAvgOps =
        fogDays.reduce((s, d) => s + d.flightCount, 0) / fogDays.length;
      const allAvgOps =
        correlationData.reduce((s, d) => s + d.flightCount, 0) /
        correlationData.length;
      const fewerFlights = allAvgOps - fogAvgOps;
      if (fewerFlights > 0) {
        result.push(
          `Fog conditions correlate with ${fewerFlights.toFixed(1)} fewer flights per day compared to the overall average (${fogDays.length} fog days in range).`,
        );
      }
    }

    // 4. Weekend + warm weather
    const warmWeekends = daysWithOps.filter(
      (d) => d.isWeekend && d.weather.avgTemperature > 70,
    );
    const coolWeekdays = daysWithOps.filter(
      (d) => !d.isWeekend && d.weather.avgTemperature <= 60,
    );

    if (warmWeekends.length > 0 && coolWeekdays.length > 0) {
      const warmWeekendOps =
        warmWeekends.reduce((s, d) => s + d.flightCount, 0) /
        warmWeekends.length;
      const coolWeekdayOps =
        coolWeekdays.reduce((s, d) => s + d.flightCount, 0) /
        coolWeekdays.length;
      if (coolWeekdayOps > 0) {
        const ratio = warmWeekendOps / coolWeekdayOps;
        if (ratio > 1.2) {
          result.push(
            `Warm weekends (above 70°F) see ${ratio.toFixed(1)}x more operations than cool weekdays (below 60°F).`,
          );
        }
      }
    }

    // 5. Dominant wind direction
    const maxSector = windRoseSectors.reduce((best, s) =>
      s.count > best.count ? s : best,
    );
    if (maxSector.count > 0) {
      result.push(
        `Prevailing wind direction is ${maxSector.label} during the selected period, accounting for ${maxSector.percentage.toFixed(0)}% of operations with an average noise level of ${maxSector.avgNoiseDb.toFixed(1)} dB.`,
      );
    }

    // 6. Rain days
    const rainDays = correlationData.filter(
      (d) => d.weather.dominantCondition === 'rain',
    );
    if (rainDays.length > 0 && daysWithOps.length > 0) {
      const rainAvgOps =
        rainDays.reduce((s, d) => s + d.flightCount, 0) / rainDays.length;
      const overallAvg =
        correlationData.reduce((s, d) => s + d.flightCount, 0) /
        correlationData.length;
      if (overallAvg > 0) {
        const pctReduction = ((overallAvg - rainAvgOps) / overallAvg) * 100;
        if (pctReduction > 5) {
          result.push(
            `Rainy days show a ${pctReduction.toFixed(0)}% reduction in flight operations compared to the period average.`,
          );
        }
      }
    }

    if (result.length === 0) {
      result.push(
        'No strong weather-noise correlations detected in the current date range. Try expanding the range for more data points.',
      );
    }

    return result;
  }, [correlationData, windRoseSectors]);

  // ─── Current Period Summary Stats ─────────────────────────────────

  const summaryStats = useMemo(() => {
    const daysWithOps = correlationData.filter((d) => d.flightCount > 0);

    // Use real weather data if available, otherwise fall back to simulated
    let avgTemp: number;
    let avgWind: number;
    let avgVis: number;
    let avgHumidity: number;
    let mostCommon: WeatherCondition = 'clear';
    let flightCategory = '';
    let rawMetar = '';

    if (realWeather?.metar?.parsed && !realWeather.metar.error) {
      // Use real METAR data
      const metar = realWeather.metar.parsed;
      avgTemp = metar.temperature_f ?? 0;
      avgWind = metar.wind_speed_mph ?? 0;
      avgVis = metar.visibility_sm ?? 10;
      avgHumidity = metar.humidity ?? 50;
      flightCategory = metar.flight_category || '';
      rawMetar = metar.raw_text || '';

      // Map flight category to condition
      if (metar.weather?.toLowerCase().includes('rain') || metar.weather?.toLowerCase().includes('ra')) {
        mostCommon = 'rain';
      } else if (metar.weather?.toLowerCase().includes('fg') || metar.weather?.toLowerCase().includes('fog')) {
        mostCommon = 'fog';
      } else if ((metar.wind_speed_mph ?? 0) > 20 || (metar.wind_gust_mph ?? 0) > 25) {
        mostCommon = 'wind_advisory';
      } else if (flightCategory === 'VFR') {
        mostCommon = avgVis > 8 ? 'clear' : 'partly_cloudy';
      } else if (flightCategory === 'MVFR') {
        mostCommon = 'partly_cloudy';
      } else if (flightCategory === 'IFR' || flightCategory === 'LIFR') {
        mostCommon = 'overcast';
      }
    } else {
      // Fall back to simulated data averages
      avgTemp =
        correlationData.length > 0
          ? Math.round(
              correlationData.reduce((s, d) => s + d.weather.avgTemperature, 0) /
                correlationData.length,
            )
          : 0;
      avgWind =
        correlationData.length > 0
          ? Math.round(
              (correlationData.reduce((s, d) => s + d.weather.avgWindSpeed, 0) /
                correlationData.length) *
                10,
            ) / 10
          : 0;
      avgVis =
        correlationData.length > 0
          ? Math.round(
              (correlationData.reduce((s, d) => s + d.weather.avgVisibility, 0) /
                correlationData.length) *
                10,
            ) / 10
          : 0;
      avgHumidity =
        correlationData.length > 0
          ? Math.round(
              correlationData.reduce((s, d) => s + d.weather.avgHumidity, 0) /
                correlationData.length,
            )
          : 0;

      // Count conditions from simulated data
      const conditionCounts = new Map<WeatherCondition, number>();
      for (const day of correlationData) {
        conditionCounts.set(
          day.weather.dominantCondition,
          (conditionCounts.get(day.weather.dominantCondition) ?? 0) + 1,
        );
      }
      let maxCount = 0;
      for (const [cond, count] of conditionCounts) {
        if (count > maxCount) {
          mostCommon = cond;
          maxCount = count;
        }
      }
    }

    return {
      avgTemp: Math.round(avgTemp),
      avgWind: Math.round(avgWind * 10) / 10,
      avgVis: Math.round(avgVis * 10) / 10,
      avgHumidity: Math.round(avgHumidity),
      mostCommon,
      totalDays: correlationData.length,
      flightCategory,
      rawMetar,
    };
  }, [correlationData, realWeather]);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between hover:bg-zinc-100/20 dark:hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-cyan-100 dark:bg-cyan-900/30 p-1.5">
            <CloudSun size={16} className="text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Weather Correlation Analysis
              {isRealData && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[9px] font-medium">
                  <Radio size={8} className="animate-pulse" />
                  LIVE
                </span>
              )}
              {weatherLoading && (
                <Loader2 size={12} className="animate-spin text-zinc-500" />
              )}
            </h3>
            <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
              {isRealData
                ? 'Real METAR/TAF observations from NOAA Aviation Weather'
                : 'Simulated weather data for KJPX (East Hampton)'}{' '}
              correlated with flight operations and noise
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-500">
            {/* Flight category badge (VFR/IFR/etc) */}
            {summaryStats.flightCategory && (
              <span
                className="px-1.5 py-0.5 font-semibold"
                style={{
                  backgroundColor:
                    summaryStats.flightCategory === 'VFR'
                      ? 'rgba(34, 197, 94, 0.2)'
                      : summaryStats.flightCategory === 'MVFR'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : summaryStats.flightCategory === 'IFR'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(168, 85, 247, 0.2)',
                  color:
                    summaryStats.flightCategory === 'VFR'
                      ? '#22c55e'
                      : summaryStats.flightCategory === 'MVFR'
                        ? '#3b82f6'
                        : summaryStats.flightCategory === 'IFR'
                          ? '#ef4444'
                          : '#a855f7',
                }}
              >
                {summaryStats.flightCategory}
              </span>
            )}
            <span
              className="px-1.5 py-0.5"
              style={{
                backgroundColor: conditionConfig[summaryStats.mostCommon].bgColor,
                color: conditionConfig[summaryStats.mostCommon].color,
              }}
            >
              {conditionConfig[summaryStats.mostCommon].label}
            </span>
            <span className="tabular-nums">{summaryStats.avgTemp}°F</span>
            <span className="text-zinc-400 dark:text-zinc-700">|</span>
            <span className="tabular-nums">{summaryStats.avgWind} mph wind</span>
            <span className="text-zinc-400 dark:text-zinc-700">|</span>
            <AirQualityInlineBadge />
          </div>
          {isExpanded ? (
            <ChevronDown size={14} className="text-zinc-500" />
          ) : (
            <ChevronRight size={14} className="text-zinc-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <>
          {/* ─── Weather Summary Stats ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-zinc-200/60 dark:bg-zinc-800/60">
            <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Thermometer size={10} className="text-zinc-500 dark:text-zinc-600" />
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Avg Temp
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {summaryStats.avgTemp}°F
              </div>
            </div>
            <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Wind size={10} className="text-zinc-500 dark:text-zinc-600" />
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Avg Wind
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {summaryStats.avgWind} mph
              </div>
            </div>
            <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets size={10} className="text-zinc-500 dark:text-zinc-600" />
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Avg Humidity
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                {summaryStats.avgHumidity}%
              </div>
            </div>
            <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye size={10} className="text-zinc-500 dark:text-zinc-600" />
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Avg Visibility
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {summaryStats.avgVis} mi
              </div>
            </div>
            <div className="bg-zinc-100/50 dark:bg-zinc-950/50 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <CloudSun size={10} className="text-zinc-500 dark:text-zinc-600" />
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                  Period
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                {summaryStats.totalDays}
                <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-normal ml-1">
                  days
                </span>
              </div>
            </div>
          </div>

          {/* ─── Charts Grid ─────────────────────────────────────────── */}
          <div className="p-5 space-y-6">
            {/* Row 1: Two-column charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wind Speed vs Noise Scatter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wind size={12} className="text-zinc-500 dark:text-zinc-500" />
                  <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Wind Speed vs Noise Level
                  </h4>
                </div>
                <div className="h-64 bg-zinc-100/30 dark:bg-zinc-950/30 border border-zinc-200/40 dark:border-zinc-800/40 p-3">
                  <Scatter data={windNoiseChartData} options={windNoiseOptions} />
                </div>
              </div>

              {/* Temperature vs Operations Scatter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer size={12} className="text-zinc-500 dark:text-zinc-500" />
                  <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Temperature vs Operations
                  </h4>
                </div>
                <div className="h-64 bg-zinc-100/30 dark:bg-zinc-950/30 border border-zinc-200/40 dark:border-zinc-800/40 p-3">
                  <Scatter data={tempOpsChartData} options={tempOpsOptions} />
                </div>
              </div>
            </div>

            {/* Row 2: Two-column charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Operations by Weather Condition */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CloudSun size={12} className="text-zinc-500 dark:text-zinc-500" />
                  <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Operations by Weather Condition
                  </h4>
                </div>
                <div className="h-64 bg-zinc-100/30 dark:bg-zinc-950/30 border border-zinc-200/40 dark:border-zinc-800/40 p-3">
                  <Bar data={conditionBarData} options={conditionBarOptions} />
                </div>
                {/* Avg noise annotations */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {conditionBarData.conditions.map((cond, i) => (
                    <div
                      key={cond}
                      className="flex items-center gap-1.5 text-[9px]"
                    >
                      <div
                        className="w-2 h-2"
                        style={{ backgroundColor: conditionConfig[cond].color }}
                      />
                      <span className="text-zinc-600 dark:text-zinc-500">
                        {conditionConfig[cond].label}:
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-400 tabular-nums font-medium">
                        {conditionBarData.avgNoises[i]} dB avg
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wind Rose */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wind size={12} className="text-zinc-500 dark:text-zinc-500" />
                  <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Wind Rose — Operations by Direction
                  </h4>
                </div>
                <div className="bg-zinc-100/30 dark:bg-zinc-950/30 border border-zinc-200/40 dark:border-zinc-800/40 p-4">
                  <WindRose sectors={windRoseSectors} />
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-500">&lt;70 dB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-500">75-80 dB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-500">80-85 dB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-500">&gt;85 dB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Full-width Key Insights */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={12} className="text-amber-500" />
                <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Key Insights
                </h4>
              </div>
              <div className="bg-zinc-100/30 dark:bg-zinc-950/30 border border-zinc-200/40 dark:border-zinc-800/40 p-4 space-y-2">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Footer ────────────────────────────────────────────── */}
          <div className="px-5 py-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 dark:text-zinc-600 flex items-center gap-2">
              {isRealData ? (
                <>
                  <Radio size={10} className="text-emerald-500" />
                  <span>Live METAR from NOAA Aviation Weather • AQI from EPA AirNow</span>
                </>
              ) : (
                <>
                  <span>Weather data is simulated (API unavailable)</span>
                  {weatherError && (
                    <span className="text-amber-500" title={weatherError}>
                      • Error: {weatherError.slice(0, 40)}...
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 flex items-center gap-2">
              <span>Noise estimates from FAA certification profiles</span>
              {summaryStats.rawMetar && (
                <span
                  className="text-zinc-600 dark:text-zinc-500 cursor-help border-b border-dotted border-zinc-500 dark:border-zinc-600"
                  title={summaryStats.rawMetar}
                >
                  Raw METAR
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
