'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Settings2,
  Filter,
  Volume2,
  Clock,
  Users,
  Repeat,
  BarChart3,
  Pencil,
} from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import { evaluateAllFlights } from '@/lib/biodiversityViolationEngine';
import { getAircraftNoiseProfile } from '@/data/noise/aircraftNoiseProfiles';
import type { Flight } from '@/types/flight';
import type { BiodiversityViolation } from '@/types/biodiversityThresholds';
import type { ImpactSeverity } from '@/types/biodiversity';

// ─── Alert Rule Types ───────────────────────────────────────────────────────

type TriggerType =
  | 'curfew_violation'
  | 'noise_threshold'
  | 'species_impact'
  | 'high_volume'
  | 'repeat_offender';

type AlertPriority = 'info' | 'warning' | 'critical';

interface CurfewParams {}

interface NoiseThresholdParams {
  minDb: number;
}

interface SpeciesImpactParams {
  minSeverity: ImpactSeverity;
}

interface HighVolumeParams {
  maxFlightsPerHour: number;
}

interface RepeatOffenderParams {
  minViolations: number;
  periodDays: number;
}

type TriggerParams =
  | CurfewParams
  | NoiseThresholdParams
  | SpeciesImpactParams
  | HighVolumeParams
  | RepeatOffenderParams;

interface AlertRule {
  id: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  params: TriggerParams;
  priority: AlertPriority;
  enabled: boolean;
  createdAt: string;
}

interface TriggeredAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  priority: AlertPriority;
  message: string;
  timestamp: string;
  flightIdent?: string;
  operator?: string;
  details: string;
  acknowledged: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RULES_STORAGE_KEY = 'jpx-alert-rules';
const ACKNOWLEDGED_STORAGE_KEY = 'jpx-acknowledged-alerts';

const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  curfew_violation: 'Curfew Violation',
  noise_threshold: 'Noise Threshold',
  species_impact: 'Species Impact',
  high_volume: 'High Volume',
  repeat_offender: 'Repeat Offender',
};

const TRIGGER_TYPE_ICONS: Record<TriggerType, typeof Clock> = {
  curfew_violation: Clock,
  noise_threshold: Volume2,
  species_impact: AlertTriangle,
  high_volume: BarChart3,
  repeat_offender: Repeat,
};

const PRIORITY_CONFIG: Record<
  AlertPriority,
  { bg: string; text: string; border: string; label: string; iconBg: string }
> = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-900/40',
    label: 'Critical',
    iconBg: 'bg-red-200 dark:bg-red-900/40',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-900/40',
    label: 'Warning',
    iconBg: 'bg-amber-200 dark:bg-amber-900/40',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-900/40',
    label: 'Info',
    iconBg: 'bg-blue-200 dark:bg-blue-900/40',
  },
};

const SEVERITY_ORDER: Record<ImpactSeverity, number> = {
  minimal: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'rule-curfew-default',
    name: 'Curfew Period Flight',
    description: 'Alerts on any flight operating during the voluntary curfew period (8 PM - 8 AM ET).',
    triggerType: 'curfew_violation',
    params: {},
    priority: 'warning',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-noise-default',
    name: 'Excessive Noise',
    description: 'Triggers when estimated aircraft noise exceeds 85 dB.',
    triggerType: 'noise_threshold',
    params: { minDb: 85 } as NoiseThresholdParams,
    priority: 'critical',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-species-default',
    name: 'High Species Impact',
    description: 'Triggers when a violation has high or critical impact on local species.',
    triggerType: 'species_impact',
    params: { minSeverity: 'high' } as SpeciesImpactParams,
    priority: 'warning',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-volume-default',
    name: 'Hourly Volume Spike',
    description: 'Triggers when more than 8 flights operate in a single hour.',
    triggerType: 'high_volume',
    params: { maxFlightsPerHour: 8 } as HighVolumeParams,
    priority: 'info',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-repeat-default',
    name: 'Repeat Offender',
    description: 'Triggers when an operator accumulates 3+ violations within a 7-day period.',
    triggerType: 'repeat_offender',
    params: { minViolations: 3, periodDays: 7 } as RepeatOffenderParams,
    priority: 'critical',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

// ─── LocalStorage Helpers ───────────────────────────────────────────────────

function loadRulesFromStorage(): AlertRule[] {
  if (typeof window === 'undefined') return DEFAULT_RULES;
  try {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AlertRule[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Corrupted — fall back
  }
  return DEFAULT_RULES;
}

function saveRulesToStorage(rules: AlertRule[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Storage full or unavailable
  }
}

function loadAcknowledgedFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // Corrupted
  }
  return new Set();
}

function saveAcknowledgedToStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage full or unavailable
  }
}

// ─── Alert Evaluation Engine ────────────────────────────────────────────────

function evaluateAlerts(
  flights: Flight[],
  violations: BiodiversityViolation[],
  rules: AlertRule[],
  acknowledgedIds: Set<string>,
): TriggeredAlert[] {
  const alerts: TriggeredAlert[] = [];
  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    switch (rule.triggerType) {
      case 'curfew_violation': {
        const curfewFlights = flights.filter((f) => f.is_curfew_period);
        for (const flight of curfewFlights) {
          const alertId = `alert-${rule.id}-${flight.fa_flight_id}`;
          alerts.push({
            id: alertId,
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
            message: `Curfew period flight: ${flight.ident} at ${flight.operation_hour_et}:00 ET`,
            timestamp: `${flight.operation_date}T${String(flight.operation_hour_et).padStart(2, '0')}:00:00`,
            flightIdent: flight.ident,
            operator: flight.operator || 'Unknown',
            details: `${flight.aircraft_type} (${flight.aircraft_category}) ${flight.direction} on ${flight.operation_date} at ${flight.operation_hour_et}:00 ET during voluntary curfew.`,
            acknowledged: acknowledgedIds.has(alertId),
          });
        }
        break;
      }

      case 'noise_threshold': {
        const params = rule.params as NoiseThresholdParams;
        for (const flight of flights) {
          const profile = getAircraftNoiseProfile(flight.aircraft_type);
          const estimatedDb =
            flight.direction === 'arrival' ? profile.approachDb : profile.takeoffDb;
          if (estimatedDb >= params.minDb) {
            const alertId = `alert-${rule.id}-${flight.fa_flight_id}`;
            alerts.push({
              id: alertId,
              ruleId: rule.id,
              ruleName: rule.name,
              priority: rule.priority,
              message: `${flight.ident} estimated at ${estimatedDb} dB (threshold: ${params.minDb} dB)`,
              timestamp: `${flight.operation_date}T${String(flight.operation_hour_et).padStart(2, '0')}:00:00`,
              flightIdent: flight.ident,
              operator: flight.operator || 'Unknown',
              details: `${flight.aircraft_type} (${flight.aircraft_category}) ${flight.direction}: estimated ${estimatedDb} dB exceeds ${params.minDb} dB threshold by +${estimatedDb - params.minDb} dB.`,
              acknowledged: acknowledgedIds.has(alertId),
            });
          }
        }
        break;
      }

      case 'species_impact': {
        const params = rule.params as SpeciesImpactParams;
        const minOrder = SEVERITY_ORDER[params.minSeverity];
        for (const violation of violations) {
          if (SEVERITY_ORDER[violation.overallSeverity] >= minOrder) {
            const alertId = `alert-${rule.id}-${violation.flightId}`;
            const speciesCount = violation.speciesAffected.length;
            alerts.push({
              id: alertId,
              ruleId: rule.id,
              ruleName: rule.name,
              priority: rule.priority,
              message: `${violation.flightIdent}: ${violation.overallSeverity} impact on ${speciesCount} species`,
              timestamp: `${violation.operationDate}T${String(violation.operationHour).padStart(2, '0')}:00:00`,
              flightIdent: violation.flightIdent,
              operator: violation.operator,
              details: `${violation.aircraftType} (${violation.aircraftCategory}) at ${violation.estimatedNoiseDb} dB. Overall severity: ${violation.overallSeverity}. ${speciesCount} species affected, ${violation.habitatsAffected.length} habitats impacted.`,
              acknowledged: acknowledgedIds.has(alertId),
            });
          }
        }
        break;
      }

      case 'high_volume': {
        const params = rule.params as HighVolumeParams;
        // Group flights by date+hour
        const hourlyGroups: Record<string, Flight[]> = {};
        for (const flight of flights) {
          const key = `${flight.operation_date}-${flight.operation_hour_et}`;
          if (!hourlyGroups[key]) hourlyGroups[key] = [];
          hourlyGroups[key].push(flight);
        }
        for (const [key, group] of Object.entries(hourlyGroups)) {
          if (group.length > params.maxFlightsPerHour) {
            const alertId = `alert-${rule.id}-${key}`;
            const [date, hourStr] = key.split('-').length > 3
              ? [key.substring(0, 10), key.substring(11)]
              : (() => {
                  const parts = key.split('-');
                  const hour = parts.pop()!;
                  return [parts.join('-'), hour];
                })();
            alerts.push({
              id: alertId,
              ruleId: rule.id,
              ruleName: rule.name,
              priority: rule.priority,
              message: `${group.length} flights at ${hourStr}:00 ET on ${date} (max: ${params.maxFlightsPerHour})`,
              timestamp: `${date}T${String(hourStr).padStart(2, '0')}:00:00`,
              operator: undefined,
              flightIdent: undefined,
              details: `${group.length} operations in a single hour exceeds the threshold of ${params.maxFlightsPerHour}. Aircraft: ${group.map((f) => f.ident).slice(0, 5).join(', ')}${group.length > 5 ? ` +${group.length - 5} more` : ''}.`,
              acknowledged: acknowledgedIds.has(alertId),
            });
          }
        }
        break;
      }

      case 'repeat_offender': {
        const params = rule.params as RepeatOffenderParams;
        // Group violations by operator within period
        const operatorViolations: Record<string, BiodiversityViolation[]> = {};
        for (const violation of violations) {
          const op = violation.operator || 'Unknown';
          if (!operatorViolations[op]) operatorViolations[op] = [];
          operatorViolations[op].push(violation);
        }

        for (const [operator, opViolations] of Object.entries(operatorViolations)) {
          if (operator === 'Unknown' || operator === 'Private') continue;
          // Sort by date
          const sorted = [...opViolations].sort(
            (a, b) => a.operationDate.localeCompare(b.operationDate),
          );

          // Sliding window: check if any contiguous period of periodDays has >= minViolations
          if (sorted.length >= params.minViolations) {
            // Simple approach: check if total in the date range meets threshold
            const firstDate = new Date(sorted[0].operationDate);
            const lastDate = new Date(sorted[sorted.length - 1].operationDate);
            const daySpan =
              (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24) + 1;

            // If the date range of loaded flights fits within periodDays, just check count
            // Otherwise, use a sliding window
            if (daySpan <= params.periodDays && sorted.length >= params.minViolations) {
              const alertId = `alert-${rule.id}-${operator.replace(/\s+/g, '_')}`;
              alerts.push({
                id: alertId,
                ruleId: rule.id,
                ruleName: rule.name,
                priority: rule.priority,
                message: `${operator}: ${sorted.length} violations in ${Math.ceil(daySpan)} days`,
                timestamp: sorted[sorted.length - 1].operationDate + 'T00:00:00',
                flightIdent: undefined,
                operator,
                details: `Operator "${operator}" has ${sorted.length} violations within a ${Math.ceil(daySpan)}-day period (threshold: ${params.minViolations} in ${params.periodDays} days). Aircraft types: ${[...new Set(sorted.map((v) => v.aircraftType))].join(', ')}.`,
                acknowledged: acknowledgedIds.has(alertId),
              });
            } else if (daySpan > params.periodDays) {
              // Sliding window check
              for (let i = 0; i < sorted.length; i++) {
                const windowStart = new Date(sorted[i].operationDate);
                const windowEnd = new Date(windowStart);
                windowEnd.setDate(windowEnd.getDate() + params.periodDays);
                const inWindow = sorted.filter((v) => {
                  const d = new Date(v.operationDate);
                  return d >= windowStart && d <= windowEnd;
                });
                if (inWindow.length >= params.minViolations) {
                  const alertId = `alert-${rule.id}-${operator.replace(/\s+/g, '_')}`;
                  alerts.push({
                    id: alertId,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    priority: rule.priority,
                    message: `${operator}: ${inWindow.length} violations in ${params.periodDays} days`,
                    timestamp: sorted[sorted.length - 1].operationDate + 'T00:00:00',
                    flightIdent: undefined,
                    operator,
                    details: `Operator "${operator}" has ${inWindow.length} violations within a ${params.periodDays}-day window starting ${sorted[i].operationDate}. Aircraft types: ${[...new Set(inWindow.map((v) => v.aircraftType))].join(', ')}.`,
                    acknowledged: acknowledgedIds.has(alertId),
                  });
                  break; // One alert per operator
                }
              }
            }
          }
        }
        break;
      }
    }
  }

  // Deduplicate by alert id (keep first occurrence)
  const seen = new Set<string>();
  const deduped: TriggeredAlert[] = [];
  for (const alert of alerts) {
    if (!seen.has(alert.id)) {
      seen.add(alert.id);
      deduped.push(alert);
    }
  }

  // Sort newest first
  return deduped.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── Rule Form Types ────────────────────────────────────────────────────────

interface RuleFormState {
  name: string;
  description: string;
  triggerType: TriggerType;
  priority: AlertPriority;
  enabled: boolean;
  // noise_threshold
  minDb: string;
  // species_impact
  minSeverity: ImpactSeverity;
  // high_volume
  maxFlightsPerHour: string;
  // repeat_offender
  minViolations: string;
  periodDays: string;
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  description: '',
  triggerType: 'curfew_violation',
  priority: 'warning',
  enabled: true,
  minDb: '85',
  minSeverity: 'high',
  maxFlightsPerHour: '8',
  minViolations: '3',
  periodDays: '7',
};

function ruleToForm(rule: AlertRule): RuleFormState {
  const form: RuleFormState = {
    name: rule.name,
    description: rule.description,
    triggerType: rule.triggerType,
    priority: rule.priority,
    enabled: rule.enabled,
    minDb: '85',
    minSeverity: 'high',
    maxFlightsPerHour: '8',
    minViolations: '3',
    periodDays: '7',
  };

  switch (rule.triggerType) {
    case 'noise_threshold': {
      const p = rule.params as NoiseThresholdParams;
      form.minDb = String(p.minDb);
      break;
    }
    case 'species_impact': {
      const p = rule.params as SpeciesImpactParams;
      form.minSeverity = p.minSeverity;
      break;
    }
    case 'high_volume': {
      const p = rule.params as HighVolumeParams;
      form.maxFlightsPerHour = String(p.maxFlightsPerHour);
      break;
    }
    case 'repeat_offender': {
      const p = rule.params as RepeatOffenderParams;
      form.minViolations = String(p.minViolations);
      form.periodDays = String(p.periodDays);
      break;
    }
  }

  return form;
}

function formToRule(form: RuleFormState, existingId?: string): AlertRule {
  let params: TriggerParams;

  switch (form.triggerType) {
    case 'curfew_violation':
      params = {};
      break;
    case 'noise_threshold':
      params = { minDb: parseInt(form.minDb, 10) || 85 } as NoiseThresholdParams;
      break;
    case 'species_impact':
      params = { minSeverity: form.minSeverity } as SpeciesImpactParams;
      break;
    case 'high_volume':
      params = {
        maxFlightsPerHour: parseInt(form.maxFlightsPerHour, 10) || 8,
      } as HighVolumeParams;
      break;
    case 'repeat_offender':
      params = {
        minViolations: parseInt(form.minViolations, 10) || 3,
        periodDays: parseInt(form.periodDays, 10) || 7,
      } as RepeatOffenderParams;
      break;
  }

  return {
    id: existingId ?? `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: form.name.trim(),
    description: form.description.trim(),
    triggerType: form.triggerType,
    params,
    priority: form.priority,
    enabled: form.enabled,
    createdAt: existingId ? '' : new Date().toISOString(), // preserved on edit
  };
}

// ─── Priority Icon Component ────────────────────────────────────────────────

function PriorityIcon({ priority, size = 14 }: { priority: AlertPriority; size?: number }) {
  const config = PRIORITY_CONFIG[priority];
  switch (priority) {
    case 'critical':
      return <AlertCircle size={size} className={config.text} />;
    case 'warning':
      return <AlertTriangle size={size} className={config.text} />;
    case 'info':
      return <Info size={size} className={config.text} />;
  }
}

// ─── Alert Card Component ───────────────────────────────────────────────────

function AlertCard({
  alert,
  onAcknowledge,
}: {
  alert: TriggeredAlert;
  onAcknowledge: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = PRIORITY_CONFIG[alert.priority];
  const TriggerIcon = TRIGGER_TYPE_ICONS[
    // Find the trigger type from rule name match; fall back to info
    (Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).find(
      (t) => alert.ruleName.toLowerCase().includes(TRIGGER_TYPE_LABELS[t].toLowerCase().split(' ')[0].toLowerCase()),
    ) ?? 'curfew_violation'
  ];

  const formattedTime = (() => {
    try {
      const d = new Date(alert.timestamp);
      if (isNaN(d.getTime())) return alert.timestamp;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return alert.timestamp;
    }
  })();

  return (
    <div
      className={`border ${config.border} ${alert.acknowledged ? 'opacity-50' : ''} transition-opacity bg-zinc-100/40 dark:bg-zinc-950/40`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1 ${config.iconBg} flex-shrink-0`}>
            <PriorityIcon priority={alert.priority} size={12} />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                {alert.ruleName}
              </span>
              <span
                className={`text-[8px] px-1.5 py-0.5 ${config.bg} ${config.text} uppercase tracking-wider`}
              >
                {config.label}
              </span>
            </div>
            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5 truncate max-w-[320px]">
              {alert.message}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-600 tabular-nums">
                {formattedTime}
              </span>
              {alert.flightIdent && (
                <>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-700">|</span>
                  <span className="text-[9px] text-zinc-600 dark:text-zinc-500 font-medium">
                    {alert.flightIdent}
                  </span>
                </>
              )}
              {alert.operator && (
                <>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-700">|</span>
                  <span className="text-[9px] text-zinc-600 dark:text-zinc-500">
                    {alert.operator}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!alert.acknowledged && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="text-[9px] px-2 py-1 bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60 transition-colors"
              title="Acknowledge"
            >
              <Check size={10} />
            </button>
          )}
          {alert.acknowledged && (
            <span className="text-[9px] text-zinc-500 dark:text-zinc-600">
              <CheckCheck size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronDown size={10} className="text-zinc-500 dark:text-zinc-600" />
          ) : (
            <ChevronRight size={10} className="text-zinc-500 dark:text-zinc-600" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-2">
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {alert.details}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Rule Form Modal ────────────────────────────────────────────────────────

function RuleFormModal({
  editingRule,
  onSave,
  onClose,
}: {
  editingRule: AlertRule | null;
  onSave: (rule: AlertRule) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RuleFormState>(
    editingRule ? ruleToForm(editingRule) : EMPTY_FORM,
  );

  const updateField = <K extends keyof RuleFormState>(
    field: K,
    value: RuleFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const rule = formToRule(form, editingRule?.id);
    if (editingRule) {
      rule.createdAt = editingRule.createdAt;
    }
    onSave(rule);
  };

  const isValid = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Form Header */}
        <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {editingRule ? 'Edit Alert Rule' : 'New Alert Rule'}
          </h4>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Late Night Helicopter Alert"
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
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
              placeholder="What does this rule monitor..."
              rows={2}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors resize-none"
            />
          </div>

          {/* Trigger Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Trigger Type
              </label>
              <select
                value={form.triggerType}
                onChange={(e) => updateField('triggerType', e.target.value as TriggerType)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-600 transition-colors"
              >
                {(Object.entries(TRIGGER_TYPE_LABELS) as [TriggerType, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value as AlertPriority)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-600 transition-colors"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Trigger-specific parameters */}
          {form.triggerType === 'noise_threshold' && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Minimum Noise Level (dB)
              </label>
              <input
                type="number"
                value={form.minDb}
                onChange={(e) => updateField('minDb', e.target.value)}
                placeholder="e.g. 85"
                min={50}
                max={120}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
              />
              <p className="text-[9px] text-zinc-600 mt-1">
                Triggers when a flight's estimated noise exceeds this dB level.
              </p>
            </div>
          )}

          {form.triggerType === 'species_impact' && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Minimum Impact Severity
              </label>
              <select
                value={form.minSeverity}
                onChange={(e) => updateField('minSeverity', e.target.value as ImpactSeverity)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-600 transition-colors"
              >
                {(['minimal', 'low', 'moderate', 'high', 'critical'] as ImpactSeverity[]).map(
                  (sev) => (
                    <option key={sev} value={sev}>
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </option>
                  ),
                )}
              </select>
              <p className="text-[9px] text-zinc-600 mt-1">
                Triggers on biodiversity violations with severity at or above this level.
              </p>
            </div>
          )}

          {form.triggerType === 'high_volume' && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Max Flights Per Hour
              </label>
              <input
                type="number"
                value={form.maxFlightsPerHour}
                onChange={(e) => updateField('maxFlightsPerHour', e.target.value)}
                placeholder="e.g. 8"
                min={1}
                max={100}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
              />
              <p className="text-[9px] text-zinc-600 mt-1">
                Triggers when more than this many flights occur in a single hour.
              </p>
            </div>
          )}

          {form.triggerType === 'repeat_offender' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Min Violations
                </label>
                <input
                  type="number"
                  value={form.minViolations}
                  onChange={(e) => updateField('minViolations', e.target.value)}
                  placeholder="e.g. 3"
                  min={1}
                  max={100}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Period (Days)
                </label>
                <input
                  type="number"
                  value={form.periodDays}
                  onChange={(e) => updateField('periodDays', e.target.value)}
                  placeholder="e.g. 7"
                  min={1}
                  max={365}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              <p className="col-span-2 text-[9px] text-zinc-600">
                Triggers when an operator has this many violations within the specified number of days.
              </p>
            </div>
          )}

          {form.triggerType === 'curfew_violation' && (
            <div className="px-3 py-2.5 bg-zinc-100/40 dark:bg-zinc-800/40 border border-zinc-300/40 dark:border-zinc-700/40">
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 leading-relaxed">
                No additional parameters needed. This rule triggers on any flight operating during
                the voluntary curfew period (8 PM - 8 AM ET).
              </p>
            </div>
          )}

          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateField('enabled', !form.enabled)}
              className={`w-8 h-4.5 rounded-full transition-colors relative flex-shrink-0 ${
                form.enabled ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  form.enabled ? 'left-4' : 'left-0.5'
                }`}
              />
            </button>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {form.enabled ? 'Rule enabled' : 'Rule disabled'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300/40 dark:border-zinc-700/40 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-4 py-2 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Summary Bar Component ────────────────────────────────────────────

function AlertSummaryBar({ alerts }: { alerts: TriggeredAlert[] }) {
  const total = alerts.length;
  if (total === 0) return null;

  const byCritical = alerts.filter((a) => a.priority === 'critical').length;
  const byWarning = alerts.filter((a) => a.priority === 'warning').length;
  const byInfo = alerts.filter((a) => a.priority === 'info').length;

  // Top triggered rule
  const ruleCountMap: Record<string, number> = {};
  for (const alert of alerts) {
    ruleCountMap[alert.ruleName] = (ruleCountMap[alert.ruleName] || 0) + 1;
  }
  const topRule = Object.entries(ruleCountMap).sort((a, b) => b[1] - a[1])[0];

  // Most flagged operator
  const operatorCountMap: Record<string, number> = {};
  for (const alert of alerts) {
    if (alert.operator && alert.operator !== 'Unknown') {
      operatorCountMap[alert.operator] = (operatorCountMap[alert.operator] || 0) + 1;
    }
  }
  const topOperator = Object.entries(operatorCountMap).sort((a, b) => b[1] - a[1])[0];

  const segments = [
    { priority: 'critical' as AlertPriority, count: byCritical, color: '#dc2626' },
    { priority: 'warning' as AlertPriority, count: byWarning, color: '#d97706' },
    { priority: 'info' as AlertPriority, count: byInfo, color: '#2563eb' },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-3">
      {/* Priority distribution bar */}
      <div className="space-y-1.5">
        <div className="flex h-2 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
          {segments.map(({ priority, count, color }) => (
            <div
              key={priority}
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: color,
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map(({ priority, count, color }) => (
            <div key={priority} className="flex items-center gap-1.5">
              <div className="w-2 h-2" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-zinc-500 capitalize">{priority}</span>
              <span className="text-[9px] text-zinc-400 tabular-nums font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-px bg-zinc-200/60 dark:bg-zinc-800/60">
        <div className="bg-white dark:bg-zinc-900 px-3 py-2.5">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Total</div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{total}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-3 py-2.5">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Critical</div>
          <div className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums">{byCritical}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-3 py-2.5">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-0.5 truncate" title="Top Rule">Top Rule</div>
          <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 truncate" title={topRule ? topRule[0] : '-'}>
            {topRule ? topRule[0] : '-'}
          </div>
          {topRule && (
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 tabular-nums">{topRule[1]}x</div>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 px-3 py-2.5">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-0.5 truncate" title="Top Operator">Top Operator</div>
          <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 truncate" title={topOperator ? topOperator[0] : '-'}>
            {topOperator ? topOperator[0] : '-'}
          </div>
          {topOperator && (
            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 tabular-nums">{topOperator[1]}x</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AlertNotificationSystem() {
  const flights = useFlightStore((s) => s.flights);
  const thresholds = useFlightStore((s) => s.thresholds);

  // Alert rules state (persisted to localStorage)
  const [rules, setRules] = useState<AlertRule[]>(() => loadRulesFromStorage());
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(
    () => loadAcknowledgedFromStorage(),
  );

  // UI state
  const [bellExpanded, setBellExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'rules'>('feed');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<AlertPriority | 'all'>('all');
  const [triggerFilter, setTriggerFilter] = useState<TriggerType | 'all'>('all');
  const [ackFilter, setAckFilter] = useState<'all' | 'unacknowledged' | 'acknowledged'>('all');

  // Compute violations from store
  const violations = useMemo(
    () => evaluateAllFlights(flights, thresholds),
    [flights, thresholds],
  );

  // Evaluate alerts
  const allAlerts = useMemo(
    () => evaluateAlerts(flights, violations, rules, acknowledgedIds),
    [flights, violations, rules, acknowledgedIds],
  );

  const unacknowledgedCount = useMemo(
    () => allAlerts.filter((a) => !a.acknowledged).length,
    [allAlerts],
  );

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let result = allAlerts;

    if (priorityFilter !== 'all') {
      result = result.filter((a) => a.priority === priorityFilter);
    }

    if (triggerFilter !== 'all') {
      // Match by ruleId to trigger type
      const triggerRuleIds = new Set(
        rules.filter((r) => r.triggerType === triggerFilter).map((r) => r.id),
      );
      result = result.filter((a) => triggerRuleIds.has(a.ruleId));
    }

    if (ackFilter === 'unacknowledged') {
      result = result.filter((a) => !a.acknowledged);
    } else if (ackFilter === 'acknowledged') {
      result = result.filter((a) => a.acknowledged);
    }

    return result;
  }, [allAlerts, priorityFilter, triggerFilter, ackFilter, rules]);

  // Persist rules
  const persistRules = useCallback((newRules: AlertRule[]) => {
    setRules(newRules);
    saveRulesToStorage(newRules);
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(
    (id: string) => {
      setAcknowledgedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        saveAcknowledgedToStorage(next);
        return next;
      });
    },
    [],
  );

  // Acknowledge all
  const acknowledgeAll = useCallback(() => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      for (const alert of allAlerts) {
        next.add(alert.id);
      }
      saveAcknowledgedToStorage(next);
      return next;
    });
  }, [allAlerts]);

  // Rule CRUD
  const handleSaveRule = useCallback(
    (rule: AlertRule) => {
      const existing = rules.find((r) => r.id === rule.id);
      if (existing) {
        persistRules(rules.map((r) => (r.id === rule.id ? rule : r)));
      } else {
        persistRules([...rules, rule]);
      }
      setShowRuleForm(false);
      setEditingRule(null);
    },
    [rules, persistRules],
  );

  const handleDeleteRule = useCallback(
    (id: string) => {
      persistRules(rules.filter((r) => r.id !== id));
    },
    [rules, persistRules],
  );

  const handleToggleRule = useCallback(
    (id: string) => {
      persistRules(
        rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
      );
    },
    [rules, persistRules],
  );

  const openNewRule = () => {
    setEditingRule(null);
    setShowRuleForm(true);
  };

  const openEditRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setShowRuleForm(true);
  };

  const tabs = [
    { key: 'feed' as const, label: 'Alert Feed' },
    { key: 'rules' as const, label: 'Rules' },
  ];

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
      {/* ─── Notification Bell Header ─────────────────────────────── */}
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBellExpanded(!bellExpanded)}
              className="relative bg-zinc-200/60 dark:bg-zinc-800/60 p-2 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60 transition-colors"
            >
              {unacknowledgedCount > 0 ? (
                <Bell size={18} className="text-amber-400" />
              ) : (
                <BellOff size={18} className="text-zinc-500" />
              )}
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-red-600 rounded-full tabular-nums">
                  {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
                </span>
              )}
            </button>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Alert Notification System
              </h3>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
                {allAlerts.length} alerts total, {unacknowledgedCount} unacknowledged
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unacknowledgedCount > 0 && (
              <button
                onClick={acknowledgeAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border border-zinc-300/40 dark:border-zinc-700/40 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <CheckCheck size={10} />
                Acknowledge All
              </button>
            )}
            <button
              onClick={openNewRule}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-medium hover:bg-blue-500 transition-colors"
            >
              <Plus size={10} />
              New Rule
            </button>
          </div>
        </div>
      </div>

      {/* ─── Alert Summary Bar ────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <AlertSummaryBar alerts={allAlerts} />
        {allAlerts.length === 0 && (
          <div className="text-center py-2">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-600">
              No alerts triggered for current flights and rules.
            </p>
          </div>
        )}
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-zinc-200/60 dark:border-zinc-800/60">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
              activeTab === key
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400 bg-amber-100/10 dark:bg-amber-950/10'
                : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30'
            }`}
          >
            {label}
            {key === 'feed' && unacknowledgedCount > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 tabular-nums">
                {unacknowledgedCount}
              </span>
            )}
            {key === 'rules' && (
              <span className="ml-1.5 text-[9px] text-zinc-500 dark:text-zinc-600 tabular-nums">
                {rules.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="p-5">
        {/* ──── Alert Feed Tab ──────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter size={10} className="text-zinc-500 dark:text-zinc-600" />
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Priority:</span>
                <div className="flex gap-1">
                  {(['all', 'critical', 'warning', 'info'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                        priorityFilter === p
                          ? p === 'all'
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                            : `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].text}`
                          : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
                      }`}
                    >
                      {p === 'all' ? 'All' : PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Type:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTriggerFilter('all')}
                    className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      triggerFilter === 'all'
                        ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                        : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
                    }`}
                  >
                    All
                  </button>
                  {(Object.entries(TRIGGER_TYPE_LABELS) as [TriggerType, string][]).map(
                    ([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setTriggerFilter(type)}
                        className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          triggerFilter === type
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                            : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">Status:</span>
                <div className="flex gap-1">
                  {(['all', 'unacknowledged', 'acknowledged'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setAckFilter(s)}
                      className={`px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                        ackFilter === s
                          ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                          : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-zinc-200/30 dark:bg-zinc-800/30'
                      }`}
                    >
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alert list */}
            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-zinc-500 dark:text-zinc-600">
                {allAlerts.length === 0
                  ? 'No alerts triggered for the current data and rules.'
                  : 'No alerts match the current filters.'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {filteredAlerts.slice(0, 100).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                  />
                ))}
                {filteredAlerts.length > 100 && (
                  <div className="text-center text-[10px] text-zinc-500 dark:text-zinc-600 py-2">
                    Showing 100 of {filteredAlerts.length} alerts
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ──── Rules Tab ───────────────────────────────────────── */}
        {activeTab === 'rules' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-600 dark:text-zinc-500 leading-relaxed">
                Alert rules define conditions that trigger notifications. Each rule
                evaluates flights and violations to generate alerts.
              </p>
            </div>

            <div className="text-[9px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
              {rules.length} Rules | {rules.filter((r) => r.enabled).length} Active
            </div>

            <div className="space-y-2">
              {rules.map((rule) => {
                const config = PRIORITY_CONFIG[rule.priority];
                const TriggerIcon = TRIGGER_TYPE_ICONS[rule.triggerType];
                const alertCount = allAlerts.filter((a) => a.ruleId === rule.id).length;

                return (
                  <div
                    key={rule.id}
                    className={`border bg-white/40 dark:bg-zinc-900/40 px-3 py-2.5 group ${
                      rule.enabled
                        ? 'border-zinc-200/60 dark:border-zinc-800/60'
                        : 'border-zinc-200/30 dark:border-zinc-800/30 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={`w-7 h-4 rounded-full transition-colors relative flex-shrink-0 ${
                            rule.enabled ? 'bg-emerald-600' : 'bg-zinc-700'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              rule.enabled ? 'left-3.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <TriggerIcon size={12} className="text-zinc-500 dark:text-zinc-500" />
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                          {rule.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 ${config.bg} ${config.text} uppercase tracking-wider`}
                        >
                          {config.label}
                        </span>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                          {TRIGGER_TYPE_LABELS[rule.triggerType]}
                        </span>
                        <span
                          className={`text-[10px] tabular-nums font-medium ${
                            alertCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-600'
                          }`}
                        >
                          {alertCount} alerts
                        </span>
                        <button
                          onClick={() => openEditRule(rule)}
                          className="text-zinc-500 dark:text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit rule"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-zinc-500 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete rule"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 leading-relaxed">
                      {rule.description}
                    </p>
                    {/* Show parameters */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {rule.triggerType === 'noise_threshold' && (
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                          Min: {(rule.params as NoiseThresholdParams).minDb} dB
                        </span>
                      )}
                      {rule.triggerType === 'species_impact' && (
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5 capitalize">
                          Min Severity: {(rule.params as SpeciesImpactParams).minSeverity}
                        </span>
                      )}
                      {rule.triggerType === 'high_volume' && (
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                          Max: {(rule.params as HighVolumeParams).maxFlightsPerHour} flights/hr
                        </span>
                      )}
                      {rule.triggerType === 'repeat_offender' && (
                        <>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                            Min: {(rule.params as RepeatOffenderParams).minViolations} violations
                          </span>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/60 px-1.5 py-0.5">
                            Period: {(rule.params as RepeatOffenderParams).periodDays} days
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Rule Form Modal ──────────────────────────────────────── */}
      {showRuleForm && (
        <RuleFormModal
          editingRule={editingRule}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleForm(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}
