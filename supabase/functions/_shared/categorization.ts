// Document categorization logic for construction documents
// Uses keyword matching and pattern recognition to classify documents

export type DocumentCategoryType =
  | 'drawing'
  | 'specification'
  | 'submittal'
  | 'contract'
  | 'rfi'
  | 'change_order'
  | 'meeting_minutes'
  | 'schedule'
  | 'safety_report'
  | 'permit'
  | 'inspection'
  | 'correspondence'
  | 'photo'
  | 'report'
  | 'invoice'
  | 'insurance'
  | 'other'

export interface CategoryResult {
  primary_category: DocumentCategoryType
  sub_category: string | null
  confidence: number
  suggested_categories: { category: DocumentCategoryType; confidence: number }[]
  detected_keywords: string[]
}

// Category keywords with weights
const CATEGORY_KEYWORDS: Record<DocumentCategoryType, { keywords: string[]; weight: number }> = {
  drawing: {
    keywords: [
      'drawing', 'dwg', 'plan', 'elevation', 'section', 'detail', 'sheet',
      'floor plan', 'roof plan', 'site plan', 'framing plan', 'foundation',
      'a-', 's-', 'e-', 'm-', 'p-', // Drawing sheet prefixes
      'architectural', 'structural', 'mechanical', 'electrical', 'plumbing',
      'scale:', '1/4"=1\'', '1/8"=1\'', 'north arrow', 'revision'
    ],
    weight: 1.0,
  },
  specification: {
    keywords: [
      'specification', 'spec', 'section', 'division', 'csi', 'masterformat',
      'part 1', 'part 2', 'part 3', 'general', 'products', 'execution',
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      'submittals', 'quality assurance', 'delivery', 'storage', 'handling',
      'applicable publications', 'references'
    ],
    weight: 0.9,
  },
  submittal: {
    keywords: [
      'submittal', 'shop drawing', 'product data', 'sample', 'mock-up',
      'manufacturer', 'product information', 'technical data',
      'catalog', 'cut sheet', 'brochure', 'warranty', 'installation',
      'approved', 'revise and resubmit', 'rejected', 'reviewed'
    ],
    weight: 1.0,
  },
  contract: {
    keywords: [
      'contract', 'agreement', 'terms and conditions', 'scope of work',
      'general conditions', 'supplementary conditions', 'addendum',
      'amendment', 'modification', 'change order', 'owner', 'contractor',
      'subcontractor', 'bid', 'proposal', 'award', 'signature', 'executed'
    ],
    weight: 0.95,
  },
  rfi: {
    keywords: [
      'rfi', 'request for information', 'clarification', 'question',
      'response', 'answer', 'query', 'inquiry', 'rfi #', 'rfi no',
      'please clarify', 'please confirm', 'please advise'
    ],
    weight: 1.0,
  },
  change_order: {
    keywords: [
      'change order', 'co #', 'co no', 'modification', 'amendment',
      'change directive', 'construction change', 'ccd', 'pcco', 'pco',
      'cost impact', 'schedule impact', 'time extension', 'additional cost',
      'credit', 'deduct', 'add'
    ],
    weight: 1.0,
  },
  meeting_minutes: {
    keywords: [
      'meeting minutes', 'meeting notes', 'minutes', 'meeting', 'agenda',
      'attendees', 'action items', 'discussion', 'next steps',
      'oac meeting', 'progress meeting', 'coordination meeting',
      'pre-construction', 'kickoff'
    ],
    weight: 0.95,
  },
  schedule: {
    keywords: [
      'schedule', 'gantt', 'timeline', 'milestone', 'critical path',
      'baseline', 'project schedule', 'construction schedule',
      'look ahead', '3 week', '2 week', 'weekly schedule',
      'start date', 'finish date', 'duration', 'predecessor', 'successor'
    ],
    weight: 0.9,
  },
  safety_report: {
    keywords: [
      'safety', 'incident', 'accident', 'injury', 'osha', 'hazard',
      'jha', 'job hazard analysis', 'toolbox talk', 'safety meeting',
      'near miss', 'first aid', 'recordable', 'lost time',
      'ppe', 'personal protective equipment', 'safety data sheet', 'sds', 'msds'
    ],
    weight: 1.0,
  },
  permit: {
    keywords: [
      'permit', 'building permit', 'demolition permit', 'grading permit',
      'electrical permit', 'plumbing permit', 'mechanical permit',
      'certificate of occupancy', 'co', 'tco', 'approval', 'license',
      'variance', 'zoning', 'code compliance'
    ],
    weight: 0.95,
  },
  inspection: {
    keywords: [
      'inspection', 'inspect', 'checklist', 'punch list', 'punchlist',
      'deficiency', 'observation', 'pass', 'fail', 'reinspection',
      'field report', 'quality control', 'qc', 'qa', 'third party',
      'special inspection', 'structural observation'
    ],
    weight: 0.9,
  },
  correspondence: {
    keywords: [
      'letter', 'email', 'memo', 'memorandum', 'notice', 'notification',
      'correspondence', 'transmittal', 'dear', 'sincerely', 'regards',
      're:', 'subject:', 'to:', 'from:', 'cc:', 'attention'
    ],
    weight: 0.7,
  },
  photo: {
    keywords: [
      'photo', 'photograph', 'image', 'picture', 'progress photo',
      'site photo', 'documentation', 'jpeg', 'jpg', 'png',
      'before', 'after', 'existing conditions'
    ],
    weight: 0.8,
  },
  report: {
    keywords: [
      'report', 'daily report', 'weekly report', 'monthly report',
      'progress report', 'status report', 'summary', 'analysis',
      'log', 'daily log', 'superintendent report', 'field report'
    ],
    weight: 0.85,
  },
  invoice: {
    keywords: [
      'invoice', 'payment', 'billing', 'pay application', 'aia g702',
      'aia g703', 'schedule of values', 'sov', 'retainage', 'lien waiver',
      'release', 'payment request', 'amount due', 'balance due'
    ],
    weight: 0.95,
  },
  insurance: {
    keywords: [
      'insurance', 'certificate', 'coi', 'liability', 'workers compensation',
      'policy', 'coverage', 'endorsement', 'additional insured',
      'indemnification', 'bonding', 'surety', 'performance bond', 'payment bond'
    ],
    weight: 0.95,
  },
  other: {
    keywords: [],
    weight: 0.1,
  },
}

// Sub-category patterns
const SUB_CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  architectural: [/architect/i, /a-\d+/i, /floor plan/i, /elevation/i, /reflected ceiling/i],
  structural: [/structur/i, /s-\d+/i, /framing/i, /foundation/i, /rebar/i, /concrete/i],
  mechanical: [/mechanic/i, /hvac/i, /m-\d+/i, /ductwork/i, /equipment/i],
  electrical: [/electric/i, /e-\d+/i, /lighting/i, /panel/i, /circuit/i, /power/i],
  plumbing: [/plumb/i, /p-\d+/i, /piping/i, /fixture/i, /sanitary/i, /water/i],
  civil: [/civil/i, /c-\d+/i, /site/i, /grading/i, /stormwater/i, /utility/i],
  landscape: [/landscape/i, /l-\d+/i, /planting/i, /irrigation/i, /hardscape/i],
  fire_protection: [/fire/i, /fp-\d+/i, /sprinkler/i, /alarm/i, /suppression/i],
}

/**
 * Categorize a document based on its text content
 */
export function categorizeDocument(
  text: string,
  fileName: string = ''
): CategoryResult {
  const normalizedText = (text + ' ' + fileName).toLowerCase()
  const scores: Record<DocumentCategoryType, number> = {} as Record<DocumentCategoryType, number>
  const detectedKeywords: string[] = []

  // Score each category based on keyword matches
  for (const [category, { keywords, weight }] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    const categoryKeywords: string[] = []

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi')
      const matches = normalizedText.match(regex)

      if (matches) {
        score += matches.length * weight
        if (!categoryKeywords.includes(keyword)) {
          categoryKeywords.push(keyword)
        }
      }
    }

    scores[category as DocumentCategoryType] = score
    detectedKeywords.push(...categoryKeywords)
  }

  // Sort categories by score
  const sortedCategories = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])

  // Calculate total score for normalization
  const totalScore = sortedCategories.reduce((sum, [_, score]) => sum + score, 0)

  // Determine primary category
  let primaryCategory: DocumentCategoryType = 'other'
  let confidence = 0

  if (sortedCategories.length > 0) {
    primaryCategory = sortedCategories[0][0] as DocumentCategoryType
    confidence = totalScore > 0
      ? Math.min(95, (sortedCategories[0][1] / totalScore) * 100)
      : 50
  }

  // Detect sub-category
  const subCategory = detectSubCategory(normalizedText)

  // Build suggested categories (top 3)
  const suggestedCategories = sortedCategories
    .slice(0, 3)
    .map(([category, score]) => ({
      category: category as DocumentCategoryType,
      confidence: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
    }))

  return {
    primary_category: primaryCategory,
    sub_category: subCategory,
    confidence: Math.round(confidence),
    suggested_categories: suggestedCategories,
    detected_keywords: [...new Set(detectedKeywords)].slice(0, 20),
  }
}

/**
 * Detect sub-category (discipline) from text
 */
function detectSubCategory(text: string): string | null {
  for (const [subCategory, patterns] of Object.entries(SUB_CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return subCategory
      }
    }
  }
  return null
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: DocumentCategoryType): string {
  const displayNames: Record<DocumentCategoryType, string> = {
    drawing: 'Drawing',
    specification: 'Specification',
    submittal: 'Submittal',
    contract: 'Contract',
    rfi: 'RFI',
    change_order: 'Change Order',
    meeting_minutes: 'Meeting Minutes',
    schedule: 'Schedule',
    safety_report: 'Safety Report',
    permit: 'Permit',
    inspection: 'Inspection',
    correspondence: 'Correspondence',
    photo: 'Photo',
    report: 'Report',
    invoice: 'Invoice',
    insurance: 'Insurance',
    other: 'Other',
  }
  return displayNames[category] || 'Other'
}
