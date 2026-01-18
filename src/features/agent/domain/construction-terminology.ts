/**
 * Construction Terminology
 * Slang, abbreviations, and terminology mappings for AI understanding
 */

// ============================================================================
// Construction Slang to Formal Terms
// ============================================================================

export const CONSTRUCTION_SLANG: Record<string, string> = {
  // Drywall/Finishing
  mud: 'drywall joint compound',
  tape: 'apply and smooth joint compound',
  float: 'smooth joint compound with float',
  hang: 'install drywall sheets',
  rock: 'drywall/gypsum board',
  board: 'drywall/gypsum board',
  skim: 'thin coat of joint compound',
  'knock down': 'textured wall finish',
  orange_peel: 'spray texture finish',
  popcorn: 'acoustic ceiling texture',

  // Concrete
  pour: 'place concrete',
  shoot: 'place concrete via pump',
  rod: 'strike off/screed concrete',
  bull: 'bull float concrete',
  trowel: 'finish concrete with trowel',
  broom: 'apply broom finish to concrete',
  cure: 'allow concrete to hydrate and harden',
  form: 'concrete formwork',
  strip: 'remove formwork',
  iron: 'reinforcing steel/rebar',
  rebar: 'reinforcing steel bars',
  mesh: 'welded wire reinforcement',
  'mud slab': 'non-structural concrete slab',
  'rat slab': 'thin concrete over soil',

  // Framing
  stick: 'piece of lumber',
  stud: 'vertical framing member',
  plate: 'horizontal framing member (top/bottom)',
  header: 'beam over opening',
  jack: 'shorter stud beside opening',
  king: 'full-height stud beside opening',
  cripple: 'short stud above/below opening',
  blocking: 'short pieces between studs',
  sheathing: 'structural panel on framing',
  'sheet out': 'install sheathing',
  'stand up': 'raise framed wall into position',
  'top out': 'complete structural frame to highest point',

  // Roofing
  deck: 'roof substrate/sheathing',
  felt: 'roofing underlayment',
  ice_and_water: 'self-adhering membrane',
  drip_edge: 'metal edge flashing',
  starter: 'first course of shingles',
  ridge: 'top/peak of roof',
  valley: 'inside corner of roof',
  hip: 'outside corner of roof',
  square: '100 square feet of roofing',

  // Plumbing
  rough: 'rough-in plumbing (before walls close)',
  top_out: 'complete vent through roof',
  trim: 'install fixtures and fittings',
  stack: 'vertical drain pipe',
  vent: 'air admission pipe',
  trap: 'water seal in drain',
  'p-trap': 'P-shaped drain trap',
  cleanout: 'access point for drain cleaning',

  // Electrical
  home_run: 'circuit back to panel',
  pigtail: 'short wire connection',
  wire_nut: 'twist-on wire connector',
  romex: 'NM (non-metallic) cable',
  mc: 'metal-clad cable',
  emt: 'electrical metallic tubing',
  box: 'electrical junction/outlet box',
  can: 'recessed light housing',
  'j-box': 'junction box',

  // General Site
  'dry in': 'make building weather-tight',
  'close in': 'complete exterior envelope',
  punch: 'deficiency list walkthrough',
  'walk through': 'inspection tour',
  'back charge': 'charge to sub for damage/correction',
  'pick': 'crane lift',
  'shake out': 'distribute materials across work area',
  'butter up': 'apply mortar to brick/block',
  'strike': 'tool mortar joints',
  'point up': 'repair/fill mortar joints',
  'flash': 'install flashing',
  'caulk': 'apply sealant',
  'shoot_hilti': 'use powder-actuated tool',

  // Equipment
  lift: 'aerial work platform',
  'scissor': 'scissor lift',
  boom: 'boom lift',
  'zoom boom': 'telehandler/rough terrain forklift',
  skid_steer: 'small loader (Bobcat type)',
  mini: 'mini excavator',
  'track hoe': 'excavator',
  dozer: 'bulldozer',
  grader: 'motor grader',
  roller: 'compaction equipment',
  'water truck': 'dust control vehicle',
}

// ============================================================================
// Common Abbreviations
// ============================================================================

export const ABBREVIATIONS: Record<string, string> = {
  // Roles
  GC: 'General Contractor',
  CM: 'Construction Manager',
  PM: 'Project Manager',
  PE: 'Project Engineer',
  APM: 'Assistant Project Manager',
  Super: 'Superintendent',
  Supt: 'Superintendent',
  Sub: 'Subcontractor',
  'A/E': 'Architect/Engineer',
  AOR: 'Architect of Record',
  EOR: 'Engineer of Record',
  OR: "Owner's Representative",
  OPR: "Owner's Project Requirements",

  // Documents
  RFI: 'Request for Information',
  RFP: 'Request for Proposal',
  RFQ: 'Request for Quote',
  CO: 'Change Order',
  PCO: 'Potential/Pending Change Order',
  COR: 'Change Order Request',
  ASI: "Architect's Supplemental Instructions",
  CCD: 'Construction Change Directive',
  PR: 'Proposal Request',
  SI: 'Supplemental Instructions',
  SK: 'Sketch',
  IR: 'Inspection Request',
  NCR: 'Non-Conformance Report',
  QA: 'Quality Assurance',
  QC: 'Quality Control',

  // Contract/Commercial
  GMP: 'Guaranteed Maximum Price',
  NTE: 'Not to Exceed',
  'T&M': 'Time and Materials',
  FF: 'Force Account/Force Work',
  LS: 'Lump Sum',
  'DB': 'Design-Build',
  'DBB': 'Design-Bid-Build',
  CMR: 'Construction Manager at Risk',
  CMAR: 'Construction Manager at Risk',
  IPD: 'Integrated Project Delivery',
  NTP: 'Notice to Proceed',
  NIC: 'Not In Contract',
  VE: 'Value Engineering',
  VECP: 'Value Engineering Change Proposal',
  SOV: 'Schedule of Values',
  AIA: 'American Institute of Architects (or their forms)',

  // Schedule
  SC: 'Substantial Completion',
  FC: 'Final Completion',
  CD: 'Contract Documents',
  CPM: 'Critical Path Method',
  WBS: 'Work Breakdown Structure',
  MS: 'Milestone',
  TIA: 'Time Impact Analysis',
  EOT: 'Extension of Time',
  LD: 'Liquidated Damages',

  // Technical/Building
  MEP: 'Mechanical/Electrical/Plumbing',
  MEPF: 'Mechanical/Electrical/Plumbing/Fire Protection',
  HVAC: 'Heating, Ventilation, Air Conditioning',
  AHU: 'Air Handling Unit',
  RTU: 'Rooftop Unit',
  VAV: 'Variable Air Volume',
  VRF: 'Variable Refrigerant Flow',
  BIM: 'Building Information Modeling',
  VDC: 'Virtual Design and Construction',
  LOD: 'Level of Development',
  LOI: 'Level of Information',
  FLS: 'Fire/Life Safety',
  FA: 'Fire Alarm',
  FP: 'Fire Protection',
  SS: 'Stainless Steel',
  GI: 'Galvanized Iron',
  PVC: 'Polyvinyl Chloride',
  CPVC: 'Chlorinated PVC',
  ABS: 'Acrylonitrile Butadiene Styrene',
  HDPE: 'High-Density Polyethylene',
  DWV: 'Drain-Waste-Vent',
  ACT: 'Acoustic Ceiling Tile',
  GWB: 'Gypsum Wall Board',
  CMU: 'Concrete Masonry Unit',
  CIP: 'Cast-in-Place',
  PT: 'Post-Tensioned',
  STC: 'Sound Transmission Class',
  NRC: 'Noise Reduction Coefficient',

  // Measurements
  SF: 'Square Feet',
  SY: 'Square Yards',
  LF: 'Linear Feet',
  CY: 'Cubic Yards',
  CF: 'Cubic Feet',
  EA: 'Each',
  MH: 'Man-Hours',
  WH: 'Worker-Hours',
  PSI: 'Pounds per Square Inch',
  PCF: 'Pounds per Cubic Foot',
  PLF: 'Pounds per Linear Foot',
  KSF: 'Kips per Square Foot',
  OC: 'On Center',
  FOF: 'Face of Finish',
  FO: 'Face of',
  TOS: 'Top of Steel',
  TOC: 'Top of Concrete',
  TOW: 'Top of Wall',
  BOS: 'Bottom of Steel',
  BOC: 'Bottom of Concrete',
  EL: 'Elevation',
  INV: 'Invert (pipe bottom)',

  // Meetings
  OAC: 'Owner-Architect-Contractor',
  POM: 'Project Operations Meeting',
  PPM: 'Pre-Pour Meeting',
  PCM: 'Pre-Construction Meeting',
  SWPPP: 'Stormwater Pollution Prevention Plan',

  // Safety
  JHA: 'Job Hazard Analysis',
  JSA: 'Job Safety Analysis',
  AHA: 'Activity Hazard Analysis',
  SDS: 'Safety Data Sheet',
  MSDS: 'Material Safety Data Sheet',
  PPE: 'Personal Protective Equipment',
  LOTO: 'Lockout/Tagout',
  GFCI: 'Ground Fault Circuit Interrupter',
  OSHA: 'Occupational Safety and Health Administration',

  // Status
  TBD: 'To Be Determined',
  TBC: 'To Be Confirmed',
  NA: 'Not Applicable',
  NR: 'Not Required',
  TYP: 'Typical',
  SIM: 'Similar',
  ALT: 'Alternate',
  OPT: 'Optional',
  REQ: 'Required',
  REQD: 'Required',
  APPR: 'Approved',
  REJ: 'Rejected',
  REV: 'Revised/Revision',
  VOID: 'Voided/Superseded',
  BIC: 'Ball in Court',
}

// ============================================================================
// Trade Names/Aliases
// ============================================================================

export const TRADE_ALIASES: Record<string, string[]> = {
  Concrete: ['concrete', 'flatwork', 'foundation', 'slab'],
  Framing: ['framing', 'carpentry', 'wood framing', 'rough carpentry'],
  Drywall: ['drywall', 'gypsum', 'sheetrock', 'gwb', 'board'],
  Painting: ['painting', 'paint', 'coatings', 'finishes'],
  Electrical: ['electrical', 'electric', 'elec', 'power'],
  Plumbing: ['plumbing', 'plumb', 'piping'],
  HVAC: ['hvac', 'mechanical', 'mech', 'sheet metal', 'ductwork'],
  Roofing: ['roofing', 'roof'],
  Masonry: ['masonry', 'block', 'brick', 'cmu', 'stone'],
  Steel: ['steel', 'structural steel', 'iron', 'ironwork'],
  Flooring: ['flooring', 'floor', 'tile', 'carpet', 'hardwood'],
  Glazing: ['glazing', 'glass', 'windows', 'storefronts'],
  Insulation: ['insulation', 'insul'],
  Waterproofing: ['waterproofing', 'wp', 'dampproofing'],
  Fireproofing: ['fireproofing', 'fire protection', 'spray fireproofing'],
  Landscaping: ['landscaping', 'landscape', 'hardscape', 'softscape'],
  Sitework: ['sitework', 'site work', 'earthwork', 'grading'],
  Demolition: ['demolition', 'demo', 'abatement'],
  'Fire Sprinkler': ['fire sprinkler', 'sprinkler', 'fire suppression'],
  'Fire Alarm': ['fire alarm', 'fa', 'detection'],
  Millwork: ['millwork', 'casework', 'cabinetry', 'trim carpentry'],
  Doors: ['doors', 'door hardware', 'dhf'],
  Elevator: ['elevator', 'lift', 'vertical transportation'],
}

// ============================================================================
// Location Patterns for Extraction
// ============================================================================

// These patterns parse construction document text (not untrusted user input).
// Quantifiers are bounded to limit worst-case performance.
/* eslint-disable security/detect-unsafe-regex */
export const LOCATION_PATTERNS = {
  building: /\b(?:building|bldg|bld)\s{0,3}[A-Z0-9-]{1,20}/gi,
  floor: /\b(?:floor|flr|level|lvl)\s{0,3}[0-9BMG-]{1,10}/gi,
  room: /\b(?:room|rm)\s{0,3}[A-Z0-9.-]{1,20}/gi,
  area: /\b(?:area|zone)\s{0,3}[A-Z0-9-]{1,20}/gi,
  gridLine: /\b(?:grid|gridline|gl)\s{0,3}[A-Z0-9]{1,10}(?:\s{0,3}[-/]\s{0,3}[A-Z0-9]{1,10})?/gi,
  elevation: /\b(?:el|elev|elevation)\s{0,3}[0-9.+-]{1,15}/gi,
  wing: /\b(?:wing|tower)\s{0,3}[A-Z0-9-]{1,20}/gi,
  unit: /\b(?:unit|apt|suite)\s{0,3}[A-Z0-9-]{1,20}/gi,
  parking: /\b(?:parking|garage)\s{0,3}(?:level|floor)?\s{0,3}[A-Z0-9-]{0,20}/gi,
}
/* eslint-enable security/detect-unsafe-regex */

// ============================================================================
// Quantity Patterns for Extraction
// ============================================================================

// These patterns extract quantities from construction documents (not untrusted user input).
// All quantifiers are bounded (e.g., {0,4} instead of *) to limit backtracking.
/* eslint-disable security/detect-unsafe-regex */
export const QUANTITY_PATTERNS = {
  squareFeet: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:sf|sq\.?\s{0,2}ft\.?|square\s{1,3}feet)/gi,
  squareYards: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:sy|sq\.?\s{0,2}yd\.?|square\s{1,3}yards)/gi,
  linearFeet: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:lf|lin\.?\s{0,2}ft\.?|linear\s{1,3}feet)/gi,
  cubicYards: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:cy|cu\.?\s{0,2}yd\.?|cubic\s{1,3}yards)/gi,
  cubicFeet: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:cf|cu\.?\s{0,2}ft\.?|cubic\s{1,3}feet)/gi,
  each: /\b(\d{1,3}(?:,\d{3}){0,4})\s{0,3}(?:ea|each|pcs?|pieces?)/gi,
  pounds: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:lbs?|pounds?)/gi,
  tons: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:tons?)/gi,
  gallons: /\b(\d{1,3}(?:,\d{3}){0,4}(?:\.\d{1,4})?)\s{0,3}(?:gal(?:lons?)?)/gi,
  sheets: /\b(\d{1,3}(?:,\d{3}){0,4})\s{0,3}(?:sheets?|shts?)/gi,
  rolls: /\b(\d{1,3}(?:,\d{3}){0,4})\s{0,3}(?:rolls?)/gi,
  bundles: /\b(\d{1,3}(?:,\d{3}){0,4})\s{0,3}(?:bundles?|bdls?)/gi,
  pallets: /\b(\d{1,3}(?:,\d{3}){0,4})\s{0,3}(?:pallets?)/gi,
  loads: /\b(\d{1,3}(?:,\d{3}){0,4})\s{0,3}(?:loads?|truckloads?)/gi,
}
/* eslint-enable security/detect-unsafe-regex */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Translate construction slang to formal term
 */
export function translateSlang(term: string): string {
  const normalized = term.toLowerCase().replace(/[_-]/g, ' ').trim()
  return CONSTRUCTION_SLANG[normalized] || term
}

/**
 * Expand abbreviation to full term
 */
export function expandAbbreviation(abbr: string): string {
  const normalized = abbr.toUpperCase().trim()
  return ABBREVIATIONS[normalized] || abbr
}

/**
 * Normalize trade name to standard format
 */
export function normalizeTradeName(input: string): string | null {
  const normalized = input.toLowerCase().trim()

  for (const [standardName, aliases] of Object.entries(TRADE_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return standardName
    }
  }

  return null
}

/**
 * Extract locations from text
 */
export function extractLocations(text: string): {
  buildings: string[]
  floors: string[]
  rooms: string[]
  areas: string[]
  gridLines: string[]
} {
  return {
    buildings: [...(text.match(LOCATION_PATTERNS.building) || [])],
    floors: [...(text.match(LOCATION_PATTERNS.floor) || [])],
    rooms: [...(text.match(LOCATION_PATTERNS.room) || [])],
    areas: [...(text.match(LOCATION_PATTERNS.area) || [])],
    gridLines: [...(text.match(LOCATION_PATTERNS.gridLine) || [])],
  }
}

/**
 * Extract quantities from text
 */
export function extractQuantities(text: string): Array<{
  value: number
  unit: string
  original: string
}> {
  const results: Array<{ value: number; unit: string; original: string }> = []

  const unitMappings: Record<string, string> = {
    squareFeet: 'SF',
    squareYards: 'SY',
    linearFeet: 'LF',
    cubicYards: 'CY',
    cubicFeet: 'CF',
    each: 'EA',
    pounds: 'LBS',
    tons: 'TONS',
    gallons: 'GAL',
    sheets: 'SHEETS',
    rolls: 'ROLLS',
    bundles: 'BUNDLES',
    pallets: 'PALLETS',
    loads: 'LOADS',
  }

  for (const [patternName, regex] of Object.entries(QUANTITY_PATTERNS)) {
    const matches = Array.from(text.matchAll(new RegExp(regex.source, regex.flags)))
    for (const match of matches) {
      const valueStr = match[1].replace(/,/g, '')
      results.push({
        value: parseFloat(valueStr),
        unit: unitMappings[patternName],
        original: match[0],
      })
    }
  }

  return results
}

/**
 * Parse voice transcription with construction context
 * Handles common transcription errors and slang
 */
export function parseVoiceTranscription(text: string): string {
  let parsed = text

  // Common voice transcription corrections
  const corrections: Record<string, string> = {
    'are a fi': 'RFI',
    'are eff eye': 'RFI',
    'see oh': 'CO',
    'change water': 'change order',
    'sea oh': 'CO',
    'pea see oh': 'PCO',
    'dry wall': 'drywall',
    'sheet rock': 'sheetrock',
    'hvack': 'HVAC',
    'h vac': 'HVAC',
    'may can ical': 'mechanical',
    'ream bar': 'rebar',
    're bar': 'rebar',
    'form work': 'formwork',
    'sub contractor': 'subcontractor',
  }

  for (const [error, correction] of Object.entries(corrections)) {
    parsed = parsed.replace(new RegExp(error, 'gi'), correction)
  }

  return parsed
}
