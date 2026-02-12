import type { AirportLayout } from '@/types/airportDiagram';

/**
 * KJPX (East Hampton Town Airport) Layout Data
 *
 * Based on FAA Airport Diagram:
 * - Runway 10-28: 4,255' x 100' (main east-west runway)
 * - Runway 16-34: ~2,400' x 75' (north-south runway, intersects 10-28)
 * - Field Elevation: 55' MSL
 * - Magnetic Variation: 13°W
 *
 * SVG Coordinate System:
 * - ViewBox: 1000 x 700
 * - North is approximately UP
 * - Runways are scaled proportionally
 */

export const kjpxLayout: AirportLayout = {
  id: 'kjpx',
  icao: 'KJPX',
  name: 'East Hampton Town Airport',
  elevation: 55,
  magneticVariation: -13,
  viewBox: {
    width: 1000,
    height: 700,
  },
  scaleBarLength: 1000, // 1000 feet

  runways: [
    {
      id: 'rwy-10-28',
      name: '10-28',
      length: 4255,
      width: 100,
      surface: 'Asphalt',
      heading: 100, // Runway 10 heading
      status: 'open',
      thresholds: [
        {
          designator: '10',
          elevation: 55,
          coordinates: { x: 150, y: 350 },
        },
        {
          designator: '28',
          elevation: 30,
          displaced: 106,
          coordinates: { x: 850, y: 350 },
        },
      ],
      // Main runway - horizontal, slightly tilted
      path: 'M 150,335 L 850,335 L 850,365 L 150,365 Z',
    },
    {
      id: 'rwy-16-34',
      name: '16-34',
      length: 2400,
      width: 75,
      surface: 'Asphalt',
      heading: 160, // Runway 16 heading
      status: 'open',
      thresholds: [
        {
          designator: '16',
          elevation: 41,
          displaced: 106,
          coordinates: { x: 500, y: 180 },
        },
        {
          designator: '34',
          elevation: 30,
          coordinates: { x: 500, y: 520 },
        },
      ],
      // Cross runway - vertical
      path: 'M 487,180 L 513,180 L 513,520 L 487,520 Z',
    },
  ],

  taxiways: [
    {
      id: 'twy-a',
      name: 'TWA',
      status: 'open',
      segments: [
        {
          id: 'twy-a-1',
          // Connects runway 10 threshold to apron
          path: 'M 170,365 Q 170,420 220,450 L 280,450',
        },
      ],
    },
    {
      id: 'twy-b',
      name: 'TWB',
      status: 'open',
      segments: [
        {
          id: 'twy-b-1',
          // Parallel to main runway on south side
          path: 'M 280,450 L 480,450',
        },
      ],
    },
    {
      id: 'twy-c',
      name: 'TWC',
      status: 'open',
      segments: [
        {
          id: 'twy-c-1',
          // Connects TWB to runway intersection
          path: 'M 487,365 L 487,450',
        },
      ],
    },
    {
      id: 'twy-d',
      name: 'TWD',
      status: 'open',
      segments: [
        {
          id: 'twy-d-1',
          // Continues east from intersection
          path: 'M 513,365 L 513,430 L 620,430',
        },
      ],
    },
    {
      id: 'twy-e',
      name: 'TWE',
      status: 'open',
      segments: [
        {
          id: 'twy-e-1',
          // Eastern connector to terminal area
          path: 'M 620,430 L 750,430 L 750,380',
        },
      ],
    },
    {
      id: 'twy-f',
      name: 'TWF',
      status: 'open',
      segments: [
        {
          id: 'twy-f-1',
          // Terminal apron connector
          path: 'M 750,380 L 820,380 L 820,365',
        },
      ],
    },
    {
      id: 'twy-g',
      name: 'TWG',
      status: 'open',
      segments: [
        {
          id: 'twy-g-1',
          // North side connector
          path: 'M 513,335 L 513,280 L 600,280',
        },
      ],
    },
    {
      id: 'twy-h',
      name: 'TWH',
      status: 'open',
      segments: [
        {
          id: 'twy-h-1',
          // Runway 34 end connector
          path: 'M 513,520 Q 560,520 580,480 L 620,430',
        },
      ],
    },
  ],

  terminals: [
    {
      id: 'terminal-main',
      name: 'Terminal Building',
      type: 'terminal',
      path: 'M 860,400 L 920,400 L 920,480 L 860,480 Z',
      label: 'TERMINAL',
    },
    {
      id: 'ga-parking',
      name: 'GA Parking',
      type: 'parking',
      path: 'M 750,440 L 840,440 L 840,520 L 750,520 Z',
      label: 'GA PARKING',
    },
    {
      id: 'apron-main',
      name: 'Main Apron',
      type: 'apron',
      path: 'M 280,440 L 480,440 L 480,520 L 280,520 Z',
    },
    {
      id: 'hangar-1',
      name: 'Hangar Area',
      type: 'hangar',
      path: 'M 600,260 L 680,260 L 680,300 L 600,300 Z',
      label: 'HANGARS',
    },
    {
      id: 'beacon',
      name: 'Airport Beacon',
      type: 'beacon',
      path: 'M 920,300 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
    },
    {
      id: 'windsock-1',
      name: 'Windsock',
      type: 'windsock',
      path: 'M 380,280 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0',
    },
    {
      id: 'windsock-2',
      name: 'Windsock',
      type: 'windsock',
      path: 'M 620,550 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0',
    },
  ],
};
