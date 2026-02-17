/**
 * Mock complaint data generator using the new Complaint schema (PlaneNoise format).
 * Generates realistic data for dashboard preview before real PlaneNoise data arrives.
 */

import type {
  Complaint,
  ComplaintDailySummary,
  ComplaintHotspot,
  PlaneNoiseAircraftType,
  PlaneNoiseComplaintType,
} from '@/types/noise';

import {
  EAST_HAMPTON_STREETS,
  getWeightedMunicipality,
  getRandomStreet,
} from './eastHamptonStreets';

// ─── Configuration ───────────────────────────────────────────────────────────

const AIRCRAFT_TYPE_WEIGHTS: Record<PlaneNoiseAircraftType, number> = {
  'Helicopter': 0.60, // 60% - most common complaint type
  'Jet': 0.25,        // 25%
  'Prop': 0.10,       // 10%
  'Seaplane': 0.02,   // 2%
  'Unknown': 0.02,    // 2%
  'Multiple': 0.005,  // 0.5%
  'Other': 0.005,     // 0.5%
};

const COMPLAINT_TYPE_WEIGHTS: Record<PlaneNoiseComplaintType, number> = {
  'Excessive Noise': 0.35,
  'Low Altitude': 0.20,
  'Too Early or Late': 0.15,
  'Frequency': 0.10,
  'Sleep Disturbance': 0.08,
  'Hovering': 0.05,
  'Speech Disturbance': 0.03,
  'Excessive Vibration': 0.02,
  'Other': 0.02,
};

const FLIGHT_DIRECTIONS = [
  'Arrival', 'Departure', 'North', 'South', 'East', 'West', 'Overhead', null,
];

const AIRPORTS = ['JPX', 'JPX', 'JPX', 'MTP', 'Other']; // 60% JPX

// ─── Aircraft Descriptions ───────────────────────────────────────────────────

const HELICOPTER_DESCRIPTIONS = [
  'Black helicopter with white tail',
  'Red and white helicopter',
  'Silver helicopter, very loud',
  'Dark blue helicopter, multiple rotors',
  'White helicopter with gold stripe',
  'Large black corporate helicopter',
  'Small red helicopter, circling',
  'Twin-engine helicopter',
  'White medical-looking helicopter',
  null, // No description provided
];

const JET_DESCRIPTIONS = [
  'White private jet, blue stripe',
  'Black corporate jet',
  'Silver jet with red tail',
  'Small white jet',
  'Large business jet',
  'Mid-size jet, very loud engines',
  'Dark grey jet, steep climb',
  null,
];

const PROP_DESCRIPTIONS = [
  'Single engine prop plane',
  'Twin prop, red and white',
  'Small white propeller plane',
  'Yellow prop plane',
  'Vintage looking prop plane',
  null,
];

// ─── Comment Templates ───────────────────────────────────────────────────────

const COMMENT_TEMPLATES = {
  helicopter: [
    'Helicopter hovering over my property for {minutes} minutes',
    'Extremely loud helicopter disrupting {activity}',
    'This is the {nth} helicopter today',
    'Helicopter noise woke up my {family_member}',
    'Could not hold a conversation outside due to helicopter noise',
    'Helicopter came in much lower than usual',
    'Multiple helicopter passes in the last hour',
    'Helicopter noise making it impossible to work from home',
    'The vibration from this helicopter rattled my windows',
    null, // Some complaints have no comment
  ],
  jet: [
    'Jet takeoff was extremely loud',
    'Windows rattled from jet noise',
    'Jet came in very low over the house',
    'Unusually loud jet during {time_period}',
    'This jet was much louder than normal operations',
    'Jet engines were deafening during approach',
    null,
  ],
  general: [
    'Disrupted outdoor family gathering',
    'Could not enjoy my backyard',
    'Woke up entire household',
    'Disturbed pets significantly',
    'Made phone call impossible',
    'Third complaint this week',
    'This happens every weekend',
    'Worse than usual today',
    null,
  ],
};

// ─── Utility Functions ───────────────────────────────────────────────────────

function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }

  return entries[0][0];
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isCurfewPeriod(hour: number): boolean {
  // Pilot's Pledge curfew: 9 PM - 7 AM ET
  return hour >= 21 || hour < 7;
}

function generateSourceId(): string {
  // PlaneNoise-style source ID
  const prefix = Math.random() > 0.5 ? 'PN' : 'EH';
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${num}`;
}

function generateComment(aircraftType: string): string | null {
  if (Math.random() < 0.3) return null; // 30% have no comment

  let templates: (string | null)[];
  if (aircraftType === 'Helicopter') {
    templates = COMMENT_TEMPLATES.helicopter;
  } else if (aircraftType === 'Jet') {
    templates = COMMENT_TEMPLATES.jet;
  } else {
    templates = COMMENT_TEMPLATES.general;
  }

  const template = randomFromArray(templates);
  if (!template) return null;

  // Replace placeholders
  return template
    .replace('{minutes}', String(Math.floor(Math.random() * 10) + 2))
    .replace('{activity}', randomFromArray(['work', 'dinner', 'sleep', 'a phone call', 'reading']))
    .replace('{nth}', randomFromArray(['third', 'fourth', 'fifth', 'sixth']))
    .replace('{family_member}', randomFromArray(['children', 'baby', 'spouse', 'elderly parent']))
    .replace('{time_period}', randomFromArray(['evening hours', 'early morning', 'dinner time']));
}

function generateAircraftDescription(aircraftType: string): string | null {
  if (Math.random() < 0.4) return null; // 40% have no description

  switch (aircraftType) {
    case 'Helicopter':
      return randomFromArray(HELICOPTER_DESCRIPTIONS);
    case 'Jet':
      return randomFromArray(JET_DESCRIPTIONS);
    case 'Prop':
      return randomFromArray(PROP_DESCRIPTIONS);
    default:
      return null;
  }
}

// ─── Complaint Type Generation ───────────────────────────────────────────────

function generateComplaintTypes(aircraftType: string, isCurfew: boolean): string {
  const types: PlaneNoiseComplaintType[] = [];

  // Primary complaint type
  types.push(weightedRandom(COMPLAINT_TYPE_WEIGHTS));

  // 40% chance of secondary complaint type
  if (Math.random() < 0.4) {
    const secondary = weightedRandom(COMPLAINT_TYPE_WEIGHTS);
    if (!types.includes(secondary)) {
      types.push(secondary);
    }
  }

  // If helicopter and hovering wasn't selected, 20% chance to add it
  if (aircraftType === 'Helicopter' && !types.includes('Hovering') && Math.random() < 0.2) {
    types.push('Hovering');
  }

  // If curfew period, higher chance of "Too Early or Late"
  if (isCurfew && !types.includes('Too Early or Late') && Math.random() < 0.5) {
    types.push('Too Early or Late');
  }

  // If curfew period, higher chance of "Sleep Disturbance"
  if (isCurfew && !types.includes('Sleep Disturbance') && Math.random() < 0.4) {
    types.push('Sleep Disturbance');
  }

  return types.join(', ');
}

// ─── Flight Matching Simulation ──────────────────────────────────────────────

interface FlightMatch {
  matched_flight_id: string | null;
  matched_confidence: 'high' | 'medium' | 'low' | 'unmatched' | null;
  matched_registration: string | null;
  matched_operator: string | null;
}

const OPERATORS = [
  'Blade Urban Air Mobility',
  'HeliFlite',
  'Helicopter Flight Services',
  'NetJets',
  'Wheels Up',
  'XO',
  'Private Owner',
  'Charter Flight',
  'N/A',
  null,
];

const TAIL_PREFIXES = ['N', 'N1', 'N2', 'N3', 'N4', 'N5', 'N7', 'N8', 'N9'];

function generateFlightMatch(): FlightMatch {
  // 35% of complaints are matched to a flight
  if (Math.random() > 0.35) {
    return {
      matched_flight_id: null,
      matched_confidence: 'unmatched',
      matched_registration: null,
      matched_operator: null,
    };
  }

  const confidence = Math.random();
  let matchedConfidence: 'high' | 'medium' | 'low';
  if (confidence < 0.4) matchedConfidence = 'high';
  else if (confidence < 0.75) matchedConfidence = 'medium';
  else matchedConfidence = 'low';

  const prefix = randomFromArray(TAIL_PREFIXES);
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  return {
    matched_flight_id: `KJPX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    matched_confidence: matchedConfidence,
    matched_registration: `${prefix}${suffix}${letter}`,
    matched_operator: randomFromArray(OPERATORS),
  };
}

// ─── Date Distribution ───────────────────────────────────────────────────────

function generateEventDate(baseDate: Date): Date {
  // Generate dates over the past 6 months with seasonal weighting
  const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

  // Use power distribution to weight towards more recent dates
  let daysAgo = Math.pow(Math.random(), 1.3) * 180;

  // Summer months (June-Sept) have 2x complaint frequency
  const candidateDate = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const month = candidateDate.getMonth();
  const isSummer = month >= 5 && month <= 8; // June through September

  // If not summer and random check fails, try to move to summer
  if (!isSummer && Math.random() < 0.3) {
    // Move to a summer month
    const summerMonth = Math.floor(Math.random() * 4) + 5; // June-Sept
    candidateDate.setMonth(summerMonth);
  }

  return candidateDate;
}

function generateEventTime(isCurfew: boolean): { hour: number; minute: number } {
  let hour: number;
  const minute = Math.floor(Math.random() * 60);

  if (isCurfew) {
    // Curfew period: 9 PM - 7 AM
    if (Math.random() < 0.6) {
      // 60% in evening (9 PM - midnight)
      hour = 21 + Math.floor(Math.random() * 3);
    } else {
      // 40% in early morning (5 AM - 7 AM) - most complaints
      hour = 5 + Math.floor(Math.random() * 2);
    }
  } else {
    // Regular hours: bias towards afternoon/evening (peak traffic times)
    const weights = [
      0.02, // 7 AM
      0.03, // 8 AM
      0.05, // 9 AM
      0.08, // 10 AM
      0.10, // 11 AM
      0.12, // 12 PM
      0.12, // 1 PM
      0.12, // 2 PM
      0.10, // 3 PM
      0.08, // 4 PM
      0.08, // 5 PM
      0.06, // 6 PM
      0.03, // 7 PM
      0.01, // 8 PM
    ];

    let random = Math.random();
    hour = 7;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        hour = 7 + i;
        break;
      }
    }
  }

  return { hour, minute };
}

// ─── Main Generator Functions ────────────────────────────────────────────────

/**
 * Generate realistic mock complaints matching the new Complaint schema.
 */
export function generateMockComplaints(count: number = 500): Complaint[] {
  const complaints: Complaint[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Determine if this is a curfew complaint (~15%)
    const willBeCurfew = Math.random() < 0.15;

    // Generate event date
    const eventDate = generateEventDate(now);
    const { hour, minute } = generateEventTime(willBeCurfew);
    eventDate.setHours(hour, minute, 0, 0);

    const actualCurfew = isCurfewPeriod(hour);
    const weekend = isWeekend(eventDate);

    // Location
    const municipality = getWeightedMunicipality();
    const streetData = getRandomStreet(municipality);

    // Add small random offset to coordinates (within ~200m)
    const latOffset = (Math.random() - 0.5) * 0.002;
    const lngOffset = (Math.random() - 0.5) * 0.002;

    // Aircraft type with distribution
    const aircraftType = weightedRandom(AIRCRAFT_TYPE_WEIGHTS);

    // Complaint types
    const complaintTypes = generateComplaintTypes(aircraftType, actualCurfew);

    // Flight matching
    const flightMatch = generateFlightMatch();

    // Submission date (usually same day or next day)
    const submissionOffset = Math.random() < 0.8 ? 0 : 1;
    const submissionDate = new Date(eventDate);
    submissionDate.setDate(submissionDate.getDate() + submissionOffset);

    const complaint: Complaint = {
      id: i + 1,
      source_id: generateSourceId(),

      // Event timing
      event_date: formatDate(eventDate),
      event_time: formatTime(eventDate),
      event_datetime_utc: eventDate.toISOString(),
      event_hour_et: hour,
      is_curfew_period: actualCurfew,
      is_weekend: weekend,

      // Location
      street_name: streetData.street,
      municipality: municipality,
      zip_code: streetData.zipCode,
      latitude: streetData.lat + latOffset,
      longitude: streetData.lng + lngOffset,

      // Complaint details
      airport: randomFromArray(AIRPORTS),
      complaint_types: complaintTypes,
      aircraft_type: aircraftType,
      aircraft_description: generateAircraftDescription(aircraftType),
      flight_direction: randomFromArray(FLIGHT_DIRECTIONS),
      comments: generateComment(aircraftType),

      // Flight correlation
      ...flightMatch,

      // Metadata
      submission_date: formatDate(submissionDate),
      created_at: submissionDate.toISOString(),
      updated_at: submissionDate.toISOString(),
    };

    complaints.push(complaint);
  }

  // Sort by event date descending (most recent first)
  return complaints.sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );
}

/**
 * Generate daily summary from complaints.
 */
export function generateMockComplaintSummary(
  complaints?: Complaint[]
): ComplaintDailySummary[] {
  const data = complaints || generateMockComplaints(500);
  const summaryMap = new Map<string, ComplaintDailySummary>();

  for (const complaint of data) {
    const date = complaint.event_date;

    if (!summaryMap.has(date)) {
      summaryMap.set(date, {
        date,
        total_complaints: 0,
        helicopter_complaints: 0,
        jet_complaints: 0,
        prop_complaints: 0,
        seaplane_complaints: 0,
        unknown_complaints: 0,
        curfew_complaints: 0,
        excessive_noise: 0,
        low_altitude: 0,
        too_early_late: 0,
        sleep_disturbance: 0,
        unique_streets: 0,
        unique_municipalities: 0,
        created_at: new Date().toISOString(),
      });
    }

    const summary = summaryMap.get(date)!;
    summary.total_complaints++;

    // Count by aircraft type
    switch (complaint.aircraft_type) {
      case 'Helicopter':
        summary.helicopter_complaints++;
        break;
      case 'Jet':
        summary.jet_complaints++;
        break;
      case 'Prop':
        summary.prop_complaints++;
        break;
      case 'Seaplane':
        summary.seaplane_complaints++;
        break;
      default:
        summary.unknown_complaints++;
    }

    // Count curfew complaints
    if (complaint.is_curfew_period) {
      summary.curfew_complaints++;
    }

    // Count by complaint type
    const types = complaint.complaint_types || '';
    if (types.includes('Excessive Noise')) summary.excessive_noise++;
    if (types.includes('Low Altitude')) summary.low_altitude++;
    if (types.includes('Too Early or Late')) summary.too_early_late++;
    if (types.includes('Sleep Disturbance')) summary.sleep_disturbance++;
  }

  // Calculate unique counts per day
  for (const [date, summary] of summaryMap) {
    const dayComplaints = data.filter((c) => c.event_date === date);
    const streets = new Set(dayComplaints.map((c) => c.street_name).filter(Boolean));
    const municipalities = new Set(dayComplaints.map((c) => c.municipality).filter(Boolean));

    summary.unique_streets = streets.size;
    summary.unique_municipalities = municipalities.size;
  }

  // Convert to array and sort by date descending
  return Array.from(summaryMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Generate hotspots from complaints.
 */
export function generateMockHotspots(
  complaints?: Complaint[]
): ComplaintHotspot[] {
  const data = complaints || generateMockComplaints(500);
  const hotspotMap = new Map<string, ComplaintHotspot>();

  for (const complaint of data) {
    const key = `${complaint.street_name}|${complaint.municipality}`;

    if (!hotspotMap.has(key)) {
      hotspotMap.set(key, {
        street_name: complaint.street_name || 'Unknown',
        municipality: complaint.municipality || 'Unknown',
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        total_complaints: 0,
        helicopter_complaints: 0,
        curfew_complaints: 0,
        date_first: complaint.event_date,
        date_last: complaint.event_date,
      });
    }

    const hotspot = hotspotMap.get(key)!;
    hotspot.total_complaints++;

    if (complaint.aircraft_type === 'Helicopter') {
      hotspot.helicopter_complaints++;
    }
    if (complaint.is_curfew_period) {
      hotspot.curfew_complaints++;
    }

    // Update date range
    if (complaint.event_date < (hotspot.date_first || '9999')) {
      hotspot.date_first = complaint.event_date;
    }
    if (complaint.event_date > (hotspot.date_last || '0000')) {
      hotspot.date_last = complaint.event_date;
    }
  }

  // Convert to array and sort by total complaints descending
  return Array.from(hotspotMap.values())
    .sort((a, b) => b.total_complaints - a.total_complaints)
    .slice(0, 50); // Top 50 hotspots
}

// ─── Pre-generated Export ────────────────────────────────────────────────────

// Generate once for consistent data across imports
let _cachedComplaints: Complaint[] | null = null;

export function getMockComplaints(): Complaint[] {
  if (!_cachedComplaints) {
    _cachedComplaints = generateMockComplaints(500);
  }
  return _cachedComplaints;
}

export function getMockComplaintSummary(): ComplaintDailySummary[] {
  return generateMockComplaintSummary(getMockComplaints());
}

export function getMockHotspots(): ComplaintHotspot[] {
  return generateMockHotspots(getMockComplaints());
}

// Clear cache (for testing)
export function clearMockCache(): void {
  _cachedComplaints = null;
}
