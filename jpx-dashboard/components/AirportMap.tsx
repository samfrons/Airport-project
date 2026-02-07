'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Map, Route, BarChart3, Maximize2, Minimize2, Crosshair, X } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import type { MapViewMode } from '@/types/flight';

// KJPX Airport coordinates
const KJPX_COORDS: [number, number] = [-72.2518, 40.9594];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

const categoryColors: Record<string, string> = {
  helicopter: '#f87171',
  jet: '#60a5fa',
  fixed_wing: '#34d399',
  unknown: '#a1a1aa',
};

const categoryLabels: Record<string, string> = {
  helicopter: 'Helicopter',
  jet: 'Jet',
  fixed_wing: 'Fixed Wing',
  unknown: 'Unknown',
};

/**
 * Generate a curved arc between two geographic points using a quadratic bezier.
 */
function generateArc(
  start: [number, number],
  end: [number, number],
  numPoints = 40
): [number, number][] {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.01) return [start, end];

  const midLng = (start[0] + end[0]) / 2;
  const midLat = (start[1] + end[1]) / 2;
  const offset = dist * 0.15;
  const nx = -dy / dist;
  const ny = dx / dist;
  const controlLng = midLng + nx * offset;
  const controlLat = midLat + ny * offset;

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lng =
      (1 - t) * (1 - t) * start[0] +
      2 * (1 - t) * t * controlLng +
      t * t * end[0];
    const lat =
      (1 - t) * (1 - t) * start[1] +
      2 * (1 - t) * t * controlLat +
      t * t * end[1];
    points.push([lng, lat]);
  }
  return points;
}

const MANAGED_LAYERS = [
  'flight-routes',
  'destination-airports',
  'destination-labels',
  'heatmap-layer',
  'heatmap-points',
];
const MANAGED_SOURCES = ['flight-routes', 'destination-airports', 'heatmap-data'];

export function AirportMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const kjpxMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const selectedAirportRef = useRef<string | null>(null);

  const {
    flights,
    airports,
    mapViewMode,
    setMapViewMode,
    selectedAirport,
    setSelectedAirport,
  } = useFlightStore();

  useEffect(() => {
    selectedAirportRef.current = selectedAirport;
  }, [selectedAirport]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    flights.forEach((f) => {
      counts[f.aircraft_category] = (counts[f.aircraft_category] || 0) + 1;
    });
    return counts;
  }, [flights]);

  // ─── Map Initialization ────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: KJPX_COORDS,
      zoom: 8,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.ScaleControl({ unit: 'imperial' }),
      'bottom-right'
    );

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
      className: 'airport-popup',
    });

    // Animated KJPX marker
    const el = document.createElement('div');
    el.className = 'kjpx-pulse-marker';
    el.innerHTML = `
      <div class="kjpx-pulse-ring"></div>
      <div class="kjpx-pulse-core"></div>
    `;

    kjpxMarker.current = new mapboxgl.Marker(el)
      .setLngLat(KJPX_COORDS)
      .setPopup(
        new mapboxgl.Popup({ offset: 25, className: 'airport-popup' }).setHTML(`
          <div class="popup-content">
            <div class="popup-title">KJPX</div>
            <div class="popup-subtitle">East Hampton Town Airport</div>
            <div class="popup-detail">East Hampton, NY</div>
          </div>
        `)
      )
      .addTo(map.current);

    // Hover handlers
    map.current.on('mouseenter', 'destination-airports', (e) => {
      if (!map.current || !e.features?.[0]) return;
      map.current.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      popup.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="popup-content">
            <div class="popup-title">${props?.code ?? ''}</div>
            <div class="popup-subtitle">${props?.name ?? ''}</div>
            <div class="popup-detail">${props?.city ?? ''}</div>
            <div class="popup-count">${props?.count ?? 0} flight${props?.count !== 1 ? 's' : ''}</div>
            <div class="popup-hint">Click to filter flights</div>
          </div>`
        )
        .addTo(map.current);
    });

    map.current.on('mouseleave', 'destination-airports', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';
      popup.current?.remove();
    });

    map.current.on('click', 'destination-airports', (e) => {
      if (!e.features?.[0]) return;
      const code = e.features[0].properties?.code;
      if (code === selectedAirportRef.current) {
        setSelectedAirport(null);
      } else {
        setSelectedAirport(code);
      }
    });

    map.current.on('mouseenter', 'flight-routes', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'flight-routes', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    map.current.on('load', () => setMapLoaded(true));

    return () => {
      popup.current?.remove();
      kjpxMarker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [setSelectedAirport]);

  // ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Resize on fullscreen toggle
  useEffect(() => {
    if (map.current) {
      const id = setTimeout(() => map.current?.resize(), 50);
      return () => clearTimeout(id);
    }
  }, [isFullscreen]);

  // ─── Update layers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    clearManagedLayers();

    if (mapViewMode === 'routes' && flights.length > 0) {
      renderRouteView();
    } else if (mapViewMode === 'heatmap' && flights.length > 0) {
      renderHeatmapView();
    }
  }, [mapViewMode, flights, airports, mapLoaded, selectedAirport]);

  function clearManagedLayers() {
    if (!map.current) return;
    MANAGED_LAYERS.forEach((id) => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    MANAGED_SOURCES.forEach((id) => {
      if (map.current!.getSource(id)) map.current!.removeSource(id);
    });
  }

  // ─── Routes view ──────────────────────────────────────────────────
  function renderRouteView() {
    if (!map.current) return;

    const routeFeatures = flights
      .map((f) => {
        const code = f.direction === 'arrival' ? f.origin_code : f.destination_code;
        const airport = airports.find((a) => a.code === code);
        if (!airport?.lat || !airport?.lng) return null;

        const other: [number, number] = [airport.lng, airport.lat];
        const coords =
          f.direction === 'arrival'
            ? generateArc(other, KJPX_COORDS)
            : generateArc(KJPX_COORDS, other);

        return {
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: coords },
          properties: {
            category: f.aircraft_category,
            direction: f.direction,
            ident: f.ident,
            airport_code: airport.code,
            is_selected: selectedAirport === airport.code,
          },
        };
      })
      .filter(Boolean);

    if (routeFeatures.length > 0) {
      map.current.addSource('flight-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: routeFeatures as any },
      });

      map.current.addLayer({
        id: 'flight-routes',
        type: 'line',
        source: 'flight-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'category'],
            'helicopter', categoryColors.helicopter,
            'jet', categoryColors.jet,
            'fixed_wing', categoryColors.fixed_wing,
            categoryColors.unknown,
          ],
          'line-width': ['case', ['get', 'is_selected'], 2.5, 1.2],
          'line-opacity': [
            'case',
            ['get', 'is_selected'],
            0.85,
            selectedAirport ? 0.08 : 0.35,
          ],
        },
      });
    }

    const airportFeatures = airports
      .filter((a) => a.lat && a.lng && a.code !== 'KJPX' && a.code !== 'KHTO')
      .map((a) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
        properties: {
          code: a.code,
          name: a.name,
          city: a.city,
          count: a.flight_count,
          is_selected: selectedAirport === a.code,
        },
      }));

    if (airportFeatures.length > 0) {
      map.current.addSource('destination-airports', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: airportFeatures },
      });

      map.current.addLayer({
        id: 'destination-airports',
        type: 'circle',
        source: 'destination-airports',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'count'],
            1, 5,
            5, 8,
            10, 12,
            30, 16,
            50, 20,
          ],
          'circle-color': ['case', ['get', 'is_selected'], '#f59e0b', '#60a5fa'],
          'circle-stroke-width': ['case', ['get', 'is_selected'], 2.5, 1],
          'circle-stroke-color': [
            'case',
            ['get', 'is_selected'],
            '#fbbf24',
            'rgba(255,255,255,0.3)',
          ],
          'circle-opacity': [
            'case',
            ['get', 'is_selected'],
            1,
            selectedAirport ? 0.25 : 0.8,
          ],
        },
      });

      map.current.addLayer({
        id: 'destination-labels',
        type: 'symbol',
        source: 'destination-airports',
        layout: {
          'text-field': ['get', 'code'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['case', ['get', 'is_selected'], 12, 10],
          'text-offset': [0, 1.6],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['case', ['get', 'is_selected'], '#fbbf24', '#93c5fd'],
          'text-halo-color': '#000000',
          'text-halo-width': 1,
          'text-opacity': [
            'case',
            ['get', 'is_selected'],
            1,
            selectedAirport ? 0.25 : 0.7,
          ],
        },
      });
    }
  }

  // ─── Heatmap view ─────────────────────────────────────────────────
  function renderHeatmapView() {
    if (!map.current) return;

    const features = flights.flatMap((f) => {
      const code = f.direction === 'arrival' ? f.origin_code : f.destination_code;
      const airport = airports.find((a) => a.code === code);
      const pts: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: KJPX_COORDS as number[] },
          properties: { weight: 0.5 },
        },
      ];
      if (airport?.lat && airport?.lng) {
        pts.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [airport.lng, airport.lat] },
          properties: { weight: 1 },
        });
      }
      return pts;
    });

    map.current.addSource('heatmap-data', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap-data',
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.6,
          9, 2,
        ],
        'heatmap-radius': [
          'interpolate', ['linear'], ['zoom'],
          4, 20,
          9, 40,
        ],
        'heatmap-opacity': 0.75,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.15, 'rgba(37,99,235,0.3)',
          0.35, 'rgba(59,130,246,0.45)',
          0.5, 'rgba(52,211,153,0.5)',
          0.7, 'rgba(245,158,11,0.65)',
          0.85, 'rgba(248,113,113,0.75)',
          1, 'rgba(239,68,68,0.85)',
        ],
      },
    });

    map.current.addLayer({
      id: 'heatmap-points',
      type: 'circle',
      source: 'heatmap-data',
      minzoom: 10,
      paint: {
        'circle-radius': 4,
        'circle-color': '#60a5fa',
        'circle-opacity': 0.5,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.3)',
      },
    });
  }

  // ─── Actions ───────────────────────────────────────────────────────
  const handleFitBounds = () => {
    if (!map.current || airports.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(KJPX_COORDS);
    airports.forEach((a) => {
      if (a.lat && a.lng) bounds.extend([a.lng, a.lat]);
    });
    map.current.fitBounds(bounds, { padding: 60, duration: 1000 });
  };

  const viewModes: { mode: MapViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'routes', icon: <Route size={14} strokeWidth={1.8} />, label: 'Routes' },
    { mode: 'stats', icon: <Map size={14} strokeWidth={1.8} />, label: 'Airport' },
    { mode: 'heatmap', icon: <BarChart3 size={14} strokeWidth={1.8} />, label: 'Heatmap' },
  ];

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div
      className={`relative ${
        isFullscreen ? 'fixed inset-0 z-50 bg-zinc-950' : 'h-full w-full'
      }`}
    >
      <div ref={mapContainer} className="h-full w-full" />

      {/* View Mode Toggle */}
      <div className="absolute top-4 left-4">
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-0.5 flex gap-px">
          {viewModes.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => {
                setMapViewMode(mode);
                if (mode !== 'routes') setSelectedAirport(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                mapViewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
              title={label}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-14 flex flex-col gap-px">
        <button
          onClick={handleFitBounds}
          className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          title="Fit to all routes"
        >
          <Crosshair size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 size={14} strokeWidth={1.5} />
          ) : (
            <Maximize2 size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Selected Airport Pill */}
      {selectedAirport && (
        <div className="absolute top-14 left-4 bg-amber-500/15 backdrop-blur-sm border border-amber-500/30 px-3 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-amber-300 tracking-wide">
            {selectedAirport}
          </span>
          <button
            onClick={() => setSelectedAirport(null)}
            className="text-amber-400/50 hover:text-amber-200 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 p-3 min-w-[130px]">
        <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-2">
          Aircraft Type
        </div>
        <div className="flex flex-col gap-1.5">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-[2px]"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-zinc-400">
                  {categoryLabels[category]}
                </span>
              </div>
              {categoryCounts[category] != null && (
                <span className="text-[11px] text-zinc-600 tabular-nums">
                  {categoryCounts[category]}
                </span>
              )}
            </div>
          ))}
        </div>
        {flights.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-600 tabular-nums">
            {flights.length} ops
          </div>
        )}
      </div>

      {/* Fullscreen hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 right-4 text-[10px] text-zinc-700 tracking-wide">
          ESC to exit
        </div>
      )}
    </div>
  );
}
