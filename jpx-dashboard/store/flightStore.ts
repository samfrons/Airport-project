import { create } from 'zustand';
import type { Flight, DailySummary, Airport, MapViewMode, DateRange } from '@/types/flight';
import type { NoiseLayerSettings, NoiseSensor, NoiseComplaint } from '@/types/noise';
import type { BiodiversityLayerSettings } from '@/types/biodiversity';

// Default noise layer settings
const defaultNoiseSettings: NoiseLayerSettings = {
  visibility: {
    sensors: false,
    aircraftNoise: false,
    complaints: false,
  },
  opacity: {
    sensors: 0.8,
    aircraftNoise: 0.6,
    complaints: 0.7,
  },
  complaintsMode: 'markers',
};

// Default biodiversity layer settings
const defaultBiodiversitySettings: BiodiversityLayerSettings = {
  visible: false,
  opacity: 0.7,
  showImpactZones: true,
  showSpeciesMarkers: false,
  showHabitatAreas: true,
  selectedSpeciesGroup: 'all',
};

interface FlightState {
  flights: Flight[];
  summary: DailySummary[];
  airports: Airport[];
  loading: boolean;
  error: string | null;
  mapViewMode: MapViewMode;
  dateRange: DateRange;
  selectedCategory: string | null;
  selectedAirport: string | null;
  selectedFlight: Flight | null;

  // Noise layer state
  noiseSettings: NoiseLayerSettings;
  noiseSensors: NoiseSensor[];
  noiseComplaints: NoiseComplaint[];

  // Biodiversity layer state
  biodiversitySettings: BiodiversityLayerSettings;

  // Actions
  setFlights: (flights: Flight[]) => void;
  setSummary: (summary: DailySummary[]) => void;
  setAirports: (airports: Airport[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMapViewMode: (mode: MapViewMode) => void;
  setDateRange: (range: DateRange) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedAirport: (code: string | null) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  fetchFlights: () => Promise<void>;
  fetchSummary: () => Promise<void>;

  // Noise actions
  setNoiseSettings: (settings: NoiseLayerSettings) => void;
  toggleNoiseLayer: (layer: keyof NoiseLayerSettings['visibility']) => void;
  setNoiseLayerOpacity: (layer: keyof NoiseLayerSettings['opacity'], value: number) => void;
  setNoiseSensors: (sensors: NoiseSensor[]) => void;
  setNoiseComplaints: (complaints: NoiseComplaint[]) => void;
  loadNoiseData: () => Promise<void>;

  // Biodiversity actions
  setBiodiversitySettings: (settings: BiodiversityLayerSettings) => void;
  toggleBiodiversityLayer: () => void;
  setBiodiversityOpacity: (value: number) => void;
}

const API_BASE = '/api';

// Get today and 7 days ago for default range
const today = new Date();
const weekAgo = new Date(today);
weekAgo.setDate(weekAgo.getDate() - 7);

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export const useFlightStore = create<FlightState>((set, get) => ({
  flights: [],
  summary: [],
  airports: [],
  loading: false,
  error: null,
  mapViewMode: 'routes',
  dateRange: {
    start: formatDate(weekAgo),
    end: formatDate(today),
  },
  selectedCategory: null,
  selectedAirport: null,
  selectedFlight: null,

  // Noise layer state
  noiseSettings: defaultNoiseSettings,
  noiseSensors: [],
  noiseComplaints: [],

  // Biodiversity layer state
  biodiversitySettings: defaultBiodiversitySettings,

  setFlights: (flights) => set({ flights }),
  setSummary: (summary) => set({ summary }),
  setAirports: (airports) => set({ airports }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMapViewMode: (mode) => set({ mapViewMode: mode }),
  setDateRange: (range) => set({ dateRange: range }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedAirport: (code) => set({ selectedAirport: code }),
  setSelectedFlight: (flight) => set({ selectedFlight: flight }),

  fetchFlights: async () => {
    const { dateRange, selectedCategory } = get();
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${API_BASE}/flights?${params}`);
      if (!response.ok) throw new Error('Failed to fetch flights');

      const data = await response.json();
      set({ flights: data.flights, airports: data.airports || [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchSummary: async () => {
    const { dateRange } = get();
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });

      const response = await fetch(`${API_BASE}/summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch summary');

      const data = await response.json();
      set({ summary: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  // Noise actions
  setNoiseSettings: (settings) => set({ noiseSettings: settings }),

  toggleNoiseLayer: (layer) =>
    set((state) => ({
      noiseSettings: {
        ...state.noiseSettings,
        visibility: {
          ...state.noiseSettings.visibility,
          [layer]: !state.noiseSettings.visibility[layer],
        },
      },
    })),

  setNoiseLayerOpacity: (layer, value) =>
    set((state) => ({
      noiseSettings: {
        ...state.noiseSettings,
        opacity: {
          ...state.noiseSettings.opacity,
          [layer]: value,
        },
      },
    })),

  setNoiseSensors: (sensors) => set({ noiseSensors: sensors }),
  setNoiseComplaints: (complaints) => set({ noiseComplaints: complaints }),

  // Biodiversity actions
  setBiodiversitySettings: (settings) => set({ biodiversitySettings: settings }),

  toggleBiodiversityLayer: () =>
    set((state) => ({
      biodiversitySettings: {
        ...state.biodiversitySettings,
        visible: !state.biodiversitySettings.visible,
      },
    })),

  setBiodiversityOpacity: (value) =>
    set((state) => ({
      biodiversitySettings: {
        ...state.biodiversitySettings,
        opacity: value,
      },
    })),

  loadNoiseData: async () => {
    // Dynamically import mock data to avoid SSR issues
    const { mockNoiseSensors } = await import('@/data/noise/mockSensors');
    const { mockComplaints } = await import('@/data/noise/mockComplaints');
    const { mockFlightsForNoise, mockAirportsForNoise } = await import('@/data/noise/mockFlights');

    // Load noise-specific data
    set({ noiseSensors: mockNoiseSensors, noiseComplaints: mockComplaints });

    // If no flights are loaded yet, use mock flights for demonstration
    const { flights } = get();
    if (flights.length === 0) {
      set({ flights: mockFlightsForNoise, airports: mockAirportsForNoise });
    }
  },
}));
