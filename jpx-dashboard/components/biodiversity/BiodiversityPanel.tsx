'use client';

import { useState } from 'react';
import {
  TreePine,
  Bird,
  Bug,
  Squirrel,
  AlertTriangle,
  TrendingDown,
  BookOpen,
  ChevronDown,
  ChevronRight,
  MapPin,
  Fish,
  Waves,
  Turtle,
} from 'lucide-react';
import { speciesImpacts, researchFindings, habitatAreas, ecologicalIndicators } from '@/data/biodiversity';
import type { TaxonomicGroup, ImpactSeverity, SpeciesImpact } from '@/types/biodiversity';
import { getImpactSeverityColor } from '@/types/biodiversity';

const groupIcons: Record<TaxonomicGroup, React.ReactNode> = {
  birds: <Bird size={12} strokeWidth={1.5} />,
  mammals: <Squirrel size={12} strokeWidth={1.5} />,
  amphibians: <Fish size={12} strokeWidth={1.5} />,
  insects: <Bug size={12} strokeWidth={1.5} />,
  reptiles: <Turtle size={12} strokeWidth={1.5} />,
  marine: <Waves size={12} strokeWidth={1.5} />,
};

const groupLabels: Record<TaxonomicGroup, string> = {
  birds: 'Birds',
  mammals: 'Mammals',
  amphibians: 'Amphibians',
  insects: 'Insects',
  reptiles: 'Reptiles',
  marine: 'Marine',
};

const severityBadge: Record<ImpactSeverity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-950/60', text: 'text-red-400', label: 'Critical' },
  high: { bg: 'bg-orange-950/60', text: 'text-orange-400', label: 'High' },
  moderate: { bg: 'bg-amber-950/60', text: 'text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-lime-950/60', text: 'text-lime-400', label: 'Low' },
  minimal: { bg: 'bg-green-950/60', text: 'text-green-400', label: 'Minimal' },
};

function SpeciesCard({ species }: { species: SpeciesImpact }) {
  const [expanded, setExpanded] = useState(false);
  const badge = severityBadge[species.severity];

  return (
    <div className="border border-zinc-800/60 bg-zinc-900/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">{groupIcons[species.taxonomicGroup]}</span>
          <span className="text-[11px] font-medium text-zinc-300">{species.commonName}</span>
          {species.conservationStatus && (
            <span className="text-[8px] px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-900/30 uppercase tracking-wider">
              {species.conservationStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}>
            {badge.label}
          </span>
          {expanded ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronRight size={10} className="text-zinc-600" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-800/40 space-y-2">
          <div className="text-[10px] text-zinc-500 italic">{species.scientificName}</div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{species.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {species.impactTypes.map((type) => (
              <span key={type} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 capitalize">
                {type}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-zinc-600">
              Sensitivity threshold: <span className="text-zinc-400 tabular-nums">{species.sensitivityThresholdDb} dB</span>
            </span>
            <span className="text-[9px] text-zinc-600">{species.source}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function BiodiversityPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'species' | 'habitats' | 'research'>('overview');
  const [selectedGroup, setSelectedGroup] = useState<TaxonomicGroup | 'all'>('all');

  const filteredSpecies = selectedGroup === 'all'
    ? speciesImpacts
    : speciesImpacts.filter((s) => s.taxonomicGroup === selectedGroup);

  const speciesByGroup = speciesImpacts.reduce((acc, s) => {
    acc[s.taxonomicGroup] = (acc[s.taxonomicGroup] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const criticalCount = speciesImpacts.filter((s) => s.severity === 'critical').length;
  const highCount = speciesImpacts.filter((s) => s.severity === 'high').length;
  const protectedCount = speciesImpacts.filter((s) => s.conservationStatus).length;

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'species' as const, label: 'Species' },
    { key: 'habitats' as const, label: 'Habitats' },
    { key: 'research' as const, label: 'Research' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-emerald-900/40 p-1.5">
            <TreePine size={16} className="text-emerald-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Biodiversity & Wildlife Impact</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Aircraft noise effects on local ecosystems based on peer-reviewed research
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/60">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
              activeTab === key
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* ─── Overview Tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950/50 border border-zinc-800/60 px-3 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={10} className="text-red-400" />
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Critical/High</span>
                </div>
                <div className="text-xl font-semibold text-zinc-100 tabular-nums">
                  {criticalCount + highCount}
                </div>
                <div className="text-[10px] text-zinc-600">species severely impacted</div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/60 px-3 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingDown size={10} className="text-amber-400" />
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Species Loss</span>
                </div>
                <div className="text-xl font-semibold text-zinc-100 tabular-nums">-28%</div>
                <div className="text-[10px] text-zinc-600">richness within 5km</div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/60 px-3 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BookOpen size={10} className="text-blue-400" />
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Protected</span>
                </div>
                <div className="text-xl font-semibold text-zinc-100 tabular-nums">{protectedCount}</div>
                <div className="text-[10px] text-zinc-600">listed species affected</div>
              </div>
            </div>

            {/* Ecological Indicators */}
            <div>
              <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-3">
                Ecological Impact Indicators
              </div>
              <div className="space-y-2">
                {ecologicalIndicators.map((indicator) => (
                  <div key={indicator.id} className="flex items-center gap-3 group">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300">{indicator.label}</span>
                        <span className={`text-[11px] font-medium tabular-nums ${
                          indicator.value < 0 ? 'text-red-400' : 'text-zinc-300'
                        }`}>
                          {indicator.value > 0 ? indicator.value : indicator.value}{indicator.unit.startsWith('%') ? indicator.unit : ` ${indicator.unit}`}
                        </span>
                      </div>
                      {/* Progress bar for negative indicators */}
                      {indicator.value < 0 && (
                        <div className="mt-1 h-1 bg-zinc-800 w-full">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${Math.min(Math.abs(indicator.value), 100)}%`,
                              backgroundColor: Math.abs(indicator.value) > 30 ? '#ef4444'
                                : Math.abs(indicator.value) > 20 ? '#f97316'
                                : '#eab308',
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {indicator.trend === 'declining' && (
                      <TrendingDown size={10} className="text-red-500/60" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Finding Highlight */}
            <div className="bg-emerald-950/20 border border-emerald-900/30 px-4 py-3">
              <div className="text-[9px] text-emerald-600 uppercase tracking-wider mb-1.5">Key Research Finding</div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Even moderate aircraft noise at <span className="text-emerald-400 font-medium">~55 dB</span> causes
                a <span className="text-red-400 font-medium">31% decline</span> in bird abundance and
                a <span className="text-red-400 font-medium">25% decline</span> in species richness.
                These noise levels are comparable to suburban neighborhoods and extend well beyond
                the immediate airport boundary.
              </p>
              <div className="text-[9px] text-zinc-600 mt-2">
                Source: Ware et al., PNAS 2015 (Phantom Road Experiment)
              </div>
            </div>

            {/* Impact Summary by Taxonomic Group */}
            <div>
              <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.12em] mb-3">
                Species Tracked by Group
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(speciesByGroup).map(([group, count]) => (
                  <div key={group} className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1">
                    {groupIcons[group as TaxonomicGroup]}
                    <span className="text-[10px] text-zinc-400">{groupLabels[group as TaxonomicGroup]}</span>
                    <span className="text-[10px] text-zinc-600 tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Species Tab ──────────────────────────────────────────── */}
        {activeTab === 'species' && (
          <div className="space-y-3">
            {/* Group filter */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                  selectedGroup === 'all'
                    ? 'bg-emerald-900/40 text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/30'
                }`}
              >
                All ({speciesImpacts.length})
              </button>
              {(Object.keys(speciesByGroup) as TaxonomicGroup[]).map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors ${
                    selectedGroup === group
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/30'
                  }`}
                >
                  {groupIcons[group]}
                  {groupLabels[group]} ({speciesByGroup[group]})
                </button>
              ))}
            </div>

            {/* Species list */}
            <div className="space-y-1">
              {filteredSpecies.map((species) => (
                <SpeciesCard key={species.id} species={species} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Habitats Tab ─────────────────────────────────────────── */}
        {activeTab === 'habitats' && (
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Sensitive ecological areas near KJPX airport with estimated noise exposure levels based on flight path analysis and published attenuation models.
            </p>
            <div className="space-y-2">
              {habitatAreas
                .sort((a, b) => b.estimatedNoiseExposure - a.estimatedNoiseExposure)
                .map((habitat) => {
                  const badge = severityBadge[habitat.impactSeverity];
                  return (
                    <div key={habitat.id} className="border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <MapPin size={10} className="text-zinc-500" />
                          <span className="text-[11px] font-medium text-zinc-300">{habitat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 tabular-nums">{habitat.estimatedNoiseExposure} dB</span>
                          <span className={`text-[9px] px-1.5 py-0.5 ${badge.bg} ${badge.text} uppercase tracking-wider`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mb-1.5">{habitat.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {habitat.keySpecies.map((sp) => (
                          <span key={sp} className="text-[9px] px-1.5 py-0.5 bg-zinc-800/60 text-zinc-500">
                            {sp}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5">
                        <div className="h-1 bg-zinc-800 w-full">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${Math.min((habitat.estimatedNoiseExposure / 90) * 100, 100)}%`,
                              backgroundColor: getImpactSeverityColor(habitat.impactSeverity),
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[8px] text-zinc-700 capitalize">{habitat.type}</span>
                          <span className="text-[8px] text-zinc-700">0 dB ——— 90 dB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ─── Research Tab ─────────────────────────────────────────── */}
        {activeTab === 'research' && (
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Key findings from peer-reviewed studies on aircraft and anthropogenic noise impacts on biodiversity and wildlife.
            </p>
            <div className="space-y-2">
              {researchFindings.map((finding) => (
                <div key={finding.id} className="border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-200">{finding.title}</span>
                    <span className="text-[9px] text-zinc-600 tabular-nums">{finding.year}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{finding.finding}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {finding.noiseLevel && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-950/40 text-amber-400">
                        {finding.noiseLevel}
                      </span>
                    )}
                    {finding.impactMetric && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-red-950/40 text-red-400">
                        {finding.impactMetric}
                      </span>
                    )}
                    {finding.taxonomicGroup && (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500">
                        {groupIcons[finding.taxonomicGroup]}
                        {groupLabels[finding.taxonomicGroup]}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-600 mt-1.5">{finding.source}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
