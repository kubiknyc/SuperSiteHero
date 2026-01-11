/**
 * Construction Letter Drafting Tool
 * Drafts formal correspondence including notices, claims, and other construction letters
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface DraftLetterInput {
  project_id: string
  letter_type: 'notice_to_proceed' | 'notice_of_delay' | 'notice_of_claim' | 'request_for_extension' | 'change_order_proposal' | 'cure_notice' | 'default_notice' | 'substantial_completion' | 'final_completion' | 'warranty_notice' | 'general_correspondence' | 'rfi_followup' | 'submittal_followup' | 'payment_request' | 'lien_notice'
  recipient: {
    name: string
    title?: string
    company: string
    address?: string
  }
  subject: string
  key_points: string[]
  supporting_data?: {
    dates?: Record<string, string>
    amounts?: Record<string, number>
    references?: string[]
    attachments?: string[]
  }
  tone?: 'formal' | 'firm' | 'collaborative' | 'urgent'
  include_contract_references?: boolean
}

interface DraftLetterOutput {
  letter: {
    header: string
    date: string
    recipient_block: string
    subject_line: string
    salutation: string
    body: string[]
    closing: string
    signature_block: string
    cc_list: string[]
    attachments_list: string[]
  }
  formatted_letter: string
  key_elements: {
    contractual_references: string[]
    dates_mentioned: string[]
    amounts_mentioned: string[]
    required_actions: string[]
    response_deadline: string | null
  }
  review_notes: string[]
  alternative_phrases: Record<string, string[]>
  legal_considerations: string[]
}

export const draftLetterTool = createTool<DraftLetterInput, DraftLetterOutput>({
  name: 'draft_construction_letter',
  description: 'Drafts formal construction correspondence including notices, claims, change order proposals, and other letters. Uses proper construction industry language and contract references.',
  category: 'communication',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID for context'
      },
      letter_type: {
        type: 'string',
        enum: [
          'notice_to_proceed', 'notice_of_delay', 'notice_of_claim',
          'request_for_extension', 'change_order_proposal', 'cure_notice',
          'default_notice', 'substantial_completion', 'final_completion',
          'warranty_notice', 'general_correspondence', 'rfi_followup',
          'submittal_followup', 'payment_request', 'lien_notice'
        ],
        description: 'Type of letter to draft'
      },
      recipient: {
        type: 'object',
        description: 'Recipient information',
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          company: { type: 'string' },
          address: { type: 'string' }
        }
      },
      subject: {
        type: 'string',
        description: 'Subject of the letter'
      },
      key_points: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key points to include in the letter'
      },
      supporting_data: {
        type: 'object',
        description: 'Supporting data like dates, amounts, references'
      },
      tone: {
        type: 'string',
        enum: ['formal', 'firm', 'collaborative', 'urgent'],
        description: 'Tone of the letter (default: formal)'
      },
      include_contract_references: {
        type: 'boolean',
        description: 'Include contract article references (default: true)'
      }
    },
    required: ['project_id', 'letter_type', 'recipient', 'subject', 'key_points']
  },

  async execute(input: DraftLetterInput, context: AgentContext): Promise<DraftLetterOutput> {
    const {
      project_id,
      letter_type,
      recipient,
      subject,
      key_points,
      supporting_data = {},
      tone = 'formal',
      include_contract_references = true
    } = input

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*, owner:owner_id(*), contractor:contractor_id(*)')
      .eq('id', project_id)
      .single()

    // Get company info for sender
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', context.companyId)
      .single()

    const now = new Date()
    const formattedDate = formatLetterDate(now)

    // Build letter components
    const header = buildHeader(company)
    const recipientBlock = buildRecipientBlock(recipient)
    const subjectLine = buildSubjectLine(subject, project?.name, project?.number)
    const salutation = buildSalutation(recipient.name, tone)

    // Get letter template and build body
    const { body, contractRefs, requiredActions, responseDeadline } = buildLetterBody(
      letter_type,
      key_points,
      supporting_data,
      tone,
      include_contract_references,
      project
    )

    const closing = buildClosing(tone, letter_type)
    const signatureBlock = buildSignatureBlock(company, context)
    const ccList = buildCCList(letter_type, project)
    const attachmentsList = supporting_data.attachments || []

    // Format complete letter
    const formattedLetter = formatCompleteLetter({
      header,
      date: formattedDate,
      recipientBlock,
      subjectLine,
      salutation,
      body,
      closing,
      signatureBlock,
      ccList,
      attachmentsList
    })

    // Extract key elements
    const datesMentioned = extractDates(body.join(' '))
    const amountsMentioned = extractAmounts(body.join(' '))

    // Generate review notes
    const reviewNotes = generateReviewNotes(letter_type, body, tone)

    // Suggest alternative phrases
    const alternativePhrases = suggestAlternatives(letter_type, tone)

    // Legal considerations
    const legalConsiderations = getLegalConsiderations(letter_type)

    return {
      letter: {
        header,
        date: formattedDate,
        recipient_block: recipientBlock,
        subject_line: subjectLine,
        salutation,
        body,
        closing,
        signature_block: signatureBlock,
        cc_list: ccList,
        attachments_list: attachmentsList
      },
      formatted_letter: formattedLetter,
      key_elements: {
        contractual_references: contractRefs,
        dates_mentioned: datesMentioned,
        amounts_mentioned: amountsMentioned,
        required_actions: requiredActions,
        response_deadline: responseDeadline
      },
      review_notes: reviewNotes,
      alternative_phrases: alternativePhrases,
      legal_considerations: legalConsiderations
    }
  }
})

function formatLetterDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

function buildHeader(company: any): string {
  if (!company) {return '[COMPANY LETTERHEAD]'}

  const lines = [company.name || '[COMPANY NAME]']
  if (company.address) {lines.push(company.address)}
  if (company.city && company.state && company.zip) {
    lines.push(`${company.city}, ${company.state} ${company.zip}`)
  }
  if (company.phone) {lines.push(`Phone: ${company.phone}`)}
  if (company.email) {lines.push(`Email: ${company.email}`)}

  return lines.join('\n')
}

function buildRecipientBlock(recipient: DraftLetterInput['recipient']): string {
  const lines = [recipient.name]
  if (recipient.title) {lines.push(recipient.title)}
  lines.push(recipient.company)
  if (recipient.address) {lines.push(recipient.address)}

  return lines.join('\n')
}

function buildSubjectLine(subject: string, projectName?: string, projectNumber?: string): string {
  let line = 'RE: '
  if (projectName) {
    line += `${projectName}`
    if (projectNumber) {line += ` (Project #${projectNumber})`}
    line += '\n    '
  }
  line += subject

  return line
}

function buildSalutation(name: string, tone: string): string {
  const lastName = name.split(' ').pop() || name

  switch (tone) {
    case 'formal':
      return `Dear Mr./Ms. ${lastName}:`
    case 'firm':
      return `Dear Mr./Ms. ${lastName}:`
    case 'collaborative':
      return `Dear ${name.split(' ')[0]}:`
    case 'urgent':
      return `Dear Mr./Ms. ${lastName}:`
    default:
      return `Dear Mr./Ms. ${lastName}:`
  }
}

interface LetterBodyResult {
  body: string[]
  contractRefs: string[]
  requiredActions: string[]
  responseDeadline: string | null
}

function buildLetterBody(
  letterType: string,
  keyPoints: string[],
  supportingData: DraftLetterInput['supporting_data'],
  tone: string,
  includeContractRefs: boolean,
  project: any
): LetterBodyResult {
  const body: string[] = []
  const contractRefs: string[] = []
  const requiredActions: string[] = []
  let responseDeadline: string | null = null

  // Opening paragraph based on letter type
  const opening = getLetterOpening(letterType, tone, supportingData)
  body.push(opening)

  // Contract reference paragraph
  if (includeContractRefs) {
    const refs = getContractReferences(letterType)
    if (refs.length > 0) {
      contractRefs.push(...refs)
      body.push(`This notice is provided in accordance with ${refs.join(' and ')} of the Contract Documents.`)
    }
  }

  // Key points paragraphs
  if (keyPoints.length > 0) {
    body.push('The following matters require your attention:')
    for (let i = 0; i < keyPoints.length; i++) {
      body.push(`${i + 1}. ${keyPoints[i]}`)
    }
  }

  // Supporting data paragraphs
  if (supportingData?.dates && Object.keys(supportingData.dates).length > 0) {
    const dateLines = Object.entries(supportingData.dates)
      .map(([label, date]) => `${label}: ${date}`)
    body.push('Relevant dates:')
    body.push(...dateLines.map(l => `  - ${l}`))
  }

  if (supportingData?.amounts && Object.keys(supportingData.amounts).length > 0) {
    const amountLines = Object.entries(supportingData.amounts)
      .map(([label, amount]) => `${label}: $${amount.toLocaleString()}`)
    body.push('Associated costs:')
    body.push(...amountLines.map(l => `  - ${l}`))
  }

  if (supportingData?.references && supportingData.references.length > 0) {
    body.push('Reference documents:')
    body.push(...supportingData.references.map(r => `  - ${r}`))
  }

  // Required actions and deadline
  const { actions, deadline } = getRequiredActions(letterType, tone)
  if (actions.length > 0) {
    requiredActions.push(...actions)
    body.push('Required actions:')
    body.push(...actions.map(a => `  - ${a}`))

    if (deadline) {
      responseDeadline = deadline
      body.push(`Please respond by ${deadline}.`)
    }
  }

  // Closing paragraph
  const closingParagraph = getClosingParagraph(letterType, tone)
  body.push(closingParagraph)

  // Reservation of rights
  if (shouldIncludeReservation(letterType)) {
    body.push('This letter is not intended to waive any rights, remedies, or defenses available under the Contract Documents or applicable law. All rights are expressly reserved.')
  }

  return { body, contractRefs, requiredActions, responseDeadline }
}

function getLetterOpening(letterType: string, tone: string, supportingData: any): string {
  const openings: Record<string, string> = {
    notice_to_proceed: 'You are hereby authorized and directed to proceed with the Work under the above-referenced Contract.',
    notice_of_delay: 'This letter serves as formal notice that the Project has experienced a delay impacting the Contract completion date.',
    notice_of_claim: 'Please be advised that this letter constitutes formal notice of a claim arising from the Work under the above-referenced Contract.',
    request_for_extension: 'We hereby request an extension of the Contract Time due to circumstances beyond our control.',
    change_order_proposal: 'In response to the changes requested, we are submitting the following Change Order Proposal for your review and approval.',
    cure_notice: 'This letter serves as formal notice that certain deficiencies in the Work have been identified that require immediate correction.',
    default_notice: 'This letter constitutes formal notice of default under the terms of the above-referenced Contract.',
    substantial_completion: 'We are pleased to notify you that the Work has reached a stage of Substantial Completion.',
    final_completion: 'This letter serves as notice that all Work under the Contract has been completed in accordance with the Contract Documents.',
    warranty_notice: 'This letter serves as notice of warranty-related issues that have been identified at the Project.',
    general_correspondence: 'This letter is to address matters related to the above-referenced Project.',
    rfi_followup: 'We are writing to follow up on outstanding Requests for Information (RFIs) that require your timely response.',
    submittal_followup: 'This letter is to address outstanding submittals requiring action.',
    payment_request: 'Please find enclosed our Payment Application for the work completed during the referenced period.',
    lien_notice: 'In accordance with applicable lien laws, this letter serves as preliminary notice of our right to file a lien.'
  }

  let opening = openings[letterType] || openings.general_correspondence

  if (tone === 'urgent') {
    opening = 'URGENT: ' + opening
  }

  return opening
}

function getContractReferences(letterType: string): string[] {
  const references: Record<string, string[]> = {
    notice_of_delay: ['Article 8 (Time)', 'Section 15.1 (Claims)'],
    notice_of_claim: ['Article 15 (Claims and Disputes)', 'Section 15.1.2 (Notice of Claims)'],
    request_for_extension: ['Section 8.3 (Delays and Extensions of Time)'],
    change_order_proposal: ['Article 7 (Changes in the Work)'],
    cure_notice: ['Section 14.2 (Termination by Owner)'],
    default_notice: ['Article 14 (Termination)', 'Section 14.2.1'],
    substantial_completion: ['Section 9.8 (Substantial Completion)'],
    final_completion: ['Section 9.10 (Final Completion and Final Payment)'],
    warranty_notice: ['Section 3.5 (Warranty)', 'Section 12.2 (Correction of Work)'],
    payment_request: ['Article 9 (Payments and Completion)']
  }

  return references[letterType] || []
}

function getRequiredActions(letterType: string, tone: string): { actions: string[]; deadline: string | null } {
  const actions: Record<string, { actions: string[]; days: number }> = {
    notice_of_delay: {
      actions: ['Review the delay documentation', 'Provide written acknowledgment'],
      days: 7
    },
    notice_of_claim: {
      actions: ['Review claim documentation', 'Schedule meeting to discuss resolution'],
      days: 14
    },
    cure_notice: {
      actions: ['Commence corrective work immediately', 'Submit corrective action plan'],
      days: 7
    },
    rfi_followup: {
      actions: ['Provide responses to outstanding RFIs'],
      days: 5
    },
    submittal_followup: {
      actions: ['Complete review of outstanding submittals'],
      days: 5
    },
    change_order_proposal: {
      actions: ['Review proposal', 'Approve, reject, or request modifications'],
      days: 14
    }
  }

  const config = actions[letterType]
  if (!config) {return { actions: [], deadline: null }}

  const deadline = new Date()
  deadline.setDate(deadline.getDate() + config.days)
  const deadlineStr = formatLetterDate(deadline)

  return {
    actions: config.actions,
    deadline: deadlineStr
  }
}

function getClosingParagraph(letterType: string, tone: string): string {
  if (tone === 'collaborative') {
    return 'We look forward to your response and are available to discuss this matter at your earliest convenience. Please do not hesitate to contact our office if you have any questions.'
  }

  if (tone === 'firm' || tone === 'urgent') {
    return 'We expect your prompt attention to this matter. Failure to respond within the timeframe specified may result in additional action as permitted under the Contract Documents.'
  }

  return 'Please contact our office if you have any questions regarding this matter. We look forward to your timely response.'
}

function shouldIncludeReservation(letterType: string): boolean {
  const reservationTypes = [
    'notice_of_delay', 'notice_of_claim', 'request_for_extension',
    'cure_notice', 'default_notice', 'lien_notice'
  ]
  return reservationTypes.includes(letterType)
}

function buildClosing(tone: string, letterType: string): string {
  if (tone === 'formal' || tone === 'firm') {
    return 'Very truly yours,'
  }
  if (tone === 'collaborative') {
    return 'Best regards,'
  }
  return 'Sincerely,'
}

function buildSignatureBlock(company: any, context: AgentContext): string {
  const lines = [
    '',
    '_______________________________',
    '[AUTHORIZED SIGNATURE]',
    '[NAME]',
    '[TITLE]',
    company?.name || '[COMPANY NAME]'
  ]
  return lines.join('\n')
}

function buildCCList(letterType: string, project: any): string[] {
  const ccList: string[] = []

  // Standard cc list based on letter type
  if (['notice_of_claim', 'default_notice', 'lien_notice'].includes(letterType)) {
    ccList.push('Company Counsel')
    ccList.push('Surety (if applicable)')
  }

  if (['notice_of_delay', 'change_order_proposal'].includes(letterType)) {
    ccList.push('Project Architect')
  }

  ccList.push('Project File')

  return ccList
}

interface FormatParams {
  header: string
  date: string
  recipientBlock: string
  subjectLine: string
  salutation: string
  body: string[]
  closing: string
  signatureBlock: string
  ccList: string[]
  attachmentsList: string[]
}

function formatCompleteLetter(params: FormatParams): string {
  const {
    header, date, recipientBlock, subjectLine, salutation,
    body, closing, signatureBlock, ccList, attachmentsList
  } = params

  const lines: string[] = []

  lines.push(header)
  lines.push('')
  lines.push(date)
  lines.push('')
  lines.push(recipientBlock)
  lines.push('')
  lines.push(subjectLine)
  lines.push('')
  lines.push(salutation)
  lines.push('')

  for (const paragraph of body) {
    lines.push(paragraph)
    lines.push('')
  }

  lines.push(closing)
  lines.push(signatureBlock)

  if (ccList.length > 0) {
    lines.push('')
    lines.push('cc: ' + ccList.join('\n    '))
  }

  if (attachmentsList.length > 0) {
    lines.push('')
    lines.push('Attachments:')
    for (const att of attachmentsList) {
      lines.push(`  - ${att}`)
    }
  }

  return lines.join('\n')
}

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
  ]

  const dates: string[] = []
  for (const pattern of datePatterns) {
    const matches = text.match(pattern) || []
    dates.push(...matches)
  }

  return [...new Set(dates)]
}

function extractAmounts(text: string): string[] {
  const amountPattern = /\$[\d,]+(?:\.\d{2})?/g
  const matches = text.match(amountPattern) || []
  return [...new Set(matches)]
}

function generateReviewNotes(letterType: string, body: string[], tone: string): string[] {
  const notes: string[] = []

  notes.push('Review all dates for accuracy before sending')
  notes.push('Verify recipient name and title are correct')
  notes.push('Confirm contract article references match your specific contract')

  if (['notice_of_claim', 'default_notice', 'lien_notice'].includes(letterType)) {
    notes.push('IMPORTANT: Have legal counsel review before sending')
  }

  if (tone === 'firm' || tone === 'urgent') {
    notes.push('Consider if this tone is appropriate for the relationship')
  }

  notes.push('Ensure supporting documentation is attached')
  notes.push('Send via certified mail or other traceable method')

  return notes
}

function suggestAlternatives(letterType: string, tone: string): Record<string, string[]> {
  return {
    'hereby': ['formally', 'officially'],
    'aforesaid': ['above-mentioned', 'previously referenced'],
    'pursuant to': ['in accordance with', 'as required by'],
    'notwithstanding': ['despite', 'regardless of'],
    'heretofore': ['previously', 'up to this point'],
    'forthwith': ['immediately', 'promptly'],
    'in the event that': ['if', 'should'],
    'with respect to': ['regarding', 'concerning']
  }
}

function getLegalConsiderations(letterType: string): string[] {
  const considerations: Record<string, string[]> = {
    notice_of_claim: [
      'Verify notice requirements in your contract (timing, method, content)',
      'Document all supporting facts and damages',
      'Preserve all related correspondence and records',
      'Consider statute of limitations implications'
    ],
    default_notice: [
      'Ensure all contractual prerequisites are satisfied',
      'Provide adequate cure period as required by contract',
      'Document all prior notices and communications',
      'Consult legal counsel before issuing'
    ],
    lien_notice: [
      'Verify compliance with state-specific lien requirements',
      'Confirm timing requirements are met',
      'Include all required statutory language',
      'File with appropriate recording office if required'
    ],
    notice_of_delay: [
      'Document delay cause and duration',
      'Notify within contract-required timeframe',
      'Preserve schedule analysis and records',
      'Consider impact on other project parties'
    ]
  }

  return considerations[letterType] || [
    'Review contract requirements for this type of notice',
    'Maintain copies of all correspondence',
    'Document delivery method and confirmation'
  ]
}
