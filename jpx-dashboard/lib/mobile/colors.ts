/**
 * Mobile dashboard color system.
 *
 * Key principle: Aircraft TYPE colors are neutral (no value judgment).
 * Noise LEVEL colors indicate dB severity only.
 */

// Navy header background
export const NAVY = '#1F3864';

// Aircraft TYPE colors — neutral, identification only
export const TYPE_COLORS = {
  helicopter: '#6366F1', // indigo
  jet: '#0EA5E9',        // sky blue
  fixed_wing: '#14B8A6', // teal
  unknown: '#6B7280',    // gray
} as const;

// Noise LEVEL colors — standards-based dB thresholds
export const NOISE_COLORS = {
  quiet: '#84CC16',      // < 65 dB (below EPA outdoor threshold)
  moderate: '#EAB308',   // 65-75 dB (WHO guideline zone)
  loud: '#F97316',       // 75-85 dB (FAA significant impact)
  veryLoud: '#EF4444',   // > 85 dB (above OSHA action level)
} as const;

// Status colors
export const STATUS_COLORS = {
  live: '#16A34A',
  stale: '#D97706',
  error: '#DC2626',
} as const;

// UI colors
export const UI_COLORS = {
  teal: '#1A6B72',
  red: '#DC2626',
  green: '#16A34A',
  grey: '#6B7280',
  lightGrey: '#F3F4F6',
} as const;

/**
 * Get noise color based on dB value.
 */
export function getNoiseColor(db: number): string {
  if (db >= 85) return NOISE_COLORS.veryLoud;
  if (db >= 75) return NOISE_COLORS.loud;
  if (db >= 65) return NOISE_COLORS.moderate;
  return NOISE_COLORS.quiet;
}

/**
 * Get type color based on aircraft category.
 */
export function getTypeColor(category: string): string {
  if (category === 'helicopter') return TYPE_COLORS.helicopter;
  if (category === 'jet') return TYPE_COLORS.jet;
  if (category === 'fixed_wing') return TYPE_COLORS.fixed_wing;
  return TYPE_COLORS.unknown;
}

/**
 * Get short label for aircraft category.
 */
export function getCategoryLabel(category: string): string {
  if (category === 'helicopter') return 'HELI';
  if (category === 'jet') return 'JET';
  if (category === 'fixed_wing') return 'PROP';
  return 'UNK';
}
