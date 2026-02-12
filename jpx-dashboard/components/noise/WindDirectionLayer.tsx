/**
 * Wind Direction Map Layer
 *
 * Mapbox GL layer showing wind direction and its effect on noise propagation.
 * Displays:
 * - Wind arrow overlay centered on airport
 * - Color gradient showing downwind (red) to upwind (blue) zones
 * - Wind speed/direction label
 */

'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap } from 'mapbox-gl';
import {
  type WindConditions,
  getWindEffectCategory,
} from '@/lib/noise/weatherAdjustments';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WindDirectionLayerProps {
  map: MapboxMap;
  wind: WindConditions;
  airportCoordinates: [number, number]; // [lng, lat]
  visible?: boolean;
  radiusMiles?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LAYER_ID_PREFIX = 'wind-direction';
const SOURCE_ID = 'wind-direction-source';

// Color stops for wind effect zones
const WIND_COLORS = {
  downwind: '#ef4444',   // red-500 - louder
  crosswind: '#f59e0b',  // amber-500 - neutral
  upwind: '#3b82f6',     // blue-500 - quieter
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Generate a circular polygon for the wind effect zone
 */
function generateWindZonePolygon(
  center: [number, number],
  radiusMiles: number,
  windDirection: number,
  zone: 'downwind' | 'crosswind' | 'upwind'
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points: [number, number][] = [];
  const radiusDegrees = radiusMiles / 69; // Approximate miles to degrees

  // Wind blows FROM windDirection, so downwind is windDirection + 180
  const downwindDirection = (windDirection + 180) % 360;

  // Calculate sector angles based on zone
  let startAngle: number;
  let endAngle: number;

  if (zone === 'downwind') {
    // 90-degree sector centered on downwind direction
    startAngle = downwindDirection - 45;
    endAngle = downwindDirection + 45;
  } else if (zone === 'upwind') {
    // 90-degree sector centered on upwind direction (opposite)
    startAngle = windDirection - 45;
    endAngle = windDirection + 45;
  } else {
    // Crosswind fills the rest (two sectors on sides)
    // This creates a single representative crosswind sector
    startAngle = downwindDirection + 45;
    endAngle = downwindDirection + 135;
  }

  // Add center point
  points.push(center);

  // Generate arc points
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const radians = (angle - 90) * (Math.PI / 180); // Adjust for compass (0 = North)
    const x = center[0] + radiusDegrees * Math.cos(radians);
    const y = center[1] + radiusDegrees * Math.sin(radians);
    points.push([x, y]);
  }

  // Close the polygon
  points.push(center);

  return {
    type: 'Feature',
    properties: {
      zone,
      color: WIND_COLORS[zone],
    },
    geometry: {
      type: 'Polygon',
      coordinates: [points],
    },
  };
}

/**
 * Generate an arrow showing wind direction
 */
function generateWindArrow(
  center: [number, number],
  radiusMiles: number,
  windDirection: number
): GeoJSON.Feature<GeoJSON.LineString> {
  const radiusDegrees = radiusMiles / 69 * 0.8; // 80% of zone radius
  const arrowRadians = (windDirection - 90) * (Math.PI / 180);

  // Arrow points in direction wind is blowing TO (opposite of FROM)
  const targetDirection = (windDirection + 180) % 360;
  const targetRadians = (targetDirection - 90) * (Math.PI / 180);

  // Start point (upwind side)
  const startX = center[0] + radiusDegrees * 0.3 * Math.cos(arrowRadians);
  const startY = center[1] + radiusDegrees * 0.3 * Math.sin(arrowRadians);

  // End point (downwind side)
  const endX = center[0] + radiusDegrees * Math.cos(targetRadians);
  const endY = center[1] + radiusDegrees * Math.sin(targetRadians);

  return {
    type: 'Feature',
    properties: {
      type: 'arrow',
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [startX, startY],
        center,
        [endX, endY],
      ],
    },
  };
}

/**
 * Generate arrowhead at the end of the arrow
 */
function generateArrowhead(
  center: [number, number],
  radiusMiles: number,
  windDirection: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusDegrees = radiusMiles / 69 * 0.8;
  const targetDirection = (windDirection + 180) % 360;
  const targetRadians = (targetDirection - 90) * (Math.PI / 180);

  // Tip of arrow
  const tipX = center[0] + radiusDegrees * Math.cos(targetRadians);
  const tipY = center[1] + radiusDegrees * Math.sin(targetRadians);

  // Base points of arrowhead (30 degrees off)
  const arrowSize = radiusDegrees * 0.15;
  const angle1 = targetRadians + Math.PI + (30 * Math.PI / 180);
  const angle2 = targetRadians + Math.PI - (30 * Math.PI / 180);

  const base1X = tipX + arrowSize * Math.cos(angle1);
  const base1Y = tipY + arrowSize * Math.sin(angle1);
  const base2X = tipX + arrowSize * Math.cos(angle2);
  const base2Y = tipY + arrowSize * Math.sin(angle2);

  return {
    type: 'Feature',
    properties: {
      type: 'arrowhead',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [tipX, tipY],
        [base1X, base1Y],
        [base2X, base2Y],
        [tipX, tipY],
      ]],
    },
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WindDirectionLayer({
  map,
  wind,
  airportCoordinates,
  visible = true,
  radiusMiles = 3,
}: WindDirectionLayerProps) {
  const sourceAdded = useRef(false);

  useEffect(() => {
    if (!map || !visible) {
      return;
    }

    // Generate GeoJSON features
    const features: GeoJSON.Feature[] = [];

    if (wind.speed >= 3) { // Only show if wind is significant
      // Add wind zone polygons
      features.push(
        generateWindZonePolygon(airportCoordinates, radiusMiles, wind.direction, 'downwind'),
        generateWindZonePolygon(airportCoordinates, radiusMiles, wind.direction, 'upwind')
      );

      // Add wind arrow
      features.push(
        generateWindArrow(airportCoordinates, radiusMiles, wind.direction),
        generateArrowhead(airportCoordinates, radiusMiles, wind.direction)
      );
    }

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    // Add or update source
    const existingSource = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: geojsonData,
      });
      sourceAdded.current = true;
    }

    // Add layers if they don't exist
    if (!map.getLayer(`${LAYER_ID_PREFIX}-zones`)) {
      // Zone fills
      map.addLayer({
        id: `${LAYER_ID_PREFIX}-zones`,
        type: 'fill',
        source: SOURCE_ID,
        filter: ['has', 'zone'],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.15,
        },
      });

      // Zone outlines
      map.addLayer({
        id: `${LAYER_ID_PREFIX}-zone-outlines`,
        type: 'line',
        source: SOURCE_ID,
        filter: ['has', 'zone'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.5,
        },
      });

      // Arrow line
      map.addLayer({
        id: `${LAYER_ID_PREFIX}-arrow`,
        type: 'line',
        source: SOURCE_ID,
        filter: ['==', ['get', 'type'], 'arrow'],
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Arrowhead fill
      map.addLayer({
        id: `${LAYER_ID_PREFIX}-arrowhead`,
        type: 'fill',
        source: SOURCE_ID,
        filter: ['==', ['get', 'type'], 'arrowhead'],
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.8,
        },
      });
    }

    // Cleanup function
    return () => {
      if (!map) return;

      // Remove layers
      [`${LAYER_ID_PREFIX}-zones`, `${LAYER_ID_PREFIX}-zone-outlines`, `${LAYER_ID_PREFIX}-arrow`, `${LAYER_ID_PREFIX}-arrowhead`].forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      });

      // Remove source
      if (sourceAdded.current && map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
        sourceAdded.current = false;
      }
    };
  }, [map, wind, airportCoordinates, visible, radiusMiles]);

  // Toggle visibility
  useEffect(() => {
    if (!map) return;

    const visibility = visible ? 'visible' : 'none';
    [`${LAYER_ID_PREFIX}-zones`, `${LAYER_ID_PREFIX}-zone-outlines`, `${LAYER_ID_PREFIX}-arrow`, `${LAYER_ID_PREFIX}-arrowhead`].forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });
  }, [map, visible]);

  return null; // This component only manages map layers
}

// ─── Wind Direction Legend Component ────────────────────────────────────────

interface WindDirectionLegendProps {
  wind: WindConditions;
  className?: string;
}

export function WindDirectionLegend({ wind, className = '' }: WindDirectionLegendProps) {
  const formatDirection = (deg: number): string => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return dirs[idx];
  };

  if (wind.speed < 3) {
    return (
      <div className={`bg-gray-900/90 border border-gray-700 p-3 ${className}`}>
        <div className="text-sm font-medium text-gray-300">Wind</div>
        <div className="text-lg text-white">Calm</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/90 border border-gray-700 p-3 ${className}`}>
      <div className="text-sm font-medium text-gray-300 mb-2">Wind Direction</div>

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 flex items-center justify-center text-white"
          style={{
            transform: `rotate(${wind.direction + 180}deg)`,
          }}
        >
          ↑
        </div>
        <div className="text-white">
          {formatDirection(wind.direction)} at {wind.speed} kt
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500/50"></div>
          <span className="text-red-400">Downwind (+4 dB)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500/50"></div>
          <span className="text-blue-400">Upwind (-2 dB)</span>
        </div>
      </div>
    </div>
  );
}

export default WindDirectionLayer;
