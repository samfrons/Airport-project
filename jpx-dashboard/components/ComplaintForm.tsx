'use client';

import { useState, useCallback } from 'react';
import { MessageSquarePlus, MapPin, Send, CheckCircle, X } from 'lucide-react';
import { useFlightStore } from '@/store/flightStore';
import type { NoiseComplaint, ComplaintCategory } from '@/types/noise';

const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'helicopter', label: 'Helicopter Noise' },
  { value: 'jet', label: 'Jet Noise' },
  { value: 'low_flying', label: 'Low Flying Aircraft' },
  { value: 'early_morning', label: 'Early Morning Disturbance' },
  { value: 'late_night', label: 'Late Night Disturbance' },
  { value: 'frequency', label: 'Too Many Flights' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS = [
  { value: 1 as const, label: 'Minor', desc: 'Barely noticeable' },
  { value: 2 as const, label: 'Moderate', desc: 'Noticeable indoors' },
  { value: 3 as const, label: 'Significant', desc: 'Disruptive to activities' },
  { value: 4 as const, label: 'Severe', desc: 'Conversation impossible' },
  { value: 5 as const, label: 'Extreme', desc: 'Intolerable, causes distress' },
];

const NEIGHBORHOODS = [
  'Wainscott',
  'Northwest Woods',
  'Springs',
  'East Hampton Village',
  'Amagansett',
  'Sagaponack',
  'Bridgehampton',
  'Sag Harbor',
  'Montauk',
  'Other',
];

// KJPX area center for default complaint location
const DEFAULT_LAT = 40.9594;
const DEFAULT_LNG = -72.2518;

const STORAGE_KEY = 'jpx-noise-complaints-submitted';

function loadSubmittedComplaints(): NoiseComplaint[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveComplaint(complaint: NoiseComplaint) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadSubmittedComplaints();
    existing.unshift(complaint);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch {
    // Storage full
  }
}

export function ComplaintForm() {
  const addComplaint = useFlightStore((s) => s.setNoiseComplaints);
  const existingComplaints = useFlightStore((s) => s.noiseComplaints);

  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState<ComplaintCategory>('helicopter');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [neighborhood, setNeighborhood] = useState('Wainscott');
  const [description, setDescription] = useState('');

  const [recentComplaints] = useState(() => loadSubmittedComplaints());

  const handleSubmit = useCallback(() => {
    const complaint: NoiseComplaint = {
      id: `complaint-${Date.now()}`,
      timestamp: new Date().toISOString(),
      location: {
        lat: DEFAULT_LAT + (Math.random() - 0.5) * 0.02,
        lng: DEFAULT_LNG + (Math.random() - 0.5) * 0.02,
        neighborhood,
      },
      severity,
      category,
      description: description.trim() || undefined,
    };

    // Add to store (appears on map)
    addComplaint([...existingComplaints, complaint]);

    // Persist locally
    saveComplaint(complaint);

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDescription('');
      setIsOpen(false);
    }, 2000);
  }, [category, severity, neighborhood, description, addComplaint, existingComplaints]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5">
              <MessageSquarePlus size={16} className="text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Community Noise Reports</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Submit noise complaints — {existingComplaints.length} reports on file
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
              isOpen
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isOpen ? <X size={10} /> : <MessageSquarePlus size={10} />}
            {isOpen ? 'Close' : 'New Report'}
          </button>
        </div>
      </div>

      {/* Form */}
      {isOpen && (
        <div className="p-5 space-y-4">
          {submitted ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle size={32} className="text-emerald-500 dark:text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Report Submitted</p>
              <p className="text-[11px] text-zinc-500">
                Your complaint has been recorded and will appear on the noise map.
              </p>
            </div>
          ) : (
            <>
              {/* Category + Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-600"
                  >
                    {COMPLAINT_CATEGORIES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Neighborhood
                  </label>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-600"
                  >
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Severity
                </label>
                <div className="flex gap-1">
                  {SEVERITY_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setSeverity(value)}
                      className={`flex-1 py-2 text-center transition-colors ${
                        severity === value
                          ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40'
                          : 'bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-500 border border-zinc-300/40 dark:border-zinc-700/40 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      <div className="text-[11px] font-medium">{value}</div>
                      <div className="text-[8px] mt-0.5 opacity-70">{label}</div>
                    </button>
                  ))}
                </div>
                <div className="text-[9px] text-zinc-600 mt-1">
                  {SEVERITY_OPTIONS.find((s) => s.value === severity)?.desc}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Description <span className="text-zinc-700">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you heard, when, and how it affected you..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 resize-none"
                />
                <div className="text-[9px] text-zinc-500 dark:text-zinc-700 text-right mt-0.5">
                  {description.length}/500
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
              >
                <Send size={12} />
                Submit Noise Report
              </button>
            </>
          )}
        </div>
      )}

      {/* Recent complaints summary */}
      {!isOpen && recentComplaints.length > 0 && (
        <div className="px-5 py-3">
          <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">
            Your Recent Reports ({recentComplaints.length})
          </div>
          <div className="space-y-1">
            {recentComplaints.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-2 py-1.5 bg-zinc-100/40 dark:bg-zinc-950/40"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={9} className="text-zinc-600" />
                  <span className="text-[10px] text-zinc-400 capitalize">
                    {c.category.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] text-zinc-600">·</span>
                  <span className="text-[10px] text-zinc-500">
                    {c.location.neighborhood}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-zinc-600 tabular-nums">
                    Severity {c.severity}/5
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
