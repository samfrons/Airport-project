export { mockNoiseSensors } from './mockSensors';
export { aircraftNoiseProfiles, getAircraftNoiseProfile, getNoiseProfileColor } from './aircraftNoiseProfiles';
export { mockComplaints, generateMockComplaints } from './mockComplaints';
export { mockFlightsForNoise, mockAirportsForNoise } from './mockFlights';

// New PlaneNoise-format mock data (for database preview)
export {
  generateMockComplaints as generateMockComplaintsDb,
  generateMockComplaintSummary,
  generateMockHotspots,
  getMockComplaints,
  getMockComplaintSummary,
  getMockHotspots,
  clearMockCache,
} from './mockComplaintsDb';
export {
  EAST_HAMPTON_STREETS,
  MUNICIPALITIES,
  getWeightedMunicipality,
  getRandomStreet,
  getAllStreets,
  type StreetLocation,
  type MunicipalityData,
} from './eastHamptonStreets';

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
