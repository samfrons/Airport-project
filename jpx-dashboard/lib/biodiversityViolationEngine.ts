/**
 * Biodiversity Violation Engine - Disabled Stub
 *
 * This file provides stub functions that return null/empty results.
 * The biodiversity feature has been removed from the dashboard.
 */

import type { Flight } from '@/types/flight';
import type { BiodiversityViolation, BiodiversityThreshold } from '@/types/biodiversityThresholds';

// Re-export types for backward compatibility
export type { BiodiversityViolation, BiodiversityThreshold } from '@/types/biodiversityThresholds';

/**
 * Evaluate a single flight - always returns null (no violations)
 */
export function evaluateFlight(
  _flight: Flight,
  _thresholds: BiodiversityThreshold[] = []
): BiodiversityViolation | null {
  return null;
}

/**
 * Evaluate all flights - always returns empty array
 */
export function evaluateAllFlights(
  _flights: Flight[],
  _thresholds: BiodiversityThreshold[] = []
): BiodiversityViolation[] {
  return [];
}
