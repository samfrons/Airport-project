import type { NoiseComplaint, ComplaintCategory } from '@/types/noise';

const neighborhoods = [
  'Wainscott',
  'Sagaponack',
  'Bridgehampton',
  'East Hampton Village',
  'Northwest Woods',
  'Springs',
  'Amagansett',
  'Georgica',
];

const categories: ComplaintCategory[] = [
  'helicopter',
  'jet',
  'low_flying',
  'early_morning',
  'late_night',
  'frequency',
  'other',
];

const descriptions: Record<ComplaintCategory, string[]> = {
  helicopter: [
    'Extremely loud helicopter hovering for extended period',
    'Low-flying helicopter causing house to vibrate',
    'Multiple helicopter passes over property',
    'Helicopter noise disrupting work from home',
    'Constant helicopter traffic throughout the afternoon',
  ],
  jet: [
    'Multiple jet takeoffs in quick succession',
    'Very loud jet departure shook windows',
    'Jet engine noise unbearable during arrival',
    'Unusually loud jet at low altitude',
  ],
  low_flying: [
    'Aircraft flying much lower than usual',
    'Plane so low I could see the tail number',
    'Low approach over residential area',
    'Aircraft appeared to be below normal altitude',
  ],
  early_morning: [
    'Early morning departure woke entire family at 6:30am',
    'Aircraft noise before 7am on a Sunday',
    'Woken by low-flying plane at 6:15am',
    'Multiple early operations before curfew end',
  ],
  late_night: [
    'Late night arrival during curfew period',
    'Helicopter landing at 9:30pm disturbed dinner guests',
    'Aircraft noise at 10pm on a weeknight',
    'Jet departure well past 8pm curfew',
  ],
  frequency: [
    'Constant aircraft traffic all day long',
    'Over 20 flights in one hour',
    'Non-stop helicopter activity',
    'This is the 5th complaint this week due to volume',
  ],
  other: [
    'Disruptive noise during outdoor event',
    'Could not hold conversation in backyard',
    'Engine sounded unusual/unhealthy',
    'Aircraft circled multiple times over neighborhood',
  ],
};

// Generate random location within the airport impact zone
function generateRandomLocation(): { lat: number; lng: number } {
  // Bounds roughly covering the Hamptons area around KJPX
  const latRange = { min: 40.92, max: 40.99 };
  const lngRange = { min: -72.32, max: -72.12 };

  return {
    lat: latRange.min + Math.random() * (latRange.max - latRange.min),
    lng: lngRange.min + Math.random() * (lngRange.max - lngRange.min),
  };
}

// Generate mock complaints distributed over time
export function generateMockComplaints(count: number = 150): NoiseComplaint[] {
  const complaints: NoiseComplaint[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Distribute over past 90 days, with more recent complaints more likely
    const daysAgo = Math.pow(Math.random(), 1.5) * 90;
    const timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Bias towards daytime hours (when flights are more common)
    const hour = Math.floor(Math.random() * 14) + 7; // 7am to 9pm
    timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    const location = generateRandomLocation();
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryDescriptions = descriptions[category];

    // Severity weighted towards middle values (3 is most common)
    const severityWeights = [0.1, 0.2, 0.35, 0.25, 0.1];
    const severityRoll = Math.random();
    let severity: 1 | 2 | 3 | 4 | 5 = 3;
    let cumulative = 0;
    for (let s = 0; s < severityWeights.length; s++) {
      cumulative += severityWeights[s];
      if (severityRoll <= cumulative) {
        severity = (s + 1) as 1 | 2 | 3 | 4 | 5;
        break;
      }
    }

    complaints.push({
      id: `complaint-${String(i).padStart(4, '0')}`,
      timestamp: timestamp.toISOString(),
      location: {
        ...location,
        neighborhood: neighborhoods[Math.floor(Math.random() * neighborhoods.length)],
      },
      severity,
      category,
      description: categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)],
    });
  }

  // Sort by timestamp descending (most recent first)
  return complaints.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export const mockComplaints = generateMockComplaints(150);
