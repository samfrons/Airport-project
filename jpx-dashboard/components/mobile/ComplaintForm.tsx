'use client';

import { useState } from 'react';
import { ArrowLeft, Check, MapPin, Clock } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { NoiseDbBadge } from './shared/NoiseDbBadge';
import { TypeChip } from './shared/TypeChip';
import { getNoiseDb } from '@/lib/noise/getNoiseDb';
import type { Flight } from '@/types/flight';

interface ComplaintFormProps {
  flight?: Flight | null;
  onBack: () => void;
  onSubmit: (data: ComplaintData) => void;
}

export interface ComplaintData {
  // Contact info
  name: string;
  email: string;
  phone: string;
  address: string;

  // Complaint details
  date: string;
  time: string;
  description: string;
  noiseLevel: 'low' | 'moderate' | 'loud' | 'very_loud';
  disturbanceType: string[];

  // Flight info (if linked)
  flightId?: number;
  registration?: string;
  operator?: string;
  aircraftType?: string;
}

const DISTURBANCE_TYPES = [
  'Sleep disruption',
  'Conversation interference',
  'Work disruption',
  'Vibration/shaking',
  'Pet distress',
  'Health impact',
  'Other',
];

export function ComplaintForm({ flight, onBack, onSubmit }: ComplaintFormProps) {
  const now = new Date();
  const [formData, setFormData] = useState<ComplaintData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().slice(0, 5),
    description: '',
    noiseLevel: 'loud',
    disturbanceType: [],
    flightId: flight?.id,
    registration: flight?.registration || flight?.ident,
    operator: flight?.operator,
    aircraftType: flight?.aircraft_type,
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof ComplaintData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDisturbance = (type: string) => {
    setFormData(prev => ({
      ...prev,
      disturbanceType: prev.disturbanceType.includes(type)
        ? prev.disturbanceType.filter(t => t !== type)
        : [...prev.disturbanceType, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    onSubmit(formData);
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-full">
        <MobileHeader title="Complaint Submitted" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">
            Thank You
          </h2>
          <p className="text-sm text-secondary mb-6">
            Your noise complaint has been recorded. A confirmation has been sent to {formData.email}.
          </p>
          <p className="text-xs text-tertiary mb-8">
            Complaint Reference: JPX-{Date.now().toString(36).toUpperCase()}
          </p>
          <button
            onClick={onBack}
            className="bg-[#1A6B72] text-white px-6 py-3 text-sm font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header with back button */}
      <div className="bg-[#1F3864] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-white p-1 -ml-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[13px] font-extrabold text-white">
            File Noise Complaint
          </h1>
          <p className="text-[10px] text-white/60">
            All fields help strengthen your report
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        {/* Linked flight info */}
        {flight && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
            <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-2">
              LINKED FLIGHT
            </div>
            <div className="flex items-center gap-3">
              <NoiseDbBadge db={getNoiseDb(flight)} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary">
                    {flight.registration || flight.ident}
                  </span>
                  <TypeChip category={flight.aircraft_category} />
                </div>
                <div className="text-[10px] text-tertiary">
                  {flight.operator || 'Unknown operator'} · {flight.operation_date}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Auto-filled time section */}
          <div className="bg-raised p-3">
            <div className="flex items-center gap-2 text-[10px] text-tertiary mb-2">
              <Clock size={12} />
              <span>Date & Time (auto-filled, adjust if needed)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={formData.date}
                onChange={e => handleChange('date', e.target.value)}
                className="bg-surface border border-subtle px-3 py-2 text-sm text-primary"
                required
              />
              <input
                type="time"
                value={formData.time}
                onChange={e => handleChange('time', e.target.value)}
                className="bg-surface border border-subtle px-3 py-2 text-sm text-primary"
                required
              />
            </div>
          </div>

          {/* Contact info */}
          <div>
            <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
              Your Contact Info
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name *"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className="w-full bg-surface border border-subtle px-3 py-2.5 text-sm text-primary placeholder:text-muted"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full bg-surface border border-subtle px-3 py-2.5 text-sm text-primary placeholder:text-muted"
                required
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full bg-surface border border-subtle px-3 py-2.5 text-sm text-primary placeholder:text-muted"
              />
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-3 text-muted" />
                <input
                  type="text"
                  placeholder="Your Address *"
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                  className="w-full bg-surface border border-subtle pl-9 pr-3 py-2.5 text-sm text-primary placeholder:text-muted"
                  required
                />
              </div>
            </div>
          </div>

          {/* Noise level */}
          <div>
            <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
              How Loud Was It?
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'low', label: 'Low', color: '#84CC16' },
                { value: 'moderate', label: 'Moderate', color: '#EAB308' },
                { value: 'loud', label: 'Loud', color: '#F97316' },
                { value: 'very_loud', label: 'Very Loud', color: '#EF4444' },
              ].map(level => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleChange('noiseLevel', level.value)}
                  className={`py-2 text-[10px] font-bold border transition-colors ${
                    formData.noiseLevel === level.value
                      ? 'text-white'
                      : 'bg-surface text-tertiary border-subtle'
                  }`}
                  style={{
                    backgroundColor: formData.noiseLevel === level.value ? level.color : undefined,
                    borderColor: formData.noiseLevel === level.value ? level.color : undefined,
                  }}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Disturbance type */}
          <div>
            <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
              Type of Disturbance (select all that apply)
            </div>
            <div className="flex flex-wrap gap-2">
              {DISTURBANCE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleDisturbance(type)}
                  className={`px-3 py-1.5 text-[10px] font-semibold border transition-colors ${
                    formData.disturbanceType.includes(type)
                      ? 'bg-[#1A6B72] text-white border-[#1A6B72]'
                      : 'bg-surface text-tertiary border-subtle'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
              Additional Details
            </div>
            <textarea
              placeholder="Describe the noise incident and its impact on you..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={4}
              className="w-full bg-surface border border-subtle px-3 py-2.5 text-sm text-primary placeholder:text-muted resize-none"
            />
          </div>

          {/* Privacy note */}
          <div className="text-[9px] text-muted leading-relaxed">
            Your complaint will be submitted to the Wainscott Citizens Advisory Committee
            and may be shared with East Hampton Town officials. Your contact information
            will be kept confidential and used only to follow up on your complaint.
          </div>
        </div>

        {/* Submit button */}
        <div className="p-4 border-t border-subtle">
          <button
            type="submit"
            disabled={submitting || !formData.name || !formData.email || !formData.address}
            className="w-full bg-red-600 text-white py-3 text-[13px] font-extrabold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : '📢 Submit Complaint'}
          </button>
        </div>
      </form>
    </div>
  );
}
