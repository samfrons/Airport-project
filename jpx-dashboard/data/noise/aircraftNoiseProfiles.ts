import type { AircraftNoiseProfile } from '@/types/noise';

// Based on FAA noise certification data and typical aircraft noise levels
// at 1000ft altitude during takeoff/approach
export const aircraftNoiseProfiles: Record<string, AircraftNoiseProfile> = {
  // ─── Helicopters ───────────────────────────────────────────────────────────
  R22: {
    aircraftType: 'R22',
    category: 'helicopter',
    noiseCategory: 'moderate',
    takeoffDb: 78,
    approachDb: 76,
  },
  R44: {
    aircraftType: 'R44',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 82,
    approachDb: 80,
  },
  R66: {
    aircraftType: 'R66',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 83,
    approachDb: 81,
  },
  S76: {
    aircraftType: 'S76',
    category: 'helicopter',
    noiseCategory: 'very_loud',
    takeoffDb: 88,
    approachDb: 85,
  },
  EC35: {
    aircraftType: 'EC35',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 84,
    approachDb: 82,
  },
  A109: {
    aircraftType: 'A109',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 85,
    approachDb: 83,
  },
  B06: {
    aircraftType: 'B06',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 83,
    approachDb: 81,
  },
  B407: {
    aircraftType: 'B407',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 84,
    approachDb: 82,
  },
  AS50: {
    aircraftType: 'AS50',
    category: 'helicopter',
    noiseCategory: 'loud',
    takeoffDb: 82,
    approachDb: 80,
  },

  // ─── Jets ──────────────────────────────────────────────────────────────────
  GLF5: {
    aircraftType: 'GLF5',
    category: 'jet',
    noiseCategory: 'very_loud',
    takeoffDb: 92,
    approachDb: 88,
  },
  GLF4: {
    aircraftType: 'GLF4',
    category: 'jet',
    noiseCategory: 'very_loud',
    takeoffDb: 90,
    approachDb: 86,
  },
  GLEX: {
    aircraftType: 'GLEX',
    category: 'jet',
    noiseCategory: 'very_loud',
    takeoffDb: 91,
    approachDb: 87,
  },
  C56X: {
    aircraftType: 'C56X',
    category: 'jet',
    noiseCategory: 'loud',
    takeoffDb: 86,
    approachDb: 82,
  },
  C680: {
    aircraftType: 'C680',
    category: 'jet',
    noiseCategory: 'loud',
    takeoffDb: 85,
    approachDb: 81,
  },
  C525: {
    aircraftType: 'C525',
    category: 'jet',
    noiseCategory: 'moderate',
    takeoffDb: 80,
    approachDb: 76,
  },
  E55P: {
    aircraftType: 'E55P',
    category: 'jet',
    noiseCategory: 'moderate',
    takeoffDb: 82,
    approachDb: 78,
  },
  PC12: {
    aircraftType: 'PC12',
    category: 'fixed_wing', // Pilatus PC-12 is a turboprop, not a jet
    noiseCategory: 'moderate',
    takeoffDb: 78,
    approachDb: 75,
  },
  LJ45: {
    aircraftType: 'LJ45',
    category: 'jet',
    noiseCategory: 'loud',
    takeoffDb: 84,
    approachDb: 80,
  },
  FA50: {
    aircraftType: 'FA50',
    category: 'jet',
    noiseCategory: 'loud',
    takeoffDb: 85,
    approachDb: 81,
  },

  // ─── Fixed Wing (Propeller) ────────────────────────────────────────────────
  C172: {
    aircraftType: 'C172',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 75,
    approachDb: 72,
  },
  C182: {
    aircraftType: 'C182',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 76,
    approachDb: 73,
  },
  C206: {
    aircraftType: 'C206',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 77,
    approachDb: 74,
  },
  PA28: {
    aircraftType: 'PA28',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 74,
    approachDb: 71,
  },
  PA32: {
    aircraftType: 'PA32',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 76,
    approachDb: 73,
  },
  BE36: {
    aircraftType: 'BE36',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 77,
    approachDb: 74,
  },
  SR22: {
    aircraftType: 'SR22',
    category: 'fixed_wing',
    noiseCategory: 'moderate',
    takeoffDb: 76,
    approachDb: 73,
  },
  P28A: {
    aircraftType: 'P28A',
    category: 'fixed_wing',
    noiseCategory: 'quiet',
    takeoffDb: 72,
    approachDb: 69,
  },
  C150: {
    aircraftType: 'C150',
    category: 'fixed_wing',
    noiseCategory: 'quiet',
    takeoffDb: 70,
    approachDb: 67,
  },

  // ─── Default/Unknown ───────────────────────────────────────────────────────
  UNKN: {
    aircraftType: 'UNKN',
    category: 'unknown',
    noiseCategory: 'moderate',
    takeoffDb: 80,
    approachDb: 76,
  },
};

// Helper to get profile or default
export function getAircraftNoiseProfile(type: string): AircraftNoiseProfile {
  return aircraftNoiseProfiles[type] || aircraftNoiseProfiles['UNKN'];
}

// Get noise category color
export function getNoiseProfileColor(noiseCategory: AircraftNoiseProfile['noiseCategory']): string {
  switch (noiseCategory) {
    case 'quiet':
      return '#22c55e';
    case 'moderate':
      return '#eab308';
    case 'loud':
      return '#f97316';
    case 'very_loud':
      return '#ef4444';
  }
}
