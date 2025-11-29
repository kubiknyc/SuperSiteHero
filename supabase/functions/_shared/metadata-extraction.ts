// Metadata extraction patterns for construction documents
// Uses regex patterns to extract structured data from OCR text

export interface ExtractedMetadata {
  extracted_dates: ExtractedDate[]
  extracted_numbers: ExtractedNumbers
  extracted_entities: ExtractedEntity[]
  extracted_contacts: ExtractedContact[]
  auto_tags: string[]
}

export interface ExtractedDate {
  type: string
  value: string
  confidence: number
  context: string
}

export interface ExtractedNumbers {
  project_number?: string
  drawing_number?: string
  sheet_number?: string
  revision?: string
  specification_section?: string
  rfi_number?: string
  submittal_number?: string
  change_order_number?: string
}

export interface ExtractedEntity {
  type: 'company' | 'person' | 'address' | 'project_name'
  value: string
  confidence: number
}

export interface ExtractedContact {
  type: 'email' | 'phone' | 'fax' | 'website'
  value: string
}

// Date extraction patterns
const DATE_PATTERNS: { pattern: RegExp; type: string }[] = [
  // Issue Date: January 15, 2024
  { pattern: /issue\s*date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi, type: 'issue_date' },
  { pattern: /issued[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi, type: 'issue_date' },
  // Date: 01/15/2024 or 2024-01-15
  { pattern: /date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi, type: 'date' },
  { pattern: /date[:\s]+(\d{4}-\d{2}-\d{2})/gi, type: 'date' },
  // Received Date
  { pattern: /received[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi, type: 'received_date' },
  { pattern: /received[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi, type: 'received_date' },
  // Revision Date
  { pattern: /rev(?:ision)?[:\s]+date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi, type: 'revision_date' },
  // Due Date
  { pattern: /due\s*date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi, type: 'due_date' },
  { pattern: /due[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi, type: 'due_date' },
  // General date formats
  { pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'general' },
  { pattern: /(\d{4}-\d{2}-\d{2})/g, type: 'general' },
  { pattern: /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/g, type: 'general' },
]

// Number/identifier extraction patterns
const NUMBER_PATTERNS: { pattern: RegExp; field: keyof ExtractedNumbers }[] = [
  // Project Number
  { pattern: /project\s*(?:#|no\.?|number)[:\s]*([A-Z0-9-]+)/gi, field: 'project_number' },
  { pattern: /job\s*(?:#|no\.?|number)[:\s]*([A-Z0-9-]+)/gi, field: 'project_number' },
  // Drawing Number
  { pattern: /(?:dwg|drawing)\s*(?:#|no\.?|number)?[:\s]*([A-Z]-?\d+(?:\.\d+)?)/gi, field: 'drawing_number' },
  { pattern: /sheet\s*(?:#|no\.?)?[:\s]*([A-Z]-?\d+(?:\.\d+)?)/gi, field: 'sheet_number' },
  // Revision
  { pattern: /rev(?:ision)?[:\s]*([A-Z0-9]+)/gi, field: 'revision' },
  { pattern: /\brev\.?\s*([A-Z0-9]+)\b/gi, field: 'revision' },
  // Specification Section
  { pattern: /section\s*(\d{2}\s*\d{2}\s*\d{2})/gi, field: 'specification_section' },
  { pattern: /division\s*(\d{2})/gi, field: 'specification_section' },
  // RFI Number
  { pattern: /rfi\s*(?:#|no\.?)?[:\s]*(\d+)/gi, field: 'rfi_number' },
  // Submittal Number
  { pattern: /submittal\s*(?:#|no\.?)?[:\s]*([A-Z0-9-]+)/gi, field: 'submittal_number' },
  // Change Order Number
  { pattern: /(?:change\s*order|co)\s*(?:#|no\.?)?[:\s]*(\d+)/gi, field: 'change_order_number' },
]

// Entity extraction patterns
const ENTITY_PATTERNS: { pattern: RegExp; type: ExtractedEntity['type'] }[] = [
  // Company patterns (common suffixes)
  { pattern: /([A-Z][A-Za-z\s&]+(?:Inc\.?|LLC|Corp\.?|Co\.?|Ltd\.?|Company|Associates|Group))/g, type: 'company' },
  // Architect/Engineer firm patterns
  { pattern: /(?:architect|engineer|design)[:\s]*([A-Z][A-Za-z\s&]+)/gi, type: 'company' },
  // Contractor patterns
  { pattern: /(?:general\s*contractor|gc|contractor)[:\s]*([A-Z][A-Za-z\s&]+)/gi, type: 'company' },
  // Owner patterns
  { pattern: /(?:owner|client)[:\s]*([A-Z][A-Za-z\s&]+)/gi, type: 'company' },
  // Person name patterns (Title + Name)
  { pattern: /(?:prepared\s*by|submitted\s*by|approved\s*by|reviewed\s*by)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi, type: 'person' },
  // Project Name
  { pattern: /project\s*(?:name)?[:\s]*([A-Z][A-Za-z0-9\s-]+(?:Building|Center|Tower|Plaza|Complex|Development|Project))/gi, type: 'project_name' },
]

// Contact extraction patterns
const CONTACT_PATTERNS: { pattern: RegExp; type: ExtractedContact['type'] }[] = [
  // Email
  { pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, type: 'email' },
  // Phone (various formats)
  { pattern: /(?:phone|tel|ph)[:\s]*([+]?[\d\s()-]{10,})/gi, type: 'phone' },
  { pattern: /(\(\d{3}\)\s*\d{3}[-.\s]?\d{4})/g, type: 'phone' },
  { pattern: /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g, type: 'phone' },
  // Fax
  { pattern: /(?:fax|facsimile)[:\s]*([+]?[\d\s()-]{10,})/gi, type: 'fax' },
  // Website
  { pattern: /(https?:\/\/[^\s]+)/gi, type: 'website' },
  { pattern: /(www\.[^\s]+)/gi, type: 'website' },
]

// Auto-tag keywords
const AUTO_TAG_KEYWORDS: string[] = [
  'urgent', 'priority', 'critical', 'review required', 'for approval',
  'approved', 'rejected', 'revised', 'superseded', 'void', 'final',
  'preliminary', 'draft', 'construction', 'as-built', 'record',
  'addendum', 'bulletin', 'directive', 'notice', 'warning',
  'confidential', 'not for construction', 'for reference only'
]

/**
 * Extract metadata from document text
 */
export function extractMetadata(
  text: string,
  fileName: string = ''
): ExtractedMetadata {
  const fullText = text + ' ' + fileName
  const normalizedText = fullText.toLowerCase()

  return {
    extracted_dates: extractDates(fullText),
    extracted_numbers: extractNumbers(fullText),
    extracted_entities: extractEntities(fullText),
    extracted_contacts: extractContacts(fullText),
    auto_tags: extractAutoTags(normalizedText),
  }
}

/**
 * Extract dates from text
 */
function extractDates(text: string): ExtractedDate[] {
  const dates: ExtractedDate[] = []
  const seen = new Set<string>()

  for (const { pattern, type } of DATE_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      const value = normalizeDate(match[1])
      if (value && !seen.has(`${type}:${value}`)) {
        seen.add(`${type}:${value}`)

        // Extract context (surrounding text)
        const start = Math.max(0, match.index - 20)
        const end = Math.min(text.length, match.index + match[0].length + 20)
        const context = text.slice(start, end).replace(/\s+/g, ' ').trim()

        dates.push({
          type,
          value,
          confidence: type === 'general' ? 60 : 85,
          context,
        })
      }
    }
  }

  // Sort by confidence and limit
  return dates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
}

/**
 * Normalize date to ISO format
 */
function normalizeDate(dateStr: string): string | null {
  try {
    // Try parsing different formats
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }

    // Try MM/DD/YYYY format
    const mdyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
    if (mdyMatch) {
      const [_, month, day, year] = mdyMatch
      const fullYear = year.length === 2 ? `20${year}` : year
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return null
  } catch {
    return null
  }
}

/**
 * Extract numbers/identifiers from text
 */
function extractNumbers(text: string): ExtractedNumbers {
  const numbers: ExtractedNumbers = {}

  for (const { pattern, field } of NUMBER_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(text)
    if (match && !numbers[field]) {
      numbers[field] = match[1].trim().toUpperCase()
    }
  }

  return numbers
}

/**
 * Extract entities (companies, people) from text
 */
function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []
  const seen = new Set<string>()

  for (const { pattern, type } of ENTITY_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].trim()

      // Skip if too short or already seen
      if (value.length < 3 || seen.has(value.toLowerCase())) {
        continue
      }

      seen.add(value.toLowerCase())
      entities.push({
        type,
        value,
        confidence: 70,
      })
    }
  }

  // Limit to top 10
  return entities.slice(0, 10)
}

/**
 * Extract contact information from text
 */
function extractContacts(text: string): ExtractedContact[] {
  const contacts: ExtractedContact[] = []
  const seen = new Set<string>()

  for (const { pattern, type } of CONTACT_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].trim()

      // Skip if already seen
      if (seen.has(value.toLowerCase())) {
        continue
      }

      seen.add(value.toLowerCase())
      contacts.push({ type, value })
    }
  }

  return contacts.slice(0, 10)
}

/**
 * Extract auto-tags from text
 */
function extractAutoTags(text: string): string[] {
  const tags: string[] = []

  for (const keyword of AUTO_TAG_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      tags.push(keyword)
    }
  }

  return tags
}

/**
 * Get flattened fields for UI display
 */
export function getFlattenedFields(metadata: ExtractedMetadata): { field: string; value: string; confidence: number }[] {
  const fields: { field: string; value: string; confidence: number }[] = []

  // Add numbers
  for (const [field, value] of Object.entries(metadata.extracted_numbers)) {
    if (value) {
      fields.push({ field, value, confidence: 80 })
    }
  }

  // Add specific dates (not general)
  for (const date of metadata.extracted_dates) {
    if (date.type !== 'general') {
      fields.push({
        field: date.type,
        value: date.value,
        confidence: date.confidence,
      })
    }
  }

  return fields
}
