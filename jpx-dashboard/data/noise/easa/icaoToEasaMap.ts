// Auto-generated from EASA noise certification data
// Generated: 2026-02-12T01:58:10.309052
// Source: https://www.easa.europa.eu/en/domains/environment/easa-certification-noise-levels
// Updated: 2026-02-12 with FAA ROSAP measurements

import {
  getFAAMeasurement,
  hasFAAMeasurement,
  type FAAHelicopterMeasurement,
} from '../faa/helicopterMeasurements';

export interface EASANoiseProfile {
  icaoType: string;
  easaManufacturer: string | null;
  easaModel: string | null;
  category: 'helicopter' | 'jet' | 'fixed_wing' | 'unknown';
  lateralEpnl: number | null;
  flyoverEpnl: number | null;
  approachEpnl: number | null;
  takeoffDb: number;      // LAmax at 1000ft reference
  approachDb: number;     // LAmax at 1000ft reference
  dataSource: 'EASA_CERTIFIED' | 'FAA_MEASURED' | 'CATEGORY_ESTIMATE' | 'UNVERIFIED';
  confidence: 'high' | 'medium' | 'low';
  faaReport?: string;     // FAA ROSAP report reference if available
}

// Category averages for unknown aircraft types (LAmax at 1000ft)
export const CATEGORY_AVERAGES: Record<string, { default: number; light?: number; medium?: number; heavy?: number }> = {
  helicopter: { default: 84, light: 78, medium: 84, heavy: 90 },
  jet: { default: 88, light: 82, medium: 88, heavy: 94 },
  fixed_wing: { default: 76, light: 72, medium: 76, heavy: 82 },
  unknown: { default: 80 }
};

// ICAO type code to EASA noise profile mapping
export const icaoToEasaMap: Record<string, EASANoiseProfile> = {
  "R22": {
    icaoType: "R22",
    easaManufacturer: "Robinson",
    easaModel: "R22",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 85.0,
    approachEpnl: null,
    takeoffDb: 78,
    approachDb: 76,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "R44": {
    icaoType: "R44",
    easaManufacturer: "Robinson",
    easaModel: "R44 II",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 88.5,
    approachEpnl: null,
    takeoffDb: 82,
    approachDb: 80,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "R66": {
    icaoType: "R66",
    easaManufacturer: "Robinson",
    easaModel: "R66",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 89.5,
    approachEpnl: null,
    takeoffDb: 83,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "S76": {
    icaoType: "S76",
    easaManufacturer: "Sikorsky",
    easaModel: "S-76C++",
    category: "helicopter",
    lateralEpnl: 91.2,
    flyoverEpnl: 95.0,
    approachEpnl: 97.0,
    takeoffDb: 88,
    approachDb: 85,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "S92": {
    icaoType: "S92",
    easaManufacturer: "Sikorsky",
    easaModel: "S-92A",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 98.0,
    approachEpnl: null,
    takeoffDb: 92,
    approachDb: 88,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "EC35": {
    icaoType: "EC35",
    easaManufacturer: "Airbus Helicopters",
    easaModel: "H135",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 91.0,
    approachEpnl: null,
    takeoffDb: 84,
    approachDb: 82,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "EC45": {
    icaoType: "EC45",
    easaManufacturer: "Airbus Helicopters",
    easaModel: "H145",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 93.0,
    approachEpnl: null,
    takeoffDb: 86,
    approachDb: 84,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "AS50": {
    icaoType: "AS50",
    easaManufacturer: "Airbus Helicopters",
    easaModel: "H125 (AS350)",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 89.0,
    approachEpnl: null,
    takeoffDb: 82,
    approachDb: 80,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "A109": {
    icaoType: "A109",
    easaManufacturer: "Leonardo",
    easaModel: "AW109SP",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 93.0,
    approachEpnl: null,
    takeoffDb: 86,
    approachDb: 84,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "A139": {
    icaoType: "A139",
    easaManufacturer: "Leonardo",
    easaModel: "AW139",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 96.0,
    approachEpnl: null,
    takeoffDb: 89,
    approachDb: 86,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "B06": {
    icaoType: "B06",
    easaManufacturer: "Bell",
    easaModel: "206L-4",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 89.0,
    approachEpnl: null,
    takeoffDb: 83,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "B407": {
    icaoType: "B407",
    easaManufacturer: "Bell",
    easaModel: "407",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 91.0,
    approachEpnl: null,
    takeoffDb: 84,
    approachDb: 82,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "B429": {
    icaoType: "B429",
    easaManufacturer: "Bell",
    easaModel: "429",
    category: "helicopter",
    lateralEpnl: null,
    flyoverEpnl: 92.0,
    approachEpnl: null,
    takeoffDb: 85,
    approachDb: 83,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "GLF4": {
    icaoType: "GLF4",
    easaManufacturer: "Gulfstream",
    easaModel: "G450",
    category: "jet",
    lateralEpnl: 94.0,
    flyoverEpnl: 86.0,
    approachEpnl: 95.0,
    takeoffDb: 90,
    approachDb: 86,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "GLF5": {
    icaoType: "GLF5",
    easaManufacturer: "Gulfstream",
    easaModel: "G550",
    category: "jet",
    lateralEpnl: 92.5,
    flyoverEpnl: 84.5,
    approachEpnl: 94.5,
    takeoffDb: 89,
    approachDb: 85,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "GLF6": {
    icaoType: "GLF6",
    easaManufacturer: "Gulfstream",
    easaModel: "G650",
    category: "jet",
    lateralEpnl: 90.0,
    flyoverEpnl: 82.5,
    approachEpnl: 92.5,
    takeoffDb: 88,
    approachDb: 84,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "GLEX": {
    icaoType: "GLEX",
    easaManufacturer: "Bombardier",
    easaModel: "Global Express",
    category: "jet",
    lateralEpnl: 93.0,
    flyoverEpnl: 85.0,
    approachEpnl: 95.0,
    takeoffDb: 91,
    approachDb: 87,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "CL30": {
    icaoType: "CL30",
    easaManufacturer: "Bombardier",
    easaModel: "Challenger 300",
    category: "jet",
    lateralEpnl: 89.0,
    flyoverEpnl: 79.0,
    approachEpnl: 92.0,
    takeoffDb: 85,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "CL35": {
    icaoType: "CL35",
    easaManufacturer: "Bombardier",
    easaModel: "Challenger 350",
    category: "jet",
    lateralEpnl: 88.0,
    flyoverEpnl: 78.0,
    approachEpnl: 91.0,
    takeoffDb: 84,
    approachDb: 80,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "CL60": {
    icaoType: "CL60",
    easaManufacturer: "Bombardier",
    easaModel: "Challenger 604",
    category: "jet",
    lateralEpnl: 91.0,
    flyoverEpnl: 82.0,
    approachEpnl: 94.0,
    takeoffDb: 87,
    approachDb: 83,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C525": {
    icaoType: "C525",
    easaManufacturer: "Cessna",
    easaModel: "Citation CJ3+",
    category: "jet",
    lateralEpnl: 86.0,
    flyoverEpnl: 75.0,
    approachEpnl: 90.0,
    takeoffDb: 80,
    approachDb: 76,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C56X": {
    icaoType: "C56X",
    easaManufacturer: "Cessna",
    easaModel: "Citation XLS+",
    category: "jet",
    lateralEpnl: 88.0,
    flyoverEpnl: 78.0,
    approachEpnl: 92.0,
    takeoffDb: 84,
    approachDb: 80,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C680": {
    icaoType: "C680",
    easaManufacturer: "Cessna",
    easaModel: "Citation Sovereign+",
    category: "jet",
    lateralEpnl: 89.0,
    flyoverEpnl: 79.0,
    approachEpnl: 93.0,
    takeoffDb: 85,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C750": {
    icaoType: "C750",
    easaManufacturer: "Cessna",
    easaModel: "Citation X+",
    category: "jet",
    lateralEpnl: 92.0,
    flyoverEpnl: 84.0,
    approachEpnl: 95.0,
    takeoffDb: 89,
    approachDb: 85,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "E50P": {
    icaoType: "E50P",
    easaManufacturer: "Embraer",
    easaModel: "Phenom 100EV",
    category: "jet",
    lateralEpnl: 85.0,
    flyoverEpnl: 74.0,
    approachEpnl: 89.0,
    takeoffDb: 78,
    approachDb: 75,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "E55P": {
    icaoType: "E55P",
    easaManufacturer: "Embraer",
    easaModel: "Phenom 300E",
    category: "jet",
    lateralEpnl: 87.0,
    flyoverEpnl: 76.0,
    approachEpnl: 91.0,
    takeoffDb: 82,
    approachDb: 78,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "FA50": {
    icaoType: "FA50",
    easaManufacturer: "Dassault",
    easaModel: "Falcon 50",
    category: "jet",
    lateralEpnl: 90.0,
    flyoverEpnl: 81.0,
    approachEpnl: 93.0,
    takeoffDb: 85,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "F900": {
    icaoType: "F900",
    easaManufacturer: "Dassault",
    easaModel: "Falcon 900EX",
    category: "jet",
    lateralEpnl: 89.0,
    flyoverEpnl: 80.0,
    approachEpnl: 92.0,
    takeoffDb: 86,
    approachDb: 82,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "FA7X": {
    icaoType: "FA7X",
    easaManufacturer: "Dassault",
    easaModel: "Falcon 7X",
    category: "jet",
    lateralEpnl: 88.0,
    flyoverEpnl: 79.0,
    approachEpnl: 91.0,
    takeoffDb: 85,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "LJ45": {
    icaoType: "LJ45",
    easaManufacturer: "Bombardier",
    easaModel: "Learjet 45XR",
    category: "jet",
    lateralEpnl: 87.0,
    flyoverEpnl: 77.0,
    approachEpnl: 90.0,
    takeoffDb: 84,
    approachDb: 80,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "LJ60": {
    icaoType: "LJ60",
    easaManufacturer: "Bombardier",
    easaModel: "Learjet 60XR",
    category: "jet",
    lateralEpnl: 88.0,
    flyoverEpnl: 78.0,
    approachEpnl: 91.0,
    takeoffDb: 85,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C172": {
    icaoType: "C172",
    easaManufacturer: "Cessna",
    easaModel: "172S Skyhawk",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 76.0,
    approachEpnl: null,
    takeoffDb: 75,
    approachDb: 72,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C182": {
    icaoType: "C182",
    easaManufacturer: "Cessna",
    easaModel: "182T Skylane",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 77.5,
    approachEpnl: null,
    takeoffDb: 76,
    approachDb: 73,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C206": {
    icaoType: "C206",
    easaManufacturer: "Cessna",
    easaModel: "T206H Stationair",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 79.0,
    approachEpnl: null,
    takeoffDb: 77,
    approachDb: 74,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "C208": {
    icaoType: "C208",
    easaManufacturer: "Cessna",
    easaModel: "208B Grand Caravan",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 82.0,
    approachEpnl: null,
    takeoffDb: 80,
    approachDb: 77,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "PA28": {
    icaoType: "PA28",
    easaManufacturer: "Piper",
    easaModel: "PA-28 Cherokee",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 75.0,
    approachEpnl: null,
    takeoffDb: 74,
    approachDb: 71,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "P28A": {
    icaoType: "P28A",
    easaManufacturer: "Piper",
    easaModel: "PA-28 Archer",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 74.0,
    approachEpnl: null,
    takeoffDb: 72,
    approachDb: 69,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "PA32": {
    icaoType: "PA32",
    easaManufacturer: "Piper",
    easaModel: "PA-32 Saratoga",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 77.0,
    approachEpnl: null,
    takeoffDb: 76,
    approachDb: 73,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "PA46": {
    icaoType: "PA46",
    easaManufacturer: "Piper",
    easaModel: "PA-46 M600",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 80.0,
    approachEpnl: null,
    takeoffDb: 79,
    approachDb: 76,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "BE36": {
    icaoType: "BE36",
    easaManufacturer: "Beechcraft",
    easaModel: "Bonanza G36",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 78.0,
    approachEpnl: null,
    takeoffDb: 77,
    approachDb: 74,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "BE58": {
    icaoType: "BE58",
    easaManufacturer: "Beechcraft",
    easaModel: "Baron G58",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 80.0,
    approachEpnl: null,
    takeoffDb: 79,
    approachDb: 76,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "BE20": {
    icaoType: "BE20",
    easaManufacturer: "Beechcraft",
    easaModel: "King Air 200",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 85.0,
    approachEpnl: null,
    takeoffDb: 83,
    approachDb: 80,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "B350": {
    icaoType: "B350",
    easaManufacturer: "Beechcraft",
    easaModel: "King Air 350",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 86.0,
    approachEpnl: null,
    takeoffDb: 84,
    approachDb: 81,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "SR22": {
    icaoType: "SR22",
    easaManufacturer: "Cirrus",
    easaModel: "SR22",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 77.0,
    approachEpnl: null,
    takeoffDb: 76,
    approachDb: 73,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "SF50": {
    icaoType: "SF50",
    easaManufacturer: "Cirrus",
    easaModel: "Vision Jet SF50",
    category: "jet",
    lateralEpnl: 82.0,
    flyoverEpnl: 73.0,
    approachEpnl: 86.0,
    takeoffDb: 77,
    approachDb: 74,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "PC12": {
    icaoType: "PC12",
    easaManufacturer: "Pilatus",
    easaModel: "PC-12 NGX",
    category: "fixed_wing",
    lateralEpnl: null,
    flyoverEpnl: 81.0,
    approachEpnl: null,
    takeoffDb: 78,
    approachDb: 75,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
  "PC24": {
    icaoType: "PC24",
    easaManufacturer: "Pilatus",
    easaModel: "PC-24",
    category: "jet",
    lateralEpnl: 85.0,
    flyoverEpnl: 75.0,
    approachEpnl: 89.0,
    takeoffDb: 79,
    approachDb: 76,
    dataSource: "EASA_CERTIFIED",
    confidence: "high"
  },
};

/**
 * Get noise profile for an ICAO type code
 * Prefers FAA measured data for helicopters when available
 * Falls back to EASA certification data, then category averages
 */
export function getEASANoiseProfile(icaoType: string): EASANoiseProfile {
  const normalizedType = icaoType?.toUpperCase();
  const profile = icaoToEasaMap[normalizedType];

  // Check for FAA measured data (higher accuracy for helicopters)
  if (hasFAAMeasurement(normalizedType)) {
    const faaMeasurement = getFAAMeasurement(normalizedType);
    if (faaMeasurement && faaMeasurement.lamax1000ft) {
      // Override with FAA measured values if available
      const baseProfile = profile || {
        icaoType: normalizedType,
        easaManufacturer: faaMeasurement.manufacturer,
        easaModel: faaMeasurement.model,
        category: 'helicopter' as const,
        lateralEpnl: null,
        flyoverEpnl: faaMeasurement.flyoverEpndb,
        approachEpnl: faaMeasurement.approachEpndb,
        takeoffDb: faaMeasurement.lamax1000ft,
        approachDb: faaMeasurement.lamax1000ft + 2, // Approach typically 2 dB higher
        dataSource: 'FAA_MEASURED' as const,
        confidence: 'high' as const,
      };

      return {
        ...baseProfile,
        takeoffDb: faaMeasurement.lamax1000ft,
        approachDb: (faaMeasurement.lamax1000ft || 0) + 2,
        dataSource: 'FAA_MEASURED',
        confidence: 'high',
        faaReport: faaMeasurement.faaReport,
      };
    }
  }

  if (profile) {
    return profile;
  }

  // Return unknown category fallback
  return {
    icaoType: icaoType || 'UNKN',
    easaManufacturer: null,
    easaModel: null,
    category: 'unknown',
    lateralEpnl: null,
    flyoverEpnl: null,
    approachEpnl: null,
    takeoffDb: CATEGORY_AVERAGES.unknown.default,
    approachDb: CATEGORY_AVERAGES.unknown.default - 4,
    dataSource: 'UNVERIFIED',
    confidence: 'low'
  };
}

/**
 * Check if a profile has FAA measured data
 */
export function hasValidatedMeasurement(icaoType: string): boolean {
  return hasFAAMeasurement(icaoType);
}

/**
 * Get category-based noise estimate
 */
export function getCategoryNoiseEstimate(
  category: string,
  weightClass: 'light' | 'medium' | 'heavy' = 'medium'
): number {
  const cat = CATEGORY_AVERAGES[category] || CATEGORY_AVERAGES.unknown;
  return cat[weightClass] || cat.default;
}
