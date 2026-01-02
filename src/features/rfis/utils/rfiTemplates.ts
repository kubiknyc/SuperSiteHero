/**
 * RFI Templates
 *
 * Pre-defined templates for common RFI types in construction.
 * These help standardize requests and ensure all necessary information is included.
 */

export interface RFITemplate {
  id: string
  name: string
  category: RFITemplateCategory
  description: string
  discipline: string
  priority: 'low' | 'normal' | 'high'
  titleTemplate: string
  descriptionTemplate: string
  additionalInfoPrompts: string[]
  hasCostImpact: boolean
  hasScheduleImpact: boolean
  tags: string[]
}

export type RFITemplateCategory =
  | 'design_clarification'
  | 'conflict_coordination'
  | 'material_substitution'
  | 'field_condition'
  | 'code_compliance'
  | 'shop_drawing'
  | 'specification'
  | 'owner_decision'

export const RFI_TEMPLATE_CATEGORIES: Record<RFITemplateCategory, { label: string; description: string }> = {
  design_clarification: {
    label: 'Design Clarification',
    description: 'Questions about drawings, details, or design intent',
  },
  conflict_coordination: {
    label: 'Conflict/Coordination',
    description: 'MEP conflicts, clashes, or coordination issues',
  },
  material_substitution: {
    label: 'Material Substitution',
    description: 'Requests to use alternative materials or products',
  },
  field_condition: {
    label: 'Field Condition',
    description: 'Unforeseen site conditions requiring direction',
  },
  code_compliance: {
    label: 'Code Compliance',
    description: 'Building code or accessibility questions',
  },
  shop_drawing: {
    label: 'Shop Drawing',
    description: 'Clarifications needed during shop drawing development',
  },
  specification: {
    label: 'Specification',
    description: 'Questions about specification requirements',
  },
  owner_decision: {
    label: 'Owner Decision',
    description: 'Items requiring owner/client direction',
  },
}

export const RFI_TEMPLATES: RFITemplate[] = [
  // Design Clarification Templates
  {
    id: 'dc-missing-dimension',
    name: 'Missing Dimension',
    category: 'design_clarification',
    description: 'Request for a dimension not shown on drawings',
    discipline: 'Architectural',
    priority: 'normal',
    titleTemplate: 'Dimension Required: [Location/Element]',
    descriptionTemplate: `A dimension is required but not shown on the drawings.

**Drawing Reference:** [Sheet number, detail number]
**Location:** [Grid lines, floor level, room number]
**Element:** [What needs to be dimensioned]
**Proposed Dimension:** [If contractor has a suggestion]

Please provide the required dimension to proceed with [activity].`,
    additionalInfoPrompts: [
      'What activity is blocked by this missing dimension?',
      'When is this information needed?',
    ],
    hasCostImpact: false,
    hasScheduleImpact: true,
    tags: ['dimension', 'drawing', 'clarification'],
  },
  {
    id: 'dc-detail-unclear',
    name: 'Unclear Detail',
    category: 'design_clarification',
    description: 'Request clarification on a confusing detail',
    discipline: 'Architectural',
    priority: 'normal',
    titleTemplate: 'Detail Clarification: [Detail Reference]',
    descriptionTemplate: `Clarification is needed on the following detail.

**Drawing Reference:** [Sheet number, detail number]
**Location Applied:** [Where this detail is used]
**Issue:** [What is unclear or confusing]
**Possible Interpretations:**
1. [Interpretation A]
2. [Interpretation B]

Please confirm the correct interpretation or provide a revised detail.`,
    additionalInfoPrompts: [
      'Describe what makes the detail unclear',
      'What trade is affected?',
    ],
    hasCostImpact: false,
    hasScheduleImpact: true,
    tags: ['detail', 'clarification', 'drawing'],
  },
  {
    id: 'dc-spec-conflict',
    name: 'Drawing vs Spec Conflict',
    category: 'design_clarification',
    description: 'Conflict between drawings and specifications',
    discipline: 'General',
    priority: 'high',
    titleTemplate: 'Drawing/Spec Conflict: [Item]',
    descriptionTemplate: `A conflict exists between the drawings and specifications.

**Drawing Shows:** [What the drawing indicates]
- Reference: [Sheet/Detail number]

**Specification States:** [What the spec requires]
- Reference: [Section/Paragraph]

**Conflict:** [Describe the specific conflict]

Please advise which document governs or provide clarification.`,
    additionalInfoPrompts: [
      'Which interpretation would you prefer?',
      'Is there a cost difference between options?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['conflict', 'specification', 'drawing'],
  },

  // Conflict/Coordination Templates
  {
    id: 'cc-mep-clash',
    name: 'MEP Clash/Conflict',
    category: 'conflict_coordination',
    description: 'Mechanical, electrical, or plumbing routing conflict',
    discipline: 'Mechanical',
    priority: 'high',
    titleTemplate: 'MEP Conflict: [Systems Involved] at [Location]',
    descriptionTemplate: `An MEP routing conflict has been identified.

**Location:** [Grid lines, floor, ceiling space]
**Systems in Conflict:**
- System A: [Description, size, elevation]
- System B: [Description, size, elevation]

**Conflict Type:** [Hard clash / soft clash / coordination issue]
**Available Space:** [Describe ceiling/plenum constraints]

**Proposed Resolution:**
[Describe preferred routing solution]

Please review and approve the proposed resolution or provide an alternative.`,
    additionalInfoPrompts: [
      'Has a coordination meeting been held?',
      'Are shop drawings available for the affected systems?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['MEP', 'clash', 'coordination', 'conflict'],
  },
  {
    id: 'cc-structural-conflict',
    name: 'MEP vs Structural Conflict',
    category: 'conflict_coordination',
    description: 'MEP penetration conflicts with structural elements',
    discipline: 'Structural',
    priority: 'high',
    titleTemplate: 'Structural Penetration Conflict: [Location]',
    descriptionTemplate: `An MEP penetration conflicts with a structural element.

**Location:** [Grid intersection, floor level]
**Structural Element:** [Beam size, column location, slab]
**MEP System:** [Pipe/duct size, purpose]
**Required Penetration:** [Size and location needed]

**Issue:** [Core location blocked, reinforcement conflict, etc.]

Please advise on:
1. Can the penetration be relocated?
2. Can structural modifications accommodate the penetration?
3. Alternative routing options?`,
    additionalInfoPrompts: [
      'Attach marked-up plan showing conflict',
      'What is the schedule impact if work stops?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['structural', 'penetration', 'MEP', 'coordination'],
  },

  // Material Substitution Templates
  {
    id: 'ms-product-substitution',
    name: 'Product Substitution Request',
    category: 'material_substitution',
    description: 'Request to use an alternative product or material',
    discipline: 'General',
    priority: 'normal',
    titleTemplate: 'Substitution Request: [Specified Product] to [Proposed Product]',
    descriptionTemplate: `Request approval for material/product substitution.

**Specified Product:**
- Manufacturer: [Name]
- Model: [Number]
- Specification Section: [Reference]

**Proposed Substitution:**
- Manufacturer: [Name]
- Model: [Number]
- Reason for Substitution: [Availability / Cost / Performance / Lead time]

**Comparison:**
| Feature | Specified | Proposed |
|---------|-----------|----------|
| [Feature 1] | [Value] | [Value] |
| [Feature 2] | [Value] | [Value] |

**Documentation Attached:**
- [ ] Product data sheet
- [ ] Warranty comparison
- [ ] Cost comparison (if applicable)

Please review and approve or reject this substitution request.`,
    additionalInfoPrompts: [
      'What is the lead time difference?',
      'Are there any aesthetic differences?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['substitution', 'material', 'product', 'approval'],
  },

  // Field Condition Templates
  {
    id: 'fc-unforeseen-condition',
    name: 'Unforeseen Site Condition',
    category: 'field_condition',
    description: 'Unexpected condition discovered during construction',
    discipline: 'General',
    priority: 'high',
    titleTemplate: 'Unforeseen Condition: [Brief Description] at [Location]',
    descriptionTemplate: `An unforeseen condition has been discovered that differs from the contract documents.

**Location:** [Specific location]
**Discovery Date:** [Date]
**Description of Condition:**
[Detailed description of what was found]

**Contract Document Shows:**
[What the documents indicated at this location]

**Impact:**
- Work Currently Stopped: [Yes/No]
- Affected Trades: [List trades]
- Potential Cost Impact: [Estimated range if known]
- Potential Schedule Impact: [Days/weeks]

**Recommended Action:**
[Contractor's recommended approach]

**Documentation:**
- [ ] Photos attached
- [ ] Survey/measurement data

Please provide direction to proceed.`,
    additionalInfoPrompts: [
      'Is this condition safety-related?',
      'What work is currently stopped?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['unforeseen', 'field condition', 'discovery', 'change'],
  },
  {
    id: 'fc-existing-condition',
    name: 'Existing Condition Differs',
    category: 'field_condition',
    description: 'Existing conditions different from as-built drawings',
    discipline: 'General',
    priority: 'normal',
    titleTemplate: 'Existing Condition Variance: [Element] at [Location]',
    descriptionTemplate: `Existing conditions differ from the as-built drawings or documents.

**Location:** [Specific location]
**Element/System:** [What is different]

**As-Built Documents Show:**
[What the documents indicated]

**Actual Field Condition:**
[What was found in the field]

**Variance:** [Describe the difference]

**Impact on Work:**
[How this affects the new construction]

**Proposed Solution:**
[How to address the variance]

Please review and approve the proposed solution or provide alternative direction.`,
    additionalInfoPrompts: [
      'Attach field survey or measurements',
      'Photos of actual condition',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['existing', 'as-built', 'variance', 'renovation'],
  },

  // Code Compliance Templates
  {
    id: 'code-accessibility',
    name: 'Accessibility Compliance Question',
    category: 'code_compliance',
    description: 'Question about ADA or accessibility requirements',
    discipline: 'Architectural',
    priority: 'normal',
    titleTemplate: 'Accessibility Question: [Element/Location]',
    descriptionTemplate: `Clarification needed regarding accessibility requirements.

**Location:** [Room, area, or element]
**Drawing Reference:** [Sheet number]
**Code Reference:** [ADA, CBC, local code section]

**Issue:**
[Describe the accessibility question or concern]

**Design Shows:**
[What the current design indicates]

**Code Requirement:**
[What the code appears to require]

**Question:**
[Specific question needing answer]

Please confirm compliance or provide direction to achieve compliance.`,
    additionalInfoPrompts: [
      'Has this been reviewed with the ADA consultant?',
      'Is a code modification possible?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: false,
    tags: ['accessibility', 'ADA', 'code', 'compliance'],
  },

  // Shop Drawing Templates
  {
    id: 'sd-dimension-confirmation',
    name: 'Shop Drawing Dimension Confirmation',
    category: 'shop_drawing',
    description: 'Confirm dimensions during shop drawing preparation',
    discipline: 'General',
    priority: 'normal',
    titleTemplate: 'Shop Drawing Clarification: [Trade/System]',
    descriptionTemplate: `Clarification needed for shop drawing preparation.

**Trade/System:** [e.g., Structural Steel, Curtain Wall, Millwork]
**Shop Drawing Package:** [If number assigned]
**Drawing Reference:** [Related contract drawing]

**Question:**
[Specific dimension, connection, or detail question]

**Information Needed:**
[What specific information is required]

**Impact if Delayed:**
- Shop Drawing Submission Date: [Date]
- Fabrication Lead Time: [Duration]
- Installation Date: [Scheduled date]

Please provide the requested information to maintain the submission schedule.`,
    additionalInfoPrompts: [
      'What is the lead time for this item?',
      'Are there related shop drawings affected?',
    ],
    hasCostImpact: false,
    hasScheduleImpact: true,
    tags: ['shop drawing', 'fabrication', 'submittal'],
  },

  // Specification Templates
  {
    id: 'spec-performance-criteria',
    name: 'Performance Criteria Clarification',
    category: 'specification',
    description: 'Question about specified performance requirements',
    discipline: 'General',
    priority: 'normal',
    titleTemplate: 'Specification Clarification: [Section] - [Topic]',
    descriptionTemplate: `Clarification needed on specification requirements.

**Specification Section:** [Number and title]
**Paragraph Reference:** [Specific paragraph]
**Subject:** [What the requirement covers]

**Specification States:**
"[Quote the relevant specification text]"

**Question:**
[What is unclear or needs confirmation]

**Interpretation Options:**
1. [Possible interpretation A]
2. [Possible interpretation B]

Please confirm the correct interpretation.`,
    additionalInfoPrompts: [
      'What product or method are you considering?',
      'Is there a cost difference between interpretations?',
    ],
    hasCostImpact: false,
    hasScheduleImpact: false,
    tags: ['specification', 'requirement', 'clarification'],
  },

  // Owner Decision Templates
  {
    id: 'od-finish-selection',
    name: 'Owner Finish Selection',
    category: 'owner_decision',
    description: 'Request owner decision on finish or color selection',
    discipline: 'Architectural',
    priority: 'normal',
    titleTemplate: 'Owner Selection Required: [Finish Type] for [Location]',
    descriptionTemplate: `Owner selection is required for the following finish/material.

**Item:** [Material/finish type]
**Location:** [Where it will be installed]
**Specification Reference:** [Section number]

**Options to Select From:**
1. [Option A - Description]
2. [Option B - Description]
3. [Option C - Description]

**Allowance Amount:** [If applicable]
**Decision Needed By:** [Date to maintain schedule]

**Impact of Delay:**
[What happens if decision is delayed]

Please make a selection or request additional samples/information.`,
    additionalInfoPrompts: [
      'Are samples available for review?',
      'Is there a showroom visit scheduled?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['owner', 'selection', 'finish', 'allowance'],
  },
  {
    id: 'od-scope-decision',
    name: 'Owner Scope Decision',
    category: 'owner_decision',
    description: 'Request owner decision on scope or approach',
    discipline: 'General',
    priority: 'high',
    titleTemplate: 'Owner Decision Required: [Topic]',
    descriptionTemplate: `An owner decision is required to proceed with work.

**Subject:** [What decision is needed]
**Location/Area Affected:** [Scope of impact]

**Background:**
[Context for why this decision is needed]

**Options:**
| Option | Description | Cost Impact | Schedule Impact |
|--------|-------------|-------------|-----------------|
| A | [Description] | [Cost] | [Days] |
| B | [Description] | [Cost] | [Days] |
| C | [Description] | [Cost] | [Days] |

**Contractor Recommendation:**
[If contractor has a recommendation, state it and why]

**Decision Needed By:** [Date]

**Work Status:**
[Is work stopped or proceeding in another area?]

Please provide direction to proceed.`,
    additionalInfoPrompts: [
      'Is a meeting needed to discuss options?',
      'Are there any constraints we should know about?',
    ],
    hasCostImpact: true,
    hasScheduleImpact: true,
    tags: ['owner', 'decision', 'scope', 'direction'],
  },
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: RFITemplateCategory): RFITemplate[] {
  return RFI_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get templates by discipline
 */
export function getTemplatesByDiscipline(discipline: string): RFITemplate[] {
  return RFI_TEMPLATES.filter(t => t.discipline === discipline || t.discipline === 'General')
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): RFITemplate[] {
  const lowerQuery = query.toLowerCase()
  return RFI_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get all unique categories from templates
 */
export function getAllCategories(): RFITemplateCategory[] {
  return Object.keys(RFI_TEMPLATE_CATEGORIES) as RFITemplateCategory[]
}
