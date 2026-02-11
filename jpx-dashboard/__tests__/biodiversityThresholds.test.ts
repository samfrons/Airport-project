import { getHighestSeverity, severityIsAtLeast } from '@/types/biodiversityThresholds';
import type { ImpactSeverity } from '@/types/biodiversity';

describe('getHighestSeverity', () => {
  it('returns critical when critical is present', () => {
    expect(getHighestSeverity(['low', 'critical', 'moderate'])).toBe('critical');
  });

  it('returns high when no critical', () => {
    expect(getHighestSeverity(['low', 'high', 'moderate'])).toBe('high');
  });

  it('returns moderate when no high or critical', () => {
    expect(getHighestSeverity(['low', 'moderate', 'minimal'])).toBe('moderate');
  });

  it('returns low when only low and minimal', () => {
    expect(getHighestSeverity(['low', 'minimal'])).toBe('low');
  });

  it('returns minimal for single minimal', () => {
    expect(getHighestSeverity(['minimal'])).toBe('minimal');
  });

  it('returns minimal for empty array', () => {
    expect(getHighestSeverity([])).toBe('minimal');
  });
});

describe('severityIsAtLeast', () => {
  it('critical is at least critical', () => {
    expect(severityIsAtLeast('critical', 'critical')).toBe(true);
  });

  it('critical is at least low', () => {
    expect(severityIsAtLeast('critical', 'low')).toBe(true);
  });

  it('low is not at least high', () => {
    expect(severityIsAtLeast('low', 'high')).toBe(false);
  });

  it('minimal is not at least moderate', () => {
    expect(severityIsAtLeast('minimal', 'moderate')).toBe(false);
  });

  it('moderate is at least moderate', () => {
    expect(severityIsAtLeast('moderate', 'moderate')).toBe(true);
  });

  it('high is at least low', () => {
    expect(severityIsAtLeast('high', 'low')).toBe(true);
  });
});
