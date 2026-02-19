import { create } from 'zustand';
import type { Flight, DailySummary, Airport, MapViewMode, DateRange } from '@/types/flight';
import type { NoiseLayerSettings, NoiseSensor, NoiseComplaint } from '@/types/noise';
import type { BiodiversityLayerSettings } from '@/types/biodiversity';
import type { BiodiversityThreshold } from '@/types/biodiversityThresholds';
import { biodiversityThresholds as defaultThresholds } from '@/data/biodiversity/thresholds';

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

// ─── Flight Track Types ──────────────────────────────────────────────────────

export interface TrackPosition {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  groundspeed?: number;
  heading?: number;
}

export interface FlightTrack {
  fa_flight_id: string;
  positions: TrackPosition[];
  position_count: number;
}

export interface AircraftOwner {
  registration: string;
  owner?: string;
  location?: string;
  location2?: string;
  website?: string;
}

export interface LiveFlights {
  arrivals: Flight[];
  departures: Flight[];
  scheduled_arrivals: Flight[];
  scheduled_departures: Flight[];
  timestamp: string;
}

interface FlightState {
  flights: Flight[];
  summary: DailySummary[];
  airports: Airport[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  mapViewMode: MapViewMode;
  dateRange: DateRange;
  selectedCategory: string | null;
  selectedAirport: string | null;
  selectedFlight: Flight | null;

  // Real-time flight data
  flightTracks: Map<string, FlightTrack>;
  aircraftOwners: Map<string, AircraftOwner>;
  liveFlights: LiveFlights | null;
  trackLoading: boolean;
  ownerLoading: boolean;

  // Noise layer state
  noiseSettings: NoiseLayerSettings;
  noiseSensors: NoiseSensor[];
  noiseComplaints: NoiseComplaint[];

  // Biodiversity layer state
  biodiversitySettings: BiodiversityLayerSettings;

  // Threshold management state
  thresholds: BiodiversityThreshold[];
  _thresholdsHydrated: boolean;

  // Actions
  hydrateThresholds: () => void;
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

  // Real-time API actions
  fetchFlightTrack: (faFlightId: string) => Promise<FlightTrack | null>;
  fetchAircraftOwner: (registration: string) => Promise<AircraftOwner | null>;
  searchFlights: (query: string) => Promise<Flight[]>;
  fetchLiveFlights: () => Promise<void>;

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

  // Threshold management actions
  addThreshold: (threshold: BiodiversityThreshold) => void;
  updateThreshold: (id: string, updates: Partial<BiodiversityThreshold>) => void;
  deleteThreshold: (id: string) => void;
  toggleThreshold: (id: string) => void;
  resetThresholds: () => void;
}

// ─── Threshold localStorage persistence ─────────────────────────────────────

const THRESHOLDS_STORAGE_KEY = 'jpx-biodiversity-thresholds';

function loadThresholdsFromStorage(): BiodiversityThreshold[] {
  if (typeof window === 'undefined') return defaultThresholds;
  try {
    const stored = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as BiodiversityThreshold[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Corrupted data — fall back to defaults
  }
  return defaultThresholds;
}

function saveThresholdsToStorage(thresholds: BiodiversityThreshold[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

const API_BASE = '/api';

// Get today and 90 days ago for default range (ensures data coverage)
const today = new Date();
const ninetyDaysAgo = new Date(today);
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export const useFlightStore = create<FlightState>((set, get) => ({
  flights: [],
  summary: [],
  airports: [],
  loading: false,
  error: null,
  lastUpdated: null,
  mapViewMode: 'routes',
  dateRange: {
    start: formatDate(ninetyDaysAgo),
    end: formatDate(today),
  },
  selectedCategory: null,
  selectedAirport: null,
  selectedFlight: null,

  // Real-time flight data
  flightTracks: new Map(),
  aircraftOwners: new Map(),
  liveFlights: null,
  trackLoading: false,
  ownerLoading: false,

  // Noise layer state
  noiseSettings: defaultNoiseSettings,
  noiseSensors: [],
  noiseComplaints: [],

  // Biodiversity layer state
  biodiversitySettings: defaultBiodiversitySettings,

  // Threshold management state - SSR-safe default, hydrate on client
  thresholds: defaultThresholds,
  _thresholdsHydrated: false,

  // Hydrate thresholds from localStorage - call this in useEffect on client
  hydrateThresholds: () => {
    if (typeof window === 'undefined' || get()._thresholdsHydrated) return;
    const stored = loadThresholdsFromStorage();
    set({
      thresholds: stored,
      _thresholdsHydrated: true,
    });
  },

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
      set({
        flights: data.flights,
        airports: data.airports || [],
        lastUpdated: new Date().toISOString(),
      });
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

  // ─── Real-time API Actions ─────────────────────────────────────────────────

  fetchFlightTrack: async (faFlightId: string): Promise<FlightTrack | null> => {
    // Check cache first
    const cached = get().flightTracks.get(faFlightId);
    if (cached) {
      return cached;
    }

    set({ trackLoading: true });

    try {
      const response = await fetch(`${API_BASE}/flights/${encodeURIComponent(faFlightId)}/track`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch flight track');
      }

      const data = await response.json() as FlightTrack;

      // Update cache
      set((state) => {
        const newTracks = new Map(state.flightTracks);
        newTracks.set(faFlightId, data);
        return { flightTracks: newTracks };
      });

      return data;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch track' });
      return null;
    } finally {
      set({ trackLoading: false });
    }
  },

  fetchAircraftOwner: async (registration: string): Promise<AircraftOwner | null> => {
    const normalizedReg = registration.toUpperCase();

    // Check cache first
    const cached = get().aircraftOwners.get(normalizedReg);
    if (cached) {
      return cached;
    }

    set({ ownerLoading: true });

    try {
      const response = await fetch(`${API_BASE}/aircraft/${encodeURIComponent(normalizedReg)}/owner`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch owner info');
      }

      const data = await response.json() as AircraftOwner;

      // Update cache
      set((state) => {
        const newOwners = new Map(state.aircraftOwners);
        newOwners.set(normalizedReg, data);
        return { aircraftOwners: newOwners };
      });

      return data;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch owner' });
      return null;
    } finally {
      set({ ownerLoading: false });
    }
  },

  searchFlights: async (query: string): Promise<Flight[]> => {
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`${API_BASE}/flights/search?${params}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data.flights || [];
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Search failed' });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  fetchLiveFlights: async (): Promise<void> => {
    set({ loading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/flights/live`);

      if (!response.ok) {
        throw new Error('Failed to fetch live flights');
      }

      const data = await response.json() as LiveFlights;
      set({ liveFlights: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch live flights' });
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

  // Threshold management actions
  addThreshold: (threshold) => {
    const updated = [...get().thresholds, threshold];
    saveThresholdsToStorage(updated);
    set({ thresholds: updated });
  },

  updateThreshold: (id, updates) => {
    const updated = get().thresholds.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    saveThresholdsToStorage(updated);
    set({ thresholds: updated });
  },

  deleteThreshold: (id) => {
    const updated = get().thresholds.filter((t) => t.id !== id);
    saveThresholdsToStorage(updated);
    set({ thresholds: updated });
  },

  toggleThreshold: (id) => {
    const updated = get().thresholds.map((t) =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    saveThresholdsToStorage(updated);
    set({ thresholds: updated });
  },

  resetThresholds: () => {
    saveThresholdsToStorage(defaultThresholds);
    set({ thresholds: defaultThresholds });
  },
}));
