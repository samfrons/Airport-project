/**
 * Aircraft Type Color System — Single Source of Truth
 *
 * Neutral color palette for aircraft categories.
 * Red/green are reserved exclusively for compliance status.
 */

// Aircraft category colors (neutral, not emotionally loaded)
export const AIRCRAFT_COLORS = {
  helicopter: {
    /** Warm orange for helicopters */
    primary: '#f97316',      // orange-500
    light: '#fb923c',        // orange-400
    dark: '#ea580c',         // orange-600
    bg: 'rgba(249, 115, 22, 0.1)',
    bgDark: 'rgba(249, 115, 22, 0.2)',
    tailwind: 'orange-500',
  },
  jet: {
    /** Steel blue for jets */
    primary: '#3b82f6',      // blue-500
    light: '#60a5fa',        // blue-400
    dark: '#2563eb',         // blue-600
    bg: 'rgba(59, 130, 246, 0.1)',
    bgDark: 'rgba(59, 130, 246, 0.2)',
    tailwind: 'blue-500',
  },
  fixed_wing: {
    /** Teal for fixed wing (prop aircraft) */
    primary: '#14b8a6',      // teal-500
    light: '#2dd4bf',        // teal-400
    dark: '#0d9488',         // teal-600
    bg: 'rgba(20, 184, 166, 0.1)',
    bgDark: 'rgba(20, 184, 166, 0.2)',
    tailwind: 'teal-500',
  },
  unknown: {
    /** Neutral zinc for unknown types */
    primary: '#a1a1aa',      // zinc-400
    light: '#d4d4d8',        // zinc-300
    dark: '#71717a',         // zinc-500
    bg: 'rgba(161, 161, 170, 0.1)',
    bgDark: 'rgba(161, 161, 170, 0.2)',
    tailwind: 'zinc-400',
  },
} as const;

// Compliance colors (reserved for pass/fail status only)
export const COMPLIANCE_COLORS = {
  compliant: {
    primary: '#22c55e',      // green-500
    light: '#4ade80',        // green-400
    dark: '#16a34a',         // green-600
    bg: 'rgba(34, 197, 94, 0.1)',
    tailwind: 'green-500',
  },
  violation: {
    primary: '#ef4444',      // red-500
    light: '#f87171',        // red-400
    dark: '#dc2626',         // red-600
    bg: 'rgba(239, 68, 68, 0.1)',
    tailwind: 'red-500',
  },
  warning: {
    primary: '#f59e0b',      // amber-500
    light: '#fbbf24',        // amber-400
    dark: '#d97706',         // amber-600
    bg: 'rgba(245, 158, 11, 0.1)',
    tailwind: 'amber-500',
  },
} as const;

// Direction colors (arrivals/departures)
export const DIRECTION_COLORS = {
  arrival: {
    primary: '#22c55e',      // green-500 (standard aviation)
    light: '#4ade80',
    tailwind: 'green-500',
  },
  departure: {
    primary: '#3b82f6',      // blue-500 (standard aviation)
    light: '#60a5fa',
    tailwind: 'blue-500',
  },
} as const;

// Helper to get category color
export function getAircraftCategoryColor(
  category: string
): (typeof AIRCRAFT_COLORS)[keyof typeof AIRCRAFT_COLORS] {
  return (
    AIRCRAFT_COLORS[category as keyof typeof AIRCRAFT_COLORS] ||
    AIRCRAFT_COLORS.unknown
  );
}

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  helicopter: 'Helicopter',
  jet: 'Jet',
  fixed_wing: 'Fixed Wing',
  unknown: 'Unknown',
};

// Simple color lookup (primary colors only)
export const CATEGORY_COLORS_SIMPLE: Record<string, string> = {
  helicopter: AIRCRAFT_COLORS.helicopter.primary,
  jet: AIRCRAFT_COLORS.jet.primary,
  fixed_wing: AIRCRAFT_COLORS.fixed_wing.primary,
  unknown: AIRCRAFT_COLORS.unknown.primary,
};

export type AircraftCategory = keyof typeof AIRCRAFT_COLORS;
export type ComplianceStatus = keyof typeof COMPLIANCE_COLORS;
