import type { NoiseSensor, NoiseReading } from '@/types/noise';

// Generate time-series readings for past 24 hours
function generateReadings(sensorId: string, baseDb: number): NoiseReading[] {
  const readings: NoiseReading[] = [];
  const now = new Date();

  for (let i = 0; i < 288; i++) {
    // 5-minute intervals for 24 hours
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hourOfDay = timestamp.getHours();

    // Higher noise during day (8am-8pm), lower at night
    const timeVariation = hourOfDay >= 8 && hourOfDay < 20 ? 8 : -5;

    // Random aircraft events (spikes)
    const eventSpike = Math.random() > 0.92 ? Math.random() * 25 : 0;

    // Natural variation
    const randomVariation = (Math.random() - 0.5) * 10;

    const dB = Math.max(35, Math.min(100, baseDb + timeVariation + randomVariation + eventSpike));

    readings.push({
      timestamp: timestamp.toISOString(),
      dB: Math.round(dB * 10) / 10,
      peakDb: Math.round((dB + Math.random() * 15) * 10) / 10,
      sensorId,
    });
  }

  return readings.reverse();
}

// Sensor locations around KJPX flight paths (40.9594, -72.2518)
export const mockNoiseSensors: NoiseSensor[] = [
  {
    id: 'sensor-001',
    name: 'Wainscott Main',
    location: { lat: 40.945, lng: -72.22, address: '123 Wainscott Main St' },
    status: 'active',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-002',
    name: 'Sagaponack South',
    location: { lat: 40.932, lng: -72.27, address: 'Sagaponack Rd' },
    status: 'active',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-003',
    name: 'Northwest Woods',
    location: { lat: 40.98, lng: -72.21, address: 'Northwest Woods' },
    status: 'active',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-004',
    name: 'Bridgehampton',
    location: { lat: 40.938, lng: -72.3, address: 'Bridgehampton' },
    status: 'active',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-005',
    name: 'East Hampton Village',
    location: { lat: 40.963, lng: -72.185, address: 'Main Street' },
    status: 'offline',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-006',
    name: 'Springs',
    location: { lat: 40.975, lng: -72.155, address: 'Springs Fireplace Rd' },
    status: 'active',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-007',
    name: 'Amagansett',
    location: { lat: 40.973, lng: -72.135, address: 'Amagansett Main' },
    status: 'maintenance',
    lastReading: null,
    readings: [],
  },
  {
    id: 'sensor-008',
    name: 'Runway Approach South',
    location: { lat: 40.94, lng: -72.2518, address: 'Near Airport - South' },
    status: 'active',
    lastReading: null,
    readings: [],
  },
];

// Initialize readings for each sensor with varying base levels
// Sensors closer to airport have higher base levels
const baseLevels: Record<string, number> = {
  'sensor-001': 52, // Wainscott - close to flight path
  'sensor-002': 48, // Sagaponack
  'sensor-003': 45, // Northwest Woods - quieter
  'sensor-004': 46, // Bridgehampton
  'sensor-005': 50, // East Hampton Village
  'sensor-006': 44, // Springs - quieter
  'sensor-007': 43, // Amagansett - quieter
  'sensor-008': 65, // Runway Approach - loudest
};

mockNoiseSensors.forEach((sensor) => {
  const baseDb = baseLevels[sensor.id] || 50;
  sensor.readings = generateReadings(sensor.id, baseDb);
  sensor.lastReading = sensor.readings[sensor.readings.length - 1];
});
