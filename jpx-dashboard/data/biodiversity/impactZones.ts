import type { BiodiversityImpactZone } from '@/types/biodiversity';

// KJPX Airport coordinates for zone generation
export const KJPX_COORDS: [number, number] = [-72.2518, 40.9594];

/**
 * Concentric impact zones around KJPX airport
 * Based on research from:
 * - CAA CAP 2517: The Effects of Aircraft Noise on Biodiversity
 * - PNAS phantom road experiment (Ware et al. 2015)
 * - Francis et al. gas compressor studies on species richness
 * - Buxton et al. 2017 (Science) - noise in protected areas
 *
 * Key findings used to calibrate zones:
 * - ~55 dB causes ~25-31% decline in bird abundance (phantom road experiment)
 * - >100 dB at takeoff/landing drives avoidance in small birds (CAA)
 * - 3 dB above natural levels = 50% reduction in listening area
 * - 10 dB above natural levels = 90% reduction in listening area
 * - Species richness reductions of 31-38% in near-range noise exposure
 */
export const biodiversityImpactZones: BiodiversityImpactZone[] = [
  {
    id: 'zone-critical',
    label: 'Critical Impact Zone',
    radiusMeters: 1000,
    estimatedDbRange: [85, 105],
    severity: 'critical',
    color: '#dc2626',
    fillOpacity: 0.18,
    description:
      'Immediate airport vicinity. Noise levels exceed 85 dB during operations. Near-complete avoidance by noise-sensitive species. Takeoff/landing noise >100 dB drives avoidance in small birds and disrupts predator-prey dynamics.',
    speciesRichnessDecline: 38,
    birdAbundanceDecline: 42,
  },
  {
    id: 'zone-high',
    label: 'High Impact Zone',
    radiusMeters: 2500,
    estimatedDbRange: [70, 85],
    severity: 'high',
    color: '#ea580c',
    fillOpacity: 0.14,
    description:
      'Frequent overflights at moderate-low altitude. Research shows 31-38% decline in species richness at these noise levels. Significant disruption to avian dawn chorus, breeding behavior, and territorial signaling.',
    speciesRichnessDecline: 31,
    birdAbundanceDecline: 35,
  },
  {
    id: 'zone-moderate',
    label: 'Moderate Impact Zone',
    radiusMeters: 5000,
    estimatedDbRange: [55, 70],
    severity: 'moderate',
    color: '#d97706',
    fillOpacity: 0.10,
    description:
      'Regular noise exposure at suburban levels (~55-70 dB). The phantom road experiment demonstrated 31% decline in bird abundance at ~55 dB. Reduced foraging efficiency: birds spend 30% less time feeding. Dawn song timing shifts observed.',
    speciesRichnessDecline: 25,
    birdAbundanceDecline: 31,
  },
  {
    id: 'zone-low',
    label: 'Low Impact Zone',
    radiusMeters: 8000,
    estimatedDbRange: [45, 55],
    severity: 'low',
    color: '#65a30d',
    fillOpacity: 0.07,
    description:
      'Intermittent noise above natural ambient levels. Even 3 dB above natural background (doubling acoustic energy) reduces listening area by 50%. Subtle behavioral changes: altered foraging patterns and song frequency shifts in some bird species.',
    speciesRichnessDecline: 12,
    birdAbundanceDecline: 15,
  },
  {
    id: 'zone-minimal',
    label: 'Minimal Impact Zone',
    radiusMeters: 12000,
    estimatedDbRange: [35, 45],
    severity: 'minimal',
    color: '#16a34a',
    fillOpacity: 0.04,
    description:
      'Occasional overflights audible above ambient. Indirect ecological effects possible through altered species interactions. Research shows cascading effects can extend beyond directly noise-exposed areas into adjacent quieter habitats.',
    speciesRichnessDecline: 5,
    birdAbundanceDecline: 8,
  },
];

/**
 * Generate GeoJSON circle polygon for an impact zone
 * Creates a circular polygon around the airport coordinates
 */
export function generateZoneCircle(
  center: [number, number],
  radiusMeters: number,
  numPoints = 64
): [number, number][] {
  const coords: [number, number][] = [];
  const metersPerDegLng = 111320 * Math.cos((center[1] * Math.PI) / 180);
  const metersPerDegLat = 110574;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const lng = center[0] + (radiusMeters / metersPerDegLng) * Math.cos(angle);
    const lat = center[1] + (radiusMeters / metersPerDegLat) * Math.sin(angle);
    coords.push([lng, lat]);
  }
  return coords;
}

/**
 * Get impact zone for a given distance from the airport
 */
export function getImpactZoneAtDistance(
  distanceMeters: number
): BiodiversityImpactZone | null {
  // Return the zone that contains this distance (innermost match)
  for (const zone of biodiversityImpactZones) {
    if (distanceMeters <= zone.radiusMeters) {
      return zone;
    }
  }
  return null;
}
