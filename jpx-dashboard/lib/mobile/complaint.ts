/**
 * Complaint URL builder for East Hampton noise reporting.
 *
 * PlaneNoise is a common complaint portal used by many airports.
 * East Hampton Town also has their own complaint form.
 */

import type { Flight } from '@/types/flight';

// East Hampton Town complaint portal
const COMPLAINT_BASE_URL = 'https://www.easthamptonny.gov/noise-complaint';

// Alternative: PlaneNoise portal (used by many airports)
const PLANENOISE_URL = 'https://planenoise.com/submit';

/**
 * Build a complaint URL with flight details pre-filled as query params.
 */
export function buildComplaintUrl(flight?: Flight): string {
  const params = new URLSearchParams();

  // Always include current timestamp
  params.set('timestamp', new Date().toISOString());

  if (flight) {
    // Pre-fill flight details
    if (flight.registration) params.set('tail', flight.registration);
    if (flight.ident) params.set('ident', flight.ident);
    if (flight.operator) params.set('operator', flight.operator);
    if (flight.aircraft_type) params.set('aircraft', flight.aircraft_type);
    if (flight.operation_date) params.set('date', flight.operation_date);

    // Include time
    const time = flight.actual_on || flight.actual_off;
    if (time) params.set('time', time);

    // Include route
    if (flight.direction === 'arrival' && flight.origin_code) {
      params.set('origin', flight.origin_code);
    } else if (flight.direction === 'departure' && flight.destination_code) {
      params.set('destination', flight.destination_code);
    }
  }

  // For now, return East Hampton Town URL
  // In production, this could be configured per deployment
  return `${COMPLAINT_BASE_URL}?${params.toString()}`;
}

/**
 * Build a general complaint URL (no specific flight).
 */
export function buildGeneralComplaintUrl(): string {
  const params = new URLSearchParams();
  params.set('timestamp', new Date().toISOString());
  params.set('source', 'jpx-mobile');

  return `${COMPLAINT_BASE_URL}?${params.toString()}`;
}

/**
 * Open the complaint portal in a new tab.
 */
export function openComplaintPortal(flight?: Flight): void {
  const url = flight ? buildComplaintUrl(flight) : buildGeneralComplaintUrl();
  window.open(url, '_blank', 'noopener,noreferrer');
}
