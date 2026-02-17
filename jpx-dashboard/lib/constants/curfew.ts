/**
 * Curfew Constants — Single Source of Truth
 *
 * East Hampton Town Airport (KJPX) voluntary curfew period.
 * All curfew logic throughout the codebase should import from this file.
 */

export const CURFEW = {
  /** Curfew starts at 9 PM (21:00) Eastern Time */
  START_HOUR: 21,

  /** Curfew ends at 7 AM (07:00) Eastern Time */
  END_HOUR: 7,

  /** Display string for UI elements */
  DISPLAY_STRING: '9 PM – 7 AM ET',

  /** Short display string */
  DISPLAY_SHORT: '9p–7a',

  /**
   * Check if an hour (0-23) falls within the curfew period.
   * Curfew is 9 PM (21:00) through 6:59 AM (before 7:00).
   *
   * @param hour - Hour in 24-hour format (0-23)
   * @returns true if the hour is during curfew
   */
  isCurfewHour: (hour: number): boolean => {
    return hour >= 21 || hour < 7;
  },
} as const;

// Re-export individual items for convenience
export const { START_HOUR, END_HOUR, DISPLAY_STRING, isCurfewHour } = CURFEW;

// Type for the curfew configuration
export type CurfewConfig = typeof CURFEW;
