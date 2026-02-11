import {
  BarChart3,
  Map,
  Clock,
  PieChart,
  Users,
  Cloud,
  TreePine,
  FileText,
  SlidersHorizontal,
  Bell,
  PlayCircle,
  ShieldCheck,
  AlertTriangle,
  Table,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { id: 'stats', label: 'Statistics', icon: BarChart3 },
      { id: 'timeline', label: 'Timeline', icon: Clock },
      { id: 'curfew', label: 'Hourly Distribution', icon: Clock },
    ],
  },
  {
    id: 'flights',
    label: 'Flights',
    items: [
      { id: 'map', label: 'Flight Routes', icon: Map },
      { id: 'breakdown', label: 'Aircraft Breakdown', icon: PieChart },
      { id: 'replay', label: 'Flight Replay', icon: PlayCircle },
      { id: 'flights', label: 'Flight Log', icon: Table },
    ],
  },
  {
    id: 'operators',
    label: 'Operators',
    items: [
      { id: 'scorecards', label: 'Operator Scorecards', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'violations', label: 'Violations', icon: AlertTriangle },
    ],
  },
  {
    id: 'environment',
    label: 'Environment',
    items: [
      { id: 'weather', label: 'Weather Correlation', icon: Cloud },
      { id: 'biodiversity', label: 'Biodiversity', icon: TreePine },
      { id: 'complaints', label: 'Noise Reports', icon: FileText },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'thresholds', label: 'Thresholds', icon: SlidersHorizontal },
      { id: 'alerts', label: 'Alerts', icon: Bell },
    ],
  },
];

// Flat list of all section IDs for intersection observer
export const allSectionIds = navGroups.flatMap((group) =>
  group.items.map((item) => item.id)
);

// Map section ID to its parent group ID
export const sectionToGroup: Record<string, string> = {};
navGroups.forEach((group) => {
  group.items.forEach((item) => {
    sectionToGroup[item.id] = group.id;
  });
});
