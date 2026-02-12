import { create } from 'zustand';
import type {
  AirportDiagramState,
  DiagramViewState,
  DiagramSelection,
  DiagramTooltipData,
  AirportLayout,
} from '@/types/airportDiagram';
import { kjpxLayout } from '@/data/airport/kjpxLayout';

const defaultView: DiagramViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  minZoom: 0.5,
  maxZoom: 4,
};

const defaultSelection: DiagramSelection = {
  type: null,
  id: null,
};

const defaultTooltip: DiagramTooltipData = {
  visible: false,
  x: 0,
  y: 0,
  title: '',
  details: [],
};

interface AirportDiagramStore extends AirportDiagramState {
  // View actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;

  // Selection actions
  setSelection: (selection: DiagramSelection) => void;
  clearSelection: () => void;

  // Tooltip actions
  showTooltip: (data: Omit<DiagramTooltipData, 'visible'>) => void;
  hideTooltip: () => void;

  // Display toggles
  toggleNOTAMs: () => void;
  toggleLegend: () => void;

  // Layout
  loadLayout: () => void;
  setLayout: (layout: AirportLayout) => void;
}

export const useAirportDiagramStore = create<AirportDiagramStore>((set, get) => ({
  layout: null,
  view: defaultView,
  selection: defaultSelection,
  tooltip: defaultTooltip,
  showNOTAMs: false,
  showLegend: true,
  loading: false,
  error: null,

  // View actions
  setZoom: (zoom) => {
    const { minZoom, maxZoom } = get().view;
    const clampedZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
    set((state) => ({
      view: { ...state.view, zoom: clampedZoom },
    }));
  },

  zoomIn: () => {
    const { zoom, maxZoom } = get().view;
    const newZoom = Math.min(zoom * 1.25, maxZoom);
    set((state) => ({
      view: { ...state.view, zoom: newZoom },
    }));
  },

  zoomOut: () => {
    const { zoom, minZoom } = get().view;
    const newZoom = Math.max(zoom / 1.25, minZoom);
    set((state) => ({
      view: { ...state.view, zoom: newZoom },
    }));
  },

  setPan: (x, y) => {
    set((state) => ({
      view: { ...state.view, panX: x, panY: y },
    }));
  },

  resetView: () => {
    set({ view: defaultView });
  },

  // Selection actions
  setSelection: (selection) => {
    set({ selection });
  },

  clearSelection: () => {
    set({ selection: defaultSelection });
  },

  // Tooltip actions
  showTooltip: (data) => {
    set({
      tooltip: { ...data, visible: true },
    });
  },

  hideTooltip: () => {
    set({ tooltip: defaultTooltip });
  },

  // Display toggles
  toggleNOTAMs: () => {
    set((state) => ({ showNOTAMs: !state.showNOTAMs }));
  },

  toggleLegend: () => {
    set((state) => ({ showLegend: !state.showLegend }));
  },

  // Layout
  loadLayout: () => {
    set({ loading: true, error: null });
    try {
      set({ layout: kjpxLayout, loading: false });
    } catch {
      set({ error: 'Failed to load airport layout', loading: false });
    }
  },

  setLayout: (layout) => {
    set({ layout });
  },
}));
