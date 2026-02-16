import {
  LayoutDashboard,
  Clock,
  Plane,
  ShieldAlert,
  Map,
  Volume2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // External page link (optional)
}

// Flat navigation structure - 7 items per feedback requirements
export const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: Clock },
  { id: 'aircraft-operators', label: 'Aircraft & Operators', icon: Plane },
  { id: 'curfew-compliance', label: 'Curfew Compliance', icon: ShieldAlert },
  { id: 'flight-map', label: 'Flight Map', icon: Map },
  { id: 'noise-impact', label: 'Noise & Impact', icon: Volume2 },
  { id: 'complaints', label: 'Complaints', icon: MessageSquare },
];

// All section IDs for intersection observer
export const allSectionIds = navItems.map((item) => item.id);

// Legacy export for backwards compatibility during transition
export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// Empty groups - kept for type compatibility, SideNav now uses navItems directly
export const navGroups: NavGroup[] = [];

// Map section ID to its parent group ID (empty for flat nav)
export const sectionToGroup: Record<string, string> = {};
