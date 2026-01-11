/**
 * Generate Permit Application Tool
 * Helps generate permit applications by determining requirements, pulling project data,
 * identifying missing documents, and generating application content
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Input/Output Types
// ============================================================================

type PermitType =
  | 'building'
  | 'electrical'
  | 'plumbing'
  | 'mechanical'
  | 'fire'
  | 'demolition'
  | 'grading'
  | 'encroachment'
  | 'sign'
  | 'temporary_power'

interface GeneratePermitAppInput {
  project_id: string
  permit_type: PermitType
  scope_description?: string
  include_fee_estimate?: boolean
}

interface RequiredDocument {
  name: string
  description: string
  category: string
  required: boolean
  status: 'available' | 'missing' | 'pending' | 'expired'
  document_id?: string
  notes?: string
}

interface MissingInfo {
  field: string
  description: string
  source: string
  priority: 'required' | 'recommended' | 'optional'
  suggestion?: string
}

interface FeeEstimate {
  fee_type: string
  description: string
  amount: number
  calculation_basis: string
  is_estimate: boolean
}

interface ApplicationSection {
  section_name: string
  fields: Array<{
    label: string
    value: string | number | null
    source: string
    confidence: 'high' | 'medium' | 'low'
  }>
}

interface GeneratePermitAppOutput {
  permit_type: PermitType
  permit_type_display: string
  project_summary: {
    project_name: string
    project_number: string | null
    address: string
    city: string | null
    state: string | null
    zip: string | null
  }
  application_data: ApplicationSection[]
  required_documents: RequiredDocument[]
  missing_info: MissingInfo[]
  estimated_fees: FeeEstimate[]
  total_estimated_fees: number
  readiness_score: number
  readiness_status: 'ready' | 'mostly_ready' | 'needs_work' | 'not_ready'
  recommendations: string[]
  next_steps: string[]
}

// ============================================================================
// Permit Requirements Configuration
// ============================================================================

interface PermitRequirement {
  displayName: string
  requiredDocuments: Array<{
    name: string
    description: string
    category: string
    required: boolean
  }>
  requiredFields: string[]
  typicalFees: Array<{
    feeType: string
    description: string
    baseFee: number
    perUnit?: string
    unitRate?: number
  }>
  inspectionTypes: string[]
}

const PERMIT_REQUIREMENTS: Record<PermitType, PermitRequirement> = {
  building: {
    displayName: 'Building Permit',
    requiredDocuments: [
      { name: 'Site Plan', description: 'Site plan showing property lines, setbacks, and building location', category: 'drawings', required: true },
      { name: 'Floor Plans', description: 'Architectural floor plans with dimensions', category: 'drawings', required: true },
      { name: 'Elevations', description: 'Building elevations showing heights and materials', category: 'drawings', required: true },
      { name: 'Structural Plans', description: 'Structural engineering drawings', category: 'drawings', required: true },
      { name: 'Title Report', description: 'Current title report showing ownership', category: 'legal', required: true },
      { name: 'Soils Report', description: 'Geotechnical investigation report', category: 'engineering', required: true },
      { name: 'Energy Calculations', description: 'Title 24 or energy code compliance documentation', category: 'compliance', required: true },
      { name: 'Contractor License', description: 'Valid contractor license', category: 'licensing', required: true },
      { name: 'Insurance Certificate', description: 'Liability and workers comp insurance', category: 'insurance', required: true },
    ],
    requiredFields: ['owner_name', 'owner_address', 'contractor_name', 'contractor_license', 'project_valuation', 'building_use', 'construction_type', 'occupancy_type', 'square_footage'],
    typicalFees: [
      { feeType: 'Building Permit', description: 'Base permit fee', baseFee: 500, perUnit: 'per $1000 valuation', unitRate: 12.50 },
      { feeType: 'Plan Check', description: 'Plan review fee (65% of permit)', baseFee: 325, perUnit: 'per $1000 valuation', unitRate: 8.13 },
      { feeType: 'Technology Fee', description: 'Electronic filing fee', baseFee: 50 },
      { feeType: 'SMI Fee', description: 'Strong motion instrumentation', baseFee: 0, perUnit: 'per $1000 valuation', unitRate: 0.13 },
    ],
    inspectionTypes: ['Foundation', 'Framing', 'Insulation', 'Drywall', 'Final']
  },
  electrical: {
    displayName: 'Electrical Permit',
    requiredDocuments: [
      { name: 'Electrical Plans', description: 'Single-line diagram and panel schedules', category: 'drawings', required: true },
      { name: 'Load Calculations', description: 'Electrical load calculations', category: 'engineering', required: true },
      { name: 'Equipment Specifications', description: 'Specifications for major electrical equipment', category: 'specifications', required: false },
      { name: 'Contractor License', description: 'Valid C-10 electrical contractor license', category: 'licensing', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'service_size', 'number_of_circuits', 'panel_location'],
    typicalFees: [
      { feeType: 'Electrical Permit', description: 'Base electrical permit fee', baseFee: 150 },
      { feeType: 'Per Circuit Fee', description: 'Fee per circuit', baseFee: 0, perUnit: 'per circuit', unitRate: 5 },
      { feeType: 'Service Fee', description: 'New service connection', baseFee: 100 },
    ],
    inspectionTypes: ['Rough Electrical', 'Service/Panel', 'Final Electrical']
  },
  plumbing: {
    displayName: 'Plumbing Permit',
    requiredDocuments: [
      { name: 'Plumbing Plans', description: 'Plumbing riser diagrams and fixture layout', category: 'drawings', required: true },
      { name: 'Isometric Drawings', description: 'Isometric plumbing diagrams', category: 'drawings', required: false },
      { name: 'Contractor License', description: 'Valid C-36 plumbing contractor license', category: 'licensing', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'fixture_count', 'water_heater_type', 'sewer_connection_type'],
    typicalFees: [
      { feeType: 'Plumbing Permit', description: 'Base plumbing permit fee', baseFee: 150 },
      { feeType: 'Per Fixture Fee', description: 'Fee per fixture', baseFee: 0, perUnit: 'per fixture', unitRate: 15 },
      { feeType: 'Water Heater Fee', description: 'Water heater installation', baseFee: 50 },
    ],
    inspectionTypes: ['Underground Plumbing', 'Rough Plumbing', 'Water Test', 'Final Plumbing']
  },
  mechanical: {
    displayName: 'Mechanical Permit',
    requiredDocuments: [
      { name: 'Mechanical Plans', description: 'HVAC plans and equipment schedules', category: 'drawings', required: true },
      { name: 'Load Calculations', description: 'Heating and cooling load calculations', category: 'engineering', required: true },
      { name: 'Duct Layout', description: 'Ductwork layout and sizing', category: 'drawings', required: false },
      { name: 'Contractor License', description: 'Valid C-20 HVAC contractor license', category: 'licensing', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'equipment_type', 'tonnage', 'duct_type'],
    typicalFees: [
      { feeType: 'Mechanical Permit', description: 'Base mechanical permit fee', baseFee: 150 },
      { feeType: 'Equipment Fee', description: 'Per HVAC unit', baseFee: 0, perUnit: 'per unit', unitRate: 75 },
      { feeType: 'Duct Fee', description: 'Ductwork installation', baseFee: 50 },
    ],
    inspectionTypes: ['Rough Mechanical', 'Equipment Set', 'Final Mechanical']
  },
  fire: {
    displayName: 'Fire Protection Permit',
    requiredDocuments: [
      { name: 'Fire Sprinkler Plans', description: 'Fire sprinkler system layout and calculations', category: 'drawings', required: true },
      { name: 'Hydraulic Calculations', description: 'Sprinkler system hydraulic calculations', category: 'engineering', required: true },
      { name: 'Fire Alarm Plans', description: 'Fire alarm system layout and riser diagram', category: 'drawings', required: true },
      { name: 'Cut Sheets', description: 'Equipment cut sheets and specifications', category: 'specifications', required: true },
      { name: 'Contractor License', description: 'Valid C-16 fire protection contractor license', category: 'licensing', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'sprinkler_head_count', 'system_type', 'coverage_area'],
    typicalFees: [
      { feeType: 'Fire Sprinkler Permit', description: 'Base fire sprinkler permit fee', baseFee: 250 },
      { feeType: 'Per Head Fee', description: 'Fee per sprinkler head', baseFee: 0, perUnit: 'per head', unitRate: 3 },
      { feeType: 'Fire Alarm Permit', description: 'Fire alarm system permit', baseFee: 150 },
      { feeType: 'Fire Marshal Review', description: 'Fire marshal plan review', baseFee: 200 },
    ],
    inspectionTypes: ['Underground Fire', 'Rough Fire Sprinkler', 'Hydrostatic Test', 'Fire Alarm', 'Final Fire']
  },
  demolition: {
    displayName: 'Demolition Permit',
    requiredDocuments: [
      { name: 'Site Plan', description: 'Site plan showing structures to be demolished', category: 'drawings', required: true },
      { name: 'Asbestos Survey', description: 'Asbestos and hazmat survey report', category: 'environmental', required: true },
      { name: 'Utility Disconnect Letters', description: 'Confirmation of utility disconnections', category: 'utilities', required: true },
      { name: 'Contractor License', description: 'Valid demolition contractor license', category: 'licensing', required: true },
      { name: 'Demolition Plan', description: 'Demolition methodology and safety plan', category: 'plans', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'structure_type', 'square_footage', 'disposal_site'],
    typicalFees: [
      { feeType: 'Demolition Permit', description: 'Base demolition permit fee', baseFee: 200 },
      { feeType: 'Per Square Foot', description: 'Based on structure size', baseFee: 0, perUnit: 'per 100 sq ft', unitRate: 5 },
      { feeType: 'AQMD Fee', description: 'Air quality management district fee', baseFee: 75 },
    ],
    inspectionTypes: ['Pre-Demolition', 'Site Clearance', 'Final Grading']
  },
  grading: {
    displayName: 'Grading Permit',
    requiredDocuments: [
      { name: 'Grading Plans', description: 'Grading and drainage plans', category: 'drawings', required: true },
      { name: 'Soils Report', description: 'Geotechnical investigation', category: 'engineering', required: true },
      { name: 'Hydrology Study', description: 'Drainage and hydrology calculations', category: 'engineering', required: true },
      { name: 'SWPPP', description: 'Stormwater pollution prevention plan', category: 'environmental', required: true },
      { name: 'Erosion Control Plan', description: 'Erosion and sediment control plan', category: 'environmental', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'cut_volume', 'fill_volume', 'disturbed_area', 'import_export_volume'],
    typicalFees: [
      { feeType: 'Grading Permit', description: 'Base grading permit fee', baseFee: 300 },
      { feeType: 'Per Cubic Yard', description: 'Based on earthwork volume', baseFee: 0, perUnit: 'per 100 CY', unitRate: 25 },
      { feeType: 'SWPPP Review', description: 'Stormwater plan review', baseFee: 150 },
    ],
    inspectionTypes: ['Pre-Grade', 'Rough Grade', 'Compaction', 'Final Grade', 'Drainage']
  },
  encroachment: {
    displayName: 'Encroachment Permit',
    requiredDocuments: [
      { name: 'Site Plan', description: 'Site plan showing encroachment area', category: 'drawings', required: true },
      { name: 'Traffic Control Plan', description: 'Traffic control and detour plan', category: 'plans', required: true },
      { name: 'Insurance Certificate', description: 'Liability insurance with city as additional insured', category: 'insurance', required: true },
      { name: 'Restoration Plan', description: 'Street/sidewalk restoration details', category: 'plans', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'encroachment_type', 'duration', 'affected_lanes'],
    typicalFees: [
      { feeType: 'Encroachment Permit', description: 'Base encroachment permit fee', baseFee: 150 },
      { feeType: 'Daily Fee', description: 'Per day of encroachment', baseFee: 0, perUnit: 'per day', unitRate: 25 },
      { feeType: 'Deposit', description: 'Refundable restoration deposit', baseFee: 500 },
    ],
    inspectionTypes: ['Pre-Work', 'Restoration', 'Final']
  },
  sign: {
    displayName: 'Sign Permit',
    requiredDocuments: [
      { name: 'Sign Plans', description: 'Sign design and construction details', category: 'drawings', required: true },
      { name: 'Site Plan', description: 'Sign location on property', category: 'drawings', required: true },
      { name: 'Electrical Plans', description: 'Electrical details for illuminated signs', category: 'drawings', required: false },
      { name: 'Structural Calculations', description: 'Structural support calculations', category: 'engineering', required: false },
    ],
    requiredFields: ['contractor_name', 'sign_type', 'sign_area', 'height', 'illumination_type'],
    typicalFees: [
      { feeType: 'Sign Permit', description: 'Base sign permit fee', baseFee: 100 },
      { feeType: 'Per Square Foot', description: 'Based on sign area', baseFee: 0, perUnit: 'per sq ft', unitRate: 5 },
      { feeType: 'Electrical Fee', description: 'For illuminated signs', baseFee: 75 },
    ],
    inspectionTypes: ['Footing', 'Installation', 'Electrical', 'Final']
  },
  temporary_power: {
    displayName: 'Temporary Power Permit',
    requiredDocuments: [
      { name: 'Site Plan', description: 'Location of temporary service', category: 'drawings', required: true },
      { name: 'Single Line Diagram', description: 'Electrical single line diagram', category: 'drawings', required: true },
      { name: 'Contractor License', description: 'Valid electrical contractor license', category: 'licensing', required: true },
    ],
    requiredFields: ['contractor_name', 'contractor_license', 'service_size', 'duration', 'utility_provider'],
    typicalFees: [
      { feeType: 'Temporary Power Permit', description: 'Base temporary power permit', baseFee: 100 },
      { feeType: 'Inspection Fee', description: 'Utility inspection fee', baseFee: 75 },
    ],
    inspectionTypes: ['Service Installation', 'Grounding', 'Final']
  }
}

// ============================================================================
// Tool Implementation
// ============================================================================

export const generatePermitAppTool = createTool<GeneratePermitAppInput, GeneratePermitAppOutput>({
  name: 'generate_permit_application',
  displayName: 'Generate Permit Application',
  description: 'Generates permit application content by determining required information for the permit type, pulling project data to pre-fill the application, identifying missing required documents, and estimating permit fees.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to generate the permit application for'
      },
      permit_type: {
        type: 'string',
        enum: ['building', 'electrical', 'plumbing', 'mechanical', 'fire', 'demolition', 'grading', 'encroachment', 'sign', 'temporary_power'],
        description: 'Type of permit to generate application for'
      },
      scope_description: {
        type: 'string',
        description: 'Optional description of work scope for the permit'
      },
      include_fee_estimate: {
        type: 'boolean',
        description: 'Whether to include fee estimates (default: true)'
      }
    },
    required: ['project_id', 'permit_type']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const { project_id, permit_type, scope_description, include_fee_estimate = true } = input
    const startTime = Date.now()

    // Get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        companies (
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          license_number
        )
      `)
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return {
        success: false,
        error: `Project not found: ${projectError?.message || 'Unknown error'}`,
        errorCode: 'PROJECT_NOT_FOUND'
      }
    }

    // Get project documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get project team / contacts
    const { data: projectTeam } = await supabase
      .from('project_team')
      .select(`
        *,
        users (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('project_id', project_id)

    // Get company details for contractor info
    const company = project.companies as {
      id: string
      name: string
      address?: string
      city?: string
      state?: string
      zip?: string
      phone?: string
      license_number?: string
    } | null

    // Get permit requirements
    const requirements = PERMIT_REQUIREMENTS[permit_type]

    // Build project summary
    const projectSummary = {
      project_name: project.name,
      project_number: project.project_number,
      address: project.address || 'Not specified',
      city: project.city,
      state: project.state,
      zip: project.zip
    }

    // Analyze available documents and determine status
    const requiredDocuments = analyzeDocuments(
      requirements.requiredDocuments,
      documents || []
    )

    // Build application data sections
    const applicationData = buildApplicationSections(
      permit_type,
      project,
      company,
      projectTeam || [],
      scope_description
    )

    // Identify missing information
    const missingInfo = identifyMissingInfo(
      requirements.requiredFields,
      project,
      company,
      applicationData
    )

    // Calculate fee estimates
    const estimatedFees: FeeEstimate[] = []
    let totalFees = 0

    if (include_fee_estimate) {
      const feeResult = calculateFees(
        requirements.typicalFees,
        project.contract_value || project.budget || 100000,
        getEstimatedUnits(permit_type, project)
      )
      estimatedFees.push(...feeResult.fees)
      totalFees = feeResult.total
    }

    // Calculate readiness score
    const { score, status } = calculateReadiness(requiredDocuments, missingInfo)

    // Generate recommendations
    const recommendations = generateRecommendations(
      requiredDocuments,
      missingInfo,
      permit_type
    )

    // Generate next steps
    const nextSteps = generateNextSteps(
      requiredDocuments,
      missingInfo,
      status
    )

    const output: GeneratePermitAppOutput = {
      permit_type,
      permit_type_display: requirements.displayName,
      project_summary: projectSummary,
      application_data: applicationData,
      required_documents: requiredDocuments,
      missing_info: missingInfo,
      estimated_fees: estimatedFees,
      total_estimated_fees: totalFees,
      readiness_score: score,
      readiness_status: status,
      recommendations,
      next_steps: nextSteps
    }

    return {
      success: true,
      data: output,
      metadata: {
        executionTimeMs: Date.now() - startTime
      }
    }
  },

  formatOutput(output) {
    const { permit_type_display, readiness_score, readiness_status, missing_info, total_estimated_fees } = output

    const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      ready: 'success',
      mostly_ready: 'success',
      needs_work: 'warning',
      not_ready: 'error'
    }

    return {
      title: `${permit_type_display} Application`,
      summary: `Readiness: ${readiness_score}% - ${readiness_status.replace('_', ' ')}`,
      icon: readiness_status === 'ready' || readiness_status === 'mostly_ready' ? 'file-check' : 'file-warning',
      status: statusMap[readiness_status] || 'info',
      details: [
        { label: 'Permit Type', value: permit_type_display, type: 'badge' },
        { label: 'Readiness', value: `${readiness_score}%`, type: 'text' },
        { label: 'Missing Items', value: missing_info.filter(m => m.priority === 'required').length, type: 'text' },
        { label: 'Est. Fees', value: `$${total_estimated_fees.toLocaleString()}`, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

function analyzeDocuments(
  required: Array<{ name: string; description: string; category: string; required: boolean }>,
  available: Array<{ id: string; name?: string; title?: string; category?: string; status?: string; expires_at?: string }>
): RequiredDocument[] {
  const results: RequiredDocument[] = []

  for (const req of required) {
    const matchingDoc = findMatchingDocument(req.name, req.category, available)

    let status: RequiredDocument['status'] = 'missing'
    let notes: string | undefined

    if (matchingDoc) {
      if (matchingDoc.expires_at && new Date(matchingDoc.expires_at) < new Date()) {
        status = 'expired'
        notes = `Expired on ${new Date(matchingDoc.expires_at).toLocaleDateString()}`
      } else if (matchingDoc.status === 'pending' || matchingDoc.status === 'draft') {
        status = 'pending'
        notes = 'Document is in draft/pending status'
      } else {
        status = 'available'
      }
    }

    results.push({
      name: req.name,
      description: req.description,
      category: req.category,
      required: req.required,
      status,
      document_id: matchingDoc?.id,
      notes
    })
  }

  return results
}

function findMatchingDocument(
  name: string,
  category: string,
  documents: Array<{ id: string; name?: string; title?: string; category?: string }>
): { id: string; name?: string; status?: string; expires_at?: string } | undefined {
  const nameLower = name.toLowerCase()
  const categoryLower = category.toLowerCase()

  // Try exact name match first
  let match = documents.find(d =>
    (d.name?.toLowerCase() === nameLower) ||
    (d.title?.toLowerCase() === nameLower)
  )

  // Try partial match
  if (!match) {
    match = documents.find(d =>
      (d.name?.toLowerCase().includes(nameLower)) ||
      (d.title?.toLowerCase().includes(nameLower)) ||
      (nameLower.includes(d.name?.toLowerCase() || '')) ||
      (d.category?.toLowerCase() === categoryLower && d.name?.toLowerCase().includes(nameLower.split(' ')[0]))
    )
  }

  return match as { id: string; name?: string; status?: string; expires_at?: string } | undefined
}

function buildApplicationSections(
  permitType: PermitType,
  project: Record<string, unknown>,
  company: { name: string; address?: string; city?: string; state?: string; zip?: string; phone?: string; license_number?: string } | null,
  team: Array<{ role?: string; users?: { full_name?: string; email?: string; phone?: string } }>,
  scopeDescription?: string
): ApplicationSection[] {
  const sections: ApplicationSection[] = []

  // Project Information Section
  sections.push({
    section_name: 'Project Information',
    fields: [
      { label: 'Project Name', value: project.name as string, source: 'project', confidence: 'high' },
      { label: 'Project Number', value: project.project_number as string | null, source: 'project', confidence: 'high' },
      { label: 'Project Address', value: project.address as string | null, source: 'project', confidence: 'high' },
      { label: 'City', value: project.city as string | null, source: 'project', confidence: 'high' },
      { label: 'State', value: project.state as string | null, source: 'project', confidence: 'high' },
      { label: 'ZIP Code', value: project.zip as string | null, source: 'project', confidence: 'high' },
      { label: 'Project Description', value: project.description as string | null || scopeDescription || null, source: project.description ? 'project' : 'input', confidence: project.description ? 'high' : 'medium' }
    ]
  })

  // Contractor Information Section
  sections.push({
    section_name: 'Contractor Information',
    fields: [
      { label: 'Company Name', value: company?.name || null, source: 'company', confidence: company?.name ? 'high' : 'low' },
      { label: 'Company Address', value: company?.address || null, source: 'company', confidence: company?.address ? 'high' : 'low' },
      { label: 'City', value: company?.city || null, source: 'company', confidence: company?.city ? 'high' : 'low' },
      { label: 'State', value: company?.state || null, source: 'company', confidence: company?.state ? 'high' : 'low' },
      { label: 'ZIP', value: company?.zip || null, source: 'company', confidence: company?.zip ? 'high' : 'low' },
      { label: 'Phone', value: company?.phone || null, source: 'company', confidence: company?.phone ? 'high' : 'low' },
      { label: 'License Number', value: company?.license_number || null, source: 'company', confidence: company?.license_number ? 'high' : 'low' }
    ]
  })

  // Project Contacts Section
  const superintendent = team.find(t => t.role?.toLowerCase().includes('superintendent'))
  const projectManager = team.find(t => t.role?.toLowerCase().includes('manager') || t.role?.toLowerCase().includes('pm'))

  sections.push({
    section_name: 'Project Contacts',
    fields: [
      { label: 'Superintendent', value: superintendent?.users?.full_name || null, source: 'team', confidence: superintendent ? 'high' : 'low' },
      { label: 'Superintendent Phone', value: superintendent?.users?.phone || null, source: 'team', confidence: superintendent?.users?.phone ? 'high' : 'low' },
      { label: 'Superintendent Email', value: superintendent?.users?.email || null, source: 'team', confidence: superintendent?.users?.email ? 'high' : 'low' },
      { label: 'Project Manager', value: projectManager?.users?.full_name || null, source: 'team', confidence: projectManager ? 'high' : 'low' },
      { label: 'Project Manager Phone', value: projectManager?.users?.phone || null, source: 'team', confidence: projectManager?.users?.phone ? 'high' : 'low' },
      { label: 'Project Manager Email', value: projectManager?.users?.email || null, source: 'team', confidence: projectManager?.users?.email ? 'high' : 'low' }
    ]
  })

  // Valuation Section (for building permits)
  if (permitType === 'building' || permitType === 'demolition' || permitType === 'grading') {
    sections.push({
      section_name: 'Project Valuation',
      fields: [
        { label: 'Contract Value', value: project.contract_value as number | null, source: 'project', confidence: project.contract_value ? 'high' : 'low' },
        { label: 'Project Budget', value: project.budget as number | null, source: 'project', confidence: project.budget ? 'high' : 'low' },
        { label: 'Estimated Valuation', value: (project.contract_value || project.budget) as number | null, source: 'calculated', confidence: (project.contract_value || project.budget) ? 'medium' : 'low' }
      ]
    })
  }

  // Permit-specific sections
  if (permitType === 'building') {
    sections.push({
      section_name: 'Building Information',
      fields: [
        { label: 'Building Use/Occupancy', value: null, source: 'manual_entry', confidence: 'low' },
        { label: 'Construction Type', value: null, source: 'manual_entry', confidence: 'low' },
        { label: 'Number of Stories', value: null, source: 'manual_entry', confidence: 'low' },
        { label: 'Square Footage', value: null, source: 'manual_entry', confidence: 'low' },
        { label: 'Number of Units', value: null, source: 'manual_entry', confidence: 'low' }
      ]
    })
  }

  // Schedule Section
  sections.push({
    section_name: 'Project Schedule',
    fields: [
      { label: 'Planned Start Date', value: project.start_date as string | null, source: 'project', confidence: project.start_date ? 'high' : 'low' },
      { label: 'Planned End Date', value: project.end_date as string | null, source: 'project', confidence: project.end_date ? 'high' : 'low' },
      { label: 'Substantial Completion', value: project.substantial_completion_date as string | null, source: 'project', confidence: project.substantial_completion_date ? 'high' : 'low' }
    ]
  })

  return sections
}

function identifyMissingInfo(
  requiredFields: string[],
  project: Record<string, unknown>,
  company: { name: string; address?: string; license_number?: string } | null,
  applicationData: ApplicationSection[]
): MissingInfo[] {
  const missing: MissingInfo[] = []

  // Check for null/empty values in application sections
  for (const section of applicationData) {
    for (const field of section.fields) {
      if (field.value === null || field.value === '') {
        const priority = determinePriority(field.label, requiredFields)

        missing.push({
          field: field.label,
          description: `${field.label} is not available in the project data`,
          source: section.section_name,
          priority,
          suggestion: getSuggestion(field.label)
        })
      }
    }
  }

  // Check specific required fields
  if (!project.address) {
    missing.push({
      field: 'Project Address',
      description: 'Complete street address is required for permit application',
      source: 'Project Information',
      priority: 'required',
      suggestion: 'Update project settings with complete address'
    })
  }

  if (!company?.license_number) {
    missing.push({
      field: 'Contractor License',
      description: 'Valid contractor license number is required',
      source: 'Contractor Information',
      priority: 'required',
      suggestion: 'Add contractor license number to company profile'
    })
  }

  // Remove duplicates and sort by priority
  const uniqueMissing = missing.reduce((acc, item) => {
    if (!acc.find(m => m.field === item.field)) {
      acc.push(item)
    }
    return acc
  }, [] as MissingInfo[])

  const priorityOrder = { required: 0, recommended: 1, optional: 2 }
  uniqueMissing.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return uniqueMissing
}

function determinePriority(fieldLabel: string, requiredFields: string[]): 'required' | 'recommended' | 'optional' {
  const labelLower = fieldLabel.toLowerCase().replace(/\s+/g, '_')

  // Check if in required fields list
  if (requiredFields.some(f => labelLower.includes(f) || f.includes(labelLower))) {
    return 'required'
  }

  // Known required fields
  const criticalFields = ['address', 'license', 'contractor', 'owner', 'valuation', 'project name']
  if (criticalFields.some(f => labelLower.includes(f))) {
    return 'required'
  }

  // Recommended fields
  const recommendedFields = ['phone', 'email', 'manager', 'superintendent']
  if (recommendedFields.some(f => labelLower.includes(f))) {
    return 'recommended'
  }

  return 'optional'
}

function getSuggestion(fieldLabel: string): string {
  const suggestions: Record<string, string> = {
    'Project Address': 'Update project settings with complete street address',
    'License Number': 'Add contractor license to company profile',
    'Superintendent': 'Assign a superintendent to the project team',
    'Project Manager': 'Assign a project manager to the project team',
    'Contract Value': 'Enter contract value in project financial settings',
    'Building Use/Occupancy': 'Consult architectural plans for occupancy classification',
    'Construction Type': 'Reference structural drawings for construction type',
    'Square Footage': 'Calculate from floor plans or scope documents'
  }

  return suggestions[fieldLabel] || 'Enter this information manually in the application'
}

function calculateFees(
  typicalFees: Array<{ feeType: string; description: string; baseFee: number; perUnit?: string; unitRate?: number }>,
  projectValue: number,
  estimatedUnits: Record<string, number>
): { fees: FeeEstimate[]; total: number } {
  const fees: FeeEstimate[] = []
  let total = 0

  for (const fee of typicalFees) {
    let amount = fee.baseFee
    let calculationBasis = 'Flat fee'

    if (fee.perUnit && fee.unitRate) {
      if (fee.perUnit.includes('valuation')) {
        const valuationUnits = Math.ceil(projectValue / 1000)
        amount = fee.baseFee + (valuationUnits * fee.unitRate)
        calculationBasis = `$${fee.unitRate.toFixed(2)} ${fee.perUnit} (${valuationUnits} units)`
      } else {
        const unitKey = fee.perUnit.replace('per ', '').replace(' ', '_')
        const units = estimatedUnits[unitKey] || 10 // Default estimate
        amount = fee.baseFee + (units * fee.unitRate)
        calculationBasis = `$${fee.unitRate.toFixed(2)} ${fee.perUnit} (${units} units est.)`
      }
    }

    fees.push({
      fee_type: fee.feeType,
      description: fee.description,
      amount: Math.round(amount * 100) / 100,
      calculation_basis: calculationBasis,
      is_estimate: true
    })

    total += amount
  }

  return { fees, total: Math.round(total * 100) / 100 }
}

function getEstimatedUnits(permitType: PermitType, project: Record<string, unknown>): Record<string, number> {
  // Default estimates based on typical project sizes
  const defaults: Record<string, number> = {
    circuit: 50,
    fixture: 20,
    unit: 2,
    head: 100,
    sq_ft: 5000,
    day: 30
  }

  // Could be enhanced with actual project data if available
  return defaults
}

function calculateReadiness(
  documents: RequiredDocument[],
  missingInfo: MissingInfo[]
): { score: number; status: 'ready' | 'mostly_ready' | 'needs_work' | 'not_ready' } {
  // Calculate document readiness
  const requiredDocs = documents.filter(d => d.required)
  const availableDocs = requiredDocs.filter(d => d.status === 'available')
  const docScore = requiredDocs.length > 0
    ? (availableDocs.length / requiredDocs.length) * 50
    : 25

  // Calculate info readiness
  const requiredInfo = missingInfo.filter(m => m.priority === 'required')
  const missingRequiredCount = requiredInfo.length
  const infoScore = Math.max(0, 50 - (missingRequiredCount * 10))

  const totalScore = Math.round(docScore + infoScore)

  let status: 'ready' | 'mostly_ready' | 'needs_work' | 'not_ready'
  if (totalScore >= 90) {
    status = 'ready'
  } else if (totalScore >= 70) {
    status = 'mostly_ready'
  } else if (totalScore >= 40) {
    status = 'needs_work'
  } else {
    status = 'not_ready'
  }

  return { score: totalScore, status }
}

function generateRecommendations(
  documents: RequiredDocument[],
  missingInfo: MissingInfo[],
  permitType: PermitType
): string[] {
  const recommendations: string[] = []

  // Document recommendations
  const missingDocs = documents.filter(d => d.required && d.status === 'missing')
  const expiredDocs = documents.filter(d => d.status === 'expired')

  if (missingDocs.length > 0) {
    recommendations.push(`Upload ${missingDocs.length} required document(s): ${missingDocs.slice(0, 3).map(d => d.name).join(', ')}${missingDocs.length > 3 ? '...' : ''}`)
  }

  if (expiredDocs.length > 0) {
    recommendations.push(`Renew ${expiredDocs.length} expired document(s): ${expiredDocs.map(d => d.name).join(', ')}`)
  }

  // Missing info recommendations
  const requiredMissing = missingInfo.filter(m => m.priority === 'required')
  if (requiredMissing.length > 0) {
    recommendations.push(`Complete ${requiredMissing.length} required field(s) before submitting`)
  }

  // Permit-specific recommendations
  const permitRecommendations: Record<PermitType, string[]> = {
    building: ['Verify contractor license is current and valid for project type', 'Confirm APN/parcel number matches title report'],
    electrical: ['Confirm service size meets load calculation requirements', 'Verify C-10 license is active'],
    plumbing: ['Ensure water heater meets efficiency requirements', 'Verify fixture count for accurate fee calculation'],
    mechanical: ['Confirm SEER ratings meet Title 24 requirements', 'Verify refrigerant type and charge calculations'],
    fire: ['Submit plans to fire marshal for pre-review', 'Coordinate with water district for flow test'],
    demolition: ['Complete asbestos survey before permit application', 'Obtain utility disconnect confirmations'],
    grading: ['Submit SWPPP to regional board if disturbing > 1 acre', 'Obtain haul route approval for import/export'],
    encroachment: ['Coordinate traffic control with local traffic authority', 'Obtain neighboring property owner notifications if required'],
    sign: ['Verify sign meets zoning code requirements', 'Check for architectural review requirements'],
    temporary_power: ['Coordinate service installation date with utility', 'Verify GFCI protection requirements']
  }

  recommendations.push(...(permitRecommendations[permitType] || []).slice(0, 2))

  return recommendations.slice(0, 6)
}

function generateNextSteps(
  documents: RequiredDocument[],
  missingInfo: MissingInfo[],
  status: string
): string[] {
  const steps: string[] = []

  const missingDocs = documents.filter(d => d.required && d.status === 'missing')
  const requiredMissing = missingInfo.filter(m => m.priority === 'required')

  if (missingDocs.length > 0) {
    steps.push(`1. Gather and upload ${missingDocs.length} missing required document(s)`)
  }

  if (requiredMissing.length > 0) {
    steps.push(`${steps.length + 1}. Complete ${requiredMissing.length} required application field(s)`)
  }

  steps.push(`${steps.length + 1}. Review application data for accuracy`)
  steps.push(`${steps.length + 1}. Print or export completed application`)

  if (status === 'ready' || status === 'mostly_ready') {
    steps.push(`${steps.length + 1}. Submit application to jurisdiction with required fees`)
    steps.push(`${steps.length + 1}. Track application status and respond to any corrections`)
  }

  return steps.slice(0, 6)
}
