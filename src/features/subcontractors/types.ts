/**
 * Subcontractor Portal Types
 * Types for bid leveling, pre-qualification, insurance compliance, scope templates, and subcontracts
 */

// Re-export bidding types that are relevant
export type {
  BidLevelingMatrix,
  BidLevelingLineItem,
  BidLineItemSubmission,
  BidLevelingSubmission,
  BidLevelingSummary,
  BidAlternateComparison,
  BidExclusionComparison,
  BidInclusionComparison,
  BidLevelingExportOptions,
  PreQualificationStatus,
  PreQualificationQuestionnaire,
  PreQualificationSection,
  PreQualificationQuestion,
  PreQualificationSubmission,
  PreQualificationAnswer,
  PreQualificationSafetyRecord,
  PreQualificationFinancials,
  PreQualificationReference,
  PreQualifiedVendor,
  PreQualificationFilters,
  CreatePreQualificationDTO,
  ReviewPreQualificationDTO,
  SubcontractorComplianceStatus,
  CertificateStatus,
  MissingCertificate,
  ExpiryCalendarItem,
  BulkReminderResult,
  SendReminderDTO,
  ExpiryDashboardFilters,
  ScopeTemplate,
  ScopeTemplateItem,
  CreateScopeTemplateDTO,
  ApplyTemplateResult,
  TradeCode,
  TRADE_CODES,
  Subcontract,
  SubcontractWithDetails,
  SubcontractAmendment,
  SubcontractStatus,
  SubcontractFilters,
  CreateSubcontractDTO,
  CreateSubcontractFromBidDTO,
  CreateAmendmentDTO,
  ContractTermsTemplate,
  SUBCONTRACT_STATUSES,
  PREQUAL_STATUSES,
  getTradeLabel,
  getSubcontractStatusColor,
  getPreQualStatusColor,
  calculateCompliancePercentage,
  getDaysUntilExpiry,
  getExpiryStatus,
} from '@/features/bidding/types/bidding'

// =============================================
// Bid Leveling Extended Types
// =============================================

export interface BidLevelingConfig {
  packageId: string
  showLineItems: boolean
  showAlternates: boolean
  showExclusions: boolean
  normalizeValues: boolean
  highlightVariance: number // percentage threshold
}

export interface BidLevelingCellData {
  value: number | null
  isIncluded: boolean
  isLowest: boolean
  isHighest: boolean
  variance: number
  notes: string | null
}

export interface BidLevelingRow {
  id: string
  itemNumber: string
  description: string
  unit: string | null
  quantity: number | null
  estimatedPrice: number | null
  cells: Record<string, BidLevelingCellData>
}

export interface BidRecommendation {
  submissionId: string
  bidderName: string
  recommendedBidder: string
  reason: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  factors: {
    priceScore: number
    qualificationScore: number
    scheduleScore: number
    scopeScore: number
  }
}

// =============================================
// Pre-Qualification Form Types
// =============================================

export interface PreQualFormValues {
  // Company Information
  companyName: string
  dbaName?: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  fax?: string
  email: string
  website?: string
  federalTaxId: string
  yearsInBusiness: number
  numberOfEmployees: number
  unionAffiliation?: string

  // Ownership
  ownershipType: 'sole_proprietor' | 'partnership' | 'corporation' | 'llc' | 'other'
  ownershipTypeOther?: string
  principals: Principal[]

  // Financial
  bondingCompany?: string
  bondingAgent?: string
  bondingLimit?: number
  singleProjectLimit?: number
  currentBondingUsed?: number
  bankName?: string
  bankContactName?: string
  bankContactPhone?: string
  creditReferences: CreditReference[]

  // Insurance
  insuranceCertificates: InsuranceCertUpload[]

  // Safety
  emr: number | null
  emrYear: number | null
  oshaRecordableRate?: number
  dartRate?: number
  osha300LogAvailable: boolean
  fatalitiesLast5Years: number
  citationsLast3Years: number
  safetyProgramDescription?: string
  safetyTrainingRequired: boolean
  ppePolicy: boolean
  substanceAbusePolicy: boolean

  // Experience
  trades: string[]
  licensesHeld: LicenseInfo[]
  typicalProjectSize: 'under_100k' | '100k_500k' | '500k_1m' | '1m_5m' | '5m_10m' | 'over_10m'
  largestProjectCompleted?: number
  references: ProjectReference[]

  // Certifications
  certifications: CertificationInfo[]

  // Additional
  additionalInfo?: string
}

export interface Principal {
  name: string
  title: string
  ownershipPercent: number
  yearsWithCompany: number
}

export interface CreditReference {
  companyName: string
  contactName: string
  phone: string
  email?: string
  accountNumber?: string
}

export interface InsuranceCertUpload {
  type: string
  file: File | null
  policyNumber?: string
  expirationDate?: string
  coverageAmount?: number
}

export interface LicenseInfo {
  type: string
  number: string
  state: string
  expirationDate: string
  classification?: string
}

export interface ProjectReference {
  projectName: string
  ownerName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  contractValue: number
  completionDate: string
  scopeDescription: string
  onTime: boolean
  onBudget: boolean
}

export interface CertificationInfo {
  name: string
  issuingBody: string
  certificationNumber?: string
  expirationDate?: string
}

export interface PreQualScoringResult {
  totalScore: number
  maxScore: number
  percentage: number
  passedMinimum: boolean
  sections: {
    name: string
    score: number
    maxScore: number
    passed: boolean
    notes?: string
  }[]
  recommendation: 'approve' | 'conditional' | 'reject' | 'review'
  flags: string[]
}

// =============================================
// Insurance Compliance Types
// =============================================

export interface InsuranceComplianceSubcontractor {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  overallStatus: 'compliant' | 'expiring' | 'non_compliant' | 'missing'
  complianceScore: number
  certificates: InsuranceCertificateInfo[]
  expiringCertificates: InsuranceCertificateInfo[]
  missingTypes: string[]
  lastReminderSent: string | null
  projectAssignments: number
  paymentHold: boolean
}

export interface InsuranceCertificateInfo {
  id: string
  type: string
  typeName: string
  carrier: string | null
  policyNumber: string | null
  effectiveDate: string
  expirationDate: string
  daysUntilExpiry: number
  status: 'active' | 'expiring_soon' | 'expired'
  coverageAmount: number | null
  requiredAmount: number | null
  meetsRequirement: boolean
  documentUrl: string | null
  additionalInsured: boolean
  waiverOfSubrogation: boolean
}

export interface InsuranceReminderSettings {
  enabled: boolean
  daysBeforeExpiry: number[]
  emailTemplate: string
  ccAddresses: string[]
  includeAttachment: boolean
}

export interface InsuranceComplianceFilters {
  status?: ('compliant' | 'expiring' | 'non_compliant' | 'missing')[]
  projectId?: string
  expiringWithinDays?: number
  search?: string
  onlyWithHold?: boolean
}

// =============================================
// Scope Template Types
// =============================================

export interface ScopeTemplateFormValues {
  name: string
  description?: string
  tradeCode: string
  division?: string
  scopeItems: ScopeTemplateItemForm[]
  commonInclusions: string[]
  commonExclusions: string[]
  requiredDocuments: string[]
  specialConditions?: string
}

export interface ScopeTemplateItemForm {
  itemNumber: string
  description: string
  unit?: string
  isRequired: boolean
  isAlternate: boolean
  alternateGroup?: string
  estimatedQuantity?: number
  estimatedUnitPrice?: number
  notes?: string
}

export interface ScopeTemplateLibrary {
  templates: ScopeTemplateWithStats[]
  trades: { code: string; name: string; count: number }[]
}

export interface ScopeTemplateWithStats {
  id: string
  name: string
  description: string | null
  tradeCode: string
  tradeName: string
  division: string | null
  itemCount: number
  usageCount: number
  isDefault: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// =============================================
// Subcontract List Types
// =============================================

export interface SubcontractListItem {
  id: string
  contractNumber: string
  contractName: string
  projectId: string
  projectName: string
  subcontractorId: string
  subcontractorName: string
  status: string
  originalValue: number
  currentValue: number
  approvedChangeOrders: number
  pendingChangeOrders: number
  invoicedAmount: number
  paidAmount: number
  retentionHeld: number
  remainingBalance: number
  complianceStatus: 'compliant' | 'warning' | 'non_compliant'
  startDate: string | null
  completionDate: string | null
  percentComplete: number
}

export interface SubcontractPayment {
  id: string
  subcontractId: string
  paymentNumber: number
  applicationDate: string
  periodFrom: string
  periodTo: string
  previouslyBilled: number
  currentBilled: number
  storedMaterials: number
  totalCompleted: number
  retentionHeld: number
  netPaymentDue: number
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected'
  paidDate: string | null
  paidAmount: number | null
  checkNumber: string | null
}

export interface SubcontractChangeOrder {
  id: string
  subcontractId: string
  changeOrderNumber: string
  title: string
  description: string | null
  amount: number
  timeExtension: number | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  requestedDate: string
  approvedDate: string | null
  approvedBy: string | null
}

export interface SubcontractSummary {
  totalContracts: number
  totalOriginalValue: number
  totalCurrentValue: number
  totalApprovedCOs: number
  totalPendingCOs: number
  totalInvoiced: number
  totalPaid: number
  totalRetention: number
  byStatus: Record<string, number>
}

// =============================================
// Additional Types for New Components
// =============================================

export type InsuranceType =
  | 'general_liability'
  | 'auto_liability'
  | 'workers_comp'
  | 'umbrella'
  | 'professional'
  | 'pollution'
  | 'builders_risk'

export interface InsuranceCertificate {
  id: string
  subcontractorId: string
  insuranceType: InsuranceType
  carrier: string
  policyNumber: string
  effectiveDate: string
  expirationDate: string
  coverageAmount: number
  aggregateAmount?: number
  deductible?: number
  additionalInsured: boolean
  waiverOfSubrogation: boolean
  primaryNonContributory: boolean
  namedInsuredExact: boolean
  verified: boolean
  verifiedAt?: string
  verifiedBy?: string
  documentId?: string
  notes?: string
  status: 'active' | 'expiring_soon' | 'expired'
  daysUntilExpiry: number
  createdAt: string
  updatedAt: string
}

export interface ReminderSettings {
  enabled: boolean
  reminderDays: number[]
  ccEmails?: string[]
  autoHoldOnExpired: boolean
}

export interface LienWaiver {
  id: string
  subcontractId: string
  paymentId?: string
  waiverType: 'conditional_partial' | 'unconditional_partial' | 'conditional_final' | 'unconditional_final'
  throughDate: string
  amount: number
  status: 'pending' | 'received' | 'verified' | 'rejected'
  isConditional: boolean
  isFinal: boolean
  requestedAt: string
  receivedAt?: string
  verifiedAt?: string
  verifiedBy?: string
  documentId?: string
  notes?: string
}

export interface BidSubmission {
  id: string
  bidPackageId: string
  bidderName: string
  bidderCompanyName: string
  bidderEmail: string
  bidderPhone?: string
  baseBidAmount: number
  alternatesTotal?: number
  totalBidAmount?: number
  status: 'draft' | 'submitted' | 'received' | 'under_review' | 'qualified' | 'shortlisted' | 'awarded' | 'rejected' | 'withdrawn' | 'disqualified'
  isLate: boolean
  submittedAt?: string
  proposedStartDate?: string
  proposedDuration?: number
  exclusions?: string
  clarifications?: string
  assumptions?: string
  bidBondIncluded?: boolean
  insuranceCertIncluded?: boolean
  rank?: number
  varianceFromLow?: number
  varianceFromEstimate?: number
}

export interface BidLineItem {
  itemId: string
  itemNumber: string
  description: string
  unit?: string
  quantity?: number
  estimatedUnitPrice?: number
  estimatedTotal?: number
  isAlternate: boolean
  submissions: {
    submissionId: string
    bidderName: string
    unitPrice?: number
    totalPrice?: number
    isIncluded: boolean
    notes?: string
  }[]
  lowestPrice?: number
  highestPrice?: number
  averagePrice?: number
}

export interface ScopeClarification {
  id: string
  submissionId: string
  itemId?: string
  noteType: 'general' | 'clarification' | 'concern' | 'recommendation'
  note: string
  createdBy: string
  createdAt: string
}
