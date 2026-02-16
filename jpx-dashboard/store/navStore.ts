import { create } from 'zustand';

const NAV_STORAGE_KEY = 'jpx-nav-state';

// SSR-safe default values
const DEFAULT_EXPANDED_GROUPS = ['analytics', 'flights'];

interface NavState {
  isExpanded: boolean;
  isMobileOpen: boolean;
  expandedGroups: Set<string>;
  activeSection: string | null;
  _hydrated: boolean;

  // Actions
  hydrate: () => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleMobileOpen: () => void;
  setMobileOpen: (open: boolean) => void;
  toggleGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  setActiveSection: (sectionId: string | null) => void;
}

// Load persisted state from localStorage - only called during hydration
function loadPersistedState(): { isExpanded: boolean; expandedGroups: string[] } {
  if (typeof window === 'undefined') {
    return { isExpanded: true, expandedGroups: DEFAULT_EXPANDED_GROUPS };
  }
  try {
    const stored = localStorage.getItem(NAV_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        isExpanded: parsed.isExpanded ?? true,
        expandedGroups: parsed.expandedGroups ?? DEFAULT_EXPANDED_GROUPS,
      };
    }
  } catch {
    // Corrupted data — fall back to defaults
  }
  return { isExpanded: true, expandedGroups: DEFAULT_EXPANDED_GROUPS };
}

// Save state to localStorage
function persistState(isExpanded: boolean, expandedGroups: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      NAV_STORAGE_KEY,
      JSON.stringify({
        isExpanded,
        expandedGroups: Array.from(expandedGroups),
      })
    );
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export const useNavStore = create<NavState>((set, get) => ({
  // SSR-safe initial values - hydrate() loads localStorage on client
  isExpanded: true,
  isMobileOpen: false,
  expandedGroups: new Set(DEFAULT_EXPANDED_GROUPS),
  activeSection: null,
  _hydrated: false,

  // Hydration action - call this in useEffect on client
  hydrate: () => {
    if (typeof window === 'undefined' || get()._hydrated) return;
    const stored = loadPersistedState();
    set({
      isExpanded: stored.isExpanded,
      expandedGroups: new Set(stored.expandedGroups),
      _hydrated: true,
    });
  },

  toggleExpanded: () => {
    const newExpanded = !get().isExpanded;
    persistState(newExpanded, get().expandedGroups);
    set({ isExpanded: newExpanded });
  },

  setExpanded: (expanded: boolean) => {
    persistState(expanded, get().expandedGroups);
    set({ isExpanded: expanded });
  },

  toggleMobileOpen: () => {
    set({ isMobileOpen: !get().isMobileOpen });
  },

  setMobileOpen: (open: boolean) => {
    set({ isMobileOpen: open });
  },

  toggleGroup: (groupId: string) => {
    const newGroups = new Set(get().expandedGroups);
    if (newGroups.has(groupId)) {
      newGroups.delete(groupId);
    } else {
      newGroups.add(groupId);
    }
    persistState(get().isExpanded, newGroups);
    set({ expandedGroups: newGroups });
  },

  expandGroup: (groupId: string) => {
    const newGroups = new Set(get().expandedGroups);
    if (!newGroups.has(groupId)) {
      newGroups.add(groupId);
      persistState(get().isExpanded, newGroups);
      set({ expandedGroups: newGroups });
    }
  },

  setActiveSection: (sectionId: string | null) => {
    set({ activeSection: sectionId });
  },
}));
