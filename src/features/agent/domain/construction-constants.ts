/**
 * Construction Industry Constants
 * Industry benchmarks, OSHA thresholds, and reference data for AI agent
 */

// ============================================================================
// OSHA Heat Illness Prevention Thresholds
// ============================================================================

export const OSHA_HEAT_THRESHOLDS = {
  moderate: {
    heatIndex: 80,
    risk: 'Moderate',
    actions: [
      'Provide water and encourage hydration',
      'Implement acclimatization plan for new workers',
      'Monitor workers for heat-related symptoms',
    ],
  },
  high: {
    heatIndex: 91,
    risk: 'High',
    actions: [
      'Mandatory water breaks every 15-20 minutes',
      'Provide shaded rest areas',
      'Schedule strenuous work for cooler hours',
      'Use buddy system to monitor workers',
    ],
  },
  veryHigh: {
    heatIndex: 103,
    risk: 'Very High',
    actions: [
      'Aggressive hydration program',
      'Mandatory rest breaks in shade',
      'Reduce work intensity',
      'Consider rescheduling outdoor work',
      'Have emergency response plan ready',
    ],
  },
  extreme: {
    heatIndex: 115,
    risk: 'Extreme',
    actions: [
      'Suspend non-essential outdoor work',
      'Only emergency or critical work with extreme precautions',
      'Continuous monitoring for all workers',
      'Emergency medical response on standby',
    ],
  },
} as const

// ============================================================================
// Cold Stress Prevention Thresholds
// ============================================================================

export const COLD_STRESS_THRESHOLDS = {
  caution: {
    windChill: 32,
    risk: 'Caution',
    frostbiteTime: null,
    actions: [
      'Provide warm break areas',
      'Limit exposure time',
      'Wear appropriate layers',
    ],
  },
  warning: {
    windChill: 10,
    risk: 'Warning',
    frostbiteTime: '30 minutes',
    actions: [
      'Limit outdoor exposure',
      'Mandatory warm-up breaks every 30 minutes',
      'Monitor for cold stress symptoms',
      'Insulated PPE required',
    ],
  },
  danger: {
    windChill: -20,
    risk: 'Danger',
    frostbiteTime: '10-30 minutes',
    actions: [
      'Consider work stoppage',
      'Only essential work with extreme precautions',
      'Frequent warm-up breaks',
      'Buddy system mandatory',
    ],
  },
  extreme: {
    windChill: -45,
    risk: 'Extreme Danger',
    frostbiteTime: '5-10 minutes',
    actions: ['Suspend all outdoor work', 'Emergency conditions only'],
  },
} as const

// ============================================================================
// Trade Weather Sensitivity Limits
// ============================================================================

export const TRADE_WEATHER_LIMITS = {
  Concrete: {
    minTemp: 40,
    maxTemp: 95,
    maxWind: 20,
    rainSensitive: true,
    notes: {
      coldWeather:
        'Use heated enclosures, blankets, accelerators. Protect for 7 days.',
      hotWeather:
        'Use retarders, ice, early pour times. Mist cure to prevent rapid drying.',
      rain: 'Cover immediately. No finishing in rain. Protect fresh pours 24+ hours.',
      wind: 'Windbreaks may be needed above 15 mph for finishing.',
    },
  },
  Roofing: {
    minTemp: 40,
    maxTemp: 100,
    maxWind: 15,
    rainSensitive: true,
    notes: {
      coldWeather: 'Shingles become brittle. Hand-seal required below 45°F.',
      hotWeather:
        'Shingles too soft above 100°F. Risk of scuffing and damage.',
      rain: 'Zero tolerance. Deck must be completely dry.',
      wind: 'Panel handling dangerous above 15 mph.',
    },
  },
  Painting: {
    minTemp: 50,
    maxTemp: 85,
    maxWind: 15,
    rainSensitive: true,
    maxHumidity: 85,
    dewPointBuffer: 5,
    notes: {
      coldWeather: 'Latex may not cure properly. Oil-based very slow drying.',
      hotWeather:
        'Rapid drying causes lap marks. Avoid direct sun on surfaces.',
      rain: 'No rain for 24 hours before or after application.',
      humidity: 'Above 85% causes blushing, poor adhesion.',
      dewPoint: 'Surface temp must be 5°F above dew point.',
    },
  },
  Masonry: {
    minTemp: 40,
    maxTemp: 100,
    maxWind: 25,
    rainSensitive: true,
    notes: {
      coldWeather:
        'Use cold weather admixtures. Cover and heat if below 32°F.',
      hotWeather: 'Pre-wet units. Keep mortar workable. Protect from drying.',
      rain: 'Cover fresh work. No laying in heavy rain.',
      wind: 'Cover fresh work to prevent rapid drying.',
    },
  },
  Steel: {
    minTemp: 0,
    maxTemp: 110,
    maxWind: 25,
    rainSensitive: false,
    notes: {
      coldWeather: 'Cold affects steel brittleness. Impact testing may apply.',
      hotWeather: 'High expansion factor. Consider thermal movement.',
      lightning: 'Immediate evacuation when storm within 6 miles.',
    },
  },
  CraneOperations: {
    minTemp: 0,
    maxTemp: 110,
    maxWind: 20,
    rainSensitive: false,
    notes: {
      wind: 'Follow load chart limits. Typically 20-35 mph max depending on load.',
      lightning: 'Suspend operations when storm within 6 miles.',
      visibility:
        'Suspend in fog, heavy rain, or snow affecting visibility.',
      temperature: 'Cold affects hydraulics. Check manufacturer guidelines.',
    },
  },
  Excavation: {
    minTemp: 20,
    maxTemp: 110,
    maxWind: 35,
    rainSensitive: true,
    notes: {
      coldWeather: 'Frozen soil cannot be properly compacted.',
      rain: 'Soil moisture affects compaction. May need drying time.',
      standingWater: 'Must be removed before compaction testing.',
      freezeThaw: 'Subgrade may need reworking after freeze/thaw.',
    },
  },
  Landscaping: {
    minTemp: 35,
    maxTemp: 100,
    maxWind: 25,
    rainSensitive: true,
    notes: {
      coldWeather: 'No planting in frozen soil. Protect new plantings.',
      hotWeather: 'Transplant shock risk. Water immediately after planting.',
      rain: 'Beneficial for planting. Avoid working in muddy conditions.',
    },
  },
  Electrical: {
    minTemp: 0,
    maxTemp: 110,
    maxWind: 30,
    rainSensitive: true,
    notes: {
      rain: 'No work on exposed/live circuits in wet conditions.',
      lightning: 'Suspend all electrical work during lightning.',
      coldWeather: 'Wire becomes stiff. PVC may crack.',
    },
  },
  Plumbing: {
    minTemp: 32,
    maxTemp: 110,
    maxWind: 30,
    rainSensitive: false,
    notes: {
      coldWeather: 'Protect from freezing. No pressure testing if freeze risk.',
      heat: 'Solvent cement has temperature limits.',
    },
  },
} as const

// ============================================================================
// Trade Productivity Benchmarks (Industry Averages)
// ============================================================================

export const TRADE_PRODUCTIVITY_BENCHMARKS = {
  Concrete: {
    placement: { value: 20, unit: 'CY/worker-hour', notes: 'Direct pour' },
    finishing: { value: 150, unit: 'SF/worker-hour', notes: 'Broom/trowel' },
    formwork: { value: 25, unit: 'SF/worker-hour', notes: 'Wall forms' },
    rebar: { value: 300, unit: 'lbs/worker-hour', notes: 'Placement only' },
  },
  Carpentry: {
    wallFraming: { value: 100, unit: 'SF/worker-day', notes: 'Wood stud walls' },
    roofFraming: { value: 80, unit: 'SF/worker-day', notes: 'Conventional' },
    blocking: { value: 50, unit: 'LF/worker-hour', notes: 'Fire/draft stops' },
    sheathing: { value: 40, unit: 'sheets/worker-day', notes: 'Wall/roof' },
  },
  Drywall: {
    hanging: { value: 500, unit: 'SF/worker-day', notes: 'Standard height' },
    taping: { value: 700, unit: 'SF/worker-day', notes: 'Level 4 finish' },
    sanding: { value: 1000, unit: 'SF/worker-day', notes: 'Final sand' },
  },
  Painting: {
    spray: { value: 1500, unit: 'SF/worker-day', notes: 'Prime + 2 coats' },
    roller: { value: 400, unit: 'SF/worker-day', notes: 'Walls' },
    brush: { value: 200, unit: 'SF/worker-day', notes: 'Trim/cut-in' },
  },
  Electrical: {
    roughIn: { value: 10, unit: 'outlets/worker-day', notes: 'Standard boxes' },
    wireRun: { value: 200, unit: 'LF/worker-day', notes: 'NM cable' },
    devices: { value: 30, unit: 'devices/worker-day', notes: 'Switches/outlets' },
    fixtures: { value: 8, unit: 'fixtures/worker-day', notes: 'Lighting' },
  },
  Plumbing: {
    roughIn: { value: 5, unit: 'fixtures/worker-day', notes: 'DWV + supply' },
    fixtures: { value: 6, unit: 'fixtures/worker-day', notes: 'Trim/finals' },
    pipeRun: { value: 50, unit: 'LF/worker-day', notes: 'Copper/PEX' },
  },
  HVAC: {
    ductwork: { value: 100, unit: 'lbs/worker-day', notes: 'Sheet metal' },
    flexDuct: { value: 150, unit: 'LF/worker-day', notes: 'Residential' },
    equipment: { value: 2, unit: 'units/worker-day', notes: 'Split systems' },
  },
  Masonry: {
    cmu: { value: 125, unit: 'blocks/worker-day', notes: '8" CMU' },
    brick: { value: 400, unit: 'bricks/worker-day', notes: 'Face brick' },
    stone: { value: 50, unit: 'SF/worker-day', notes: 'Veneer' },
  },
  Roofing: {
    shingles: { value: 3, unit: 'squares/worker-day', notes: 'Composition' },
    singlePly: { value: 15, unit: 'squares/worker-day', notes: 'TPO/EPDM' },
    metalPanels: { value: 200, unit: 'SF/worker-day', notes: 'Standing seam' },
  },
  Flooring: {
    carpet: { value: 50, unit: 'SY/worker-day', notes: 'Commercial' },
    tile: { value: 75, unit: 'SF/worker-day', notes: 'Ceramic/porcelain' },
    hardwood: { value: 200, unit: 'SF/worker-day', notes: 'Nail-down' },
    lvp: { value: 400, unit: 'SF/worker-day', notes: 'Click-lock' },
  },
} as const

// ============================================================================
// Lightning Safety Constants
// ============================================================================

export const LIGHTNING_SAFETY = {
  flashToBangSeconds: 30, // 6 miles away
  waitAfterLastThunder: 30, // minutes
  evacuationPriority: [
    'Crane operators and riggers',
    'Workers on scaffolding',
    'Workers on roofs',
    'Workers in excavations (flooding risk)',
    'All other outdoor workers',
  ],
  safeShelters: [
    'Substantial buildings with wiring and plumbing',
    'Fully enclosed metal vehicles',
  ],
  unsafeShelters: [
    'Open structures (pavilions, car ports)',
    'Small sheds or outbuildings',
    'Tents',
    'Convertibles or open-cab equipment',
  ],
} as const

// ============================================================================
// CSI MasterFormat Divisions (2018 Edition)
// ============================================================================

export const CSI_DIVISIONS = {
  '00': 'Procurement and Contracting Requirements',
  '01': 'General Requirements',
  '02': 'Existing Conditions',
  '03': 'Concrete',
  '04': 'Masonry',
  '05': 'Metals',
  '06': 'Wood, Plastics, and Composites',
  '07': 'Thermal and Moisture Protection',
  '08': 'Openings',
  '09': 'Finishes',
  '10': 'Specialties',
  '11': 'Equipment',
  '12': 'Furnishings',
  '13': 'Special Construction',
  '14': 'Conveying Equipment',
  '21': 'Fire Suppression',
  '22': 'Plumbing',
  '23': 'Heating, Ventilating, and Air Conditioning (HVAC)',
  '25': 'Integrated Automation',
  '26': 'Electrical',
  '27': 'Communications',
  '28': 'Electronic Safety and Security',
  '31': 'Earthwork',
  '32': 'Exterior Improvements',
  '33': 'Utilities',
  '34': 'Transportation',
  '35': 'Waterway and Marine Construction',
  '40': 'Process Integration',
  '41': 'Material Processing and Handling Equipment',
  '42': 'Process Heating, Cooling, and Drying Equipment',
  '43': 'Process Gas and Liquid Handling, Purification, and Storage Equipment',
  '44': 'Pollution and Waste Control Equipment',
  '45': 'Industry-Specific Manufacturing Equipment',
  '46': 'Water and Wastewater Equipment',
  '48': 'Electrical Power Generation',
} as const

// ============================================================================
// Inspection Types by Project Phase
// ============================================================================

export const INSPECTION_TYPES_BY_PHASE = {
  siteWork: [
    'Erosion control',
    'Utility trenches (before backfill)',
    'Subgrade/compaction',
    'Underground plumbing',
    'Underground electrical',
  ],
  foundation: [
    'Footing excavation',
    'Rebar placement',
    'Pre-pour (formwork)',
    'Anchor bolt placement',
    'Backfill/waterproofing',
  ],
  structural: [
    'Steel connections',
    'Welding (certified)',
    'Concrete placement',
    'Post-tensioning',
    'Fireproofing',
  ],
  roughIn: [
    'Framing (before close-in)',
    'Rough plumbing',
    'Rough electrical',
    'Rough HVAC',
    'Insulation',
  ],
  finishes: [
    'Drywall (before texture)',
    'Fire stopping',
    'Above ceiling',
    'ADA compliance',
    'Fire alarm testing',
  ],
  closeout: [
    'Final plumbing',
    'Final electrical',
    'Final mechanical',
    'Final fire/life safety',
    'Certificate of Occupancy',
  ],
} as const

// ============================================================================
// Delay Categories for Documentation
// ============================================================================

export const DELAY_CATEGORIES = {
  owner: [
    'Design changes',
    'Late owner decisions',
    'Change order negotiations',
    'Owner-furnished equipment delays',
    'Access restrictions',
    'Inspection delays (owner-arranged)',
  ],
  architect: [
    'RFI response delays',
    'Submittal review delays',
    'Design errors/omissions',
    'Incomplete documents',
    'Conflicting information',
  ],
  contractor: [
    'Coordination issues',
    'Resource allocation',
    'Subcontractor performance',
    'Material procurement',
    'Rework/corrections',
  ],
  weather: [
    'Rain/precipitation',
    'Extreme heat',
    'Extreme cold',
    'High winds',
    'Lightning/storms',
    'Snow/ice',
  ],
  unforeseen: [
    'Differing site conditions',
    'Unknown utilities',
    'Contaminated soil',
    'Archaeological finds',
    'Protected species',
  ],
  thirdParty: [
    'Utility company delays',
    'Permit delays',
    'Inspection delays',
    'Material supplier delays',
    'Equipment delivery delays',
  ],
} as const

// ============================================================================
// Safety Observation Categories
// ============================================================================

export const SAFETY_CATEGORIES = {
  hazards: [
    'Fall hazard',
    'Struck-by hazard',
    'Electrical hazard',
    'Caught-in/between hazard',
    'Excavation/trench hazard',
    'Confined space',
    'Chemical/hazmat',
    'Fire hazard',
  ],
  ppe: [
    'Hard hat',
    'Safety glasses',
    'High-visibility vest',
    'Steel-toed boots',
    'Gloves',
    'Face shield',
    'Hearing protection',
    'Fall protection harness',
    'Respiratory protection',
  ],
  housekeeping: [
    'Debris accumulation',
    'Walking/working surfaces',
    'Material storage',
    'Cord/hose management',
    'Lighting',
    'Access/egress',
  ],
  equipment: [
    'Pre-operation inspection',
    'Operator certification',
    'Safety devices/guards',
    'Maintenance issues',
    'Improper use',
  ],
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get heat risk level based on heat index
 */
export function getHeatRiskLevel(heatIndex: number): keyof typeof OSHA_HEAT_THRESHOLDS | 'low' {
  if (heatIndex >= OSHA_HEAT_THRESHOLDS.extreme.heatIndex) {return 'extreme'}
  if (heatIndex >= OSHA_HEAT_THRESHOLDS.veryHigh.heatIndex) {return 'veryHigh'}
  if (heatIndex >= OSHA_HEAT_THRESHOLDS.high.heatIndex) {return 'high'}
  if (heatIndex >= OSHA_HEAT_THRESHOLDS.moderate.heatIndex) {return 'moderate'}
  return 'low'
}

/**
 * Get cold stress risk level based on wind chill
 */
export function getColdRiskLevel(windChill: number): keyof typeof COLD_STRESS_THRESHOLDS | 'low' {
  if (windChill <= COLD_STRESS_THRESHOLDS.extreme.windChill) {return 'extreme'}
  if (windChill <= COLD_STRESS_THRESHOLDS.danger.windChill) {return 'danger'}
  if (windChill <= COLD_STRESS_THRESHOLDS.warning.windChill) {return 'warning'}
  if (windChill <= COLD_STRESS_THRESHOLDS.caution.windChill) {return 'caution'}
  return 'low'
}

/**
 * Check if conditions are safe for a specific trade
 */
export function checkTradeWeatherSafety(
  trade: keyof typeof TRADE_WEATHER_LIMITS,
  temperature: number,
  windSpeed: number,
  isRaining: boolean,
  humidity?: number
): { safe: boolean; warnings: string[] } {
  const limits = TRADE_WEATHER_LIMITS[trade]
  const warnings: string[] = []

  if (temperature < limits.minTemp) {
    warnings.push(`Temperature ${temperature}°F below minimum ${limits.minTemp}°F`)
  }
  if (temperature > limits.maxTemp) {
    warnings.push(`Temperature ${temperature}°F above maximum ${limits.maxTemp}°F`)
  }
  if (windSpeed > limits.maxWind) {
    warnings.push(`Wind speed ${windSpeed} mph above maximum ${limits.maxWind} mph`)
  }
  if (limits.rainSensitive && isRaining) {
    warnings.push('Activity is rain-sensitive')
  }
  if ('maxHumidity' in limits && humidity && humidity > (limits as { maxHumidity: number }).maxHumidity) {
    warnings.push(`Humidity ${humidity}% above maximum ${(limits as { maxHumidity: number }).maxHumidity}%`)
  }

  return {
    safe: warnings.length === 0,
    warnings,
  }
}

/**
 * Calculate heat index from temperature and humidity
 * Uses the NWS heat index equation
 */
export function calculateHeatIndex(temperature: number, humidity: number): number {
  if (temperature < 80) {return temperature}

  const T = temperature
  const R = humidity

  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R

  // Adjustments
  if (R < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
  } else if (R > 85 && T >= 80 && T <= 87) {
    HI += ((R - 85) / 10) * ((87 - T) / 5)
  }

  return Math.round(HI)
}

/**
 * Calculate wind chill from temperature and wind speed
 * Uses the NWS wind chill equation
 */
export function calculateWindChill(temperature: number, windSpeed: number): number {
  if (temperature > 50 || windSpeed < 3) {return temperature}

  const T = temperature
  const V = windSpeed

  const WC = 35.74 + 0.6215 * T - 35.75 * Math.pow(V, 0.16) + 0.4275 * T * Math.pow(V, 0.16)

  return Math.round(WC)
}
