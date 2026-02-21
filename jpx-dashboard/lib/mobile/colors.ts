/**
 * Mobile dashboard color system.
 *
 * Key principle: Aircraft TYPE colors are neutral (no value judgment).
 * Noise LEVEL colors indicate dB severity only.
 *
 * Aligned with desktop dashboard styling for consistent theming.
 */

// Aircraft TYPE colors — neutral, identification only (aligned with desktop)
export const TYPE_COLORS = {
  helicopter: '#f97316', // orange-500 (aligned with desktop)
  jet: '#3b82f6',        // blue-500 (aligned with desktop)
  fixed_wing: '#14b8a6', // teal-500 (unchanged)
  unknown: '#a1a1aa',    // zinc-400 (aligned with desktop)
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

// UI colors (aligned with desktop blue accent)
export const UI_COLORS = {
  accent: '#2563eb',      // blue-600 (replaces teal)
  accentHover: '#1d4ed8', // blue-700
  red: '#ef4444',         // red-500
  green: '#22c55e',       // green-500
  grey: '#71717a',        // zinc-500
  lightGrey: '#f4f4f5',   // zinc-100
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
