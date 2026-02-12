export { mockNoiseSensors } from './mockSensors';
export { aircraftNoiseProfiles, getAircraftNoiseProfile, getNoiseProfileColor } from './aircraftNoiseProfiles';
export { mockComplaints, generateMockComplaints } from './mockComplaints';
export { mockFlightsForNoise, mockAirportsForNoise } from './mockFlights';

// EASA and FAA noise data
export {
  icaoToEasaMap,
  getEASANoiseProfile,
  getCategoryNoiseEstimate,
  hasValidatedMeasurement,
  CATEGORY_AVERAGES,
  type EASANoiseProfile,
} from './easa/icaoToEasaMap';

export {
  faaHelicopterMeasurements,
  getFAAMeasurement,
  hasFAAMeasurement,
  getAllFAAMeasurements,
  getFAALamaxAt1000ft,
  faaHelicopterStats,
  type FAAHelicopterMeasurement,
} from './faa/helicopterMeasurements';
