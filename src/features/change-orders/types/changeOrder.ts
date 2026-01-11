/**
 * Extended Change Order Types
 * Line items, PCO workflow, T&M tracking, and SOV integration
 */

// =============================================================================
// LINE ITEM BREAKDOWN TYPES
// =============================================================================

export enum LineItemCategory {
  LABOR = 'labor',
  MATERIAL = 'material',
  EQUIPMENT = 'equipment',
  SUBCONTRACTOR = 'subcontractor',
  OTHER = 'other',
}

export interface LineItemBreakdown {
  id: string;
  change_order_id: string;
  item_number: number;
  category: LineItemCategory;
  description: string;
  cost_code?: string;
  cost_code_id?: string;

  // Quantity-based pricing
  quantity: number;
  unit: string;
  unit_price: number;
  extended_price: number;

  // Markup
  markup_percent: number;
  markup_amount: number;

  // Total
  total_amount: number;

  // Notes
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface LineItemCategorySummary {
  category: LineItemCategory;
  subtotal: number;
  markup: number;
  total: number;
  item_count: number;
}

export interface LineItemBreakdownSummary {
  by_category: LineItemCategorySummary[];
  subtotal: number;
  total_markup: number;
  grand_total: number;
}

export interface CreateLineItemDTO {
  category: LineItemCategory;
  description: string;
  cost_code?: string;
  cost_code_id?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent?: number;
  notes?: string;
}

export interface UpdateLineItemDTO extends Partial<CreateLineItemDTO> {
  id?: string;
}

// =============================================================================
// CONTINGENCY TRACKING TYPES
// =============================================================================

export enum ContingencyAlertLevel {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  DEPLETED = 'depleted',
}

export interface ContingencyStatus {
  original_amount: number;
  used_amount: number;
  remaining_amount: number;
  utilization_percent: number;
  alert_level: ContingencyAlertLevel;
  pending_amount: number;
  projected_remaining: number;
}

export interface ContingencyUsageRecord {
  id: string;
  project_id: string;
  change_order_id: string;
  change_order_number: string;
  amount: number;
  date_applied: string;
  description: string;
}

export interface ContingencyAdjustment {
  id: string;
  project_id: string;
  adjustment_type: 'increase' | 'decrease' | 'reallocation';
  amount: number;
  reason: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

// =============================================================================
// PCO TO CO WORKFLOW TYPES
// =============================================================================

export enum PCOStatus {
  DRAFT = 'draft',
  PENDING_PRICING = 'pending_pricing',
  PRICING_COMPLETE = 'pricing_complete',
  PENDING_REVIEW = 'pending_review',
  APPROVED_TO_CO = 'approved_to_co',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface PCO {
  id: string;
  project_id: string;
  pco_number: number;
  title: string;
  description?: string;

  // Status
  status: PCOStatus;

  // Initiator
  initiated_by: string;
  initiated_date: string;

  // Pricing
  estimated_amount?: number;
  estimated_days?: number;
  pricing_notes?: string;
  priced_by?: string;
  priced_date?: string;

  // Review
  reviewed_by?: string;
  review_date?: string;
  review_notes?: string;

  // Conversion to CO
  converted_to_co_id?: string;
  conversion_date?: string;

  // Related items
  related_rfi_id?: string;
  related_submittal_id?: string;
  source_type?: 'rfi' | 'submittal' | 'field_condition' | 'owner_request' | 'other';

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreatePCODTO {
  project_id: string;
  title: string;
  description?: string;
  estimated_amount?: number;
  estimated_days?: number;
  related_rfi_id?: string;
  related_submittal_id?: string;
  source_type?: 'rfi' | 'submittal' | 'field_condition' | 'owner_request' | 'other';
}

export interface ConvertPCOToCoDTO {
  pco_id: string;
  final_amount: number;
  final_days?: number;
  pricing_method: 'lump_sum' | 'time_materials' | 'unit_price';
  justification?: string;
}

// =============================================================================
// T&M (TIME & MATERIAL) TRACKING TYPES
// =============================================================================

export enum TMChangeOrderType {
  FIXED_PRICE = 'fixed_price',
  TIME_MATERIALS = 'time_materials',
}

export interface LaborRateSheet {
  id: string;
  project_id: string;
  trade: string;
  classification: string;
  straight_time_rate: number;
  overtime_rate: number;
  double_time_rate: number;
  burden_percent: number;
  effective_date: string;
  expiration_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialMarkupRate {
  id: string;
  project_id: string;
  category: string;
  markup_percent: number;
  notes?: string;
  effective_date: string;
  created_at: string;
}

export interface TMTicket {
  id: string;
  change_order_id: string;
  ticket_number: number;
  date: string;

  // Location/scope
  location?: string;
  work_description: string;

  // Labor entries
  labor_entries: TMTicketLaborEntry[];

  // Material entries
  material_entries: TMTicketMaterialEntry[];

  // Equipment entries
  equipment_entries: TMTicketEquipmentEntry[];

  // Totals
  labor_total: number;
  material_total: number;
  equipment_total: number;
  subtotal: number;
  markup_percent: number;
  markup_amount: number;
  total_amount: number;

  // Approval
  foreman_signature?: string;
  foreman_name?: string;
  owner_signature?: string;
  owner_name?: string;
  approved_date?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TMTicketLaborEntry {
  id: string;
  tm_ticket_id: string;
  worker_name: string;
  trade: string;
  classification: string;

  // Hours
  straight_time_hours: number;
  overtime_hours: number;
  double_time_hours: number;

  // Rates (from rate sheet or override)
  straight_time_rate: number;
  overtime_rate: number;
  double_time_rate: number;
  burden_percent: number;

  // Calculated
  labor_cost: number;
  burden_cost: number;
  total_cost: number;

  notes?: string;
}

export interface TMTicketMaterialEntry {
  id: string;
  tm_ticket_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  extended_cost: number;
  markup_percent: number;
  markup_amount: number;
  total_cost: number;
  supplier?: string;
  invoice_number?: string;
  notes?: string;
}

export interface TMTicketEquipmentEntry {
  id: string;
  tm_ticket_id: string;
  equipment_description: string;
  hours: number;
  hourly_rate: number;
  extended_cost: number;
  notes?: string;
}

export interface TMSummary {
  change_order_id: string;
  ticket_count: number;
  total_labor: number;
  total_material: number;
  total_equipment: number;
  total_markup: number;
  grand_total: number;
  tickets: TMTicket[];
}

export interface CreateTMTicketDTO {
  change_order_id: string;
  date: string;
  location?: string;
  work_description: string;
  markup_percent?: number;
}

export interface CreateTMTicketLaborEntryDTO {
  worker_name: string;
  trade: string;
  classification: string;
  straight_time_hours?: number;
  overtime_hours?: number;
  double_time_hours?: number;
  notes?: string;
}

export interface CreateTMTicketMaterialEntryDTO {
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  supplier?: string;
  invoice_number?: string;
  notes?: string;
}

export interface CreateTMTicketEquipmentEntryDTO {
  equipment_description: string;
  hours: number;
  hourly_rate: number;
  notes?: string;
}

// =============================================================================
// SOV (SCHEDULE OF VALUES) INTEGRATION TYPES
// =============================================================================

export interface SOVLineItem {
  id: string;
  project_id: string;
  line_number: number;
  description: string;
  scheduled_value: number;
  work_completed_previous: number;
  work_completed_current: number;
  materials_stored: number;
  total_completed_and_stored: number;
  percent_complete: number;
  balance_to_finish: number;
  retainage: number;

  // CO tracking
  original_value: number;
  co_adjustments: number;
  current_value: number;

  // Reference
  cost_code?: string;
  cost_code_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface SOVAdjustmentFromCO {
  id: string;
  project_id: string;
  sov_line_item_id: string;
  change_order_id: string;
  adjustment_type: 'new_line' | 'increase' | 'decrease';
  amount: number;
  description: string;
  effective_date: string;
  created_at: string;
}

export interface SOVAdjustmentHistory {
  id: string;
  project_id: string;
  sov_line_item_id: string;
  change_order_id: string;
  change_order_number: string;
  previous_value: number;
  adjustment_amount: number;
  new_value: number;
  date: string;
}

export interface CreateSOVAdjustmentDTO {
  sov_line_item_id?: string;  // null for new line
  change_order_id: string;
  adjustment_type: 'new_line' | 'increase' | 'decrease';
  amount: number;
  description?: string;
  new_line_number?: number;
  cost_code?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate line item total
 */
export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
  markupPercent: number = 0
): { extendedPrice: number; markupAmount: number; total: number } {
  const extendedPrice = quantity * unitPrice;
  const markupAmount = extendedPrice * (markupPercent / 100);
  const total = extendedPrice + markupAmount;
  return { extendedPrice, markupAmount, total };
}

/**
 * Calculate T&M labor entry total
 */
export function calculateTMLaborEntryTotal(entry: Partial<TMTicketLaborEntry>): number {
  const stCost = (entry.straight_time_hours || 0) * (entry.straight_time_rate || 0);
  const otCost = (entry.overtime_hours || 0) * (entry.overtime_rate || 0);
  const dtCost = (entry.double_time_hours || 0) * (entry.double_time_rate || 0);
  const laborCost = stCost + otCost + dtCost;
  const burdenCost = laborCost * ((entry.burden_percent || 0) / 100);
  return laborCost + burdenCost;
}

/**
 * Get contingency alert level
 */
export function getContingencyAlertLevel(utilizationPercent: number): ContingencyAlertLevel {
  if (utilizationPercent >= 100) {return ContingencyAlertLevel.DEPLETED;}
  if (utilizationPercent >= 95) {return ContingencyAlertLevel.CRITICAL;}
  if (utilizationPercent >= 90) {return ContingencyAlertLevel.WARNING;}
  return ContingencyAlertLevel.HEALTHY;
}

/**
 * Get PCO status label
 */
export function getPCOStatusLabel(status: PCOStatus): string {
  const labels: Record<PCOStatus, string> = {
    [PCOStatus.DRAFT]: 'Draft',
    [PCOStatus.PENDING_PRICING]: 'Pending Pricing',
    [PCOStatus.PRICING_COMPLETE]: 'Pricing Complete',
    [PCOStatus.PENDING_REVIEW]: 'Pending Review',
    [PCOStatus.APPROVED_TO_CO]: 'Approved to CO',
    [PCOStatus.REJECTED]: 'Rejected',
    [PCOStatus.WITHDRAWN]: 'Withdrawn',
  };
  return labels[status] || status;
}

/**
 * Get PCO status color
 */
export function getPCOStatusColor(status: PCOStatus): string {
  const colors: Record<PCOStatus, string> = {
    [PCOStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [PCOStatus.PENDING_PRICING]: 'bg-yellow-100 text-yellow-800',
    [PCOStatus.PRICING_COMPLETE]: 'bg-blue-100 text-blue-800',
    [PCOStatus.PENDING_REVIEW]: 'bg-purple-100 text-purple-800',
    [PCOStatus.APPROVED_TO_CO]: 'bg-green-100 text-green-800',
    [PCOStatus.REJECTED]: 'bg-red-100 text-red-800',
    [PCOStatus.WITHDRAWN]: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get line item category label
 */
export function getLineItemCategoryLabel(category: LineItemCategory): string {
  const labels: Record<LineItemCategory, string> = {
    [LineItemCategory.LABOR]: 'Labor',
    [LineItemCategory.MATERIAL]: 'Material',
    [LineItemCategory.EQUIPMENT]: 'Equipment',
    [LineItemCategory.SUBCONTRACTOR]: 'Subcontractor',
    [LineItemCategory.OTHER]: 'Other',
  };
  return labels[category] || category;
}

/**
 * Get line item category color
 */
export function getLineItemCategoryColor(category: LineItemCategory): string {
  const colors: Record<LineItemCategory, string> = {
    [LineItemCategory.LABOR]: 'bg-blue-100 text-blue-800',
    [LineItemCategory.MATERIAL]: 'bg-green-100 text-green-800',
    [LineItemCategory.EQUIPMENT]: 'bg-orange-100 text-orange-800',
    [LineItemCategory.SUBCONTRACTOR]: 'bg-purple-100 text-purple-800',
    [LineItemCategory.OTHER]: 'bg-gray-100 text-gray-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}
