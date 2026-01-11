/**
 * Check Compliance Tool
 * Verifies regulatory compliance by checking permits, insurance, safety training, and OSHA requirements
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

// ============================================================================
// Input/Output Types
// ============================================================================

type ComplianceCheckType =
  | 'permits'
  | 'insurance'
  | 'safety_training'
  | 'osha_postings'
  | 'all'

interface CheckComplianceInput {
  project_id: string
  check_types?: ComplianceCheckType[]
}

interface PermitComplianceItem {
  permit_type: string
  permit_number: string | null
  status: 'valid' | 'expired' | 'missing' | 'pending'
  expiration_date: string | null
  issuing_authority: string | null
  required_for: string
  notes: string | null
}

interface InsuranceComplianceItem {
  certificate_type: string
  carrier: string | null
  policy_number: string | null
  status: 'current' | 'expiring_soon' | 'expired' | 'missing'
  expiration_date: string | null
  coverage_amount: number | null
  holder: string
  notes: string | null
}

interface SafetyTrainingItem {
  training_type: string
  required_for: string
  status: 'compliant' | 'expiring_soon' | 'expired' | 'missing'
  workers_compliant: number
  workers_total: number
  compliance_percentage: number
  next_expiration: string | null
  notes: string | null
}

interface OshaPostingItem {
  posting_type: string
  requirement: string
  status: 'posted' | 'missing' | 'outdated'
  location: string | null
  last_verified: string | null
  notes: string | null
}

interface ComplianceGap {
  category: 'permit' | 'insurance' | 'training' | 'osha'
  severity: 'critical' | 'high' | 'medium' | 'low'
  item: string
  description: string
  deadline: string | null
  action_required: string
  potential_penalty: string | null
  responsible_party: string | null
}

interface CheckComplianceOutput {
  compliance_status: 'compliant' | 'at_risk' | 'non_compliant'
  overall_score: number
  gaps: ComplianceGap[]
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  permits: PermitComplianceItem[]
  insurance: InsuranceComplianceItem[]
  safety_training: SafetyTrainingItem[]
  osha_postings: OshaPostingItem[]
  recommendations: string[]
  summary: {
    total_items_checked: number
    compliant_items: number
    non_compliant_items: number
    expiring_soon: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_PERMITS: Array<{ type: string; required_for: string }> = [
  { type: 'Building Permit', required_for: 'General construction activities' },
  { type: 'Electrical Permit', required_for: 'Electrical work' },
  { type: 'Plumbing Permit', required_for: 'Plumbing installations' },
  { type: 'Mechanical Permit', required_for: 'HVAC and mechanical systems' },
  { type: 'Demolition Permit', required_for: 'Demolition activities' },
  { type: 'Grading Permit', required_for: 'Site grading and earthwork' },
  { type: 'Fire Permit', required_for: 'Fire suppression systems' },
  { type: 'Environmental Permit', required_for: 'Environmental compliance' },
]

const REQUIRED_INSURANCE: Array<{ type: string; min_coverage: number }> = [
  { type: 'General Liability', min_coverage: 1000000 },
  { type: 'Workers Compensation', min_coverage: 500000 },
  { type: 'Professional Liability', min_coverage: 1000000 },
  { type: 'Automobile Liability', min_coverage: 1000000 },
  { type: 'Umbrella/Excess Liability', min_coverage: 5000000 },
  { type: 'Builders Risk', min_coverage: 0 }, // Project-specific
]

const REQUIRED_SAFETY_TRAINING: string[] = [
  'OSHA 10-Hour Construction',
  'OSHA 30-Hour Construction',
  'Fall Protection',
  'Hazard Communication (HazCom)',
  'Scaffolding Safety',
  'Confined Space Entry',
  'Excavation & Trenching',
  'Lockout/Tagout (LOTO)',
  'First Aid/CPR/AED',
  'Fire Extinguisher',
  'PPE Training',
  'Silica Awareness',
]

const OSHA_REQUIRED_POSTINGS: Array<{ type: string; requirement: string }> = [
  { type: 'OSHA 3165 Poster', requirement: 'Job Safety and Health Protection poster' },
  { type: 'OSHA 300A Summary', requirement: 'Annual summary of injuries/illnesses (Feb-Apr)' },
  { type: 'Emergency Action Plan', requirement: 'Emergency procedures and evacuation routes' },
  { type: 'Emergency Contact Numbers', requirement: 'Emergency services and site contacts' },
  { type: 'First Aid Station Location', requirement: 'Location of first aid supplies' },
  { type: 'Fire Extinguisher Locations', requirement: 'Fire extinguisher placement signage' },
  { type: 'Safety Data Sheets (SDS)', requirement: 'Chemical hazard information access' },
  { type: 'Confined Space Warning', requirement: 'Permit-required confined space signage' },
  { type: 'Hard Hat Area', requirement: 'PPE requirement signage' },
  { type: 'No Smoking Signs', requirement: 'Designated smoking/no-smoking areas' },
]

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) return null
  const expDate = new Date(expirationDate)
  const today = new Date()
  return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getExpirationStatus(
  expirationDate: string | null,
  warningDays: number = 30
): 'current' | 'expiring_soon' | 'expired' {
  const daysUntil = calculateDaysUntilExpiration(expirationDate)
  if (daysUntil === null) return 'current'
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= warningDays) return 'expiring_soon'
  return 'current'
}

function determineRiskLevel(gaps: ComplianceGap[]): 'low' | 'medium' | 'high' | 'critical' {
  const criticalCount = gaps.filter(g => g.severity === 'critical').length
  const highCount = gaps.filter(g => g.severity === 'high').length
  const mediumCount = gaps.filter(g => g.severity === 'medium').length

  if (criticalCount > 0) return 'critical'
  if (highCount >= 2) return 'high'
  if (highCount === 1 || mediumCount >= 3) return 'medium'
  return 'low'
}

function determineComplianceStatus(
  score: number
): 'compliant' | 'at_risk' | 'non_compliant' {
  if (score >= 90) return 'compliant'
  if (score >= 70) return 'at_risk'
  return 'non_compliant'
}

function generateRecommendations(
  gaps: ComplianceGap[],
  permits: PermitComplianceItem[],
  insurance: InsuranceComplianceItem[],
  training: SafetyTrainingItem[],
  postings: OshaPostingItem[]
): string[] {
  const recommendations: string[] = []

  // Critical gaps first
  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  if (criticalGaps.length > 0) {
    recommendations.push(
      `URGENT: Address ${criticalGaps.length} critical compliance gap(s) immediately to avoid work stoppage`
    )
  }

  // Permit recommendations
  const missingPermits = permits.filter(p => p.status === 'missing')
  const expiringPermits = permits.filter(p => p.status === 'pending')
  if (missingPermits.length > 0) {
    recommendations.push(
      `Obtain missing permits: ${missingPermits.map(p => p.permit_type).join(', ')}`
    )
  }
  if (expiringPermits.length > 0) {
    recommendations.push(
      `Follow up on pending permit applications to avoid delays`
    )
  }

  // Insurance recommendations
  const expiringInsurance = insurance.filter(i => i.status === 'expiring_soon')
  const expiredInsurance = insurance.filter(i => i.status === 'expired')
  if (expiredInsurance.length > 0) {
    recommendations.push(
      `Renew expired insurance certificates immediately: ${expiredInsurance.map(i => i.certificate_type).join(', ')}`
    )
  }
  if (expiringInsurance.length > 0) {
    recommendations.push(
      `Initiate renewal for ${expiringInsurance.length} insurance certificate(s) expiring within 30 days`
    )
  }

  // Training recommendations
  const lowCompliance = training.filter(t => t.compliance_percentage < 80)
  if (lowCompliance.length > 0) {
    recommendations.push(
      `Schedule safety training sessions for: ${lowCompliance.map(t => t.training_type).join(', ')}`
    )
  }

  // OSHA posting recommendations
  const missingPostings = postings.filter(p => p.status === 'missing')
  if (missingPostings.length > 0) {
    recommendations.push(
      `Post required OSHA signage: ${missingPostings.map(p => p.posting_type).join(', ')}`
    )
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue regular compliance monitoring and documentation')
    recommendations.push('Schedule quarterly compliance audits to maintain status')
  }

  recommendations.push('Maintain updated records of all compliance documents in project files')

  return recommendations.slice(0, 8)
}

// ============================================================================
// Tool Definition
// ============================================================================

export const checkComplianceTool = createTool<CheckComplianceInput, CheckComplianceOutput>({
  name: 'check_compliance',
  displayName: 'Check Regulatory Compliance',
  description:
    'Checks regulatory compliance by verifying required permits are in place, insurance certificates are current, safety training certifications are valid, and OSHA posting requirements are met. Flags compliance gaps and provides risk assessment.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to check compliance for',
      },
      check_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['permits', 'insurance', 'safety_training', 'osha_postings', 'all'],
        },
        description:
          'Types of compliance checks to perform. Defaults to all if not specified.',
      },
    },
    required: ['project_id'],
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(
    input: CheckComplianceInput,
    context: AgentContext
  ): Promise<CheckComplianceOutput> {
    const { project_id, check_types = ['all'] } = input
    const checkAll = check_types.includes('all')

    const gaps: ComplianceGap[] = []
    let permits: PermitComplianceItem[] = []
    let insurance: InsuranceComplianceItem[] = []
    let safetyTraining: SafetyTrainingItem[] = []
    let oshaPostings: OshaPostingItem[] = []

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*, company_id')
      .eq('id', project_id)
      .single()

    const companyId = project?.company_id || context.companyId

    // ========================================================================
    // Check Permits
    // ========================================================================
    if (checkAll || check_types.includes('permits')) {
      const { data: projectPermits } = await supabase
        .from('permits')
        .select('*')
        .eq('project_id', project_id)
        .is('deleted_at', null)

      const existingPermitTypes = new Set(
        (projectPermits || []).map(p => (p.permit_type || p.type || '').toLowerCase())
      )

      permits = REQUIRED_PERMITS.map(required => {
        const existing = (projectPermits || []).find(
          p =>
            (p.permit_type || p.type || '').toLowerCase() ===
            required.type.toLowerCase()
        )

        if (!existing) {
          gaps.push({
            category: 'permit',
            severity: 'critical',
            item: required.type,
            description: `Required ${required.type} is missing`,
            deadline: null,
            action_required: `Obtain ${required.type} before proceeding with ${required.required_for.toLowerCase()}`,
            potential_penalty: 'Work stoppage, fines up to $10,000',
            responsible_party: 'Project Manager',
          })

          return {
            permit_type: required.type,
            permit_number: null,
            status: 'missing' as const,
            expiration_date: null,
            issuing_authority: null,
            required_for: required.required_for,
            notes: null,
          }
        }

        const daysUntil = calculateDaysUntilExpiration(existing.expiration_date)
        let status: 'valid' | 'expired' | 'pending' = 'valid'

        if (existing.status === 'pending' || existing.status === 'submitted') {
          status = 'pending'
        } else if (daysUntil !== null && daysUntil < 0) {
          status = 'expired'
          gaps.push({
            category: 'permit',
            severity: 'critical',
            item: required.type,
            description: `${required.type} has expired`,
            deadline: existing.expiration_date,
            action_required: 'Renew permit immediately',
            potential_penalty: 'Work stoppage, fines',
            responsible_party: 'Project Manager',
          })
        } else if (daysUntil !== null && daysUntil <= 30) {
          gaps.push({
            category: 'permit',
            severity: 'medium',
            item: required.type,
            description: `${required.type} expires in ${daysUntil} days`,
            deadline: existing.expiration_date,
            action_required: 'Initiate permit renewal process',
            potential_penalty: null,
            responsible_party: 'Project Manager',
          })
        }

        return {
          permit_type: required.type,
          permit_number: existing.permit_number || existing.number,
          status,
          expiration_date: existing.expiration_date,
          issuing_authority: existing.issuing_authority || existing.authority,
          required_for: required.required_for,
          notes: existing.notes,
        }
      })
    }

    // ========================================================================
    // Check Insurance Certificates
    // ========================================================================
    if (checkAll || check_types.includes('insurance')) {
      const { data: insuranceCerts } = await supabase
        .from('insurance_certificates')
        .select('*')
        .eq('project_id', project_id)
        .is('deleted_at', null)

      insurance = REQUIRED_INSURANCE.map(required => {
        const existing = (insuranceCerts || []).find(
          cert =>
            (cert.certificate_type || cert.type || '').toLowerCase() ===
            required.type.toLowerCase()
        )

        if (!existing) {
          gaps.push({
            category: 'insurance',
            severity: 'high',
            item: required.type,
            description: `Required ${required.type} insurance certificate is missing`,
            deadline: null,
            action_required: `Obtain certificate of insurance for ${required.type}`,
            potential_penalty: 'Contract violation, liability exposure',
            responsible_party: 'Project Manager / Contractor',
          })

          return {
            certificate_type: required.type,
            carrier: null,
            policy_number: null,
            status: 'missing' as const,
            expiration_date: null,
            coverage_amount: null,
            holder: 'Unknown',
            notes: null,
          }
        }

        const status = getExpirationStatus(existing.expiration_date)

        if (status === 'expired') {
          gaps.push({
            category: 'insurance',
            severity: 'critical',
            item: required.type,
            description: `${required.type} insurance has expired`,
            deadline: existing.expiration_date,
            action_required: 'Obtain renewed certificate immediately',
            potential_penalty: 'Work stoppage, liability exposure',
            responsible_party: 'Project Manager',
          })
        } else if (status === 'expiring_soon') {
          const daysUntil = calculateDaysUntilExpiration(existing.expiration_date)
          gaps.push({
            category: 'insurance',
            severity: 'medium',
            item: required.type,
            description: `${required.type} insurance expires in ${daysUntil} days`,
            deadline: existing.expiration_date,
            action_required: 'Request renewal certificate from carrier',
            potential_penalty: null,
            responsible_party: 'Project Manager',
          })
        }

        // Check coverage amount
        const coverageAmount = existing.coverage_amount || existing.amount || 0
        if (required.min_coverage > 0 && coverageAmount < required.min_coverage) {
          gaps.push({
            category: 'insurance',
            severity: 'medium',
            item: required.type,
            description: `${required.type} coverage ($${coverageAmount.toLocaleString()}) below minimum requirement ($${required.min_coverage.toLocaleString()})`,
            deadline: null,
            action_required: 'Increase coverage to meet minimum requirements',
            potential_penalty: 'Potential liability exposure',
            responsible_party: 'Project Manager',
          })
        }

        return {
          certificate_type: required.type,
          carrier: existing.carrier || existing.insurance_carrier,
          policy_number: existing.policy_number,
          status,
          expiration_date: existing.expiration_date,
          coverage_amount: coverageAmount,
          holder: existing.holder || existing.certificate_holder || 'Project',
          notes: existing.notes,
        }
      })
    }

    // ========================================================================
    // Check Safety Training Certifications
    // ========================================================================
    if (checkAll || check_types.includes('safety_training')) {
      // Get project team members
      const { data: teamMembers } = await supabase
        .from('project_team')
        .select('user_id, role')
        .eq('project_id', project_id)

      const totalWorkers = teamMembers?.length || 0

      // Get training records
      const { data: trainingRecords } = await supabase
        .from('safety_training')
        .select('*')
        .eq('project_id', project_id)
        .is('deleted_at', null)

      safetyTraining = REQUIRED_SAFETY_TRAINING.map(trainingType => {
        const matchingRecords = (trainingRecords || []).filter(
          record =>
            (record.training_type || record.type || '').toLowerCase() ===
            trainingType.toLowerCase()
        )

        const validRecords = matchingRecords.filter(record => {
          const status = getExpirationStatus(record.expiration_date, 60)
          return status === 'current'
        })

        const expiringRecords = matchingRecords.filter(record => {
          const status = getExpirationStatus(record.expiration_date, 60)
          return status === 'expiring_soon'
        })

        const workersCompliant = validRecords.length
        const compliancePercentage =
          totalWorkers > 0 ? Math.round((workersCompliant / totalWorkers) * 100) : 0

        let status: 'compliant' | 'expiring_soon' | 'expired' | 'missing' = 'compliant'
        if (workersCompliant === 0) {
          status = 'missing'
        } else if (compliancePercentage < 80) {
          status = 'expired'
        } else if (expiringRecords.length > 0) {
          status = 'expiring_soon'
        }

        // Find next expiration
        const sortedRecords = matchingRecords
          .filter(r => r.expiration_date)
          .sort(
            (a, b) =>
              new Date(a.expiration_date).getTime() -
              new Date(b.expiration_date).getTime()
          )
        const nextExpiration = sortedRecords[0]?.expiration_date || null

        if (compliancePercentage < 100 && totalWorkers > 0) {
          const workersNeeding = totalWorkers - workersCompliant
          gaps.push({
            category: 'training',
            severity: compliancePercentage < 50 ? 'high' : 'medium',
            item: trainingType,
            description: `${workersNeeding} worker(s) lack valid ${trainingType} certification`,
            deadline: nextExpiration,
            action_required: `Schedule ${trainingType} training for non-compliant workers`,
            potential_penalty: 'OSHA citations, potential work stoppage',
            responsible_party: 'Safety Manager',
          })
        }

        return {
          training_type: trainingType,
          required_for: 'All site personnel',
          status,
          workers_compliant: workersCompliant,
          workers_total: totalWorkers,
          compliance_percentage: compliancePercentage,
          next_expiration: nextExpiration,
          notes: null,
        }
      })
    }

    // ========================================================================
    // Check OSHA Posting Requirements
    // ========================================================================
    if (checkAll || check_types.includes('osha_postings')) {
      const { data: postings } = await supabase
        .from('safety_postings')
        .select('*')
        .eq('project_id', project_id)
        .is('deleted_at', null)

      oshaPostings = OSHA_REQUIRED_POSTINGS.map(required => {
        const existing = (postings || []).find(
          posting =>
            (posting.posting_type || posting.type || '').toLowerCase() ===
            required.type.toLowerCase()
        )

        if (!existing) {
          gaps.push({
            category: 'osha',
            severity: 'medium',
            item: required.type,
            description: `Required ${required.type} not posted`,
            deadline: null,
            action_required: `Post ${required.type} in visible location`,
            potential_penalty: 'OSHA citation',
            responsible_party: 'Site Superintendent',
          })

          return {
            posting_type: required.type,
            requirement: required.requirement,
            status: 'missing' as const,
            location: null,
            last_verified: null,
            notes: null,
          }
        }

        // Check if posting is outdated (not verified in last 90 days)
        const lastVerified = existing.last_verified || existing.verified_date
        let status: 'posted' | 'missing' | 'outdated' = 'posted'
        if (lastVerified) {
          const daysSinceVerification = Math.ceil(
            (Date.now() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysSinceVerification > 90) {
            status = 'outdated'
            gaps.push({
              category: 'osha',
              severity: 'low',
              item: required.type,
              description: `${required.type} has not been verified in ${daysSinceVerification} days`,
              deadline: null,
              action_required: 'Verify posting is current and visible',
              potential_penalty: null,
              responsible_party: 'Site Superintendent',
            })
          }
        }

        return {
          posting_type: required.type,
          requirement: required.requirement,
          status,
          location: existing.location,
          last_verified: lastVerified,
          notes: existing.notes,
        }
      })
    }

    // ========================================================================
    // Calculate Overall Compliance Score
    // ========================================================================
    const totalItems =
      permits.length + insurance.length + safetyTraining.length + oshaPostings.length

    const compliantPermits = permits.filter(p => p.status === 'valid').length
    const compliantInsurance = insurance.filter(i => i.status === 'current').length
    const compliantTraining = safetyTraining.filter(
      t => t.status === 'compliant' || t.status === 'expiring_soon'
    ).length
    const compliantPostings = oshaPostings.filter(p => p.status === 'posted').length

    const compliantItems =
      compliantPermits + compliantInsurance + compliantTraining + compliantPostings

    const overallScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100

    const expiringSoon =
      permits.filter(p => p.status === 'pending').length +
      insurance.filter(i => i.status === 'expiring_soon').length +
      safetyTraining.filter(t => t.status === 'expiring_soon').length

    const nonCompliantItems = totalItems - compliantItems

    // Sort gaps by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    const recommendations = generateRecommendations(
      gaps,
      permits,
      insurance,
      safetyTraining,
      oshaPostings
    )

    return {
      compliance_status: determineComplianceStatus(overallScore),
      overall_score: overallScore,
      gaps,
      risk_level: determineRiskLevel(gaps),
      permits,
      insurance,
      safety_training: safetyTraining,
      osha_postings: oshaPostings,
      recommendations,
      summary: {
        total_items_checked: totalItems,
        compliant_items: compliantItems,
        non_compliant_items: nonCompliantItems,
        expiring_soon: expiringSoon,
      },
    }
  },

  formatOutput(output: CheckComplianceOutput) {
    const { compliance_status, overall_score, gaps, risk_level, summary } = output

    const statusIcon = {
      compliant: 'check-circle',
      at_risk: 'alert-triangle',
      non_compliant: 'x-circle',
    }[compliance_status]

    const statusColor = {
      compliant: 'success',
      at_risk: 'warning',
      non_compliant: 'error',
    }[compliance_status] as 'success' | 'warning' | 'error'

    const criticalGaps = gaps.filter(g => g.severity === 'critical').length
    const highGaps = gaps.filter(g => g.severity === 'high').length

    return {
      title: 'Compliance Check Complete',
      summary:
        compliance_status === 'compliant'
          ? `All compliance requirements met (${overall_score}%)`
          : `${gaps.length} compliance gap(s) identified - ${risk_level.toUpperCase()} risk`,
      icon: statusIcon,
      status: statusColor,
      details: [
        { label: 'Overall Score', value: `${overall_score}%`, type: 'text' as const },
        { label: 'Status', value: compliance_status.replace('_', ' ').toUpperCase(), type: 'badge' as const },
        { label: 'Risk Level', value: risk_level.toUpperCase(), type: 'badge' as const },
        { label: 'Items Checked', value: summary.total_items_checked, type: 'text' as const },
        { label: 'Compliant', value: summary.compliant_items, type: 'text' as const },
        { label: 'Non-Compliant', value: summary.non_compliant_items, type: 'text' as const },
        ...(criticalGaps > 0
          ? [{ label: 'Critical Gaps', value: criticalGaps, type: 'text' as const }]
          : []),
        ...(highGaps > 0
          ? [{ label: 'High Priority Gaps', value: highGaps, type: 'text' as const }]
          : []),
        ...(summary.expiring_soon > 0
          ? [{ label: 'Expiring Soon', value: summary.expiring_soon, type: 'text' as const }]
          : []),
      ],
      expandedContent: output as unknown as Record<string, unknown>,
    }
  },
})
