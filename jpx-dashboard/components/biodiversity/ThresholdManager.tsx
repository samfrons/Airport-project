'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  Volume2,
  Clock,
  Bird,
  TreePine,
  Settings2,
  RotateCcw,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { getImpactSeverityColor } from '@/types/biodiversity';
import type { ImpactSeverity, TaxonomicGroup, HabitatType } from '@/types/biodiversity';
import type {
  BiodiversityThreshold,
  AircraftCategory,
  FlightDirection,
} from '@/types/biodiversityThresholds';

// ─── Constants ──────────────────────────────────────────────────────────────

const THRESHOLD_TYPES = [
  { value: 'noise_level', label: 'Noise Level', icon: Volume2 },
  { value: 'time_of_day', label: 'Time of Day', icon: Clock },
  { value: 'seasonal', label: 'Seasonal', icon: Bird },
  { value: 'habitat_proximity', label: 'Habitat Proximity', icon: TreePine },
] as const;

const SEVERITIES: ImpactSeverity[] = ['critical', 'high', 'moderate', 'low', 'minimal'];

const AIRCRAFT_CATEGORIES: { value: AircraftCategory; label: string }[] = [
  { value: 'helicopter', label: 'Helicopter' },
  { value: 'jet', label: 'Jet' },
  { value: 'fixed_wing', label: 'Fixed Wing' },
  { value: 'unknown', label: 'Unknown' },
];

const DIRECTIONS: { value: FlightDirection; label: string }[] = [
  { value: 'arrival', label: 'Arrivals' },
  { value: 'departure', label: 'Departures' },
];

const TAXONOMIC_GROUPS: TaxonomicGroup[] = [
  'birds', 'mammals', 'amphibians', 'insects', 'reptiles', 'marine',
];

const HABITAT_TYPES: HabitatType[] = [
  'wetland', 'forest', 'grassland', 'coastal', 'freshwater',
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Default form state ─────────────────────────────────────────────────────

interface ThresholdFormState {
  label: string;
  description: string;
  type: BiodiversityThreshold['type'];
  noiseThresholdDb: string;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeMonths: number[];
  protectedHabitatTypes: HabitatType[];
  protectedGroups: TaxonomicGroup[];
  violationSeverity: ImpactSeverity;
  applicableAircraftCategories: AircraftCategory[];
  applicableDirections: FlightDirection[];
}

const emptyForm: ThresholdFormState = {
  label: '',
  description: '',
  type: 'noise_level',
  noiseThresholdDb: '',
  activeHoursStart: '',
  activeHoursEnd: '',
  activeMonths: [],
  protectedHabitatTypes: [],
  protectedGroups: [],
  violationSeverity: 'moderate',
  applicableAircraftCategories: [],
  applicableDirections: [],
};

function formFromThreshold(t: BiodiversityThreshold): ThresholdFormState {
  return {
    label: t.label,
    description: t.description,
    type: t.type,
    noiseThresholdDb: t.noiseThresholdDb?.toString() ?? '',
    activeHoursStart: t.activeHours?.start?.toString() ?? '',
    activeHoursEnd: t.activeHours?.end?.toString() ?? '',
    activeMonths: t.activeMonths ?? [],
    protectedHabitatTypes: t.protectedHabitatTypes ?? [],
    protectedGroups: t.protectedGroups ?? [],
    violationSeverity: t.violationSeverity,
    applicableAircraftCategories: t.applicableAircraftCategories ?? [],
    applicableDirections: t.applicableDirections ?? [],
  };
}

function formToThreshold(
  form: ThresholdFormState,
  existingId?: string,
): BiodiversityThreshold {
  const id = existingId ?? `th-custom-${Date.now()}`;
  const threshold: BiodiversityThreshold = {
    id,
    label: form.label.trim(),
    description: form.description.trim(),
    enabled: true,
    type: form.type,
    violationSeverity: form.violationSeverity,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  if (form.noiseThresholdDb) {
    threshold.noiseThresholdDb = parseInt(form.noiseThresholdDb, 10);
  }
  if (form.activeHoursStart && form.activeHoursEnd) {
    threshold.activeHours = {
      start: parseInt(form.activeHoursStart, 10),
      end: parseInt(form.activeHoursEnd, 10),
    };
  }
  if (form.activeMonths.length > 0) {
    threshold.activeMonths = form.activeMonths;
  }
  if (form.protectedHabitatTypes.length > 0) {
    threshold.protectedHabitatTypes = form.protectedHabitatTypes;
  }
  if (form.protectedGroups.length > 0) {
    threshold.protectedGroups = form.protectedGroups;
  }
  if (form.applicableAircraftCategories.length > 0) {
    threshold.applicableAircraftCategories = form.applicableAircraftCategories;
  }
  if (form.applicableDirections.length > 0) {
    threshold.applicableDirections = form.applicableDirections;
  }

  return threshold;
}

// ─── Multi-Select Chip Component ────────────────────────────────────────────

function ChipSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
  getLabel,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  getLabel?: (value: T) => string;
}) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
        {label} <span className="text-zinc-700 normal-case">(empty = all)</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-[10px] px-2 py-1 transition-colors capitalize ${
                isSelected
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 hover:text-zinc-300'
              }`}
            >
              {getLabel ? getLabel(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ThresholdManager() {
  const thresholds = useFlightStore((s) => s.thresholds);
  const addThreshold = useFlightStore((s) => s.addThreshold);
  const updateThreshold = useFlightStore((s) => s.updateThreshold);
  const deleteThreshold = useFlightStore((s) => s.deleteThreshold);
  const toggleThreshold = useFlightStore((s) => s.toggleThreshold);
  const resetThresholds = useFlightStore((s) => s.resetThresholds);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ThresholdFormState>(emptyForm);
  const [confirmReset, setConfirmReset] = useState(false);

  const openNewForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (threshold: BiodiversityThreshold) => {
    setForm(formFromThreshold(threshold));
    setEditingId(threshold.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.label.trim()) return;

    if (editingId) {
      const updated = formToThreshold(form, editingId);
      // Preserve enabled state and isCustom from original if editing a built-in
      const original = thresholds.find((t) => t.id === editingId);
      if (original) {
        updated.enabled = original.enabled;
        updated.isCustom = original.isCustom;
        updated.createdAt = original.createdAt;
      }
      updateThreshold(editingId, updated);
    } else {
      addThreshold(formToThreshold(form));
    }

    closeForm();
  };

  const handleDelete = (id: string) => {
    deleteThreshold(id);
    if (editingId === id) closeForm();
  };

  const handleReset = () => {
    if (confirmReset) {
      resetThresholds();
      setConfirmReset(false);
      closeForm();
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const updateField = <K extends keyof ThresholdFormState>(
    field: K,
    value: ThresholdFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = form.label.trim().length > 0;

  const categoryLabelsMap: Record<string, string> = {
    helicopter: 'Heli',
    jet: 'Jet',
    fixed_wing: 'Prop',
    unknown: 'Unknown',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    noise_level: <Volume2 size={10} className="text-zinc-500" />,
    time_of_day: <Clock size={10} className="text-zinc-500" />,
    seasonal: <Bird size={10} className="text-zinc-500" />,
    habitat_proximity: <TreePine size={10} className="text-zinc-500" />,
  };

  const severityBadge: Record<ImpactSeverity, { bg: string; text: string; label: string }> = {
    critical: { bg: 'bg-red-950/60', text: 'text-red-400', label: 'Critical' },
    high: { bg: 'bg-orange-950/60', text: 'text-orange-400', label: 'High' },
    moderate: { bg: 'bg-amber-950/60', text: 'text-amber-400', label: 'Moderate' },
    low: { bg: 'bg-lime-950/60', text: 'text-lime-400', label: 'Low' },
    minimal: { bg: 'bg-green-950/60', text: 'text-green-400', label: 'Minimal' },
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900/30 p-1.5">
              <Settings2 size={16} className="text-blue-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Threshold Administration
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Create and manage biodiversity protection thresholds per aircraft type and time period
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                confirmReset
                  ? 'bg-red-900/40 text-red-400 border border-red-800/40'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/40 hover:text-zinc-300'
              }`}
            >
              <RotateCcw size={10} />
              {confirmReset ? 'Confirm Reset' : 'Reset to Defaults'}
            </button>
            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-medium hover:bg-blue-500 transition-colors"
            >
              <Plus size={10} />
              New Threshold
            </button>
          </div>
        </div>
      </div>

      {/* Threshold List */}
      <div className="p-5">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-3">
          {thresholds.length} Thresholds · {thresholds.filter((t) => t.enabled).length} Active
        </div>

        <div className="space-y-2">
          {thresholds.map((threshold) => {
            const badge = severityBadge[threshold.violationSeverity];

            return (
              <div
                key={threshold.id}
                className={`border bg-zinc-900/40 px-3 py-2.5 group ${
                  threshold.enabled ? 'border-zinc-800/60' : 'border-zinc-800/30 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleThreshold(threshold.id)}
                      className={`w-7 h-4 rounded-full transition-colors relative flex-shrink-0 ${
                        threshold.enabled ? 'bg-emerald-600' : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          threshold.enabled ? 'left-3.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                    {typeIcons[threshold.type]}
                    <span className="text-[11px] font-medium text-zinc-300">
                      {threshold.label}
                    </span>
                    {threshold.isCustom && (
                      <span className="text-[8px] px-1 py-0.5 bg-blue-950/50 text-blue-400 uppercase tracking-wider">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}
                    >
                      {badge.label}
                    </span>
                    <button
                      onClick={() => openEditForm(threshold)}
                      className="text-[9px] px-1.5 py-0.5 bg-zinc-800/60 text-zinc-500 hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Edit
                    </button>
                    {threshold.isCustom && (
                      <button
                        onClick={() => handleDelete(threshold.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 leading-relaxed mb-1.5">
                  {threshold.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {threshold.noiseThresholdDb && (
                    <span className="text-[9px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5">
                      Limit: {threshold.noiseThresholdDb} dB
                    </span>
                  )}
                  {threshold.activeHours && (
                    <span className="text-[9px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5">
                      Hours: {threshold.activeHours.start}:00–{threshold.activeHours.end}:00
                    </span>
                  )}
                  {threshold.activeMonths && threshold.activeMonths.length > 0 && (
                    <span className="text-[9px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5">
                      Months: {threshold.activeMonths.map((m) => MONTH_LABELS[m - 1]).join(', ')}
                    </span>
                  )}
                  {threshold.protectedGroups && threshold.protectedGroups.length > 0 && (
                    <span className="text-[9px] text-emerald-600 bg-emerald-950/30 px-1.5 py-0.5">
                      Protects: {threshold.protectedGroups.join(', ')}
                    </span>
                  )}
                  {threshold.applicableAircraftCategories && threshold.applicableAircraftCategories.length > 0 && (
                    <span className="text-[9px] text-blue-500 bg-blue-950/30 px-1.5 py-0.5">
                      Aircraft: {threshold.applicableAircraftCategories.map((c) => categoryLabelsMap[c] || c).join(', ')}
                    </span>
                  )}
                  {threshold.applicableDirections && threshold.applicableDirections.length > 0 && (
                    <span className="text-[9px] text-purple-500 bg-purple-950/30 px-1.5 py-0.5">
                      {threshold.applicableDirections.map((d) => d === 'arrival' ? 'Arrivals' : 'Departures').join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Create / Edit Form Modal ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Form Header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
              <h4 className="text-sm font-semibold text-zinc-100">
                {editingId ? 'Edit Threshold' : 'New Threshold'}
              </h4>
              <button
                onClick={closeForm}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Label */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => updateField('label', e.target.value)}
                  placeholder="e.g. Helicopter Dawn Restriction"
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Why this threshold exists and what it protects..."
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors resize-none"
                />
              </div>

              {/* Type + Severity row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Threshold Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      updateField('type', e.target.value as BiodiversityThreshold['type'])
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    {THRESHOLD_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Violation Severity
                  </label>
                  <select
                    value={form.violationSeverity}
                    onChange={(e) =>
                      updateField('violationSeverity', e.target.value as ImpactSeverity)
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    {SEVERITIES.map((sev) => (
                      <option key={sev} value={sev}>
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─── Type-specific fields ─────────────────────────── */}

              {/* Noise threshold dB (noise_level, seasonal, habitat_proximity) */}
              {(form.type === 'noise_level' ||
                form.type === 'seasonal' ||
                form.type === 'habitat_proximity') && (
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Noise Threshold (dB)
                  </label>
                  <input
                    type="number"
                    value={form.noiseThresholdDb}
                    onChange={(e) => updateField('noiseThresholdDb', e.target.value)}
                    placeholder="e.g. 72"
                    min={30}
                    max={120}
                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              )}

              {/* Active hours (time_of_day) */}
              {form.type === 'time_of_day' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                      Start Hour (0-23)
                    </label>
                    <input
                      type="number"
                      value={form.activeHoursStart}
                      onChange={(e) => updateField('activeHoursStart', e.target.value)}
                      placeholder="e.g. 4"
                      min={0}
                      max={23}
                      className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                      End Hour (0-23)
                    </label>
                    <input
                      type="number"
                      value={form.activeHoursEnd}
                      onChange={(e) => updateField('activeHoursEnd', e.target.value)}
                      placeholder="e.g. 7"
                      min={0}
                      max={23}
                      className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Active months (seasonal) */}
              {form.type === 'seasonal' && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                    Active Months
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {MONTH_LABELS.map((label, idx) => {
                      const month = idx + 1;
                      const isActive = form.activeMonths.includes(month);
                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              updateField(
                                'activeMonths',
                                form.activeMonths.filter((m) => m !== month),
                              );
                            } else {
                              updateField('activeMonths', [...form.activeMonths, month].sort((a, b) => a - b));
                            }
                          }}
                          className={`text-[10px] py-1.5 transition-colors ${
                            isActive
                              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                              : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 hover:text-zinc-300'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Habitat types (habitat_proximity) */}
              {form.type === 'habitat_proximity' && (
                <ChipSelect
                  label="Protected Habitat Types"
                  options={HABITAT_TYPES}
                  selected={form.protectedHabitatTypes}
                  onChange={(val) => updateField('protectedHabitatTypes', val)}
                />
              )}

              {/* ─── Common fields ────────────────────────────────── */}

              {/* Aircraft categories */}
              <ChipSelect
                label="Aircraft Categories"
                options={AIRCRAFT_CATEGORIES.map((c) => c.value)}
                selected={form.applicableAircraftCategories}
                onChange={(val) => updateField('applicableAircraftCategories', val)}
                getLabel={(v) => AIRCRAFT_CATEGORIES.find((c) => c.value === v)?.label ?? v}
              />

              {/* Flight directions */}
              <ChipSelect
                label="Flight Directions"
                options={DIRECTIONS.map((d) => d.value)}
                selected={form.applicableDirections}
                onChange={(val) => updateField('applicableDirections', val)}
                getLabel={(v) => DIRECTIONS.find((d) => d.value === v)?.label ?? v}
              />

              {/* Protected species groups */}
              <ChipSelect
                label="Protected Species Groups"
                options={TAXONOMIC_GROUPS}
                selected={form.protectedGroups}
                onChange={(val) => updateField('protectedGroups', val)}
              />

              {/* ─── Actions ─────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 text-[11px] font-medium text-zinc-400 bg-zinc-800/50 border border-zinc-700/40 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isValid}
                  className="px-4 py-2 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Save Changes' : 'Create Threshold'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
