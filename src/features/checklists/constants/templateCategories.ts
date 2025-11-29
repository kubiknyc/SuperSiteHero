// File: /src/features/checklists/constants/templateCategories.ts
// Template category definitions and visual properties

/**
 * Template categories for organizing checklist templates
 */
export const TEMPLATE_CATEGORIES = {
  SAFETY: 'Safety',
  QUALITY_CONCRETE: 'Quality - Concrete',
  QUALITY_SITEWORK: 'Quality - Sitework',
  QUALITY_STRUCTURAL: 'Quality - Structural',
  QUALITY_ENVELOPE: 'Quality - Envelope',
  QUALITY_MEP: 'Quality - MEP',
  QUALITY_FINISHES: 'Quality - Finishes',
  PROJECT_MILESTONES: 'Project Milestones',
} as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[keyof typeof TEMPLATE_CATEGORIES]

/**
 * Category color schemes for UI badges and visual differentiation
 */
export const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  [TEMPLATE_CATEGORIES.SAFETY]: 'red',
  [TEMPLATE_CATEGORIES.QUALITY_CONCRETE]: 'blue',
  [TEMPLATE_CATEGORIES.QUALITY_SITEWORK]: 'amber',
  [TEMPLATE_CATEGORIES.QUALITY_STRUCTURAL]: 'indigo',
  [TEMPLATE_CATEGORIES.QUALITY_ENVELOPE]: 'cyan',
  [TEMPLATE_CATEGORIES.QUALITY_MEP]: 'green',
  [TEMPLATE_CATEGORIES.QUALITY_FINISHES]: 'purple',
  [TEMPLATE_CATEGORIES.PROJECT_MILESTONES]: 'orange',
}

/**
 * Category descriptions for help text
 */
export const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  [TEMPLATE_CATEGORIES.SAFETY]:
    'Safety inspections and compliance checklists including OSHA requirements',
  [TEMPLATE_CATEGORIES.QUALITY_CONCRETE]:
    'Concrete and foundation quality control inspections',
  [TEMPLATE_CATEGORIES.QUALITY_SITEWORK]:
    'Site grading, utilities, erosion control, and earthwork inspections',
  [TEMPLATE_CATEGORIES.QUALITY_STRUCTURAL]:
    'Structural framing, steel, masonry, and specialty system inspections',
  [TEMPLATE_CATEGORIES.QUALITY_ENVELOPE]:
    'Building envelope including roofing, cladding, windows, and waterproofing',
  [TEMPLATE_CATEGORIES.QUALITY_MEP]:
    'Mechanical, electrical, plumbing, and fire protection system inspections',
  [TEMPLATE_CATEGORIES.QUALITY_FINISHES]:
    'Interior finishes, flooring, ceilings, and final completion inspections',
  [TEMPLATE_CATEGORIES.PROJECT_MILESTONES]:
    'Project mobilization, substantial completion, and closeout checklists',
}

/**
 * Get all available categories
 */
export function getAllCategories(): TemplateCategory[] {
  return Object.values(TEMPLATE_CATEGORIES)
}

/**
 * Get category color for badges
 */
export function getCategoryColor(category: TemplateCategory): string {
  return CATEGORY_COLORS[category] || 'gray'
}

/**
 * Get category description
 */
export function getCategoryDescription(category: TemplateCategory): string {
  return CATEGORY_DESCRIPTIONS[category] || ''
}
