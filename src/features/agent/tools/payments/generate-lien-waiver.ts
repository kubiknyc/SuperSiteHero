/**
 * Generate Lien Waiver Tool
 * Generates lien waivers based on payment and contract data with state-specific requirements
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

type WaiverType = 'conditional_progress' | 'unconditional_progress' | 'conditional_final' | 'unconditional_final'
type WaiverStatus = 'draft' | 'pending_signature' | 'signed' | 'recorded' | 'expired' | 'void'

interface GenerateLienWaiverInput {
  project_id: string
  payment_id?: string
  amount?: number
  waiver_type: WaiverType
  vendor_id: string
  through_date?: string
}

interface StateRequirements {
  state_code: string
  state_name: string
  statutory_form_required: boolean
  form_reference?: string
  notarization_required: boolean
  recording_required: boolean
  special_language?: string[]
  warning_language?: string
  effective_date_rules?: string
  additional_fields?: string[]
}

interface VendorInfo {
  id: string
  name: string
  company_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  license_number?: string
  tax_id?: string
}

interface ProjectInfo {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  owner_name?: string
  general_contractor?: string
  contract_amount?: number
}

interface PaymentInfo {
  id: string
  amount: number
  payment_date?: string
  payment_number?: string
  description?: string
  check_number?: string
}

interface WaiverContent {
  title: string
  waiver_type_display: string
  date: string
  claimant_name: string
  claimant_address: string
  owner_name: string
  property_address: string
  general_contractor?: string
  job_description?: string
  through_date: string
  payment_amount: number
  payment_description?: string
  exceptions?: string
  statutory_warning?: string
  notarization_block?: string
  signature_block: string
  body_text: string
}

interface GenerateLienWaiverOutput {
  waiver_id: string
  waiver_content: WaiverContent
  waiver_type: WaiverType
  waiver_type_display: string
  amount: number
  through_date: string
  state_requirements: StateRequirements
  vendor_info: VendorInfo
  project_info: ProjectInfo
  status: WaiverStatus
  created_at: string
  warnings: string[]
  next_steps: string[]
}

// ============================================================================
// State-Specific Lien Waiver Requirements
// ============================================================================

const STATE_REQUIREMENTS: Record<string, StateRequirements> = {
  CA: {
    state_code: 'CA',
    state_name: 'California',
    statutory_form_required: true,
    form_reference: 'California Civil Code Section 8132-8138',
    notarization_required: false,
    recording_required: false,
    special_language: [
      'This document waives the claimant\'s lien, stop payment notice, and payment bond rights effective on receipt of payment.',
      'A person should not rely on this document unless satisfied that the claimant has received payment.'
    ],
    warning_language: 'NOTICE: This document waives rights unconditionally and states that you have been paid for giving up those rights. This document is enforceable against you if you sign it, even if you have not been paid. If you have not been paid, use a conditional release form.',
    additional_fields: ['license_number', 'through_date']
  },
  TX: {
    state_code: 'TX',
    state_name: 'Texas',
    statutory_form_required: true,
    form_reference: 'Texas Property Code Chapter 53.281-53.284',
    notarization_required: true,
    recording_required: false,
    special_language: [
      'This waiver and release is given in exchange for the payment described.',
      'The claimant waives and releases all liens, claims, and rights to claim liens.'
    ],
    effective_date_rules: 'Conditional waivers effective only upon receipt of actual payment',
    additional_fields: ['notarization']
  },
  FL: {
    state_code: 'FL',
    state_name: 'Florida',
    statutory_form_required: true,
    form_reference: 'Florida Statutes Section 713.20',
    notarization_required: false,
    recording_required: false,
    special_language: [
      'The undersigned lienor waives and releases its lien and right to claim a lien for labor, services, or materials furnished through the date shown.'
    ],
    warning_language: 'Warning: This is a waiver of payment bond rights. Do not sign this waiver unless you have received payment.',
    additional_fields: ['through_date', 'permit_number']
  },
  NY: {
    state_code: 'NY',
    state_name: 'New York',
    statutory_form_required: false,
    notarization_required: true,
    recording_required: false,
    special_language: [
      'The undersigned hereby waives and releases any and all lien or claim of lien upon the premises described herein.'
    ],
    additional_fields: ['notarization', 'acknowledgment']
  },
  IL: {
    state_code: 'IL',
    state_name: 'Illinois',
    statutory_form_required: false,
    notarization_required: false,
    recording_required: false,
    special_language: [
      'The undersigned waives and releases any mechanic\'s lien rights under the Illinois Mechanics Lien Act.'
    ],
    additional_fields: ['sworn_statement_reference']
  },
  AZ: {
    state_code: 'AZ',
    state_name: 'Arizona',
    statutory_form_required: true,
    form_reference: 'Arizona Revised Statutes Section 33-1008',
    notarization_required: false,
    recording_required: false,
    special_language: [
      'This waiver and release complies with Arizona Revised Statutes Section 33-1008.',
      'Claimant certifies that all laborers, subcontractors, and material suppliers have been paid.'
    ],
    effective_date_rules: 'Must specify progress payment period',
    additional_fields: ['registrar_of_contractors_number']
  },
  GA: {
    state_code: 'GA',
    state_name: 'Georgia',
    statutory_form_required: false,
    notarization_required: true,
    recording_required: false,
    special_language: [
      'The undersigned certifies that all amounts due for labor, services, and materials have been paid.'
    ],
    additional_fields: ['affidavit', 'notarization']
  },
  DEFAULT: {
    state_code: 'DEFAULT',
    state_name: 'Standard',
    statutory_form_required: false,
    notarization_required: false,
    recording_required: false,
    special_language: [
      'The undersigned hereby waives and releases any lien or claim of lien for labor, services, or materials furnished to the property described herein.'
    ]
  }
}

// ============================================================================
// Waiver Content Templates
// ============================================================================

const WAIVER_TITLES: Record<WaiverType, string> = {
  conditional_progress: 'Conditional Waiver and Release on Progress Payment',
  unconditional_progress: 'Unconditional Waiver and Release on Progress Payment',
  conditional_final: 'Conditional Waiver and Release on Final Payment',
  unconditional_final: 'Unconditional Waiver and Release on Final Payment'
}

const WAIVER_TYPE_DESCRIPTIONS: Record<WaiverType, string> = {
  conditional_progress: 'Conditional Progress Payment',
  unconditional_progress: 'Unconditional Progress Payment',
  conditional_final: 'Conditional Final Payment',
  unconditional_final: 'Unconditional Final Payment'
}

function getWaiverBodyText(
  waiverType: WaiverType,
  stateRequirements: StateRequirements,
  content: {
    claimantName: string
    ownerName: string
    propertyAddress: string
    amount: number
    throughDate: string
    paymentDescription?: string
  }
): string {
  const isConditional = waiverType.includes('conditional')
  const isFinal = waiverType.includes('final')

  const amountFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(content.amount)

  let bodyText = ''

  if (isConditional) {
    bodyText = `Upon receipt of payment in the sum of ${amountFormatted}, the undersigned, ${content.claimantName}, `
  } else {
    bodyText = `The undersigned, ${content.claimantName}, having received payment in the sum of ${amountFormatted}, `
  }

  if (isFinal) {
    bodyText += `hereby waives and releases any and all right to a mechanic's lien, stop payment notice, and any right to make a claim on a labor and material payment bond for labor, services, equipment, or materials furnished to ${content.ownerName} on the property located at ${content.propertyAddress}.`
  } else {
    bodyText += `hereby waives and releases any and all right to a mechanic's lien, stop payment notice, and any right to make a claim on a labor and material payment bond for labor, services, equipment, or materials furnished to ${content.ownerName} on the property located at ${content.propertyAddress} through ${content.throughDate}.`
  }

  // Add state-specific language
  if (stateRequirements.special_language && stateRequirements.special_language.length > 0) {
    bodyText += '\n\n' + stateRequirements.special_language.join('\n\n')
  }

  if (isFinal) {
    bodyText += '\n\nThis waiver covers the final payment for all work and materials and represents a complete and final release of all lien rights.'
  } else {
    bodyText += `\n\nThis waiver covers progress payment through ${content.throughDate} only. The claimant reserves all rights for amounts not covered by this waiver.`
  }

  return bodyText
}

function generateSignatureBlock(
  waiverType: WaiverType,
  stateRequirements: StateRequirements,
  vendor: VendorInfo
): string {
  let block = `
CLAIMANT'S SIGNATURE:

_________________________________
${vendor.company_name || vendor.name}
By: _____________________________
Title: __________________________
Date: ___________________________
`

  if (vendor.license_number) {
    block += `License No.: ${vendor.license_number}\n`
  }

  return block
}

function generateNotarizationBlock(state: StateRequirements): string | undefined {
  if (!state.notarization_required) {return undefined}

  return `
NOTARIZATION:

State of ${state.state_name}
County of ______________________

On this _____ day of _____________, 20____, before me personally appeared
_____________________________, known to me (or proved to me on the basis of
satisfactory evidence) to be the person whose name is subscribed to the
within instrument and acknowledged to me that he/she executed the same
in his/her authorized capacity, and that by his/her signature on the
instrument the person, or the entity upon behalf of which the person acted,
executed the instrument.

WITNESS my hand and official seal.

_________________________________
Notary Public
My Commission Expires: ___________
`
}

// ============================================================================
// Tool Implementation
// ============================================================================

export const generateLienWaiverTool = createTool<GenerateLienWaiverInput, GenerateLienWaiverOutput>({
  name: 'generate_lien_waiver',
  displayName: 'Generate Lien Waiver',
  description: 'Generates lien waivers for progress or final payments. Supports conditional and unconditional waivers with state-specific statutory requirements. Tracks waiver status through signature and recording.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID for which to generate the waiver'
      },
      payment_id: {
        type: 'string',
        description: 'The payment ID (if generating waiver for a specific payment)'
      },
      amount: {
        type: 'number',
        description: 'The payment amount (required if payment_id not provided)'
      },
      waiver_type: {
        type: 'string',
        enum: ['conditional_progress', 'unconditional_progress', 'conditional_final', 'unconditional_final'],
        description: 'Type of lien waiver to generate'
      },
      vendor_id: {
        type: 'string',
        description: 'The vendor/subcontractor ID for whom the waiver is generated'
      },
      through_date: {
        type: 'string',
        description: 'The date through which work/materials are covered (ISO date format)'
      }
    },
    required: ['project_id', 'waiver_type', 'vendor_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const {
      project_id,
      payment_id,
      amount: inputAmount,
      waiver_type,
      vendor_id,
      through_date
    } = input

    const warnings: string[] = []
    const nextSteps: string[] = []

    // Fetch project information
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, address, city, state, zip, owner_name, contract_amount')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return {
        success: false,
        error: `Failed to fetch project: ${projectError?.message || 'Project not found'}`,
        errorCode: 'PROJECT_NOT_FOUND'
      }
    }

    // Fetch vendor information
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, company_name, address, city, state, zip, license_number, tax_id')
      .eq('id', vendor_id)
      .single()

    if (vendorError || !vendor) {
      return {
        success: false,
        error: `Failed to fetch vendor: ${vendorError?.message || 'Vendor not found'}`,
        errorCode: 'VENDOR_NOT_FOUND'
      }
    }

    // Determine payment amount and info
    let paymentAmount = inputAmount || 0
    let paymentInfo: PaymentInfo | undefined

    if (payment_id) {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, amount, payment_date, payment_number, description, check_number')
        .eq('id', payment_id)
        .single()

      if (paymentError || !payment) {
        return {
          success: false,
          error: `Failed to fetch payment: ${paymentError?.message || 'Payment not found'}`,
          errorCode: 'PAYMENT_NOT_FOUND'
        }
      }

      paymentAmount = payment.amount
      paymentInfo = {
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_number: payment.payment_number,
        description: payment.description,
        check_number: payment.check_number
      }
    }

    if (!paymentAmount || paymentAmount <= 0) {
      return {
        success: false,
        error: 'Payment amount is required. Provide either a payment_id or amount.',
        errorCode: 'INVALID_AMOUNT'
      }
    }

    // Determine state requirements
    const projectState = project.state?.toUpperCase() || 'DEFAULT'
    const stateRequirements = STATE_REQUIREMENTS[projectState] || STATE_REQUIREMENTS.DEFAULT

    // Calculate through date
    const effectiveThroughDate = through_date || new Date().toISOString().split('T')[0]

    // Build addresses
    const vendorAddress = [vendor.address, vendor.city, vendor.state, vendor.zip]
      .filter(Boolean)
      .join(', ')

    const propertyAddress = [project.address, project.city, project.state, project.zip]
      .filter(Boolean)
      .join(', ')

    // Generate waiver content
    const waiverTitle = WAIVER_TITLES[waiver_type]
    const waiverTypeDisplay = WAIVER_TYPE_DESCRIPTIONS[waiver_type]
    const currentDate = new Date().toISOString().split('T')[0]

    const bodyText = getWaiverBodyText(waiver_type, stateRequirements, {
      claimantName: vendor.company_name || vendor.name,
      ownerName: project.owner_name || 'Property Owner',
      propertyAddress: propertyAddress || project.name,
      amount: paymentAmount,
      throughDate: effectiveThroughDate,
      paymentDescription: paymentInfo?.description
    })

    const signatureBlock = generateSignatureBlock(waiver_type, stateRequirements, vendor as VendorInfo)
    const notarizationBlock = generateNotarizationBlock(stateRequirements)

    const waiverContent: WaiverContent = {
      title: waiverTitle,
      waiver_type_display: waiverTypeDisplay,
      date: currentDate,
      claimant_name: vendor.company_name || vendor.name,
      claimant_address: vendorAddress,
      owner_name: project.owner_name || 'Property Owner',
      property_address: propertyAddress || project.name,
      job_description: project.name,
      through_date: effectiveThroughDate,
      payment_amount: paymentAmount,
      payment_description: paymentInfo?.description,
      statutory_warning: stateRequirements.warning_language,
      notarization_block: notarizationBlock,
      signature_block: signatureBlock,
      body_text: bodyText
    }

    // Create waiver record in database
    const { data: waiverRecord, error: waiverError } = await supabase
      .from('lien_waivers')
      .insert({
        project_id,
        vendor_id,
        payment_id: payment_id || null,
        waiver_type,
        amount: paymentAmount,
        through_date: effectiveThroughDate,
        status: 'draft',
        state_code: stateRequirements.state_code,
        waiver_content: waiverContent,
        created_by: context.userId
      })
      .select('id, created_at')
      .single()

    if (waiverError) {
      warnings.push(`Warning: Could not save waiver to database: ${waiverError.message}`)
    }

    // Generate warnings based on waiver type and state requirements
    if (waiver_type.includes('unconditional')) {
      warnings.push('This is an UNCONDITIONAL waiver. It is enforceable even if payment has not been received.')
    }

    if (stateRequirements.statutory_form_required) {
      warnings.push(`${stateRequirements.state_name} requires statutory form per ${stateRequirements.form_reference}`)
    }

    if (stateRequirements.notarization_required) {
      warnings.push(`${stateRequirements.state_name} requires notarization for this waiver`)
      nextSteps.push('Obtain notarization before submitting waiver')
    }

    if (waiver_type.includes('final')) {
      warnings.push('This is a FINAL waiver. Ensure all work is complete and all payments are received before signing.')
      nextSteps.push('Verify all punch list items are completed')
      nextSteps.push('Confirm all previous progress payments have been received')
    }

    // Add next steps
    nextSteps.push('Review waiver content for accuracy')
    nextSteps.push('Obtain signature from authorized representative')
    if (!waiver_type.includes('unconditional')) {
      nextSteps.push('Verify payment has cleared before releasing unconditional waiver')
    }
    nextSteps.push('Retain a copy for project records')

    const vendorInfo: VendorInfo = {
      id: vendor.id,
      name: vendor.name,
      company_name: vendor.company_name || undefined,
      address: vendor.address || undefined,
      city: vendor.city || undefined,
      state: vendor.state || undefined,
      zip: vendor.zip || undefined,
      license_number: vendor.license_number || undefined,
      tax_id: vendor.tax_id || undefined
    }

    const projectInfo: ProjectInfo = {
      id: project.id,
      name: project.name,
      address: project.address || undefined,
      city: project.city || undefined,
      state: project.state || undefined,
      zip: project.zip || undefined,
      owner_name: project.owner_name || undefined,
      contract_amount: project.contract_amount || undefined
    }

    return {
      success: true,
      data: {
        waiver_id: waiverRecord?.id || `temp-${Date.now()}`,
        waiver_content: waiverContent,
        waiver_type,
        waiver_type_display: waiverTypeDisplay,
        amount: paymentAmount,
        through_date: effectiveThroughDate,
        state_requirements: stateRequirements,
        vendor_info: vendorInfo,
        project_info: projectInfo,
        status: 'draft' as WaiverStatus,
        created_at: waiverRecord?.created_at || new Date().toISOString(),
        warnings,
        next_steps: nextSteps
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const {
      waiver_type_display,
      amount,
      through_date,
      vendor_info,
      state_requirements,
      status,
      warnings
    } = output

    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)

    const hasWarnings = warnings.length > 0
    const statusIcon = status === 'draft' ? 'file-text' : status === 'signed' ? 'check-circle' : 'clock'

    return {
      title: 'Lien Waiver Generated',
      summary: `${waiver_type_display} for ${amountFormatted} through ${through_date}`,
      icon: statusIcon,
      status: hasWarnings ? 'warning' : 'success',
      details: [
        { label: 'Waiver Type', value: waiver_type_display, type: 'badge' },
        { label: 'Amount', value: amountFormatted, type: 'text' },
        { label: 'Through Date', value: through_date, type: 'date' },
        { label: 'Vendor', value: vendor_info.company_name || vendor_info.name, type: 'text' },
        { label: 'State', value: state_requirements.state_name, type: 'badge' },
        { label: 'Status', value: status, type: 'badge' },
        { label: 'Notarization Required', value: state_requirements.notarization_required ? 'Yes' : 'No', type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
