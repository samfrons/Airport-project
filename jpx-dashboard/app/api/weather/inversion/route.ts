/**
 * Temperature Inversion Detection API
 *
 * Fetches and analyzes upper-air sounding data from NWS radiosonde stations
 * to detect temperature inversions that affect noise propagation.
 *
 * Data Source: NOAA/NWS Radiosonde Data
 * Nearest station to KJPX: OKX (Upton, NY) - approximately 30 miles away
 *
 * Soundings are released twice daily:
 * - 00Z (8 PM ET / 7 PM EDT)
 * - 12Z (8 AM ET / 7 AM EDT)
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SoundingLevel {
  pressureMb: number;
  heightFt: number;
  tempC: number;
  dewpointC: number;
  windDir: number;
  windSpeedKt: number;
}

interface InversionLayer {
  baseAltFt: number;
  topAltFt: number;
  baseTempC: number;
  topTempC: number;
  tempDifferenceC: number;
  strength: 'weak' | 'moderate' | 'strong';
}

interface InversionAnalysis {
  stationId: string;
  stationName: string;
  soundingTime: string;
  surfaceTempC: number;
  surfaceWindDir: number;
  surfaceWindSpeedKt: number;
  inversions: InversionLayer[];
  strongestInversion: InversionLayer | null;
  inversionPresent: boolean;
  inversionStrength: 'none' | 'weak' | 'moderate' | 'strong';
  lowLevelInversion: boolean; // Inversion in lowest 3000ft
  description: string;
  dataAge: string;
  nextSoundingTime: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const OKX_STATION = {
  id: 'OKX',
  name: 'Upton, NY (Brookhaven)',
  lat: 40.87,
  lon: -72.87,
};

// NWS RAO (Radiosonde Archive) URL pattern
// Example: https://www.weather.gov/source/okx/upperair/OKX_sounding.txt
const NWS_SOUNDING_URL = `https://www.weather.gov/source/okx/upperair/${OKX_STATION.id}_sounding.txt`;

// NOAA ESRL/GSD Sounding Archive (backup)
const NOAA_RUCS_URL = `https://rucsoundings.noaa.gov/get_soundings.cgi?data_source=Op40&latest=latest&n_hrs=24.0&fcst_len=shortest&airport=${OKX_STATION.id}&text=Ascii%20text%20%28GSD%20format%29&hydession=0`;

// Threshold for detecting temperature increase with altitude (inversion)
const INVERSION_THRESHOLD_C = 0.5; // Minimum temp increase to flag as inversion

// ─── Sounding Parser ────────────────────────────────────────────────────────

/**
 * Parse GSD format sounding data
 * Example line: "  925.0  2756  12.2   8.8  250   15"
 */
function parseSoundingData(text: string): SoundingLevel[] {
  const levels: SoundingLevel[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip header lines and empty lines
    if (!line.trim() || line.includes('PRESSURE') || line.includes('---')) {
      continue;
    }

    // Try to parse as data line
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
      const pressure = parseFloat(parts[0]);
      const height = parseFloat(parts[1]);
      const temp = parseFloat(parts[2]);
      const dewpoint = parseFloat(parts[3]);
      const windDir = parts.length > 4 ? parseFloat(parts[4]) : 0;
      const windSpeed = parts.length > 5 ? parseFloat(parts[5]) : 0;

      // Valid data check
      if (!isNaN(pressure) && !isNaN(height) && !isNaN(temp) && pressure > 0 && pressure < 1100) {
        levels.push({
          pressureMb: pressure,
          heightFt: Math.round(height * 3.28084), // Convert meters to feet
          tempC: temp,
          dewpointC: dewpoint,
          windDir: windDir,
          windSpeedKt: windSpeed,
        });
      }
    }
  }

  // Sort by altitude (lowest first)
  return levels.sort((a, b) => a.heightFt - b.heightFt);
}

/**
 * Detect temperature inversions in sounding data
 */
function detectInversions(levels: SoundingLevel[]): InversionLayer[] {
  const inversions: InversionLayer[] = [];

  for (let i = 0; i < levels.length - 1; i++) {
    const lower = levels[i];
    const upper = levels[i + 1];

    // Check for temperature increase with altitude (inversion)
    const tempDiff = upper.tempC - lower.tempC;

    if (tempDiff > INVERSION_THRESHOLD_C) {
      // Determine strength based on temperature difference per 1000ft
      const altDiff = (upper.heightFt - lower.heightFt) || 1;
      const lapseRate = (tempDiff / altDiff) * 1000; // °C per 1000ft

      let strength: 'weak' | 'moderate' | 'strong';
      if (lapseRate > 5) {
        strength = 'strong';
      } else if (lapseRate > 2) {
        strength = 'moderate';
      } else {
        strength = 'weak';
      }

      inversions.push({
        baseAltFt: lower.heightFt,
        topAltFt: upper.heightFt,
        baseTempC: lower.tempC,
        topTempC: upper.tempC,
        tempDifferenceC: tempDiff,
        strength,
      });
    }
  }

  return inversions;
}

/**
 * Get the strongest inversion within a relevant altitude range
 */
function getStrongestLowLevelInversion(
  inversions: InversionLayer[],
  maxAltFt: number = 3000
): InversionLayer | null {
  const lowLevelInversions = inversions.filter((inv) => inv.baseAltFt <= maxAltFt);

  if (lowLevelInversions.length === 0) {
    return null;
  }

  return lowLevelInversions.reduce((strongest, current) => {
    const currentScore = current.tempDifferenceC;
    const strongestScore = strongest.tempDifferenceC;
    return currentScore > strongestScore ? current : strongest;
  });
}

/**
 * Generate mock sounding data for development/fallback
 */
function generateMockSoundingData(hasInversion: boolean): SoundingLevel[] {
  const baseTime = new Date();
  const levels: SoundingLevel[] = [];

  // Generate levels from surface to 10000ft
  const altitudes = [0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000];
  const baseTemp = 15; // Surface temp in °C

  for (let i = 0; i < altitudes.length; i++) {
    const alt = altitudes[i];
    let temp: number;

    if (hasInversion && alt >= 500 && alt <= 1500) {
      // Create inversion layer between 500-1500ft
      temp = baseTemp + 2 + (alt - 500) * 0.003; // Temp increases with alt
    } else {
      // Normal lapse rate: -6.5°C per 1000m (-2°C per 1000ft)
      temp = baseTemp - (alt / 1000) * 2;
    }

    levels.push({
      pressureMb: 1013.25 * Math.exp(-alt / 27000), // Approximate pressure
      heightFt: alt,
      tempC: Math.round(temp * 10) / 10,
      dewpointC: Math.round((temp - 5) * 10) / 10,
      windDir: 270, // West wind
      windSpeedKt: 10 + Math.round(alt / 500),
    });
  }

  return levels;
}

// ─── API Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';

  try {
    let soundingLevels: SoundingLevel[];
    let soundingTime = new Date().toISOString();
    let dataSource = 'NOAA/NWS';

    if (useMock) {
      // Use mock data for development
      const hour = new Date().getHours();
      // Inversions more common in early morning and evening
      const hasInversion = hour < 8 || hour > 18;
      soundingLevels = generateMockSoundingData(hasInversion);
      dataSource = 'MOCK';
    } else {
      // Try to fetch real sounding data
      try {
        const response = await fetch(NOAA_RUCS_URL, {
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const text = await response.text();
          soundingLevels = parseSoundingData(text);

          // Extract sounding time from data if available
          const timeMatch = text.match(/(\d{2}Z \d{2} \w{3} \d{4})/);
          if (timeMatch) {
            soundingTime = timeMatch[1];
          }
        } else {
          // Fallback to mock data if fetch fails
          soundingLevels = generateMockSoundingData(false);
          dataSource = 'MOCK (NWS unavailable)';
        }
      } catch {
        // Network error - use mock data
        soundingLevels = generateMockSoundingData(false);
        dataSource = 'MOCK (network error)';
      }
    }

    // Analyze for inversions
    const inversions = detectInversions(soundingLevels);
    const strongestInversion = getStrongestLowLevelInversion(inversions);
    const lowLevelInversions = inversions.filter((inv) => inv.baseAltFt <= 3000);

    // Determine overall inversion status
    let inversionStrength: 'none' | 'weak' | 'moderate' | 'strong' = 'none';
    if (strongestInversion) {
      inversionStrength = strongestInversion.strength;
    }

    // Get surface conditions
    const surfaceLevel = soundingLevels[0] || {
      tempC: 15,
      windDir: 0,
      windSpeedKt: 0,
    };

    // Calculate next sounding time
    const now = new Date();
    const currentHour = now.getUTCHours();
    let nextSoundingHour: number;
    if (currentHour < 12) {
      nextSoundingHour = 12;
    } else {
      nextSoundingHour = 0;
      now.setUTCDate(now.getUTCDate() + 1);
    }
    now.setUTCHours(nextSoundingHour, 0, 0, 0);
    const nextSoundingTime = now.toISOString();

    // Generate description
    let description: string;
    if (!strongestInversion) {
      description = 'No significant temperature inversions detected. Normal sound propagation expected.';
    } else {
      const altRange = `${strongestInversion.baseAltFt}-${strongestInversion.topAltFt} ft`;
      const tempChange = `+${strongestInversion.tempDifferenceC.toFixed(1)}°C`;
      description = `${inversionStrength.charAt(0).toUpperCase() + inversionStrength.slice(1)} temperature inversion detected at ${altRange} (${tempChange}). Sound may be trapped and amplified at ground level.`;
    }

    // Calculate data age
    const soundingDate = new Date(soundingTime);
    const ageMs = Date.now() - soundingDate.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const dataAge = ageHours > 0 ? `${ageHours} hour${ageHours > 1 ? 's' : ''} ago` : 'Recent';

    const analysis: InversionAnalysis = {
      stationId: OKX_STATION.id,
      stationName: OKX_STATION.name,
      soundingTime,
      surfaceTempC: surfaceLevel.tempC,
      surfaceWindDir: surfaceLevel.windDir,
      surfaceWindSpeedKt: surfaceLevel.windSpeedKt,
      inversions,
      strongestInversion,
      inversionPresent: lowLevelInversions.length > 0,
      inversionStrength,
      lowLevelInversion: lowLevelInversions.length > 0,
      description,
      dataAge,
      nextSoundingTime,
    };

    return NextResponse.json({
      success: true,
      dataSource,
      analysis,
      soundingLevels: soundingLevels.slice(0, 15), // Limit to first 15 levels
    });
  } catch (error) {
    console.error('Inversion detection error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze temperature inversions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
