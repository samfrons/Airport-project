/**
 * What-If Scenario Simulator
 *
 * Allows users to simulate the impact of policy changes on noise exposure:
 * - "What if helicopters flew 500ft higher?"
 * - "What if curfew started at 7pm instead of 8pm?"
 * - "What if jets were banned?"
 *
 * Uses the existing noise calculation engine to recalculate impacts.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  type: 'altitude' | 'curfew' | 'ban' | 'custom';
  params: {
    altitudeChange?: number; // feet
    curfewStartHour?: number; // 0-23
    curfewEndHour?: number; // 0-23
    bannedTypes?: ('helicopter' | 'jet' | 'fixed_wing')[];
  };
}

interface ScenarioResult {
  scenarioId: string;
  current: {
    totalFlights: number;
    totalDbSeconds: number;
    avgMaxDb: number;
    curfewViolations: number;
    loudEvents: number;
  };
  simulated: {
    totalFlights: number;
    totalDbSeconds: number;
    avgMaxDb: number;
    curfewViolations: number;
    loudEvents: number;
  };
  changes: {
    flightsChange: number;
    dbSecondsChange: number;
    dbSecondsPercent: number;
    avgDbChange: number;
    curfewChange: number;
    loudEventsChange: number;
  };
  affectedOperators: string[];
}

interface WhatIfSimulatorProps {
  className?: string;
  dateRange?: { start: string; end: string };
  onScenarioApply?: (scenario: ScenarioConfig) => void;
}

// ─── Preset Scenarios ───────────────────────────────────────────────────────

const PRESET_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'altitude-500',
    name: 'Helicopters +500ft',
    description: 'What if all helicopters flew 500 feet higher?',
    type: 'altitude',
    params: { altitudeChange: 500 },
  },
  {
    id: 'altitude-1000',
    name: 'All Aircraft +1000ft',
    description: 'What if all aircraft flew 1000 feet higher?',
    type: 'altitude',
    params: { altitudeChange: 1000 },
  },
  {
    id: 'curfew-7pm',
    name: 'Curfew at 7 PM',
    description: 'What if the voluntary curfew started at 7 PM instead of 8 PM?',
    type: 'curfew',
    params: { curfewStartHour: 19, curfewEndHour: 8 },
  },
  {
    id: 'curfew-6pm',
    name: 'Curfew at 6 PM',
    description: 'What if the voluntary curfew started at 6 PM?',
    type: 'curfew',
    params: { curfewStartHour: 18, curfewEndHour: 8 },
  },
  {
    id: 'ban-helicopters',
    name: 'Ban Helicopters',
    description: 'What if helicopters were banned from the airport?',
    type: 'ban',
    params: { bannedTypes: ['helicopter'] },
  },
  {
    id: 'ban-jets',
    name: 'Ban Jets',
    description: 'What if jet aircraft were banned?',
    type: 'ban',
    params: { bannedTypes: ['jet'] },
  },
];

// ─── Mock Simulation Engine ─────────────────────────────────────────────────

function simulateScenario(scenario: ScenarioConfig): ScenarioResult {
  // Current baseline (mock data - would come from actual flight data)
  const current = {
    totalFlights: 847,
    totalDbSeconds: 4250000,
    avgMaxDb: 78.5,
    curfewViolations: 42,
    loudEvents: 127,
  };

  let simulated = { ...current };
  let affectedOperators: string[] = [];

  switch (scenario.type) {
    case 'altitude':
      // Each 1000ft of altitude reduces noise by ~6 dB
      // dB-seconds scale with dB levels
      const altChange = scenario.params.altitudeChange || 0;
      const dbReduction = (altChange / 1000) * 6;
      const dbSecondsReduction = 1 - Math.pow(10, -dbReduction / 10);

      simulated.totalDbSeconds = Math.round(current.totalDbSeconds * (1 - dbSecondsReduction));
      simulated.avgMaxDb = Math.round((current.avgMaxDb - dbReduction) * 10) / 10;
      simulated.loudEvents = Math.round(current.loudEvents * (1 - dbSecondsReduction * 1.5));
      affectedOperators = ['All operators'];
      break;

    case 'curfew':
      // Earlier curfew affects more flights
      const currentCurfew = 20; // 8 PM
      const newCurfew = scenario.params.curfewStartHour || 20;
      const additionalHours = currentCurfew - newCurfew;

      // Assume 5% of flights per hour in evening
      const additionalViolations = Math.round(current.totalFlights * 0.05 * additionalHours);
      simulated.curfewViolations = current.curfewViolations + additionalViolations;
      affectedOperators = ['BLADE', 'HeliJets Aviation', 'NetJets', 'Charter One'];
      break;

    case 'ban':
      const bannedTypes = scenario.params.bannedTypes || [];

      if (bannedTypes.includes('helicopter')) {
        // Helicopters are ~35% of flights but ~50% of noise impact
        simulated.totalFlights = Math.round(current.totalFlights * 0.65);
        simulated.totalDbSeconds = Math.round(current.totalDbSeconds * 0.50);
        simulated.loudEvents = Math.round(current.loudEvents * 0.40);
        affectedOperators = ['BLADE', 'HeliJets Aviation', 'Sound Helicopters'];
      }

      if (bannedTypes.includes('jet')) {
        // Jets are ~40% of flights but ~35% of noise impact
        simulated.totalFlights = Math.round(current.totalFlights * 0.60);
        simulated.totalDbSeconds = Math.round(current.totalDbSeconds * 0.65);
        simulated.curfewViolations = Math.round(current.curfewViolations * 0.50);
        affectedOperators = ['NetJets', 'Wheels Up', 'Flexjet', 'XO Jet'];
      }
      break;
  }

  return {
    scenarioId: scenario.id,
    current,
    simulated,
    changes: {
      flightsChange: simulated.totalFlights - current.totalFlights,
      dbSecondsChange: simulated.totalDbSeconds - current.totalDbSeconds,
      dbSecondsPercent: Math.round(((simulated.totalDbSeconds - current.totalDbSeconds) / current.totalDbSeconds) * 100),
      avgDbChange: Math.round((simulated.avgMaxDb - current.avgMaxDb) * 10) / 10,
      curfewChange: simulated.curfewViolations - current.curfewViolations,
      loudEventsChange: simulated.loudEvents - current.loudEvents,
    },
    affectedOperators,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WhatIfSimulator({
  className = '',
  dateRange,
  onScenarioApply,
}: WhatIfSimulatorProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioConfig | null>(null);
  const [customAltitude, setCustomAltitude] = useState(500);
  const [customCurfewHour, setCustomCurfewHour] = useState(19);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Run simulation when scenario changes
  const result = useMemo(() => {
    if (!selectedScenario) return null;
    return simulateScenario(selectedScenario);
  }, [selectedScenario]);

  // Handle preset selection
  const handlePresetSelect = useCallback((scenario: ScenarioConfig) => {
    setSelectedScenario(scenario);
    setIsCustomMode(false);
  }, []);

  // Handle custom scenario
  const handleCustomScenario = useCallback(() => {
    const customScenario: ScenarioConfig = {
      id: 'custom',
      name: `Custom (+${customAltitude}ft, ${customCurfewHour}:00 curfew)`,
      description: 'Custom scenario configuration',
      type: 'custom',
      params: {
        altitudeChange: customAltitude,
        curfewStartHour: customCurfewHour,
      },
    };
    setSelectedScenario(customScenario);
    setIsCustomMode(true);
  }, [customAltitude, customCurfewHour]);

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const formatNumber = (num: number): string => {
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const renderChangeIndicator = (value: number, unit: string = '', inverse: boolean = false) => {
    const isPositive = value > 0;
    const isBetter = inverse ? isPositive : !isPositive;
    const color = value === 0 ? 'text-gray-400' : isBetter ? 'text-green-400' : 'text-red-400';
    const sign = value > 0 ? '+' : '';

    return (
      <span className={color}>
        {sign}{formatNumber(value)}{unit}
      </span>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div className={`bg-gray-900 border border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">
          What-If Scenario Simulator
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Simulate the impact of policy changes on noise exposure
        </p>
      </div>

      <div className="p-4">
        {/* Preset Scenarios */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Select a Scenario
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PRESET_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handlePresetSelect(scenario)}
                className={`p-3 text-left transition-colors
                  ${selectedScenario?.id === scenario.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                <div className="font-medium text-sm">{scenario.name}</div>
                <div className="text-xs opacity-70 mt-1">
                  {scenario.description.slice(0, 50)}...
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Configuration */}
        <div className="mb-6 p-4 bg-gray-800">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Custom Scenario
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Altitude Increase (ft)
              </label>
              <input
                type="range"
                min="0"
                max="2000"
                step="100"
                value={customAltitude}
                onChange={(e) => setCustomAltitude(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-white mt-1">+{customAltitude} ft</div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Curfew Start Time
              </label>
              <select
                value={customCurfewHour}
                onChange={(e) => setCustomCurfewHour(parseInt(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 border border-gray-600"
              >
                {[16, 17, 18, 19, 20, 21, 22].map((hour) => (
                  <option key={hour} value={hour}>
                    {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCustomScenario}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm hover:bg-blue-500"
          >
            Run Custom Scenario
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="border border-gray-700">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <h4 className="font-medium text-white">
                {selectedScenario?.name}
              </h4>
              <p className="text-sm text-gray-400">
                {selectedScenario?.description}
              </p>
            </div>

            <div className="p-4">
              {/* Comparison Table */}
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left py-2">Metric</th>
                    <th className="text-right py-2">Current</th>
                    <th className="text-right py-2">Simulated</th>
                    <th className="text-right py-2">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="py-2 text-gray-300">Total Flights</td>
                    <td className="py-2 text-right text-white">{result.current.totalFlights}</td>
                    <td className="py-2 text-right text-white">{result.simulated.totalFlights}</td>
                    <td className="py-2 text-right">
                      {renderChangeIndicator(result.changes.flightsChange)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-300">Noise Exposure (dB·s)</td>
                    <td className="py-2 text-right text-white">{formatNumber(result.current.totalDbSeconds)}</td>
                    <td className="py-2 text-right text-white">{formatNumber(result.simulated.totalDbSeconds)}</td>
                    <td className="py-2 text-right">
                      {renderChangeIndicator(result.changes.dbSecondsPercent, '%')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-300">Avg Max dB</td>
                    <td className="py-2 text-right text-white">{result.current.avgMaxDb}</td>
                    <td className="py-2 text-right text-white">{result.simulated.avgMaxDb}</td>
                    <td className="py-2 text-right">
                      {renderChangeIndicator(result.changes.avgDbChange, ' dB')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-300">Loud Events (&gt;85 dB)</td>
                    <td className="py-2 text-right text-white">{result.current.loudEvents}</td>
                    <td className="py-2 text-right text-white">{result.simulated.loudEvents}</td>
                    <td className="py-2 text-right">
                      {renderChangeIndicator(result.changes.loudEventsChange)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-300">Curfew Violations</td>
                    <td className="py-2 text-right text-white">{result.current.curfewViolations}</td>
                    <td className="py-2 text-right text-white">{result.simulated.curfewViolations}</td>
                    <td className="py-2 text-right">
                      {renderChangeIndicator(result.changes.curfewChange, '', false)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Affected Operators */}
              {result.affectedOperators.length > 0 && (
                <div className="mt-4 p-3 bg-gray-800">
                  <div className="text-xs text-gray-400 mb-2">Affected Operators</div>
                  <div className="flex flex-wrap gap-2">
                    {result.affectedOperators.map((op) => (
                      <span
                        key={op}
                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs"
                      >
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-3 border-l-4 border-blue-500 bg-blue-900/20">
                <div className="text-sm text-white">
                  This scenario would result in a{' '}
                  <span className={result.changes.dbSecondsPercent < 0 ? 'text-green-400' : 'text-red-400'}>
                    {Math.abs(result.changes.dbSecondsPercent)}% {result.changes.dbSecondsPercent < 0 ? 'reduction' : 'increase'}
                  </span>
                  {' '}in total noise exposure.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatIfSimulator;
