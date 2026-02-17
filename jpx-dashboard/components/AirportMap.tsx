'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Map, Route, BarChart3, Maximize2, Minimize2, Crosshair, X, Satellite, MapPin } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { useThemeStore } from '@/store/themeStore';
import { NoiseLayerControls } from './NoiseLayerControls';
import { NoiseLegend } from './NoiseLegend';
import { getAircraftNoiseProfile, getNoiseProfileColor } from '@/data/noise/aircraftNoiseProfiles';
import { getDbColor } from '@/types/noise';
import {
  calculateDbAtAltitude,
  getAltitudeAtPosition,
  formatAltitude,
  getDbLevelColor,
} from './noise/NoiseCalculator';
import type { MapViewMode, Flight } from '@/types/flight';

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

// Noise visualization layers
const NOISE_LAYERS = [
  'noise-sensors',
  'noise-sensor-labels',
  'noise-sensor-pulse',
  'aircraft-noise-corridors',
  'aircraft-noise-fill',
  'aircraft-noise-points',
  'aircraft-noise-db-labels',
  'complaint-markers',
  'complaint-heatmap',
  'complaint-clusters',
  'complaint-cluster-count',
];
const NOISE_SOURCES = ['noise-sensors-data', 'aircraft-corridors-data', 'aircraft-db-points-data', 'complaints-data'];


export function AirportMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const kjpxMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const selectedAirportRef = useRef<string | null>(null);

  const {
    flights,
    airports,
    mapViewMode,
    setMapViewMode,
    selectedAirport,
    setSelectedAirport,
    noiseSettings,
    noiseSensors,
    noiseComplaints,
    selectedFlight,
    setSelectedFlight,
  } = useFlightStore();

  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

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

    // Determine initial style based on current theme
    const initialStyle = resolvedTheme === 'light'
      ? 'mapbox://styles/mapbox/light-v11'
      : 'mapbox://styles/mapbox/dark-v11';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: initialStyle,
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

  // Satellite / light / dark style toggle based on theme
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    let style: string;
    if (isSatellite) {
      style = 'mapbox://styles/mapbox/satellite-streets-v12';
    } else if (resolvedTheme === 'light') {
      style = 'mapbox://styles/mapbox/light-v11';
    } else {
      style = 'mapbox://styles/mapbox/dark-v11';
    }

    map.current.setStyle(style);

    // After style loads, mark as loaded so data layer effects re-fire
    const onStyleLoad = () => {
      setMapLoaded(false);
      // Small delay to let style fully settle, then re-enable
      setTimeout(() => setMapLoaded(true), 100);
    };
    map.current.once('style.load', onStyleLoad);

    return () => {
      map.current?.off('style.load', onStyleLoad);
    };
  }, [isSatellite, resolvedTheme]);

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

  // ─── Update noise layers ──────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    clearNoiseLayers();

    if (noiseSettings.visibility.sensors && noiseSensors.length > 0) {
      renderNoiseSensors();
    }
    if (noiseSettings.visibility.aircraftNoise && flights.length > 0) {
      renderAircraftNoise();
    }
    if (noiseSettings.visibility.complaints && noiseComplaints.length > 0) {
      renderComplaints();
    }
  }, [noiseSettings, noiseSensors, noiseComplaints, flights, airports, mapLoaded]);

  function clearManagedLayers() {
    if (!map.current) return;
    MANAGED_LAYERS.forEach((id) => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    MANAGED_SOURCES.forEach((id) => {
      if (map.current!.getSource(id)) map.current!.removeSource(id);
    });
  }

  function clearNoiseLayers() {
    if (!map.current) return;
    NOISE_LAYERS.forEach((id) => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    NOISE_SOURCES.forEach((id) => {
      if (map.current!.getSource(id)) map.current!.removeSource(id);
    });
  }

  // ─── Noise Sensors Layer ─────────────────────────────────────────
  function renderNoiseSensors() {
    if (!map.current) return;

    const sensorFeatures = noiseSensors
      .filter((s) => s.status !== 'offline')
      .map((sensor) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [sensor.location.lng, sensor.location.lat],
        },
        properties: {
          id: sensor.id,
          name: sensor.name,
          dB: sensor.lastReading?.dB ?? 0,
          status: sensor.status,
        },
      }));

    map.current.addSource('noise-sensors-data', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: sensorFeatures },
    });

    // Outer pulse ring
    map.current.addLayer({
      id: 'noise-sensor-pulse',
      type: 'circle',
      source: 'noise-sensors-data',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'dB'],
          40, 10,
          60, 14,
          80, 20,
          100, 28,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'dB'],
          40, '#22c55e',
          55, '#84cc16',
          65, '#eab308',
          75, '#f97316',
          85, '#ef4444',
        ],
        'circle-opacity': 0.25 * noiseSettings.opacity.sensors,
        'circle-stroke-width': 0,
      },
    });

    // Core sensor marker
    map.current.addLayer({
      id: 'noise-sensors',
      type: 'circle',
      source: 'noise-sensors-data',
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'dB'],
          40, '#22c55e',
          55, '#84cc16',
          65, '#eab308',
          75, '#f97316',
          85, '#ef4444',
        ],
        'circle-opacity': noiseSettings.opacity.sensors,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8,
      },
    });

    // dB labels
    map.current.addLayer({
      id: 'noise-sensor-labels',
      type: 'symbol',
      source: 'noise-sensors-data',
      layout: {
        'text-field': ['concat', ['to-string', ['round', ['get', 'dB']]], ' dB'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': 10,
        'text-offset': [0, 1.4],
      },
      paint: {
        'text-color': '#fafafa',
        'text-halo-color': '#000000',
        'text-halo-width': 1,
        'text-opacity': noiseSettings.opacity.sensors,
      },
    });

    // Add hover handlers for sensors
    map.current.on('mouseenter', 'noise-sensors', (e) => {
      if (!map.current || !e.features?.[0]) return;
      map.current.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];

      popup.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="popup-content">
            <div class="popup-title">${props?.name ?? 'Sensor'}</div>
            <div class="popup-count" style="color: ${getDbColor(props?.dB ?? 0)}">${(props?.dB ?? 0).toFixed(1)} dB</div>
            <div class="popup-detail">Status: ${props?.status}</div>
          </div>`
        )
        .addTo(map.current);
    });

    map.current.on('mouseleave', 'noise-sensors', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';
      popup.current?.remove();
    });
  }

  // ─── Aircraft Noise Corridors Layer ──────────────────────────────
  function renderAircraftNoise() {
    if (!map.current) return;

    const corridorFeatures: any[] = [];
    const dbPointFeatures: any[] = [];

    flights.forEach((f) => {
      const code = f.direction === 'arrival' ? f.origin_code : f.destination_code;
      const airport = airports.find((a) => a.code === code);
      if (!airport?.lat || !airport?.lng) return;

      const profile = getAircraftNoiseProfile(f.aircraft_type);
      const other: [number, number] = [airport.lng, airport.lat];
      const pathPoints =
        f.direction === 'arrival'
          ? generateArc(other, KJPX_COORDS)
          : generateArc(KJPX_COORDS, other);

      // Generate corridor polygon
      const corridorWidth = 800; // meters
      const corridor = generateCorridorPolygon(pathPoints, corridorWidth);

      const baseDb = f.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;

      corridorFeatures.push({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [corridor] },
        properties: {
          flightId: f.fa_flight_id,
          ident: f.ident,
          aircraftType: f.aircraft_type,
          noiseCategory: profile.noiseCategory,
          estimatedDb: baseDb,
        },
      });

      // Generate dB reading points along the path with altitude-based calculations
      // Use altitude patterns that simulate realistic climb/descent profiles
      const numPoints = 6;
      for (let i = 0; i < numPoints; i++) {
        // For arrivals: show points from 60% to 100% (near KJPX, descending)
        // For departures: show points from 0% to 40% (near KJPX, climbing)
        const t = f.direction === 'arrival'
          ? 0.6 + (i * 0.08) // 60% to ~100% of path
          : i * 0.08; // 0% to ~40% of path

        const pointIndex = Math.floor(t * (pathPoints.length - 1));
        const point = pathPoints[pointIndex];

        // Get altitude and phase at this position using realistic patterns
        const { altitude, phase } = getAltitudeAtPosition(t, f.direction);

        // Calculate dB at this altitude using inverse square law
        const adjustedDb = Math.round(calculateDbAtAltitude(baseDb, altitude));

        dbPointFeatures.push({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: point },
          properties: {
            dB: adjustedDb,
            altitude: altitude,
            phase: phase,
            ident: f.ident,
            registration: f.registration || f.ident,
            operator: f.operator || 'Private',
            operatorIata: f.operator_iata || '',
            aircraftType: f.aircraft_type,
            aircraftCategory: f.aircraft_category,
            noiseCategory: profile.noiseCategory,
            direction: f.direction,
            flightId: f.fa_flight_id,
          },
        });
      }
    });

    map.current.addSource('aircraft-corridors-data', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: corridorFeatures },
    });

    map.current.addSource('aircraft-db-points-data', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: dbPointFeatures },
    });

    // Noise corridor fill
    map.current.addLayer({
      id: 'aircraft-noise-fill',
      type: 'fill',
      source: 'aircraft-corridors-data',
      paint: {
        'fill-color': [
          'match',
          ['get', 'noiseCategory'],
          'quiet', 'rgba(34, 197, 94, 0.15)',
          'moderate', 'rgba(234, 179, 8, 0.2)',
          'loud', 'rgba(249, 115, 22, 0.25)',
          'very_loud', 'rgba(239, 68, 68, 0.3)',
          'rgba(161, 161, 170, 0.15)',
        ],
        'fill-opacity': noiseSettings.opacity.aircraftNoise,
      },
    });

    // Corridor outline
    map.current.addLayer({
      id: 'aircraft-noise-corridors',
      type: 'line',
      source: 'aircraft-corridors-data',
      paint: {
        'line-color': [
          'match',
          ['get', 'noiseCategory'],
          'quiet', '#22c55e',
          'moderate', '#eab308',
          'loud', '#f97316',
          'very_loud', '#ef4444',
          '#a1a1aa',
        ],
        'line-width': 1,
        'line-opacity': 0.5 * noiseSettings.opacity.aircraftNoise,
        'line-dasharray': [2, 2],
      },
    });

    // dB point markers along flight paths
    map.current.addLayer({
      id: 'aircraft-noise-points',
      type: 'circle',
      source: 'aircraft-db-points-data',
      paint: {
        'circle-radius': 4,
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'dB'],
          65, '#22c55e',
          75, '#eab308',
          82, '#f97316',
          88, '#ef4444',
        ],
        'circle-opacity': noiseSettings.opacity.aircraftNoise,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.6)',
      },
    });

    // dB + altitude labels along flight paths
    map.current.addLayer({
      id: 'aircraft-noise-db-labels',
      type: 'symbol',
      source: 'aircraft-db-points-data',
      layout: {
        'text-field': [
          'concat',
          ['to-string', ['get', 'dB']],
          ' dB\n',
          ['to-string', ['/', ['get', 'altitude'], 1000]],
          "k'",
        ],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': 9,
        'text-offset': [0, 1.5],
        'text-allow-overlap': false,
        'text-line-height': 1.1,
      },
      paint: {
        'text-color': '#fafafa',
        'text-halo-color': '#000000',
        'text-halo-width': 1,
        'text-opacity': noiseSettings.opacity.aircraftNoise * 0.9,
      },
    });

    // Hover handler for dB points - enhanced with registration and altitude
    map.current.on('mouseenter', 'aircraft-noise-points', (e) => {
      if (!map.current || !e.features?.[0]) return;
      map.current.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];

      const altitude = props?.altitude ?? 0;
      const altitudeDisplay = altitude >= 1000
        ? `${(altitude / 1000).toFixed(1)}k'`
        : `${altitude}'`;

      popup.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="popup-content">
            <div class="popup-registration">${props?.registration ?? props?.ident ?? ''}</div>
            <div class="popup-operator">${props?.operator ?? 'Private'}${props?.operatorIata ? ` (${props.operatorIata})` : ''}</div>
            <div class="popup-divider"></div>
            <div class="popup-aircraft">${props?.aircraftType ?? ''} · ${(props?.aircraftCategory ?? '').replace('_', ' ')}</div>
            <div class="popup-metrics">
              <span class="popup-db" style="color: ${getDbLevelColor(props?.dB ?? 0)}">${props?.dB ?? 0} dB</span>
              <span class="popup-altitude">@ ${altitudeDisplay}</span>
            </div>
            <div class="popup-phase">${props?.phase?.toUpperCase() ?? ''} · ${props?.direction?.toUpperCase() ?? ''}</div>
            <div class="popup-hint">Click for details</div>
          </div>`
        )
        .addTo(map.current);
    });

    map.current.on('mouseleave', 'aircraft-noise-points', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';
      popup.current?.remove();
    });

    // Click handler to open flight details sidebar
    map.current.on('click', 'aircraft-noise-points', (e) => {
      if (!e.features?.[0]) return;
      const props = e.features[0].properties;
      const flightId = props?.flightId;

      // Find the flight in our data
      const clickedFlight = flights.find((f) => f.fa_flight_id === flightId);
      if (clickedFlight) {
        setSelectedFlight(clickedFlight);
      }
    });
  }

  // ─── Noise Complaints Layer ─────────────────────────────────────
  function renderComplaints() {
    if (!map.current) return;

    const complaintFeatures = noiseComplaints.map((c) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [c.location.lng, c.location.lat],
      },
      properties: {
        id: c.id,
        severity: c.severity,
        category: c.category,
        timestamp: c.timestamp,
        neighborhood: c.location.neighborhood,
        description: c.description,
      },
    }));

    if (noiseSettings.complaintsMode === 'heatmap') {
      map.current.addSource('complaints-data', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: complaintFeatures },
      });

      map.current.addLayer({
        id: 'complaint-heatmap',
        type: 'heatmap',
        source: 'complaints-data',
        paint: {
          'heatmap-weight': ['/', ['get', 'severity'], 5],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1.5],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 20, 12, 40],
          'heatmap-opacity': noiseSettings.opacity.complaints,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(251,191,36,0.4)',
            0.4, 'rgba(249,115,22,0.5)',
            0.6, 'rgba(239,68,68,0.6)',
            0.8, 'rgba(220,38,38,0.7)',
            1, 'rgba(185,28,28,0.8)',
          ],
        },
      });
    } else if (noiseSettings.complaintsMode === 'clusters') {
      map.current.addSource('complaints-data', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: complaintFeatures },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      // Cluster circles
      map.current.addLayer({
        id: 'complaint-clusters',
        type: 'circle',
        source: 'complaints-data',
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 5, 15, 20, 25, 50, 35],
          'circle-color': '#f97316',
          'circle-opacity': noiseSettings.opacity.complaints,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
        },
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'complaint-cluster-count',
        type: 'symbol',
        source: 'complaints-data',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Unclustered points
      map.current.addLayer({
        id: 'complaint-markers',
        type: 'circle',
        source: 'complaints-data',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 1, 4, 3, 6, 5, 10],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            1, '#fbbf24',
            3, '#f97316',
            5, '#dc2626',
          ],
          'circle-opacity': noiseSettings.opacity.complaints,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.5)',
        },
      });
    } else {
      // Markers mode
      map.current.addSource('complaints-data', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: complaintFeatures },
      });

      map.current.addLayer({
        id: 'complaint-markers',
        type: 'circle',
        source: 'complaints-data',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 1, 4, 3, 6, 5, 10],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            1, '#fbbf24',
            3, '#f97316',
            5, '#dc2626',
          ],
          'circle-opacity': noiseSettings.opacity.complaints,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.5)',
        },
      });
    }

    // Add hover handler for complaint markers
    map.current.on('mouseenter', 'complaint-markers', (e) => {
      if (!map.current || !e.features?.[0]) return;
      map.current.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ];

      const severityStars = '★'.repeat(props?.severity || 1);
      popup.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="popup-content">
            <div class="popup-title">Noise Complaint</div>
            <div class="popup-subtitle">${(props?.category ?? '').replace('_', ' ')}</div>
            <div class="popup-detail">Severity: ${severityStars}</div>
            <div class="popup-detail">${props?.neighborhood || ''}</div>
            <div class="popup-hint">${new Date(props?.timestamp ?? '').toLocaleDateString()}</div>
          </div>`
        )
        .addTo(map.current);
    });

    map.current.on('mouseleave', 'complaint-markers', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';
      popup.current?.remove();
    });
  }

  // Generate corridor polygon around flight path
  function generateCorridorPolygon(
    pathPoints: [number, number][],
    widthMeters: number
  ): [number, number][] {
    const leftSide: [number, number][] = [];
    const rightSide: [number, number][] = [];

    for (let i = 0; i < pathPoints.length; i++) {
      const p = pathPoints[i];
      const prev = pathPoints[Math.max(0, i - 1)];
      const next = pathPoints[Math.min(pathPoints.length - 1, i + 1)];

      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) continue;

      // Perpendicular offset (approximate meters to degrees at this lat)
      const metersPerDegLng = 111320 * Math.cos((p[1] * Math.PI) / 180);
      const metersPerDegLat = 110574;
      const offsetLng = (widthMeters / metersPerDegLng) * (-dy / len);
      const offsetLat = (widthMeters / metersPerDegLat) * (dx / len);

      leftSide.push([p[0] + offsetLng, p[1] + offsetLat]);
      rightSide.push([p[0] - offsetLng, p[1] - offsetLat]);
    }

    // Close the polygon
    return [...leftSide, ...rightSide.reverse(), leftSide[0]];
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
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-0.5 flex gap-px">
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
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300'
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
          onClick={() => setIsSatellite((v) => !v)}
          className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-2 transition-all ${
            isSatellite ? 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          } hover:bg-zinc-100 dark:hover:bg-zinc-800`}
          title={isSatellite ? 'Switch to standard map' : 'Switch to satellite'}
        >
          {isSatellite ? (
            <MapPin size={14} strokeWidth={1.5} />
          ) : (
            <Satellite size={14} strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={handleFitBounds}
          className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          title="Fit to all routes"
        >
          <Crosshair size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
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

      {/* Noise Layer Controls */}
      <div className={`absolute left-4 ${selectedAirport ? 'top-24' : 'top-14'}`}>
        <NoiseLayerControls />
      </div>

      {/* Noise Legend - shown when any noise layer is visible */}
      <div className="absolute bottom-4 left-36">
        <NoiseLegend />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-3 min-w-[130px]">
        <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.12em] mb-2">
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
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {categoryLabels[category]}
                </span>
              </div>
              {categoryCounts[category] != null && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-600 tabular-nums">
                  {categoryCounts[category]}
                </span>
              )}
            </div>
          ))}
        </div>
        {flights.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-600 tabular-nums">
            {flights.length} ops
          </div>
        )}
      </div>

      {/* Fullscreen hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 right-4 text-[10px] text-zinc-500 dark:text-zinc-700 tracking-wide">
          ESC to exit
        </div>
      )}
    </div>
  );
}
