/**
 * Invoice Analyzer Tool
 * Analyzes invoices for discrepancies, compliance issues, and potential errors
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeInvoiceInput {
  project_id: string
  invoice_id: string
}

interface Discrepancy {
  type: 'amount_mismatch' | 'rate_variance' | 'quantity_issue' | 'duplicate' | 'overcharge' | 'missing_backup' | 'unauthorized_work'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  expected_value?: number | string
  actual_value?: number | string
  variance?: number
  variance_percent?: number
  line_item?: string
  recommendation: string
}

interface ComplianceItem {
  requirement: string
  status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable'
  details?: string
  expiration_date?: string
  days_until_expiry?: number
}

interface ComplianceStatus {
  overall_status: 'compliant' | 'non_compliant' | 'pending_review'
  items: ComplianceItem[]
  missing_documents: string[]
  expiring_soon: string[]
}

interface AnalyzeInvoiceOutput {
  invoice_summary: {
    invoice_number: string
    vendor_name: string
    invoice_amount: number
    invoice_date: string
    due_date?: string
    description?: string
  }
  contract_comparison: {
    contract_value: number
    total_billed_to_date: number
    this_invoice_amount: number
    remaining_contract_value: number
    percent_billed: number
    over_contract: boolean
  }
  discrepancies: Discrepancy[]
  discrepancy_summary: {
    total_count: number
    critical_count: number
    high_count: number
    medium_count: number
    low_count: number
    total_variance_amount: number
  }
  compliance_status: ComplianceStatus
  duplicate_check: {
    is_duplicate: boolean
    potential_duplicates: Array<{
      invoice_id: string
      invoice_number: string
      amount: number
      date: string
      similarity_reason: string
    }>
  }
  recommendations: string[]
  approval_recommendation: {
    action: 'approve' | 'approve_with_conditions' | 'hold_for_review' | 'reject'
    confidence: number
    reasoning: string
    conditions?: string[]
    required_actions?: string[]
  }
}

// Rate tolerance thresholds
const RATE_VARIANCE_THRESHOLD_PERCENT = 5
const QUANTITY_VARIANCE_THRESHOLD_PERCENT = 10
const DUPLICATE_SIMILARITY_THRESHOLD = 0.8

export const analyzeInvoiceTool = createTool<AnalyzeInvoiceInput, AnalyzeInvoiceOutput>({
  name: 'analyze_invoice',
  displayName: 'Analyze Invoice',
  description: 'Analyzes invoices for discrepancies by comparing to contract/PO values, checking for duplicates, validating billing rates and quantities, flagging potential overcharges, and verifying compliance with insurance and lien waiver requirements.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      invoice_id: {
        type: 'string',
        description: 'The invoice ID to analyze'
      }
    },
    required: ['project_id', 'invoice_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(input: AnalyzeInvoiceInput, context: AgentContext) {
    const { project_id, invoice_id } = input

    // Fetch invoice details (using type assertion for non-existent table)
    const { data: invoice } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoice_id}`)
    }

    const invoiceAny = invoice as any

    // Fetch invoice line items
    const { data: invoiceLineItems } = await (supabase as any)
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice_id)

    const invoiceLineItemsAny = invoiceLineItems as any[]

    // Fetch contract/PO for this vendor
    const { data: contracts } = await (supabase as any)
      .from('contracts')
      .select('*')
      .eq('project_id', project_id)
      .eq('vendor_id', invoiceAny.vendor_id)

    const contract = (contracts as any[])?.[0]

    // Fetch contract line items/schedule of values
    const { data: contractLineItems } = await (supabase as any)
      .from('contract_line_items')
      .select('*')
      .eq('contract_id', contract?.id)

    const contractLineItemsAny = contractLineItems as any[]

    // Fetch all previous invoices from this vendor for duplicate check
    const { data: previousInvoices } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('project_id', project_id)
      .eq('vendor_id', invoiceAny.vendor_id)
      .neq('id', invoice_id)
      .order('created_at', { ascending: false })

    const previousInvoicesAny = previousInvoices as any[]

    // Fetch compliance documents
    const { data: insuranceCerts } = await (supabase as any)
      .from('insurance_certificates')
      .select('*')
      .eq('vendor_id', invoiceAny.vendor_id)
      .eq('project_id', project_id)

    const insuranceCertsAny = insuranceCerts as any[]

    const { data: lienWaivers } = await (supabase as any)
      .from('lien_waivers')
      .select('*')
      .eq('vendor_id', invoiceAny.vendor_id)
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })

    const lienWaiversAny = lienWaivers as any[]

    // Calculate contract comparison
    const contractValue = contract?.amount || contract?.contract_value || 0
    const totalBilledToDate = (previousInvoicesAny || [])
      .filter((inv: any) => inv.status === 'paid' || inv.status === 'approved')
      .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
    const thisInvoiceAmount = invoiceAny.amount || 0
    const remainingContractValue = contractValue - totalBilledToDate - thisInvoiceAmount
    const percentBilled = contractValue > 0
      ? ((totalBilledToDate + thisInvoiceAmount) / contractValue) * 100
      : 0

    // Analyze discrepancies
    const discrepancies: Discrepancy[] = []

    // 1. Check if invoice exceeds contract value
    if (contractValue > 0 && (totalBilledToDate + thisInvoiceAmount) > contractValue) {
      const overAmount = (totalBilledToDate + thisInvoiceAmount) - contractValue
      discrepancies.push({
        type: 'overcharge',
        severity: 'critical',
        description: `Invoice causes total billing to exceed contract value by $${overAmount.toLocaleString()}`,
        expected_value: contractValue,
        actual_value: totalBilledToDate + thisInvoiceAmount,
        variance: overAmount,
        variance_percent: (overAmount / contractValue) * 100,
        recommendation: 'Verify if change order exists to cover additional amount or reject invoice'
      })
    }

    // 2. Validate line item rates against contract rates
    if (invoiceLineItemsAny && contractLineItemsAny) {
      for (const lineItem of invoiceLineItemsAny) {
        const matchingContractItem = contractLineItemsAny.find(
          (ci: any) => ci.description?.toLowerCase() === lineItem.description?.toLowerCase() ||
                ci.cost_code === lineItem.cost_code
        )

        if (matchingContractItem) {
          // Check rate variance
          const contractRate = matchingContractItem.unit_rate || matchingContractItem.rate || 0
          const invoiceRate = lineItem.unit_rate || lineItem.rate || 0

          if (contractRate > 0 && invoiceRate > 0) {
            const rateVariance = invoiceRate - contractRate
            const rateVariancePercent = (rateVariance / contractRate) * 100

            if (Math.abs(rateVariancePercent) > RATE_VARIANCE_THRESHOLD_PERCENT) {
              discrepancies.push({
                type: 'rate_variance',
                severity: rateVariancePercent > 15 ? 'high' : 'medium',
                description: `Rate for "${lineItem.description}" differs from contract rate`,
                expected_value: contractRate,
                actual_value: invoiceRate,
                variance: rateVariance,
                variance_percent: rateVariancePercent,
                line_item: lineItem.description,
                recommendation: rateVariance > 0
                  ? 'Request explanation for rate increase or adjust to contract rate'
                  : 'Verify rate reduction is intentional'
              })
            }
          }

          // Check quantity billed vs remaining quantity
          const contractQty = matchingContractItem.quantity || 0
          const previouslyBilled = matchingContractItem.quantity_billed || 0
          const currentQty = lineItem.quantity || 0
          const remainingQty = contractQty - previouslyBilled

          if (currentQty > remainingQty && remainingQty >= 0) {
            discrepancies.push({
              type: 'quantity_issue',
              severity: 'high',
              description: `Quantity billed for "${lineItem.description}" exceeds remaining contract quantity`,
              expected_value: remainingQty,
              actual_value: currentQty,
              variance: currentQty - remainingQty,
              line_item: lineItem.description,
              recommendation: 'Verify additional quantity was authorized via change order'
            })
          }
        } else if (lineItem.amount && lineItem.amount > 1000) {
          // Flag line items not in contract (potential unauthorized work)
          discrepancies.push({
            type: 'unauthorized_work',
            severity: 'medium',
            description: `Line item "${lineItem.description}" not found in contract schedule of values`,
            actual_value: lineItem.amount,
            line_item: lineItem.description,
            recommendation: 'Verify work was authorized and covered by change order'
          })
        }
      }
    }

    // 3. Check for duplicate invoices
    const potentialDuplicates: Array<{
      invoice_id: string
      invoice_number: string
      amount: number
      date: string
      similarity_reason: string
    }> = []

    for (const prevInvoice of previousInvoicesAny || []) {
      const reasons: string[] = []

      // Same invoice number
      if (prevInvoice.invoice_number === invoiceAny.invoice_number) {
        reasons.push('Same invoice number')
      }

      // Same amount within 30 days
      const prevDate = new Date(prevInvoice.invoice_date || prevInvoice.created_at)
      const currentDate = new Date(invoiceAny.invoice_date || invoiceAny.created_at)
      const daysDiff = Math.abs((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      if (prevInvoice.amount === invoiceAny.amount && daysDiff <= 30) {
        reasons.push('Same amount within 30 days')
      }

      // Similar amount (within 1%) within 14 days
      if (daysDiff <= 14 && prevInvoice.amount && invoiceAny.amount) {
        const amountDiff = Math.abs(prevInvoice.amount - invoiceAny.amount)
        const amountVariance = amountDiff / Math.max(prevInvoice.amount, invoiceAny.amount)
        if (amountVariance < 0.01) {
          reasons.push('Nearly identical amount within 14 days')
        }
      }

      if (reasons.length > 0) {
        potentialDuplicates.push({
          invoice_id: prevInvoice.id,
          invoice_number: prevInvoice.invoice_number || 'N/A',
          amount: prevInvoice.amount || 0,
          date: prevInvoice.invoice_date || prevInvoice.created_at,
          similarity_reason: reasons.join('; ')
        })
      }
    }

    if (potentialDuplicates.length > 0) {
      discrepancies.push({
        type: 'duplicate',
        severity: 'critical',
        description: `Found ${potentialDuplicates.length} potential duplicate invoice(s)`,
        recommendation: 'Review potential duplicates before processing'
      })
    }

    // 4. Analyze compliance status
    const complianceItems: ComplianceItem[] = []
    const missingDocuments: string[] = []
    const expiringSoon: string[] = []
    const today = new Date()

    // Check insurance certificates
    const activeInsurance = insuranceCertsAny?.filter((cert: any) => {
      const expiry = new Date(cert.expiration_date)
      return expiry > today
    }) || []

    const requiredInsuranceTypes = ['general_liability', 'workers_comp', 'auto_liability']
    for (const insType of requiredInsuranceTypes) {
      const cert = activeInsurance.find((c: any) => c.type === insType || c.coverage_type === insType)

      if (cert) {
        const expiryDate = new Date(cert.expiration_date)
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        complianceItems.push({
          requirement: `${insType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Insurance`,
          status: daysUntilExpiry < 0 ? 'non_compliant' : 'compliant',
          details: `Certificate on file, expires ${expiryDate.toLocaleDateString()}`,
          expiration_date: cert.expiration_date,
          days_until_expiry: daysUntilExpiry
        })

        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          expiringSoon.push(`${insType.replace(/_/g, ' ')} insurance expires in ${daysUntilExpiry} days`)
        }
      } else {
        missingDocuments.push(`${insType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Insurance Certificate`)
        complianceItems.push({
          requirement: `${insType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Insurance`,
          status: 'non_compliant',
          details: 'Certificate not on file or expired'
        })
      }
    }

    // Check lien waiver for previous payment
    const lastPaidInvoice = (previousInvoicesAny || []).find((inv: any) => inv.status === 'paid')
    if (lastPaidInvoice) {
      const lienWaiverForLast = lienWaiversAny?.find((lw: any) =>
        lw.invoice_id === lastPaidInvoice.id ||
        lw.payment_application_number === lastPaidInvoice.payment_application_number
      )

      if (lienWaiverForLast) {
        complianceItems.push({
          requirement: 'Lien Waiver for Previous Payment',
          status: 'compliant',
          details: `Lien waiver received for Invoice #${lastPaidInvoice.invoice_number}`
        })
      } else {
        missingDocuments.push('Lien Waiver for Previous Payment')
        complianceItems.push({
          requirement: 'Lien Waiver for Previous Payment',
          status: 'non_compliant',
          details: `No lien waiver on file for Invoice #${lastPaidInvoice.invoice_number}`
        })

        discrepancies.push({
          type: 'missing_backup',
          severity: 'high',
          description: 'Lien waiver not received for previous payment',
          recommendation: 'Obtain lien waiver for previous payment before processing current invoice'
        })
      }
    } else {
      complianceItems.push({
        requirement: 'Lien Waiver for Previous Payment',
        status: 'not_applicable',
        details: 'No previous payments on record'
      })
    }

    // Determine overall compliance status
    const hasNonCompliant = complianceItems.some(item => item.status === 'non_compliant')
    const hasPending = complianceItems.some(item => item.status === 'pending')
    const overallComplianceStatus: ComplianceStatus['overall_status'] = hasNonCompliant
      ? 'non_compliant'
      : hasPending
        ? 'pending_review'
        : 'compliant'

    // Calculate discrepancy summary
    const discrepancySummary = {
      total_count: discrepancies.length,
      critical_count: discrepancies.filter(d => d.severity === 'critical').length,
      high_count: discrepancies.filter(d => d.severity === 'high').length,
      medium_count: discrepancies.filter(d => d.severity === 'medium').length,
      low_count: discrepancies.filter(d => d.severity === 'low').length,
      total_variance_amount: discrepancies
        .filter(d => typeof d.variance === 'number')
        .reduce((sum, d) => sum + Math.abs(d.variance as number), 0)
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (discrepancySummary.critical_count > 0) {
      recommendations.push('Address all critical discrepancies before approving invoice')
    }

    if (potentialDuplicates.length > 0) {
      recommendations.push('Verify this is not a duplicate submission before processing')
    }

    if (missingDocuments.length > 0) {
      recommendations.push(`Obtain missing compliance documents: ${missingDocuments.join(', ')}`)
    }

    if (expiringSoon.length > 0) {
      recommendations.push('Request updated insurance certificates before next payment')
    }

    if (percentBilled > 90 && remainingContractValue > 0) {
      recommendations.push('Contract is nearly fully billed - verify remaining work scope')
    }

    if (discrepancies.some(d => d.type === 'rate_variance')) {
      recommendations.push('Review rate variances with project manager before approval')
    }

    if (recommendations.length === 0) {
      recommendations.push('Invoice appears to be in good order for processing')
    }

    // Determine approval recommendation
    let approvalAction: AnalyzeInvoiceOutput['approval_recommendation']['action']
    let approvalConfidence: number
    let approvalReasoning: string
    const conditions: string[] = []
    const requiredActions: string[] = []

    if (discrepancySummary.critical_count > 0 || potentialDuplicates.length > 0) {
      approvalAction = 'hold_for_review'
      approvalConfidence = 0.9
      approvalReasoning = 'Critical issues found that require resolution before payment'

      if (potentialDuplicates.length > 0) {
        requiredActions.push('Confirm this is not a duplicate invoice')
      }
      discrepancies
        .filter(d => d.severity === 'critical')
        .forEach(d => requiredActions.push(d.recommendation))
    } else if (discrepancySummary.high_count > 0 || hasNonCompliant) {
      approvalAction = 'approve_with_conditions'
      approvalConfidence = 0.75
      approvalReasoning = 'Invoice has issues that should be addressed but may be approved with conditions'

      if (hasNonCompliant) {
        conditions.push('Obtain missing compliance documents within 5 business days')
      }
      discrepancies
        .filter(d => d.severity === 'high')
        .forEach(d => conditions.push(d.recommendation))
    } else if (discrepancySummary.medium_count > 2) {
      approvalAction = 'approve_with_conditions'
      approvalConfidence = 0.7
      approvalReasoning = 'Multiple medium-severity issues warrant review'
      discrepancies
        .filter(d => d.severity === 'medium')
        .slice(0, 3)
        .forEach(d => conditions.push(d.recommendation))
    } else if (discrepancySummary.total_count === 0 && !hasNonCompliant) {
      approvalAction = 'approve'
      approvalConfidence = 0.95
      approvalReasoning = 'Invoice matches contract terms and all compliance requirements are met'
    } else {
      approvalAction = 'approve'
      approvalConfidence = 0.85
      approvalReasoning = 'Minor issues noted but invoice is acceptable for payment'
    }

    return {
      success: true,
      data: {
        invoice_summary: {
          invoice_number: invoiceAny.invoice_number || 'N/A',
          vendor_name: invoiceAny.vendor_name || 'Unknown Vendor',
          invoice_amount: thisInvoiceAmount,
          invoice_date: invoiceAny.invoice_date || invoiceAny.created_at,
          due_date: invoiceAny.due_date,
          description: invoiceAny.description
        },
        contract_comparison: {
          contract_value: contractValue,
          total_billed_to_date: totalBilledToDate,
          this_invoice_amount: thisInvoiceAmount,
          remaining_contract_value: remainingContractValue,
          percent_billed: Math.round(percentBilled * 10) / 10,
          over_contract: remainingContractValue < 0
        },
        discrepancies,
        discrepancy_summary: discrepancySummary,
        compliance_status: {
          overall_status: overallComplianceStatus,
          items: complianceItems,
          missing_documents: missingDocuments,
          expiring_soon: expiringSoon
        },
        duplicate_check: {
          is_duplicate: potentialDuplicates.length > 0,
          potential_duplicates: potentialDuplicates
        },
        recommendations,
        approval_recommendation: {
          action: approvalAction,
          confidence: approvalConfidence,
          reasoning: approvalReasoning,
          conditions: conditions.length > 0 ? conditions : undefined,
          required_actions: requiredActions.length > 0 ? requiredActions : undefined
        }
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { discrepancy_summary, compliance_status, approval_recommendation } = output

    const getStatusIcon = () => {
      switch (approval_recommendation.action) {
        case 'approve': return 'check-circle'
        case 'approve_with_conditions': return 'alert-circle'
        case 'hold_for_review': return 'pause-circle'
        case 'reject': return 'x-circle'
        default: return 'file-text'
      }
    }

    const getStatus = () => {
      switch (approval_recommendation.action) {
        case 'approve': return 'success'
        case 'approve_with_conditions': return 'warning'
        case 'hold_for_review': return 'error'
        case 'reject': return 'error'
        default: return 'info'
      }
    }

    return {
      title: 'Invoice Analysis Complete',
      summary: `${approval_recommendation.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${Math.round(approval_recommendation.confidence * 100)}% confidence)`,
      icon: getStatusIcon(),
      status: getStatus(),
      details: [
        { label: 'Invoice', value: `#${output.invoice_summary.invoice_number}`, type: 'text' },
        { label: 'Amount', value: `$${output.invoice_summary.invoice_amount.toLocaleString()}`, type: 'text' },
        { label: 'Discrepancies', value: discrepancy_summary.total_count, type: discrepancy_summary.critical_count > 0 ? 'badge' : 'text' },
        { label: 'Critical Issues', value: discrepancy_summary.critical_count, type: discrepancy_summary.critical_count > 0 ? 'badge' : 'text' },
        { label: 'Compliance', value: compliance_status.overall_status.replace(/_/g, ' '), type: 'badge' },
        { label: 'Contract Billed', value: `${output.contract_comparison.percent_billed}%`, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
