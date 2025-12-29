// Insurance Certificate OCR Parsing Module
// Specialized parsing for ACORD 25/28 insurance certificate forms
// Extracts carrier, policy, limits, endorsements, and dates

export interface InsuranceOcrResult {
  // Certificate Information
  certificate_number: string | null
  certificate_holder: string | null

  // Carrier/Insurer Information
  carrier_name: string | null
  carrier_naic: string | null

  // Policy Information
  policy_number: string | null
  effective_date: string | null
  expiration_date: string | null

  // Insured Information
  insured_name: string | null
  insured_address: string | null

  // Coverage Limits - General Liability
  general_liability: {
    each_occurrence: number | null
    damage_to_rented_premises: number | null
    medical_expense: number | null
    personal_adv_injury: number | null
    general_aggregate: number | null
    products_comp_op_aggregate: number | null
    commercial_general_liability: boolean
    claims_made: boolean
    occurrence: boolean
  }

  // Coverage Limits - Automobile Liability
  auto_liability: {
    combined_single_limit: number | null
    bodily_injury_per_person: number | null
    bodily_injury_per_accident: number | null
    property_damage: number | null
    any_auto: boolean
    owned_autos: boolean
    hired_autos: boolean
    non_owned_autos: boolean
  }

  // Coverage Limits - Umbrella/Excess
  umbrella_excess: {
    each_occurrence: number | null
    aggregate: number | null
    umbrella: boolean
    excess: boolean
    deductible: number | null
    retention: number | null
  }

  // Coverage Limits - Workers Compensation
  workers_comp: {
    each_accident: number | null
    disease_each_employee: number | null
    disease_policy_limit: number | null
    statutory_limits: boolean
  }

  // Endorsements
  endorsements: {
    additional_insured: boolean
    additional_insured_text: string | null
    waiver_of_subrogation: boolean
    waiver_of_subrogation_text: string | null
    primary_noncontributory: boolean
    primary_noncontributory_text: string | null
    blanket_additional_insured: boolean
    per_project_aggregate: boolean
  }

  // Description of Operations
  description_of_operations: string | null

  // Producer (Agent/Broker)
  producer_name: string | null
  producer_contact: string | null
  producer_phone: string | null
  producer_email: string | null

  // Confidence scores
  confidence: {
    overall: number
    carrier: number
    dates: number
    limits: number
    endorsements: number
  }

  // Form type detection
  form_type: 'acord_25' | 'acord_28' | 'generic' | 'unknown'

  // Raw OCR text for debugging
  raw_text: string
}

// Currency patterns: $1,000,000 or 1000000 or 1,000,000
const _CURRENCY_PATTERN = /\$?\s*([\d,]+(?:\.\d{2})?)/

// Date patterns
const _DATE_PATTERNS = [
  /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,  // MM/DD/YYYY or MM/DD/YY
  /(\d{4})-(\d{2})-(\d{2})/,           // YYYY-MM-DD
  /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/ // Month DD, YYYY
]

/**
 * Parse insurance certificate from OCR text
 */
export function parseInsuranceCertificate(text: string): InsuranceOcrResult {
  const normalizedText = normalizeText(text)
  const lines = normalizedText.split('\n')

  // Detect form type
  const formType = detectFormType(normalizedText)

  // Initialize result
  const result: InsuranceOcrResult = {
    certificate_number: null,
    certificate_holder: null,
    carrier_name: null,
    carrier_naic: null,
    policy_number: null,
    effective_date: null,
    expiration_date: null,
    insured_name: null,
    insured_address: null,
    general_liability: {
      each_occurrence: null,
      damage_to_rented_premises: null,
      medical_expense: null,
      personal_adv_injury: null,
      general_aggregate: null,
      products_comp_op_aggregate: null,
      commercial_general_liability: false,
      claims_made: false,
      occurrence: false,
    },
    auto_liability: {
      combined_single_limit: null,
      bodily_injury_per_person: null,
      bodily_injury_per_accident: null,
      property_damage: null,
      any_auto: false,
      owned_autos: false,
      hired_autos: false,
      non_owned_autos: false,
    },
    umbrella_excess: {
      each_occurrence: null,
      aggregate: null,
      umbrella: false,
      excess: false,
      deductible: null,
      retention: null,
    },
    workers_comp: {
      each_accident: null,
      disease_each_employee: null,
      disease_policy_limit: null,
      statutory_limits: false,
    },
    endorsements: {
      additional_insured: false,
      additional_insured_text: null,
      waiver_of_subrogation: false,
      waiver_of_subrogation_text: null,
      primary_noncontributory: false,
      primary_noncontributory_text: null,
      blanket_additional_insured: false,
      per_project_aggregate: false,
    },
    description_of_operations: null,
    producer_name: null,
    producer_contact: null,
    producer_phone: null,
    producer_email: null,
    confidence: {
      overall: 0,
      carrier: 0,
      dates: 0,
      limits: 0,
      endorsements: 0,
    },
    form_type: formType,
    raw_text: text,
  }

  // Extract data based on form type
  if (formType === 'acord_25' || formType === 'generic') {
    parseAcord25(normalizedText, lines, result)
  } else if (formType === 'acord_28') {
    parseAcord28(normalizedText, lines, result)
  } else {
    // Generic parsing for unknown forms
    parseGenericCertificate(normalizedText, lines, result)
  }

  // Calculate confidence scores
  calculateConfidence(result)

  return result
}

/**
 * Detect the type of insurance form
 */
function detectFormType(text: string): InsuranceOcrResult['form_type'] {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('acord 25') || lowerText.includes('certificate of liability insurance')) {
    return 'acord_25'
  }

  if (lowerText.includes('acord 28') || lowerText.includes('evidence of commercial property insurance')) {
    return 'acord_28'
  }

  if (lowerText.includes('certificate of insurance') ||
      lowerText.includes('general liability') ||
      lowerText.includes('workers compensation')) {
    return 'generic'
  }

  return 'unknown'
}

/**
 * Normalize OCR text for better parsing
 */
function normalizeText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    // Fix common OCR errors
    .replace(/\|/g, 'I')
    .replace(/0(?=[A-Za-z])/g, 'O')
    .replace(/1(?=nsur)/gi, 'I')
    // Normalize currency symbols
    .replace(/\$/g, '$')
    // Normalize dashes
    .replace(/[–—]/g, '-')
}

/**
 * Parse ACORD 25 Certificate of Liability Insurance
 */
function parseAcord25(text: string, lines: string[], result: InsuranceOcrResult): void {
  // Certificate Number
  const certMatch = text.match(/certificate\s*(?:number|#|no\.?)[:\s]*([A-Z0-9-]+)/i)
  if (certMatch) {
    result.certificate_number = certMatch[1].trim()
  }

  // Producer (Insurance Agent/Broker)
  const producerSection = extractSection(text, 'PRODUCER', ['INSURED', 'INSURER'])
  if (producerSection) {
    const prodLines = producerSection.split('\n').filter(l => l.trim())
    if (prodLines.length > 0) {
      result.producer_name = prodLines[0].trim()
    }
    // Extract phone
    const phoneMatch = producerSection.match(/(?:phone|tel|ph)?[:\s]*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/i)
    if (phoneMatch) {
      result.producer_phone = phoneMatch[0].replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    }
    // Extract email
    const emailMatch = producerSection.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
    if (emailMatch) {
      result.producer_email = emailMatch[0].toLowerCase()
    }
  }

  // Insured Name and Address
  const insuredSection = extractSection(text, 'INSURED', ['INSURER', 'COVERAGES'])
  if (insuredSection) {
    const insuredLines = insuredSection.split('\n').filter(l => l.trim())
    if (insuredLines.length > 0) {
      result.insured_name = insuredLines[0].trim()
    }
    if (insuredLines.length > 1) {
      result.insured_address = insuredLines.slice(1).join(', ').trim()
    }
  }

  // Carrier Name
  parseCarrierInfo(text, result)

  // Policy Number and Dates
  parsePolicyInfo(text, result)

  // General Liability Limits
  parseGeneralLiabilityLimits(text, result)

  // Auto Liability Limits
  parseAutoLiabilityLimits(text, result)

  // Umbrella/Excess Limits
  parseUmbrellaLimits(text, result)

  // Workers Comp Limits
  parseWorkersCompLimits(text, result)

  // Endorsements
  parseEndorsements(text, result)

  // Description of Operations
  const descMatch = text.match(/description\s*of\s*operations[^:]*[:\s]*([\s\S]*?)(?:certificate\s*holder|$)/i)
  if (descMatch) {
    result.description_of_operations = descMatch[1].trim().substring(0, 1000)
  }

  // Certificate Holder
  const holderSection = extractSection(text, 'CERTIFICATE HOLDER', ['CANCELLATION', 'ACORD'])
  if (holderSection) {
    result.certificate_holder = holderSection.split('\n').filter(l => l.trim()).slice(0, 3).join('\n')
  }
}

/**
 * Parse ACORD 28 Evidence of Commercial Property Insurance
 */
function parseAcord28(text: string, lines: string[], result: InsuranceOcrResult): void {
  // Similar structure but for property insurance
  // Certificate Number
  const certMatch = text.match(/certificate\s*(?:number|#|no\.?)[:\s]*([A-Z0-9-]+)/i)
  if (certMatch) {
    result.certificate_number = certMatch[1].trim()
  }

  // Basic info extraction (property-specific)
  parseCarrierInfo(text, result)
  parsePolicyInfo(text, result)

  // Property insurance typically doesn't have the same GL/Auto structure
  // but we can still extract key information
  const holderSection = extractSection(text, 'CERTIFICATE HOLDER', ['CANCELLATION', 'ACORD'])
  if (holderSection) {
    result.certificate_holder = holderSection.split('\n').filter(l => l.trim()).slice(0, 3).join('\n')
  }
}

/**
 * Parse generic insurance certificate
 */
function parseGenericCertificate(text: string, lines: string[], result: InsuranceOcrResult): void {
  parseCarrierInfo(text, result)
  parsePolicyInfo(text, result)
  parseGeneralLiabilityLimits(text, result)
  parseAutoLiabilityLimits(text, result)
  parseUmbrellaLimits(text, result)
  parseWorkersCompLimits(text, result)
  parseEndorsements(text, result)
}

/**
 * Extract carrier/insurer information
 */
function parseCarrierInfo(text: string, result: InsuranceOcrResult): void {
  // Common insurance carrier patterns
  const carrierPatterns = [
    /insurer\s*[a-e]?[:\s]+([A-Z][A-Za-z\s&]+(?:Insurance|Ins\.?|Mutual|Indemnity|Assurance|Casualty|Company|Corp|Co\.?))/gi,
    /(?:carrier|insurance\s*company)[:\s]+([A-Z][A-Za-z\s&]+)/gi,
    /(?:company\s*name)[:\s]+([A-Z][A-Za-z\s&]+)/gi,
  ]

  for (const pattern of carrierPatterns) {
    const match = pattern.exec(text)
    if (match) {
      result.carrier_name = match[1].trim()
      break
    }
  }

  // NAIC Number
  const naicMatch = text.match(/naic\s*(?:#|no\.?)?[:\s]*(\d{5})/i)
  if (naicMatch) {
    result.carrier_naic = naicMatch[1]
  }
}

/**
 * Extract policy information
 */
function parsePolicyInfo(text: string, result: InsuranceOcrResult): void {
  // Policy Number patterns
  const policyPatterns = [
    /policy\s*(?:number|#|no\.?)[:\s]*([A-Z0-9-]+)/gi,
    /pol\s*(?:#|no\.?)?[:\s]*([A-Z0-9-]+)/gi,
  ]

  for (const pattern of policyPatterns) {
    const match = pattern.exec(text)
    if (match) {
      result.policy_number = match[1].trim()
      break
    }
  }

  // Effective/Expiration Dates
  // Look for date pairs near "eff" and "exp" labels
  const effMatch = text.match(/(?:eff(?:ective)?|policy\s*period\s*from)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
  if (effMatch) {
    result.effective_date = normalizeDate(effMatch[1])
  }

  const expMatch = text.match(/(?:exp(?:iration)?|policy\s*period\s*to|ends?)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
  if (expMatch) {
    result.expiration_date = normalizeDate(expMatch[1])
  }

  // Fallback: look for date ranges like "01/01/2024 - 01/01/2025"
  if (!result.effective_date || !result.expiration_date) {
    const dateRangeMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–to]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (dateRangeMatch) {
      if (!result.effective_date) {result.effective_date = normalizeDate(dateRangeMatch[1])}
      if (!result.expiration_date) {result.expiration_date = normalizeDate(dateRangeMatch[2])}
    }
  }
}

/**
 * Parse General Liability limits
 */
function parseGeneralLiabilityLimits(text: string, result: InsuranceOcrResult): void {
  const glSection = text.toLowerCase()

  // Check coverage type
  result.general_liability.commercial_general_liability =
    glSection.includes('commercial general liability') || glSection.includes('cgl')
  result.general_liability.claims_made = glSection.includes('claims-made') || glSection.includes('claims made')
  result.general_liability.occurrence = glSection.includes('occurrence')

  // Each Occurrence limit
  const occurrenceMatch = text.match(/each\s*occurrence[:\s]*\$?\s*([\d,]+)/i)
  if (occurrenceMatch) {
    result.general_liability.each_occurrence = parseCurrency(occurrenceMatch[1])
  }

  // Damage to Rented Premises
  const rentedMatch = text.match(/(?:damage\s*to\s*rented\s*premises|fire\s*damage)[:\s]*\$?\s*([\d,]+)/i)
  if (rentedMatch) {
    result.general_liability.damage_to_rented_premises = parseCurrency(rentedMatch[1])
  }

  // Medical Expense
  const medMatch = text.match(/med(?:ical)?\s*exp(?:ense)?[:\s]*\$?\s*([\d,]+)/i)
  if (medMatch) {
    result.general_liability.medical_expense = parseCurrency(medMatch[1])
  }

  // Personal & Advertising Injury
  const paiMatch = text.match(/personal\s*(?:&|and)?\s*adv(?:ertising)?\s*injury[:\s]*\$?\s*([\d,]+)/i)
  if (paiMatch) {
    result.general_liability.personal_adv_injury = parseCurrency(paiMatch[1])
  }

  // General Aggregate
  const aggMatch = text.match(/general\s*aggregate[:\s]*\$?\s*([\d,]+)/i)
  if (aggMatch) {
    result.general_liability.general_aggregate = parseCurrency(aggMatch[1])
  }

  // Products-Completed Operations Aggregate
  const prodMatch = text.match(/products[:\s-]*comp(?:leted)?[:\s-]*op(?:erations)?[:\s]*(?:agg(?:regate)?)?[:\s]*\$?\s*([\d,]+)/i)
  if (prodMatch) {
    result.general_liability.products_comp_op_aggregate = parseCurrency(prodMatch[1])
  }
}

/**
 * Parse Auto Liability limits
 */
function parseAutoLiabilityLimits(text: string, result: InsuranceOcrResult): void {
  const autoSection = text.toLowerCase()

  // Check auto types
  result.auto_liability.any_auto = autoSection.includes('any auto')
  result.auto_liability.owned_autos = autoSection.includes('owned') && autoSection.includes('auto')
  result.auto_liability.hired_autos = autoSection.includes('hired') && autoSection.includes('auto')
  result.auto_liability.non_owned_autos = autoSection.includes('non-owned') || autoSection.includes('non owned')

  // Combined Single Limit
  const cslMatch = text.match(/combined\s*single\s*limit[:\s]*\$?\s*([\d,]+)/i)
  if (cslMatch) {
    result.auto_liability.combined_single_limit = parseCurrency(cslMatch[1])
  }

  // Bodily Injury Per Person
  const biPersonMatch = text.match(/bodily\s*injury[:\s]*\(?\s*per\s*person\s*\)?[:\s]*\$?\s*([\d,]+)/i)
  if (biPersonMatch) {
    result.auto_liability.bodily_injury_per_person = parseCurrency(biPersonMatch[1])
  }

  // Bodily Injury Per Accident
  const biAccidentMatch = text.match(/bodily\s*injury[:\s]*\(?\s*per\s*accident\s*\)?[:\s]*\$?\s*([\d,]+)/i)
  if (biAccidentMatch) {
    result.auto_liability.bodily_injury_per_accident = parseCurrency(biAccidentMatch[1])
  }

  // Property Damage
  const pdMatch = text.match(/property\s*damage[:\s]*\$?\s*([\d,]+)/i)
  if (pdMatch) {
    result.auto_liability.property_damage = parseCurrency(pdMatch[1])
  }
}

/**
 * Parse Umbrella/Excess limits
 */
function parseUmbrellaLimits(text: string, result: InsuranceOcrResult): void {
  const umbrellaSection = text.toLowerCase()

  result.umbrella_excess.umbrella = umbrellaSection.includes('umbrella')
  result.umbrella_excess.excess = umbrellaSection.includes('excess')

  // Each Occurrence
  const occMatch = text.match(/umbrella[^$]*each\s*occurrence[:\s]*\$?\s*([\d,]+)/i) ||
                   text.match(/excess[^$]*each\s*occurrence[:\s]*\$?\s*([\d,]+)/i)
  if (occMatch) {
    result.umbrella_excess.each_occurrence = parseCurrency(occMatch[1])
  }

  // Aggregate
  const aggMatch = text.match(/umbrella[^$]*aggregate[:\s]*\$?\s*([\d,]+)/i) ||
                   text.match(/excess[^$]*aggregate[:\s]*\$?\s*([\d,]+)/i)
  if (aggMatch) {
    result.umbrella_excess.aggregate = parseCurrency(aggMatch[1])
  }

  // Deductible
  const dedMatch = text.match(/deductible[:\s]*\$?\s*([\d,]+)/i)
  if (dedMatch) {
    result.umbrella_excess.deductible = parseCurrency(dedMatch[1])
  }

  // Retention
  const retMatch = text.match(/retention[:\s]*\$?\s*([\d,]+)/i)
  if (retMatch) {
    result.umbrella_excess.retention = parseCurrency(retMatch[1])
  }
}

/**
 * Parse Workers Compensation limits
 */
function parseWorkersCompLimits(text: string, result: InsuranceOcrResult): void {
  const wcSection = text.toLowerCase()

  result.workers_comp.statutory_limits =
    wcSection.includes('statutory') || wcSection.includes('wc statutory limits')

  // Each Accident
  const accidentMatch = text.match(/(?:e\.?l\.?\s*)?each\s*accident[:\s]*\$?\s*([\d,]+)/i)
  if (accidentMatch) {
    result.workers_comp.each_accident = parseCurrency(accidentMatch[1])
  }

  // Disease - Each Employee
  const diseaseEmpMatch = text.match(/disease[:\s-]*(?:e\.?l\.?\s*)?(?:each\s*)?employee[:\s]*\$?\s*([\d,]+)/i)
  if (diseaseEmpMatch) {
    result.workers_comp.disease_each_employee = parseCurrency(diseaseEmpMatch[1])
  }

  // Disease - Policy Limit
  const diseasePolicyMatch = text.match(/disease[:\s-]*policy\s*limit[:\s]*\$?\s*([\d,]+)/i)
  if (diseasePolicyMatch) {
    result.workers_comp.disease_policy_limit = parseCurrency(diseasePolicyMatch[1])
  }
}

/**
 * Parse endorsements from certificate
 */
function parseEndorsements(text: string, result: InsuranceOcrResult): void {
  const lowerText = text.toLowerCase()

  // Additional Insured
  result.endorsements.additional_insured =
    lowerText.includes('additional insured') &&
    !lowerText.includes('no additional insured')

  if (result.endorsements.additional_insured) {
    const aiMatch = text.match(/additional\s*insured[^.]*\.?/i)
    if (aiMatch) {
      result.endorsements.additional_insured_text = aiMatch[0].trim().substring(0, 200)
    }
  }

  // Blanket Additional Insured
  result.endorsements.blanket_additional_insured =
    lowerText.includes('blanket') && lowerText.includes('additional insured')

  // Waiver of Subrogation
  result.endorsements.waiver_of_subrogation =
    lowerText.includes('waiver of subrogation') ||
    lowerText.includes('waiver of sub')

  if (result.endorsements.waiver_of_subrogation) {
    const wosMatch = text.match(/waiver\s*of\s*subrogation[^.]*\.?/i)
    if (wosMatch) {
      result.endorsements.waiver_of_subrogation_text = wosMatch[0].trim().substring(0, 200)
    }
  }

  // Primary & Non-Contributory
  result.endorsements.primary_noncontributory =
    (lowerText.includes('primary') && lowerText.includes('non-contributory')) ||
    lowerText.includes('primary/non-contributory') ||
    lowerText.includes('primary and non-contributory')

  if (result.endorsements.primary_noncontributory) {
    const pncMatch = text.match(/primary[^.]*non-?contributory[^.]*\.?/i)
    if (pncMatch) {
      result.endorsements.primary_noncontributory_text = pncMatch[0].trim().substring(0, 200)
    }
  }

  // Per Project Aggregate
  result.endorsements.per_project_aggregate =
    lowerText.includes('per project') || lowerText.includes('per location')
}

/**
 * Extract a section of text between headers
 */
function extractSection(text: string, startHeader: string, endHeaders: string[]): string | null {
  const startPattern = new RegExp(startHeader.replace(/\s+/g, '\\s*'), 'i')
  const startMatch = startPattern.exec(text)

  if (!startMatch) {return null}

  let endIndex = text.length
  for (const endHeader of endHeaders) {
    const endPattern = new RegExp(endHeader.replace(/\s+/g, '\\s*'), 'i')
    const endMatch = endPattern.exec(text.substring(startMatch.index + startMatch[0].length))
    if (endMatch) {
      const potentialEnd = startMatch.index + startMatch[0].length + endMatch.index
      if (potentialEnd < endIndex) {
        endIndex = potentialEnd
      }
    }
  }

  return text.substring(startMatch.index + startMatch[0].length, endIndex).trim()
}

/**
 * Parse currency string to number
 */
function parseCurrency(str: string): number | null {
  if (!str) {return null}
  const cleaned = str.replace(/[,$\s]/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

/**
 * Normalize date to ISO format
 */
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) {return null}

  // Try MM/DD/YYYY or MM/DD/YY
  const mdyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (mdyMatch) {
    const [_, month, day, year] = mdyMatch
    const fullYear = year.length === 2 ? `20${year}` : year
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try YYYY-MM-DD (already ISO)
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return isoMatch[0]
  }

  return null
}

/**
 * Calculate confidence scores for extracted data
 */
function calculateConfidence(result: InsuranceOcrResult): void {
  let carrierScore = 0
  let datesScore = 0
  let limitsScore = 0
  let endorsementsScore = 0

  // Carrier confidence
  if (result.carrier_name) {carrierScore += 50}
  if (result.carrier_naic) {carrierScore += 30}
  if (result.policy_number) {carrierScore += 20}
  result.confidence.carrier = Math.min(100, carrierScore)

  // Dates confidence
  if (result.effective_date) {datesScore += 50}
  if (result.expiration_date) {datesScore += 50}
  result.confidence.dates = datesScore

  // Limits confidence
  const gl = result.general_liability
  if (gl.each_occurrence) {limitsScore += 20}
  if (gl.general_aggregate) {limitsScore += 20}
  if (result.auto_liability.combined_single_limit) {limitsScore += 20}
  if (result.umbrella_excess.each_occurrence) {limitsScore += 20}
  if (result.workers_comp.each_accident || result.workers_comp.statutory_limits) {limitsScore += 20}
  result.confidence.limits = Math.min(100, limitsScore)

  // Endorsements confidence
  if (result.endorsements.additional_insured) {endorsementsScore += 35}
  if (result.endorsements.waiver_of_subrogation) {endorsementsScore += 35}
  if (result.endorsements.primary_noncontributory) {endorsementsScore += 30}
  result.confidence.endorsements = Math.min(100, endorsementsScore)

  // Overall confidence
  result.confidence.overall = Math.round(
    (result.confidence.carrier * 0.2 +
     result.confidence.dates * 0.3 +
     result.confidence.limits * 0.3 +
     result.confidence.endorsements * 0.2)
  )
}

/**
 * Validate extracted data against project requirements
 */
export interface ComplianceValidation {
  is_compliant: boolean
  issues: ComplianceIssue[]
  warnings: ComplianceIssue[]
}

export interface ComplianceIssue {
  field: string
  message: string
  required_value?: number | string
  actual_value?: number | string | null
  severity: 'error' | 'warning'
}

export interface ProjectRequirements {
  min_each_occurrence?: number
  min_general_aggregate?: number
  min_auto_combined_single_limit?: number
  min_umbrella_each_occurrence?: number
  min_workers_comp_each_accident?: number
  additional_insured_required?: boolean
  waiver_of_subrogation_required?: boolean
  primary_noncontributory_required?: boolean
}

/**
 * Validate insurance certificate against project requirements
 */
export function validateAgainstRequirements(
  result: InsuranceOcrResult,
  requirements: ProjectRequirements
): ComplianceValidation {
  const validation: ComplianceValidation = {
    is_compliant: true,
    issues: [],
    warnings: [],
  }

  // Check GL Each Occurrence
  if (requirements.min_each_occurrence) {
    const actual = result.general_liability.each_occurrence
    if (!actual || actual < requirements.min_each_occurrence) {
      validation.is_compliant = false
      validation.issues.push({
        field: 'general_liability.each_occurrence',
        message: `General Liability Each Occurrence limit is insufficient`,
        required_value: requirements.min_each_occurrence,
        actual_value: actual,
        severity: 'error',
      })
    }
  }

  // Check GL General Aggregate
  if (requirements.min_general_aggregate) {
    const actual = result.general_liability.general_aggregate
    if (!actual || actual < requirements.min_general_aggregate) {
      validation.is_compliant = false
      validation.issues.push({
        field: 'general_liability.general_aggregate',
        message: `General Liability Aggregate limit is insufficient`,
        required_value: requirements.min_general_aggregate,
        actual_value: actual,
        severity: 'error',
      })
    }
  }

  // Check Auto CSL
  if (requirements.min_auto_combined_single_limit) {
    const actual = result.auto_liability.combined_single_limit
    if (!actual || actual < requirements.min_auto_combined_single_limit) {
      validation.is_compliant = false
      validation.issues.push({
        field: 'auto_liability.combined_single_limit',
        message: `Auto Liability Combined Single Limit is insufficient`,
        required_value: requirements.min_auto_combined_single_limit,
        actual_value: actual,
        severity: 'error',
      })
    }
  }

  // Check Umbrella
  if (requirements.min_umbrella_each_occurrence) {
    const actual = result.umbrella_excess.each_occurrence
    if (!actual || actual < requirements.min_umbrella_each_occurrence) {
      validation.is_compliant = false
      validation.issues.push({
        field: 'umbrella_excess.each_occurrence',
        message: `Umbrella/Excess Each Occurrence limit is insufficient`,
        required_value: requirements.min_umbrella_each_occurrence,
        actual_value: actual,
        severity: 'error',
      })
    }
  }

  // Check Workers Comp
  if (requirements.min_workers_comp_each_accident) {
    const actual = result.workers_comp.each_accident
    const hasStatutory = result.workers_comp.statutory_limits
    if (!hasStatutory && (!actual || actual < requirements.min_workers_comp_each_accident)) {
      validation.is_compliant = false
      validation.issues.push({
        field: 'workers_comp.each_accident',
        message: `Workers Compensation Each Accident limit is insufficient`,
        required_value: requirements.min_workers_comp_each_accident,
        actual_value: actual,
        severity: 'error',
      })
    }
  }

  // Check Additional Insured
  if (requirements.additional_insured_required && !result.endorsements.additional_insured) {
    validation.is_compliant = false
    validation.issues.push({
      field: 'endorsements.additional_insured',
      message: `Additional Insured endorsement is required but not found`,
      required_value: 'Yes',
      actual_value: 'No',
      severity: 'error',
    })
  }

  // Check Waiver of Subrogation
  if (requirements.waiver_of_subrogation_required && !result.endorsements.waiver_of_subrogation) {
    validation.is_compliant = false
    validation.issues.push({
      field: 'endorsements.waiver_of_subrogation',
      message: `Waiver of Subrogation endorsement is required but not found`,
      required_value: 'Yes',
      actual_value: 'No',
      severity: 'error',
    })
  }

  // Check Primary & Non-Contributory
  if (requirements.primary_noncontributory_required && !result.endorsements.primary_noncontributory) {
    validation.is_compliant = false
    validation.issues.push({
      field: 'endorsements.primary_noncontributory',
      message: `Primary & Non-Contributory endorsement is required but not found`,
      required_value: 'Yes',
      actual_value: 'No',
      severity: 'error',
    })
  }

  // Add warnings for low confidence scores
  if (result.confidence.overall < 70) {
    validation.warnings.push({
      field: 'confidence.overall',
      message: `Low overall confidence (${result.confidence.overall}%) - manual review recommended`,
      actual_value: result.confidence.overall,
      severity: 'warning',
    })
  }

  if (!result.expiration_date) {
    validation.warnings.push({
      field: 'expiration_date',
      message: `Could not extract expiration date - manual review required`,
      severity: 'warning',
    })
  }

  return validation
}
