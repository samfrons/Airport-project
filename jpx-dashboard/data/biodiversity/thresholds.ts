import type { BiodiversityThreshold } from '@/types/biodiversityThresholds';

/**
 * Biodiversity protection thresholds for KJPX airport
 *
 * These thresholds define the rules that trigger violations when
 * aircraft operations exceed noise or timing limits that impact
 * local wildlife and ecosystems.
 */
export const biodiversityThresholds: BiodiversityThreshold[] = [
  // ─── Noise Level Thresholds ───────────────────────────────────────────────
  {
    id: 'th-critical-noise',
    label: 'Critical Noise Level',
    description: 'Aircraft exceeding 88 dB at reference altitude — causes near-complete avoidance by sensitive species and disrupts predator-prey dynamics.',
    enabled: true,
    type: 'noise_level',
    noiseThresholdDb: 88,
    violationSeverity: 'critical',
  },
  {
    id: 'th-high-noise',
    label: 'High Noise Level',
    description: 'Aircraft exceeding 80 dB at reference altitude — causes 31-38% decline in species richness and significant disruption to avian breeding behavior.',
    enabled: true,
    type: 'noise_level',
    noiseThresholdDb: 80,
    violationSeverity: 'high',
  },
  {
    id: 'th-moderate-noise',
    label: 'Moderate Noise Level',
    description: 'Aircraft exceeding 72 dB at reference altitude — research shows reduced foraging efficiency and dawn chorus timing shifts at these levels.',
    enabled: true,
    type: 'noise_level',
    noiseThresholdDb: 72,
    violationSeverity: 'moderate',
  },

  // ─── Time-of-Day Thresholds ──────────────────────────────────────────────
  {
    id: 'th-dawn-chorus',
    label: 'Dawn Chorus Protection',
    description: 'Operations during critical dawn singing hours (4-7 AM) when birds establish territories and attract mates. Aircraft noise masks songs and permanently alters singing behavior.',
    enabled: true,
    type: 'time_of_day',
    activeHours: { start: 4, end: 7 },
    violationSeverity: 'high',
    protectedGroups: ['birds'],
  },
  {
    id: 'th-dusk-hunting',
    label: 'Dusk Hunting Period',
    description: 'Operations during dusk hours (19-21) when owls and bats begin acoustic hunting. A 1 dB increase in noise reduces owl hunting success by 8%.',
    enabled: true,
    type: 'time_of_day',
    activeHours: { start: 19, end: 21 },
    violationSeverity: 'high',
    protectedGroups: ['birds', 'mammals'],
  },
  {
    id: 'th-nighttime-ecology',
    label: 'Nighttime Ecology Protection',
    description: 'Operations during night hours (21-4) when nocturnal species are active. Noise disrupts bat echolocation, amphibian chorusing, and owl foraging.',
    enabled: true,
    type: 'time_of_day',
    activeHours: { start: 21, end: 4 },
    violationSeverity: 'moderate',
    protectedGroups: ['mammals', 'amphibians', 'birds'],
  },

  // ─── Seasonal Thresholds ──────────────────────────────────────────────────
  {
    id: 'th-breeding-season',
    label: 'Avian Breeding Season',
    description: 'April through August is the critical breeding season for shorebirds (Piping Plover, Least Tern) and songbirds. Noise causes nest abandonment and reduced fledging success.',
    enabled: true,
    type: 'seasonal',
    activeMonths: [4, 5, 6, 7, 8],
    noiseThresholdDb: 70,
    violationSeverity: 'critical',
    protectedGroups: ['birds'],
  },
  {
    id: 'th-amphibian-breeding',
    label: 'Amphibian Breeding Season',
    description: 'March through June is the peak chorusing and breeding period for frogs and toads. Noise masks mating calls and reduces reproductive success.',
    enabled: true,
    type: 'seasonal',
    activeMonths: [3, 4, 5, 6],
    noiseThresholdDb: 65,
    violationSeverity: 'high',
    protectedGroups: ['amphibians'],
  },
  {
    id: 'th-migration-season',
    label: 'Fall Migration Period',
    description: 'September through November is peak migration for songbirds. The phantom road experiment showed 31% of migrating birds avoid areas with just 55 dB noise.',
    enabled: true,
    type: 'seasonal',
    activeMonths: [9, 10, 11],
    noiseThresholdDb: 72,
    violationSeverity: 'moderate',
    protectedGroups: ['birds', 'insects'],
  },

  // ─── Habitat Proximity Thresholds ─────────────────────────────────────────
  {
    id: 'th-wetland-protection',
    label: 'Wetland Habitat Protection',
    description: 'Protects wetland habitats including saltmarshes hosting Saltmarsh Sparrow (globally vulnerable) and wading bird colonies. Operations exceeding noise threshold degrade acoustic habitat quality.',
    enabled: true,
    type: 'habitat_proximity',
    noiseThresholdDb: 65,
    protectedHabitatTypes: ['wetland'],
    violationSeverity: 'high',
    protectedGroups: ['birds', 'amphibians'],
  },
  {
    id: 'th-coastal-protection',
    label: 'Coastal Nesting Protection',
    description: 'Protects coastal habitats where federally threatened Piping Plover and state-threatened Least Tern nest. High sensitivity to overflight disturbance.',
    enabled: true,
    type: 'habitat_proximity',
    noiseThresholdDb: 60,
    protectedHabitatTypes: ['coastal'],
    violationSeverity: 'critical',
    protectedGroups: ['birds'],
  },
];
