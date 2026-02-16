import type { AirportLayout } from '@/types/airportDiagram';

/**
 * KJPX (East Hampton Town Airport) Layout Data
 *
 * Based on FAA Airport Diagram:
 * - Runway 10-28: 4,255' x 100' (main east-west runway)
 * - Runway 16-34: 2,000' x 75' (angled runway, intersects 10-28)
 * - Field Elevation: 55' MSL
 * - Magnetic Variation: 13°W
 *
 * SVG Coordinate System:
 * - ViewBox: 1200 x 900
 * - Scaled to match actual proportions
 * - North arrow at ~350° (slightly west of true north)
 */

export const kjpxLayout: AirportLayout = {
  id: 'kjpx',
  icao: 'KJPX',
  name: 'East Hampton Town Airport',
  elevation: 55,
  magneticVariation: -13,
  viewBox: {
    width: 1200,
    height: 900,
  },
  scaleBarLength: 1000, // 1000 feet

  runways: [
    {
      id: 'rwy-10-28',
      name: '10-28',
      length: 4255,
      width: 100,
      surface: 'Asphalt',
      heading: 100,
      status: 'open',
      thresholds: [
        {
          designator: '10',
          elevation: 55,
          coordinates: { x: 100, y: 480 },
        },
        {
          designator: '28',
          elevation: 30,
          displaced: 106,
          coordinates: { x: 1000, y: 480 },
        },
      ],
      // Main runway - horizontal
      path: 'M 100,460 L 1000,460 L 1000,500 L 100,500 Z',
    },
    {
      id: 'rwy-16-34',
      name: '16-34',
      length: 2000,
      width: 75,
      surface: 'Asphalt',
      heading: 160,
      status: 'open',
      thresholds: [
        {
          designator: '16',
          elevation: 41,
          displaced: 106,
          coordinates: { x: 620, y: 250 },
        },
        {
          designator: '34',
          elevation: 30,
          coordinates: { x: 700, y: 620 },
        },
      ],
      // Angled runway - roughly 160° heading (tilted southeast)
      path: 'M 607,250 L 633,250 L 713,620 L 687,620 Z',
    },
  ],

  taxiways: [
    // TWA - West end connector with holding pad
    {
      id: 'twy-a',
      name: 'TWA',
      status: 'open',
      segments: [
        {
          id: 'twy-a-1',
          // Main taxiway from runway south to holding area and east
          path: 'M 130,500 Q 130,560 180,580 L 420,580',
        },
        {
          id: 'twy-a-hold',
          // Holding pad at west end - rectangular
          path: 'M 60,560 L 150,560 L 150,640 L 60,640 Z',
        },
        {
          id: 'twy-a-connector',
          // Connector from runway to holding pad
          path: 'M 130,500 L 130,560 L 60,560',
        },
      ],
    },
    // TWB - Short connector from TWA to runway
    {
      id: 'twy-b',
      name: 'TWB',
      status: 'open',
      segments: [
        {
          id: 'twy-b-1',
          path: 'M 260,580 L 260,500',
        },
      ],
    },
    // TWC - Connector at west intersection area
    {
      id: 'twy-c',
      name: 'TWC',
      status: 'open',
      segments: [
        {
          id: 'twy-c-1',
          path: 'M 420,580 L 420,500',
        },
        {
          id: 'twy-c-2',
          // Continue TWA east from TWC
          path: 'M 420,580 L 580,580',
        },
      ],
    },
    // TWD - East side connector to terminal area
    {
      id: 'twy-d',
      name: 'TWD',
      status: 'open',
      segments: [
        {
          id: 'twy-d-1',
          path: 'M 820,460 L 820,400',
        },
      ],
    },
    // TWE - Connector to apron/terminal
    {
      id: 'twy-e',
      name: 'TWE',
      status: 'open',
      segments: [
        {
          id: 'twy-e-1',
          path: 'M 770,460 L 770,400',
        },
      ],
    },
    // TWF - Short apron connector
    {
      id: 'twy-f',
      name: 'TWF',
      status: 'open',
      segments: [
        {
          id: 'twy-f-1',
          path: 'M 700,460 L 700,420',
        },
      ],
    },
    // TWG - South connector from runway 34 end
    {
      id: 'twy-g',
      name: 'TWG',
      status: 'open',
      segments: [
        {
          id: 'twy-g-1',
          path: 'M 713,620 Q 750,640 780,620',
        },
      ],
    },
    // TWH - Northwest connector from taxiway system to near RWY 16
    {
      id: 'twy-h',
      name: 'TWH',
      status: 'open',
      segments: [
        {
          id: 'twy-h-1',
          // Goes northwest from the taxiway intersection
          path: 'M 580,580 Q 520,500 480,420 L 380,340',
        },
      ],
    },
  ],

  terminals: [
    // Main Apron
    {
      id: 'apron-main',
      name: 'Apron',
      type: 'apron',
      path: 'M 650,380 L 790,380 L 790,455 L 650,455 Z',
      label: 'APRON',
    },
    // Terminal Building
    {
      id: 'terminal-main',
      name: 'Terminal',
      type: 'terminal',
      path: 'M 850,380 L 920,380 L 920,450 L 850,450 Z',
      label: 'TERMINAL',
    },
    // GA Parking Area
    {
      id: 'ga-parking',
      name: 'General Aviation Parking Area',
      type: 'parking',
      path: 'M 900,260 L 1060,260 L 1060,370 L 900,370 Z',
      label: 'GENERAL AVIATION PARKING AREA',
    },
    // Hangars - row of buildings
    {
      id: 'hangar-row-1',
      name: 'Hangars',
      type: 'hangar',
      path: 'M 800,290 L 895,290 L 895,330 L 800,330 Z',
    },
    {
      id: 'hangar-row-2',
      name: 'Hangars',
      type: 'hangar',
      path: 'M 800,335 L 895,335 L 895,370 L 800,370 Z',
    },
    // South industrial buildings
    {
      id: 'industrial-1',
      name: 'Industrial Building',
      type: 'hangar',
      path: 'M 220,670 L 380,670 L 380,710 L 220,710 Z',
    },
    {
      id: 'industrial-2',
      name: 'Industrial Building',
      type: 'hangar',
      path: 'M 220,715 L 380,715 L 380,750 L 220,750 Z',
    },
    // Airport beacon (near GA parking)
    {
      id: 'beacon-1',
      name: 'Airport Beacon',
      type: 'beacon',
      path: 'M 960,280 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
    },
    // Second BCN marker near AWOS
    {
      id: 'beacon-2',
      name: 'BCN',
      type: 'beacon',
      path: 'M 600,430 m -6,0 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0',
    },
    // AWOS marker
    {
      id: 'awos',
      name: 'AWOS',
      type: 'windsock', // Using windsock type for small marker
      path: 'M 590,400 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0',
    },
    // Windsock near intersection
    {
      id: 'windsock-1',
      name: 'Windsock',
      type: 'windsock',
      path: 'M 630,520 m -6,0 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0',
    },
  ],
};

// Additional metadata for rendering labels and annotations
export const kjpxAnnotations = {
  // Airport property boundary (irregular polygon)
  airportBoundary: {
    path: 'M 30,180 L 200,100 L 400,80 L 700,90 L 1000,100 L 1150,150 L 1160,300 L 1150,500 L 1100,650 L 900,720 L 700,750 L 500,780 L 300,800 L 150,780 L 50,700 L 30,500 L 30,180 Z',
  },

  runwayLabels: [
    {
      text: '4,255\' X 100\'',
      x: 560,
      y: 525,
      rotation: 0,
    },
    {
      text: '2,000\' X 75\'',
      x: 620,
      y: 380,
      rotation: 65,
    },
  ],

  // Runway name labels on pavement
  runwayNameLabels: [
    { text: 'RUNWAY 10 - 28', x: 550, y: 485, rotation: 0 },
    { text: 'RUNWAY 16 - 34', x: 660, y: 435, rotation: 65 },
  ],

  thresholdLabels: [
    {
      runway: '10',
      lines: ['THRESHOLD', 'ELEV = 55\''],
      x: 130,
      y: 540,
    },
    {
      runway: '28',
      lines: ['THRESHOLD', 'ELEV = 30\'', '106\' DISPLACED', 'THRESHOLD'],
      x: 970,
      y: 535,
    },
    {
      runway: '16',
      lines: ['THRESHOLD', 'ELEV = 41\'', '106\' DISPLACED', 'THRESHOLD'],
      x: 560,
      y: 270,
    },
    {
      runway: '34',
      lines: ['THRESHOLD', 'ELEV = 30\''],
      x: 750,
      y: 640,
    },
  ],

  // Taxiway name labels along paths (TW A, TW B, etc.)
  taxiwayPathLabels: [
    { text: 'TW A', x: 300, y: 570, rotation: 0 },
    { text: 'TW B', x: 260, y: 540, rotation: -90 },
    { text: 'TW C', x: 420, y: 540, rotation: -90 },
    { text: 'TW C', x: 500, y: 570, rotation: 0 },
    { text: 'TW D', x: 835, y: 430, rotation: -90 },
    { text: 'TW E', x: 785, y: 430, rotation: -90 },
    { text: 'TW F', x: 715, y: 438, rotation: -90 },
    { text: 'TW G', x: 750, y: 600, rotation: 0 },
    { text: 'TW H', x: 450, y: 400, rotation: -55 },
  ],

  roads: [
    {
      name: 'TOWN LINE ROAD',
      path: 'M 30,180 Q 35,400 40,500 Q 45,650 50,780',
      labelX: 55,
      labelY: 350,
      rotation: -90,
    },
    {
      name: 'DANIELS HOLE ROAD',
      path: 'M 200,100 Q 500,85 700,90 Q 900,95 1100,105',
      labelX: 500,
      labelY: 75,
      rotation: -3,
    },
    {
      name: 'INDUSTRIAL ROAD',
      path: 'M 150,780 Q 350,765 500,770 Q 650,775 750,760',
      labelX: 400,
      labelY: 755,
      rotation: -2,
    },
    {
      name: 'LONG ISLAND RAIL ROAD',
      path: 'M 30,840 Q 400,825 700,820 Q 1000,815 1160,810',
      labelX: 350,
      labelY: 810,
      rotation: -2,
    },
  ],

  terrain: [
    { label: 'WOODED', x: 120, y: 200 },
    { label: 'WOODED', x: 180, y: 350 },
    { label: 'WOODED', x: 180, y: 630 },
    { label: 'WOODED', x: 1070, y: 180 },
    { label: 'WOODED', x: 1070, y: 520 },
  ],

  facilities: [
    { label: 'S.C. WATER AUTHORITY', x: 70, y: 380, icon: 'building' },
    { label: 'CELL TOWER', x: 270, y: 130, icon: 'tower' },
    { label: 'HIGH TENSION POWER\nLINES AND TOWERS (TYP.)', x: 1080, y: 110, icon: 'powerline' },
    { label: 'AIRPORT BEACON', x: 990, y: 280 },
    { label: 'GENERAL AVIATION\nPARKING AREA', x: 980, y: 320 },
    { label: 'APRON', x: 720, y: 415 },
    { label: 'TERMINAL', x: 885, y: 415 },
  ],

  // Woods line - dashed line showing tree line
  woodsLine: {
    path: 'M 350,350 Q 400,360 450,370 Q 500,375 550,365',
    label: 'WOODS LINE',
    labelX: 450,
    labelY: 380,
  },

  // BCN labels for beacon markers
  beaconLabels: [
    { x: 960, y: 295, label: 'BCN' },
  ],

  // AWOS label
  awosLabel: { x: 600, y: 405, label: 'AWOS' },

  // Windsock label
  windsockLabel: { x: 640, y: 520, label: 'WINDSOCK' },

  // Taxiway label positions (single letter in circle)
  taxiwayLabels: [
    { letter: 'A', x: 110, y: 600 },
    { letter: 'B', x: 260, y: 555 },
    { letter: 'C', x: 420, y: 555 },
    { letter: 'D', x: 835, y: 415 },
    { letter: 'E', x: 785, y: 415 },
    { letter: 'F', x: 715, y: 415 },
    { letter: 'G', x: 755, y: 635 },
    { letter: 'H', x: 480, y: 380 },
  ],

  // Additional hangars/buildings
  hangars: [
    // Individual hangar buildings near terminal area (black filled)
    { path: 'M 800,295 L 840,295 L 840,325 L 800,325 Z' },
    { path: 'M 845,295 L 890,295 L 890,325 L 845,325 Z' },
    { path: 'M 800,330 L 840,330 L 840,360 L 800,360 Z' },
    { path: 'M 845,330 L 890,330 L 890,360 L 845,360 Z' },
  ],

  // Perimeter buildings (small structures around airport)
  perimeterStructures: [
    // Near S.C. Water Authority
    { path: 'M 60,360 L 90,360 L 90,380 L 60,380 Z' },
    { path: 'M 60,385 L 80,385 L 80,400 L 60,400 Z' },
    // Industrial area buildings
    { path: 'M 220,680 L 280,680 L 280,705 L 220,705 Z' },
    { path: 'M 285,680 L 370,680 L 370,705 L 285,705 Z' },
    { path: 'M 220,710 L 280,710 L 280,735 L 220,735 Z' },
    { path: 'M 285,710 L 370,710 L 370,735 L 285,735 Z' },
    { path: 'M 220,740 L 370,740 L 370,755 L 220,755 Z' },
  ],

  // Power line towers (triangle symbols)
  powerLineTowers: [
    { x: 1080, y: 140 },
    { x: 1120, y: 170 },
  ],

  // Power line path
  powerLine: {
    path: 'M 1050,100 L 1080,140 L 1120,170 L 1160,200',
  },
};
