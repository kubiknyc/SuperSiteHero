/**
 * Enhanced Bidding Module Types
 * Types for bid leveling, pre-qualification, scope templates, and subcontracts
 */

// =============================================
// Bid Leveling Types
// =============================================

export interface BidLevelingLineItem {
  id: string;
  packageItemId: string;
  itemNumber: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  submissions: BidLineItemSubmission[];
  lowestPrice: number | null;
  highestPrice: number | null;
  averagePrice: number | null;
  estimatedPrice: number | null;
}

export interface BidLineItemSubmission {
  submissionId: string;
  bidderName: string;
  unitPrice: number | null;
  totalPrice: number | null;
  isIncluded: boolean;
  notes: string | null;
  isLowest: boolean;
  isHighest: boolean;
  varianceFromLowest: number;
}

export interface BidLevelingMatrix {
  packageId: string;
  packageName: string;
  estimatedValue: number | null;
  lineItems: BidLevelingLineItem[];
  submissions: BidLevelingSubmission[];
  alternates: BidAlternateComparison[];
  exclusions: BidExclusionComparison[];
  inclusions: BidInclusionComparison[];
  summary: BidLevelingSummary;
}

export interface BidLevelingSubmission {
  id: string;
  bidderName: string;
  bidderContact: string | null;
  bidderEmail: string | null;
  baseBidAmount: number;
  alternatesTotal: number;
  totalBidAmount: number;
  rank: number;
  varianceFromLow: number;
  varianceFromEstimate: number | null;
  isQualified: boolean;
  isLate: boolean;
  status: string;
  submittedAt: string;
  exclusions: string | null;
  clarifications: string | null;
  proposedStartDate: string | null;
  proposedDuration: number | null;
}

export interface BidAlternateComparison {
  alternateNumber: string;
  description: string;
  submissions: {
    submissionId: string;
    bidderName: string;
    amount: number | null;
    isIncluded: boolean;
    notes: string | null;
  }[];
}

export interface BidExclusionComparison {
  submissionId: string;
  bidderName: string;
  exclusions: string[];
}

export interface BidInclusionComparison {
  submissionId: string;
  bidderName: string;
  inclusions: string[];
}

export interface BidLevelingSummary {
  totalBids: number;
  qualifiedBids: number;
  lowBid: number;
  highBid: number;
  averageBid: number;
  spreadPercent: number;
  estimatedValue: number | null;
  varianceFromEstimate: number | null;
  recommendedBid: string | null;
  recommendationReason: string | null;
}

// =============================================
// Pre-Qualification Types
// =============================================

export type PreQualificationStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'approved'
  | 'conditionally_approved'
  | 'rejected'
  | 'expired';

export interface PreQualificationQuestionnaire {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  version: number;
  isActive: boolean;
  sections: PreQualificationSection[];
  expiresInDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface PreQualificationSection {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  questions: PreQualificationQuestion[];
}

export interface PreQualificationQuestion {
  id: string;
  sectionId: string;
  questionText: string;
  questionType: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'boolean' | 'file' | 'date';
  options: string[] | null;
  isRequired: boolean;
  validationRules: Record<string, unknown> | null;
  helpText: string | null;
  sortOrder: number;
  weight: number; // For scoring
  passingCriteria: string | null;
}

export interface PreQualificationSubmission {
  id: string;
  questionnaireId: string;
  subcontractorId: string;
  status: PreQualificationStatus;
  answers: PreQualificationAnswer[];
  score: number | null;
  maxScore: number | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  conditions: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreQualificationAnswer {
  questionId: string;
  value: unknown;
  score: number | null;
  notes: string | null;
}

export interface PreQualificationSafetyRecord {
  id: string;
  submissionId: string;
  emr: number | null; // Experience Modification Rate
  osha300Log: boolean;
  oshaRecordableRate: number | null;
  dartRate: number | null; // Days Away, Restricted, or Transfer rate
  fatalitiesLast5Years: number;
  seriousViolationsLast3Years: number;
  safetyProgramInPlace: boolean;
  safetyTrainingRequired: boolean;
  ppePolicy: boolean;
  substanceAbusePolicy: boolean;
  notes: string | null;
}

export interface PreQualificationFinancials {
  id: string;
  submissionId: string;
  yearsInBusiness: number;
  annualRevenue: number | null;
  creditRating: string | null;
  bondingCapacity: number | null;
  currentBondingUsed: number | null;
  bankReference: string | null;
  financialStatementsProvided: boolean;
  financialStatementDate: string | null;
  dAndBNumber: string | null; // Dun & Bradstreet
  notes: string | null;
}

export interface PreQualificationReference {
  id: string;
  submissionId: string;
  companyName: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  projectName: string;
  projectValue: number | null;
  projectCompletedDate: string | null;
  scope: string | null;
  rating: number | null;
  wasReferenceContacted: boolean;
  referenceNotes: string | null;
}

export interface PreQualifiedVendor {
  id: string;
  subcontractorId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  trades: string[];
  status: PreQualificationStatus;
  approvedDate: string | null;
  expiresAt: string | null;
  score: number | null;
  tier: 'preferred' | 'approved' | 'conditional' | null;
  bondingCapacity: number | null;
  insuranceCompliant: boolean;
  notes: string | null;
}

// =============================================
// Insurance/Certification Expiry Types
// =============================================

export interface SubcontractorComplianceStatus {
  subcontractorId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  overallCompliance: number; // 0-100
  isFullyCompliant: boolean;
  certificates: CertificateStatus[];
  expiringCertificates: CertificateStatus[];
  missingCertificates: MissingCertificate[];
  lastReminderSent: string | null;
}

export interface CertificateStatus {
  id: string;
  type: string;
  typeName: string;
  policyNumber: string | null;
  carrier: string | null;
  expirationDate: string;
  daysUntilExpiry: number;
  status: 'valid' | 'expiring_soon' | 'expired' | 'missing';
  coverageAmount: number | null;
  requiredAmount: number | null;
  meetsRequirement: boolean;
}

export interface MissingCertificate {
  type: string;
  typeName: string;
  requiredAmount: number | null;
  isRequired: boolean;
}

export interface ExpiryCalendarItem {
  id: string;
  subcontractorId: string;
  companyName: string;
  certificateType: string;
  expirationDate: string;
  daysUntilExpiry: number;
  status: 'valid' | 'expiring_soon' | 'expired';
}

export interface BulkReminderResult {
  sent: number;
  failed: number;
  errors: { subcontractorId: string; error: string }[];
}

// =============================================
// Scope Template Types
// =============================================

export type TradeCode =
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'concrete'
  | 'masonry'
  | 'structural_steel'
  | 'carpentry'
  | 'drywall'
  | 'painting'
  | 'flooring'
  | 'roofing'
  | 'glazing'
  | 'fire_protection'
  | 'landscaping'
  | 'sitework'
  | 'demolition'
  | 'general';

export interface ScopeTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  tradeCode: TradeCode;
  division: string | null;
  isDefault: boolean;
  isPublic: boolean;
  scopeItems: ScopeTemplateItem[];
  commonExclusions: string[];
  commonInclusions: string[];
  requiredDocuments: string[];
  specialConditions: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScopeTemplateItem {
  id: string;
  templateId: string;
  itemNumber: string;
  description: string;
  unit: string | null;
  isRequired: boolean;
  isAlternate: boolean;
  alternateGroup: string | null;
  estimatedQuantity: number | null;
  estimatedUnitPrice: number | null;
  notes: string | null;
  sortOrder: number;
}

export interface CreateScopeTemplateDTO {
  name: string;
  description?: string;
  tradeCode: TradeCode;
  division?: string;
  isDefault?: boolean;
  scopeItems?: Omit<ScopeTemplateItem, 'id' | 'templateId'>[];
  commonExclusions?: string[];
  commonInclusions?: string[];
  requiredDocuments?: string[];
  specialConditions?: string;
}

export interface ApplyTemplateResult {
  itemsAdded: number;
  exclusionsAdded: string[];
  inclusionsAdded: string[];
}

// =============================================
// Subcontract Execution Types
// =============================================

export type SubcontractStatus =
  | 'draft'
  | 'pending_review'
  | 'sent_for_signature'
  | 'partially_signed'
  | 'executed'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'terminated';

export interface Subcontract {
  id: string;
  projectId: string;
  bidPackageId: string | null;
  submissionId: string | null;
  subcontractorId: string;
  companyId: string;

  // Contract identification
  contractNumber: string;
  contractName: string;

  // Amounts
  originalContractValue: number;
  currentContractValue: number;
  approvedChangeOrders: number;
  pendingChangeOrders: number;

  // Dates
  contractDate: string | null;
  startDate: string | null;
  completionDate: string | null;

  // Terms
  retentionPercent: number;
  paymentTerms: string | null;
  warrantyPeriodMonths: number | null;
  liquidatedDamagesPerDay: number | null;

  // Status
  status: SubcontractStatus;

  // Scope
  scopeOfWork: string | null;
  exclusions: string | null;
  inclusions: string | null;
  specialConditions: string | null;

  // Documents
  contractDocumentUrl: string | null;
  exhibitUrls: string[] | null;

  // Signatures
  gcSignedBy: string | null;
  gcSignedAt: string | null;
  subSignedBy: string | null;
  subSignedAt: string | null;

  // DocuSign
  docusignEnvelopeId: string | null;
  docusignStatus: string | null;

  // Metadata
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractWithDetails extends Subcontract {
  project?: {
    id: string;
    name: string;
    projectNumber: string | null;
  };
  subcontractor?: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
  };
  bidPackage?: {
    id: string;
    name: string;
    packageNumber: string;
  };
  amendments?: SubcontractAmendment[];
  changeOrdersCount?: number;
  paymentsCount?: number;
  invoicedAmount?: number;
  paidAmount?: number;
}

export interface SubcontractAmendment {
  id: string;
  subcontractId: string;
  amendmentNumber: number;
  title: string;
  description: string | null;

  // Changes
  changeReason: string | null;
  scopeChanges: string | null;
  priceChange: number;
  timeExtensionDays: number | null;
  newCompletionDate: string | null;

  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executed';

  // Signatures
  gcSignedBy: string | null;
  gcSignedAt: string | null;
  subSignedBy: string | null;
  subSignedAt: string | null;

  // Documents
  documentUrl: string | null;
  docusignEnvelopeId: string | null;

  // Metadata
  effectiveDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTermsTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isDefault: boolean;

  // Standard clauses
  generalConditions: string | null;
  insuranceRequirements: string | null;
  indemnification: string | null;
  disputeResolution: string | null;
  termination: string | null;
  warranty: string | null;
  safetyRequirements: string | null;

  // Additional terms
  additionalTerms: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcontractDTO {
  projectId: string;
  bidPackageId?: string;
  submissionId?: string;
  subcontractorId: string;
  contractName: string;
  originalContractValue: number;
  startDate?: string;
  completionDate?: string;
  retentionPercent?: number;
  paymentTerms?: string;
  scopeOfWork?: string;
  exclusions?: string;
  inclusions?: string;
  specialConditions?: string;
}

export interface CreateSubcontractFromBidDTO {
  submissionId: string;
  termsTemplateId?: string;
  startDate?: string;
  completionDate?: string;
  retentionPercent?: number;
  additionalTerms?: string;
}

export interface SignatureRequest {
  subcontractId: string;
  signerEmail: string;
  signerName: string;
  signerRole: 'gc' | 'subcontractor';
  message?: string;
}

export interface DocuSignWebhookPayload {
  envelopeId: string;
  status: string;
  signers: {
    email: string;
    status: string;
    signedAt?: string;
  }[];
}

// =============================================
// DTOs
// =============================================

export interface CreatePreQualificationDTO {
  subcontractorId: string;
  questionnaireId: string;
  answers: PreQualificationAnswer[];
  safetyRecord?: Omit<PreQualificationSafetyRecord, 'id' | 'submissionId'>;
  financials?: Omit<PreQualificationFinancials, 'id' | 'submissionId'>;
  references?: Omit<PreQualificationReference, 'id' | 'submissionId'>[];
}

export interface ReviewPreQualificationDTO {
  status: PreQualificationStatus;
  reviewNotes?: string;
  conditions?: string;
  expiresAt?: string;
}

export interface SendReminderDTO {
  subcontractorIds: string[];
  reminderType: 'expiring' | 'missing' | 'all';
  customMessage?: string;
}

export interface CreateAmendmentDTO {
  subcontractId: string;
  title: string;
  description?: string;
  changeReason?: string;
  scopeChanges?: string;
  priceChange: number;
  timeExtensionDays?: number;
  newCompletionDate?: string;
}

// =============================================
// Filter Types
// =============================================

export interface PreQualificationFilters {
  status?: PreQualificationStatus | PreQualificationStatus[];
  trades?: TradeCode[];
  minScore?: number;
  expiringWithinDays?: number;
  search?: string;
}

export interface SubcontractFilters {
  projectId?: string;
  subcontractorId?: string;
  status?: SubcontractStatus | SubcontractStatus[];
  search?: string;
}

export interface ExpiryDashboardFilters {
  daysAhead?: number;
  certificateTypes?: string[];
  onlyNonCompliant?: boolean;
}

// =============================================
// Export Formats
// =============================================

export interface BidLevelingExportOptions {
  format: 'xlsx' | 'pdf' | 'csv';
  includeLineItems: boolean;
  includeAlternates: boolean;
  includeExclusions: boolean;
  includeCharts: boolean;
}

// =============================================
// Utility Types
// =============================================

export const TRADE_CODES: { value: TradeCode; label: string; division: string }[] = [
  { value: 'electrical', label: 'Electrical', division: '26' },
  { value: 'plumbing', label: 'Plumbing', division: '22' },
  { value: 'hvac', label: 'HVAC', division: '23' },
  { value: 'concrete', label: 'Concrete', division: '03' },
  { value: 'masonry', label: 'Masonry', division: '04' },
  { value: 'structural_steel', label: 'Structural Steel', division: '05' },
  { value: 'carpentry', label: 'Carpentry', division: '06' },
  { value: 'drywall', label: 'Drywall & Acoustical', division: '09' },
  { value: 'painting', label: 'Painting & Coatings', division: '09' },
  { value: 'flooring', label: 'Flooring', division: '09' },
  { value: 'roofing', label: 'Roofing', division: '07' },
  { value: 'glazing', label: 'Glazing', division: '08' },
  { value: 'fire_protection', label: 'Fire Protection', division: '21' },
  { value: 'landscaping', label: 'Landscaping', division: '32' },
  { value: 'sitework', label: 'Sitework', division: '31' },
  { value: 'demolition', label: 'Demolition', division: '02' },
  { value: 'general', label: 'General', division: '01' },
];

export const SUBCONTRACT_STATUSES: { value: SubcontractStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending_review', label: 'Pending Review', color: 'yellow' },
  { value: 'sent_for_signature', label: 'Sent for Signature', color: 'blue' },
  { value: 'partially_signed', label: 'Partially Signed', color: 'orange' },
  { value: 'executed', label: 'Executed', color: 'green' },
  { value: 'active', label: 'Active', color: 'emerald' },
  { value: 'suspended', label: 'Suspended', color: 'red' },
  { value: 'completed', label: 'Completed', color: 'purple' },
  { value: 'terminated', label: 'Terminated', color: 'red' },
];

export const PREQUAL_STATUSES: { value: PreQualificationStatus; label: string; color: string }[] = [
  { value: 'not_submitted', label: 'Not Submitted', color: 'gray' },
  { value: 'pending_review', label: 'Pending Review', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'conditionally_approved', label: 'Conditionally Approved', color: 'orange' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'red' },
];

// =============================================
// Utility Functions
// =============================================

export function getTradeLabel(code: TradeCode): string {
  const trade = TRADE_CODES.find((t) => t.value === code);
  return trade?.label || code;
}

export function getSubcontractStatusColor(status: SubcontractStatus): string {
  const config = SUBCONTRACT_STATUSES.find((s) => s.value === status);
  return config?.color || 'gray';
}

export function getPreQualStatusColor(status: PreQualificationStatus): string {
  const config = PREQUAL_STATUSES.find((s) => s.value === status);
  return config?.color || 'gray';
}

export function calculateCompliancePercentage(
  certificates: CertificateStatus[],
  missingCertificates: MissingCertificate[]
): number {
  const total = certificates.length + missingCertificates.length;
  if (total === 0) {return 100;}

  const compliant = certificates.filter(
    (c) => c.status === 'valid' && c.meetsRequirement
  ).length;

  return Math.round((compliant / total) * 100);
}

export function getDaysUntilExpiry(expirationDate: string): number {
  const expiry = new Date(expirationDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(daysUntilExpiry: number): 'valid' | 'expiring_soon' | 'expired' {
  if (daysUntilExpiry < 0) {return 'expired';}
  if (daysUntilExpiry <= 30) {return 'expiring_soon';}
  return 'valid';
}
