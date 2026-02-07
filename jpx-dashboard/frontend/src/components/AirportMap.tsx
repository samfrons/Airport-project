import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Map, Route, BarChart3 } from 'lucide-react';
import { useFlightStore } from '../store/flightStore';
import type { MapViewMode } from '../types/flight';

// KJPX Airport coordinates
const KJPX_COORDS: [number, number] = [-72.2518, 40.9594];
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

const categoryColors: Record<string, string> = {
  helicopter: '#ef4444',
  jet: '#3b82f6',
  fixed_wing: '#22c55e',
  unknown: '#9ca3af',
};

export function AirportMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { flights, airports, mapViewMode, setMapViewMode } = useFlightStore();

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: KJPX_COORDS,
      zoom: 8,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add KJPX airport marker
      if (map.current) {
        // Add airport source and layer
        map.current.addSource('kjpx-airport', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: KJPX_COORDS,
            },
            properties: {
              name: 'East Hampton Airport (KJPX)',
            },
          },
        });

        map.current.addLayer({
          id: 'kjpx-marker',
          type: 'circle',
          source: 'kjpx-airport',
          paint: {
            'circle-radius': 12,
            'circle-color': '#f97316',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });

        // Add label
        map.current.addLayer({
          id: 'kjpx-label',
          type: 'symbol',
          source: 'kjpx-airport',
          layout: {
            'text-field': 'KJPX',
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-offset': [0, 1.5],
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          },
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map based on view mode and data
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing layers (except KJPX marker)
    const layersToRemove = ['flight-routes', 'destination-airports', 'heatmap-layer'];
    const sourcesToRemove = ['flight-routes', 'destination-airports', 'heatmap-data'];

    layersToRemove.forEach(id => {
      if (map.current?.getLayer(id)) {
        map.current.removeLayer(id);
      }
    });

    sourcesToRemove.forEach(id => {
      if (map.current?.getSource(id)) {
        map.current.removeSource(id);
      }
    });

    if (mapViewMode === 'routes' && flights.length > 0) {
      renderRouteView();
    } else if (mapViewMode === 'heatmap' && flights.length > 0) {
      renderHeatmapView();
    }
    // Stats view shows only the KJPX marker (already rendered)
  }, [mapViewMode, flights, airports, mapLoaded]);

  const renderRouteView = useCallback(() => {
    if (!map.current) return;

    // Create route lines from flights
    const routeFeatures = flights
      .filter(f => {
        // Only include flights with valid coordinates
        const airport = airports.find(
          a => a.code === (f.direction === 'arrival' ? f.origin_code : f.destination_code)
        );
        return airport && airport.lat && airport.lng;
      })
      .map(f => {
        const airport = airports.find(
          a => a.code === (f.direction === 'arrival' ? f.origin_code : f.destination_code)
        );
        if (!airport) return null;

        const coords = f.direction === 'arrival'
          ? [[airport.lng, airport.lat], KJPX_COORDS]
          : [KJPX_COORDS, [airport.lng, airport.lat]];

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: coords,
          },
          properties: {
            category: f.aircraft_category,
            direction: f.direction,
            ident: f.ident,
          },
        };
      })
      .filter(Boolean);

    if (routeFeatures.length > 0) {
      map.current.addSource('flight-routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: routeFeatures as any,
        },
      });

      map.current.addLayer({
        id: 'flight-routes',
        type: 'line',
        source: 'flight-routes',
        paint: {
          'line-color': [
            'match',
            ['get', 'category'],
            'helicopter', categoryColors.helicopter,
            'jet', categoryColors.jet,
            'fixed_wing', categoryColors.fixed_wing,
            categoryColors.unknown,
          ],
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });
    }

    // Add destination airport markers
    const airportFeatures = airports
      .filter(a => a.lat && a.lng && a.code !== 'KJPX')
      .map(a => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [a.lng, a.lat],
        },
        properties: {
          code: a.code,
          name: a.name,
          city: a.city,
          count: a.flight_count,
        },
      }));

    if (airportFeatures.length > 0) {
      map.current.addSource('destination-airports', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: airportFeatures,
        },
      });

      map.current.addLayer({
        id: 'destination-airports',
        type: 'circle',
        source: 'destination-airports',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 5,
            10, 10,
            50, 15,
          ],
          'circle-color': '#60a5fa',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8,
        },
      });
    }
  }, [flights, airports]);

  const renderHeatmapView = useCallback(() => {
    if (!map.current) return;

    // Create heatmap from flight times
    const heatmapFeatures = flights.map(f => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: KJPX_COORDS,
      },
      properties: {
        hour: f.operation_hour_et,
        isCurfew: f.is_curfew_period ? 1 : 0,
      },
    }));

    map.current.addSource('heatmap-data', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: heatmapFeatures,
      },
    });

    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap-data',
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': 1,
        'heatmap-radius': 50,
        'heatmap-opacity': 0.8,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, '#0ea5e9',
          0.4, '#22c55e',
          0.6, '#eab308',
          0.8, '#f97316',
          1, '#ef4444',
        ],
      },
    });
  }, [flights]);

  const viewModes: { mode: MapViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'routes', icon: <Route size={18} />, label: 'Routes' },
    { mode: 'stats', icon: <Map size={18} />, label: 'Airport' },
    { mode: 'heatmap', icon: <BarChart3 size={18} />, label: 'Heatmap' },
  ];

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* View Mode Toggle */}
      <div className="absolute top-4 left-4 bg-gray-900/90 p-1 flex gap-1">
        {viewModes.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setMapViewMode(mode)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
              mapViewMode === mode
                ? 'bg-sky-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">Aircraft Type</div>
        <div className="flex flex-col gap-1">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-300 capitalize">
                {category.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
