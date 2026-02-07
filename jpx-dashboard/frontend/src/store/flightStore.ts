import { create } from 'zustand';
import type { Flight, DailySummary, Airport, MapViewMode, DateRange } from '../types/flight';

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
  fetchFlights: () => Promise<void>;
  fetchSummary: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

  setFlights: (flights) => set({ flights }),
  setSummary: (summary) => set({ summary }),
  setAirports: (airports) => set({ airports }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMapViewMode: (mode) => set({ mapViewMode: mode }),
  setDateRange: (range) => set({ dateRange: range }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedAirport: (code) => set({ selectedAirport: code }),

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
}));
