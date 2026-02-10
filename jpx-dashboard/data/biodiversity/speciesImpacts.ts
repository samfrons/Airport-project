import type { SpeciesImpact, ResearchFinding, HabitatArea, EcologicalIndicator } from '@/types/biodiversity';

/**
 * Species impact data for the East Hampton / Long Island region
 * Based on published research from multiple peer-reviewed sources
 */
export const speciesImpacts: SpeciesImpact[] = [
  // ─── Birds ────────────────────────────────────────────────────────────────
  {
    id: 'sp-piping-plover',
    commonName: 'Piping Plover',
    scientificName: 'Charadrius melodus',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 45,
    impactTypes: ['behavioral', 'reproductive', 'population'],
    severity: 'critical',
    description:
      'Federally threatened shorebird nesting on Long Island beaches. Highly sensitive to disturbance during breeding season. Aircraft noise causes nest abandonment and reduced fledging success.',
    source: 'USFWS Endangered Species Program; CAA CAP 2517',
    conservationStatus: 'Threatened (Federal)',
  },
  {
    id: 'sp-least-tern',
    commonName: 'Least Tern',
    scientificName: 'Sternula antillarum',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 50,
    impactTypes: ['behavioral', 'reproductive', 'communication'],
    severity: 'high',
    description:
      'Colonial nesting seabird on Long Island shores. Noise masks alarm calls critical for predator detection, reducing colony defensive behavior. Breeding colonies near flight paths show lower fledging rates.',
    source: 'NY DEC; CAA CAP 2517',
    conservationStatus: 'Threatened (NY State)',
  },
  {
    id: 'sp-osprey',
    commonName: 'Osprey',
    scientificName: 'Pandion haliaetus',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 60,
    impactTypes: ['foraging', 'behavioral'],
    severity: 'moderate',
    description:
      'Common raptor in East Hampton. Noise reduces hunting efficiency — for every 1 dB increase in noise, raptors are up to 8% less successful at catching prey. Nest platform locations increasingly displaced from flight corridors.',
    source: 'Mason et al. 2016; Current Pollution Reports 2024',
  },
  {
    id: 'sp-saltmarsh-sparrow',
    commonName: 'Saltmarsh Sparrow',
    scientificName: 'Ammospiza caudacuta',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 45,
    impactTypes: ['communication', 'reproductive', 'population'],
    severity: 'critical',
    description:
      'Globally vulnerable species restricted to saltmarsh habitat on Long Island. Aircraft noise masks territorial songs, reducing breeding success. Population already declining 9% annually; noise compounds habitat loss.',
    source: 'BirdLife International; Roberts et al. 2019',
    conservationStatus: 'Vulnerable (Global)',
  },
  {
    id: 'sp-barn-owl',
    commonName: 'Barn Owl',
    scientificName: 'Tyto alba',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 40,
    impactTypes: ['foraging', 'predation', 'physiological'],
    severity: 'high',
    description:
      'Relies on acoustic hunting — locates prey by sound. A 1 dB increase in background noise reduces hunting success by 8%. Aircraft overflights during dusk/dawn hours directly compromise survival.',
    source: 'Mason et al. 2016; Proceedings Royal Society B',
  },
  {
    id: 'sp-black-capped-chickadee',
    commonName: 'Black-capped Chickadee',
    scientificName: 'Poecile atricapillus',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 50,
    impactTypes: ['communication', 'behavioral'],
    severity: 'moderate',
    description:
      'Adjusts song frequency upward in noisy environments, but higher-frequency songs are less effective for territory defense. Population density lower in noise-exposed areas near airports.',
    source: 'Proppe et al. 2012; Royal Society B 2022',
  },
  {
    id: 'sp-wood-thrush',
    commonName: 'Wood Thrush',
    scientificName: 'Hylocichla mustelina',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 45,
    impactTypes: ['communication', 'reproductive', 'population'],
    severity: 'high',
    description:
      'Low-frequency song heavily masked by aircraft noise. Advances dawn chorus by up to 20 minutes near airports but effect persists even after noise cessation. Species avoids areas >55 dB.',
    source: 'De Framond & Brumm 2022; Francis et al. 2009',
  },
  {
    id: 'sp-waterfowl-general',
    commonName: 'Waterfowl (general)',
    scientificName: 'Various Anatidae',
    taxonomicGroup: 'birds',
    locallyRelevant: true,
    sensitivityThresholdDb: 55,
    impactTypes: ['behavioral', 'population'],
    severity: 'high',
    description:
      'Waterfowl particularly disturbed by aircraft noise. Studies at Heathrow showed waterbodies 1-5km from the airport overflown hundreds of times daily. Snow geese most sensitive; some species habituate within days, others do not.',
    source: 'CAA CAP 2517; Heathrow SPA monitoring',
  },

  // ─── Mammals ──────────────────────────────────────────────────────────────
  {
    id: 'sp-white-tailed-deer',
    commonName: 'White-tailed Deer',
    scientificName: 'Odocoileus virginianus',
    taxonomicGroup: 'mammals',
    locallyRelevant: true,
    sensitivityThresholdDb: 65,
    impactTypes: ['behavioral', 'physiological'],
    severity: 'low',
    description:
      'Chronic noise exposure elevates cortisol levels and alters movement patterns. Deer near airports show increased vigilance behavior, reducing foraging time. Generally habituates to predictable noise patterns.',
    source: 'Shannon et al. 2016; Frontiers in Ecology 2023',
  },
  {
    id: 'sp-eastern-red-bat',
    commonName: 'Eastern Red Bat',
    scientificName: 'Lasiurus borealis',
    taxonomicGroup: 'mammals',
    locallyRelevant: true,
    sensitivityThresholdDb: 45,
    impactTypes: ['foraging', 'communication', 'behavioral'],
    severity: 'high',
    description:
      'Echolocating bat species highly sensitive to anthropogenic noise. Aircraft noise masks echolocation signals used for navigation and prey detection. Foraging efficiency declines significantly in noisy environments.',
    source: 'Bunkley et al. 2015; Schaub et al. 2008',
  },

  // ─── Amphibians ───────────────────────────────────────────────────────────
  {
    id: 'sp-spring-peeper',
    commonName: 'Spring Peeper',
    scientificName: 'Pseudacris crucifer',
    taxonomicGroup: 'amphibians',
    locallyRelevant: true,
    sensitivityThresholdDb: 50,
    impactTypes: ['communication', 'reproductive'],
    severity: 'moderate',
    description:
      'Chorus frogs rely on acoustic signaling for mate attraction. Traffic and aircraft noise masks mating calls, reducing reproductive success. Males expend more energy producing louder calls in noisy areas.',
    source: 'Bee & Swanson 2007; Environmental Evidence 2020',
  },
  {
    id: 'sp-fowlers-toad',
    commonName: "Fowler's Toad",
    scientificName: 'Anaxyrus fowleri',
    taxonomicGroup: 'amphibians',
    locallyRelevant: true,
    sensitivityThresholdDb: 55,
    impactTypes: ['communication', 'reproductive', 'behavioral'],
    severity: 'moderate',
    description:
      'Breeding calls disrupted by low-frequency noise components of aircraft. Toads in noisy areas call at higher frequencies but attract fewer mates, suggesting noise-induced mate selection pressure.',
    source: 'Cunnington & Bhatt 2014',
  },

  // ─── Insects ──────────────────────────────────────────────────────────────
  {
    id: 'sp-monarch-butterfly',
    commonName: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    taxonomicGroup: 'insects',
    locallyRelevant: true,
    sensitivityThresholdDb: 70,
    impactTypes: ['behavioral', 'foraging'],
    severity: 'low',
    description:
      'Migrates through Long Island. Noise pollution alters pollinator presence and behavior, indirectly affecting plant communities. Vibration-sensitive — low-frequency aircraft noise may disrupt navigation.',
    source: 'Guenat & Dallimer 2023; Francis et al. 2012',
    conservationStatus: 'Candidate (Federal)',
  },
  {
    id: 'sp-grasshoppers',
    commonName: 'Grasshoppers',
    scientificName: 'Various Acrididae',
    taxonomicGroup: 'insects',
    locallyRelevant: true,
    sensitivityThresholdDb: 55,
    impactTypes: ['communication', 'reproductive'],
    severity: 'moderate',
    description:
      'Grasshoppers near noise sources produce higher-frequency mating songs. This shift persists even in silence and carries across generations — offspring from noisy areas also sing at higher pitch without noise exposure.',
    source: 'Lampe et al. 2012; Frontiers in Ecology 2023',
  },
];

/**
 * Key research findings for display in the biodiversity panel
 */
export const researchFindings: ResearchFinding[] = [
  {
    id: 'rf-phantom-road',
    title: 'Phantom Road Experiment',
    finding:
      'Traffic noise alone (without visual disturbance or pollution) causes a 31% decline in bird abundance and 25% decline in species richness. Even moderate noise at ~55 dB(A) fundamentally shapes bird distributions.',
    source: 'Ware et al., PNAS 2015',
    year: 2015,
    noiseLevel: '~55 dB(A)',
    impactMetric: '31% decline in abundance',
    taxonomicGroup: 'birds',
  },
  {
    id: 'rf-dawn-chorus',
    title: 'Airport Closure & Dawn Chorus Recovery',
    finding:
      'After an international airport closed, birds continued advanced dawn singing for 6+ months. Some species never reverted to natural timing, suggesting long-term or permanent behavioral changes from chronic noise exposure.',
    source: 'De Framond & Brumm, Proceedings Royal Society B 2022',
    year: 2022,
    impactMetric: 'Persistent behavioral change',
    taxonomicGroup: 'birds',
  },
  {
    id: 'rf-owl-hunting',
    title: 'Raptor Hunting Efficiency',
    finding:
      'For every 1 dB increase in ambient noise, owls are 8% less successful at catching prey. Acoustic hunters are disproportionately affected by even small increases in background noise from aircraft.',
    source: 'Mason et al., Biological Conservation 2016',
    year: 2016,
    impactMetric: '8% prey capture decline per 1 dB',
    taxonomicGroup: 'birds',
  },
  {
    id: 'rf-protected-areas',
    title: 'Noise Pollution in Protected Areas',
    finding:
      'Anthropogenic noise doubled background levels in 63% of U.S. protected areas. A 3 dB increase halves the area over which animals can hear, and a 10 dB increase reduces listening area by 90%.',
    source: 'Buxton et al., Science 2017',
    year: 2017,
    noiseLevel: '3-10 dB above natural',
    impactMetric: '50-90% reduction in listening area',
  },
  {
    id: 'rf-community-level',
    title: 'Community-Level Ecological Effects',
    finding:
      '79% of community-level studies found negative effects of noise exposure including decreased abundance, reduced species richness, and decreased offspring survival. Only 1 study documented a positive effect.',
    source: 'Sordello et al., Environmental Evidence 2020',
    year: 2020,
    impactMetric: '79% of studies show negative effects',
  },
  {
    id: 'rf-cascading-effects',
    title: 'Cascading Ecosystem Effects',
    finding:
      'Noise altered seed dispersal and pollination at gas compressor sites, modifying plant communities. Even after compressors were switched off, the plant community did not recover within 4 years — demonstrating long-lasting ecological cascades.',
    source: 'Francis et al., Proceedings Royal Society B 2012',
    year: 2012,
    impactMetric: '4+ years to recover',
  },
  {
    id: 'rf-insect-epigenetics',
    title: 'Cross-Generational Noise Effects',
    finding:
      'Grasshoppers from noisy habitats produce higher-frequency mating songs. This change persists in offspring reared in silence — suggesting epigenetic or developmental noise impacts that cross generations.',
    source: 'Lampe et al., Functional Ecology 2012',
    year: 2012,
    impactMetric: 'Heritable behavioral change',
    taxonomicGroup: 'insects',
  },
  {
    id: 'rf-heathrow-spa',
    title: 'Airport Overflights of Protected Waterbodies',
    finding:
      'At Heathrow Airport, the Southwest London Waterbodies Special Protected Area (1km from the boundary) is overflown hundreds of times daily. Two winters of monitoring recorded 9,240 overflights over waterbodies 1-5km from the airfield.',
    source: 'CAA CAP 2517, UK Civil Aviation Authority',
    year: 2023,
    noiseLevel: '>70 dB at 1km',
    taxonomicGroup: 'birds',
  },
  {
    id: 'rf-biotic-homogenization',
    title: 'Avian Biotic Homogenization Near Airports',
    finding:
      'Bird communities near airports show lower species richness and diversity compared to quiet control sites. Airport environments drive biotic homogenization — favoring generalist, noise-tolerant species over sensitive specialists.',
    source: 'Alquezar et al., Urban Ecosystems 2020',
    year: 2020,
    impactMetric: 'Reduced species diversity',
    taxonomicGroup: 'birds',
  },
];

/**
 * Local habitat areas near East Hampton Airport (KJPX)
 * Based on actual ecological features of the region
 */
export const habitatAreas: HabitatArea[] = [
  {
    id: 'hab-napeague',
    name: 'Napeague State Park',
    type: 'coastal',
    coordinates: [-72.1128, 41.0035],
    radiusMeters: 800,
    keySpecies: ['Piping Plover', 'Least Tern', 'Horseshoe Crab'],
    estimatedNoiseExposure: 52,
    impactSeverity: 'moderate',
    description: 'Coastal habitat with nesting shorebirds. Under flight path approach corridor.',
  },
  {
    id: 'hab-northwest-harbor',
    name: 'Northwest Harbor County Park',
    type: 'wetland',
    coordinates: [-72.2285, 41.0050],
    radiusMeters: 600,
    keySpecies: ['Osprey', 'Great Blue Heron', 'Saltmarsh Sparrow'],
    estimatedNoiseExposure: 62,
    impactSeverity: 'high',
    description: 'Critical wetland habitat near airport. High frequency of overflights impacts wading birds and marsh species.',
  },
  {
    id: 'hab-barcelona-neck',
    name: 'Barcelona Neck Preserve',
    type: 'wetland',
    coordinates: [-72.2650, 40.9820],
    radiusMeters: 400,
    keySpecies: ['Saltmarsh Sparrow', 'Diamondback Terrapin', 'Fiddler Crab'],
    estimatedNoiseExposure: 68,
    impactSeverity: 'high',
    description: 'Tidal wetland south of airport, directly beneath departure flight paths. High noise exposure during operations.',
  },
  {
    id: 'hab-hither-hills',
    name: 'Hither Hills State Park',
    type: 'forest',
    coordinates: [-72.0210, 41.0100],
    radiusMeters: 1200,
    keySpecies: ['Wood Thrush', 'Eastern Red Bat', 'Box Turtle'],
    estimatedNoiseExposure: 45,
    impactSeverity: 'low',
    description: 'Maritime forest and grassland. Eastern position provides some noise buffer but still experiences overflight noise.',
  },
  {
    id: 'hab-accabonac',
    name: 'Accabonac Harbor',
    type: 'wetland',
    coordinates: [-72.1450, 41.0180],
    radiusMeters: 700,
    keySpecies: ['Osprey', 'Clapper Rail', 'Blue Crab'],
    estimatedNoiseExposure: 55,
    impactSeverity: 'moderate',
    description: 'Productive estuary northeast of airport. Noise-sensitive species breeding in adjacent salt marshes.',
  },
  {
    id: 'hab-sagg-pond',
    name: 'Sagg Swamp Preserve',
    type: 'freshwater',
    coordinates: [-72.2870, 40.9450],
    radiusMeters: 500,
    keySpecies: ['Spring Peeper', "Fowler's Toad", 'Red-winged Blackbird'],
    estimatedNoiseExposure: 60,
    impactSeverity: 'moderate',
    description: 'Freshwater wetland supporting amphibian breeding. Aircraft noise disrupts chorus frog acoustic signaling.',
  },
  {
    id: 'hab-cedar-point',
    name: 'Cedar Point County Park',
    type: 'coastal',
    coordinates: [-72.2680, 41.0290],
    radiusMeters: 900,
    keySpecies: ['Piping Plover', 'Black Skimmer', 'Eastern Box Turtle'],
    estimatedNoiseExposure: 50,
    impactSeverity: 'moderate',
    description: 'Coastal point with nesting shorebirds and maritime grasslands. Under approach path for northwest arrivals.',
  },
  {
    id: 'hab-wainscott-pond',
    name: 'Wainscott Pond',
    type: 'freshwater',
    coordinates: [-72.2420, 40.9520],
    radiusMeters: 300,
    keySpecies: ['Painted Turtle', 'Green Frog', 'Belted Kingfisher'],
    estimatedNoiseExposure: 72,
    impactSeverity: 'high',
    description: 'Small freshwater pond immediately south of airport. One of the highest noise exposure levels among local habitats.',
  },
];

/**
 * Ecological indicators summarizing biodiversity health
 */
export const ecologicalIndicators: EcologicalIndicator[] = [
  {
    id: 'ei-bird-species',
    label: 'Bird Species Richness (5km)',
    value: -28,
    unit: '% vs control',
    trend: 'declining',
    description: 'Estimated reduction in bird species richness within 5km of KJPX compared to comparable quiet habitats, based on published impact studies.',
    source: 'Ware et al. 2015; Alquezar et al. 2020',
  },
  {
    id: 'ei-breeding-success',
    label: 'Breeding Success Impact',
    value: -22,
    unit: '% reduction',
    trend: 'declining',
    description: 'Estimated reduction in avian breeding success (hatching/fledging) within noise-exposed zones around the airport.',
    source: 'CAA CAP 2517; Sordello et al. 2020',
  },
  {
    id: 'ei-foraging-efficiency',
    label: 'Foraging Efficiency',
    value: -30,
    unit: '% reduction',
    trend: 'declining',
    description: 'Research shows birds spend ~30% less time feeding in areas with noise levels matching suburban exposure (~55 dB).',
    source: 'Ware et al. PNAS 2015',
  },
  {
    id: 'ei-listening-area',
    label: 'Acoustic Habitat Quality',
    value: -50,
    unit: '% listening area',
    trend: 'declining',
    description: 'A 3 dB increase above natural background halves the area over which animals can communicate and detect threats.',
    source: 'Buxton et al. Science 2017',
  },
  {
    id: 'ei-habitat-areas',
    label: 'Habitat Areas Exposed',
    value: 8,
    unit: 'areas impacted',
    trend: 'stable',
    description: 'Number of identified sensitive habitat areas within the airport noise influence zone receiving >45 dB noise exposure.',
    source: 'Local ecological survey data',
  },
  {
    id: 'ei-protected-species',
    label: 'Protected Species Affected',
    value: 4,
    unit: 'species',
    trend: 'stable',
    description: 'Number of federally or state-listed species whose habitat overlaps with airport noise impact zones.',
    source: 'USFWS; NY DEC',
  },
];
