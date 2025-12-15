/**
 * Payment Forecast Types
 * Types for payment forecast calendar and cash flow projections
 * Supports visualization of upcoming payment schedules
 */

// =============================================
// Enums and Constants
// =============================================

export type PaymentType =
  | 'subcontractor_pay_application'
  | 'invoice_payment'
  | 'retention_release'
  | 'owner_requisition'
  | 'vendor_payment'
  | 'progress_billing';

export type PaymentStatus =
  | 'scheduled'
  | 'pending_approval'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type PaymentPriority = 'low' | 'medium' | 'high' | 'critical';

export const PAYMENT_TYPES: Array<{
  value: PaymentType;
  label: string;
  color: string;
  icon: string;
}> = [
  { value: 'subcontractor_pay_application', label: 'Subcontractor Pay App', color: 'blue', icon: 'Users' },
  { value: 'invoice_payment', label: 'Invoice Payment', color: 'purple', icon: 'FileText' },
  { value: 'retention_release', label: 'Retention Release', color: 'emerald', icon: 'Unlock' },
  { value: 'owner_requisition', label: 'Owner Requisition', color: 'amber', icon: 'Building' },
  { value: 'vendor_payment', label: 'Vendor Payment', color: 'pink', icon: 'Truck' },
  { value: 'progress_billing', label: 'Progress Billing', color: 'cyan', icon: 'TrendingUp' },
];

export const PAYMENT_STATUSES: Array<{
  value: PaymentStatus;
  label: string;
  color: string;
  bgColor: string;
}> = [
  { value: 'scheduled', label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'pending_approval', label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { value: 'approved', label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'processing', label: 'Processing', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  { value: 'overdue', label: 'Overdue', color: 'text-red-700', bgColor: 'bg-red-100' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100' },
];

export const PAYMENT_PRIORITIES: Array<{
  value: PaymentPriority;
  label: string;
  color: string;
}> = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];

// =============================================
// Core Types
// =============================================

/**
 * Payment Forecast Item - Individual payment entry
 */
export interface PaymentForecastItem {
  id: string;
  project_id: string;
  company_id: string;

  // Payment identification
  payment_type: PaymentType;
  reference_number: string;
  description: string;

  // Related entities
  subcontractor_id: string | null;
  subcontractor_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  invoice_id: string | null;
  pay_application_id: string | null;

  // Amounts
  amount: number;
  retainage_amount: number | null;
  total_amount: number;

  // Dates
  due_date: string;
  scheduled_payment_date: string | null;
  actual_payment_date: string | null;

  // Status
  status: PaymentStatus;
  priority: PaymentPriority;

  // Terms
  payment_terms: string | null;  // e.g., "Net 30"
  days_until_due: number;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Payment Calendar Event - For calendar display
 */
export interface PaymentCalendarEvent {
  id: string;
  title: string;
  date: string;
  amount: number;
  payment_type: PaymentType;
  status: PaymentStatus;
  priority: PaymentPriority;
  project_id: string;
  project_name: string;
  payee_name: string | null;
  is_incoming: boolean;  // true = money coming in (owner requisition), false = money going out
  details: PaymentForecastItem;
}

/**
 * Payment Forecast Summary - Aggregated totals
 */
export interface PaymentForecastSummary {
  // Period info
  period_start: string;
  period_end: string;

  // Totals
  total_payments_due: number;
  total_incoming: number;
  total_outgoing: number;
  net_cash_flow: number;

  // Counts
  payment_count: number;
  overdue_count: number;
  pending_approval_count: number;

  // By type totals
  by_type: Array<{
    payment_type: PaymentType;
    label: string;
    count: number;
    amount: number;
  }>;

  // By status totals
  by_status: Array<{
    status: PaymentStatus;
    label: string;
    count: number;
    amount: number;
  }>;
}

/**
 * Cash Flow Projection - Monthly forecast
 */
export interface CashFlowProjection {
  month: string;  // YYYY-MM format
  month_name: string;  // "January 2024"

  // Projections
  projected_incoming: number;
  projected_outgoing: number;
  net_cash_flow: number;
  cumulative_cash_flow: number;

  // Breakdown
  owner_requisitions: number;
  subcontractor_payments: number;
  vendor_payments: number;
  retention_releases: number;
  other_payments: number;

  // Confidence level based on confirmed vs estimated
  confirmed_amount: number;
  estimated_amount: number;
  confidence_percent: number;
}

/**
 * Payment Pattern - Historical payment analysis
 */
export interface PaymentPattern {
  payment_type: PaymentType;
  average_days_to_payment: number;
  on_time_percentage: number;
  average_amount: number;
  total_paid: number;
  payment_count: number;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Daily Payment Totals - For calendar grid
 */
export interface DailyPaymentTotals {
  date: string;
  incoming: number;
  outgoing: number;
  net: number;
  payment_count: number;
  events: PaymentCalendarEvent[];
}

/**
 * Weekly Payment Summary
 */
export interface WeeklyPaymentSummary {
  week_start: string;
  week_end: string;
  week_number: number;
  incoming: number;
  outgoing: number;
  net: number;
  payment_count: number;
  days: DailyPaymentTotals[];
}

/**
 * Monthly Calendar Data
 */
export interface MonthlyCalendarData {
  year: number;
  month: number;
  month_name: string;
  weeks: WeeklyPaymentSummary[];
  totals: {
    incoming: number;
    outgoing: number;
    net: number;
    payment_count: number;
  };
}

// =============================================
// Filter Types
// =============================================

export interface PaymentForecastFilters {
  projectId?: string;
  companyId?: string;
  startDate: string;
  endDate: string;
  paymentTypes?: PaymentType[];
  statuses?: PaymentStatus[];
  minAmount?: number;
  maxAmount?: number;
  subcontractorId?: string;
  vendorId?: string;
  isIncoming?: boolean;
}

export interface CashFlowForecastFilters {
  projectId?: string;
  companyId?: string;
  months: number;  // Number of months to forecast
  includeHistorical?: boolean;
}

// =============================================
// DTO Types
// =============================================

export interface CreatePaymentForecastDTO {
  project_id: string;
  payment_type: PaymentType;
  description: string;
  amount: number;
  due_date: string;
  scheduled_payment_date?: string;
  subcontractor_id?: string;
  vendor_id?: string;
  retainage_amount?: number;
  payment_terms?: string;
  priority?: PaymentPriority;
  notes?: string;
}

export interface UpdatePaymentForecastDTO {
  description?: string;
  amount?: number;
  due_date?: string;
  scheduled_payment_date?: string;
  status?: PaymentStatus;
  priority?: PaymentPriority;
  actual_payment_date?: string;
  notes?: string;
}

// =============================================
// API Response Types
// =============================================

export interface PaymentForecastResponse {
  payments: PaymentForecastItem[];
  summary: PaymentForecastSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CashFlowForecastResponse {
  projections: CashFlowProjection[];
  patterns: PaymentPattern[];
  total_forecast: {
    incoming: number;
    outgoing: number;
    net: number;
  };
}

export interface CalendarEventsResponse {
  events: PaymentCalendarEvent[];
  monthly_data: MonthlyCalendarData;
}

// =============================================
// UI Helper Types
// =============================================

export type CalendarView = 'month' | 'timeline' | 'list';

export interface CalendarViewConfig {
  view: CalendarView;
  showAmounts: boolean;
  showIncoming: boolean;
  showOutgoing: boolean;
  groupByProject: boolean;
  colorByType: boolean;
}

/**
 * Get payment type configuration
 */
export function getPaymentTypeConfig(type: PaymentType) {
  return PAYMENT_TYPES.find(t => t.value === type) || PAYMENT_TYPES[0];
}

/**
 * Get payment status configuration
 */
export function getPaymentStatusConfig(status: PaymentStatus) {
  return PAYMENT_STATUSES.find(s => s.value === status) || PAYMENT_STATUSES[0];
}

/**
 * Check if payment type is incoming (money received)
 */
export function isIncomingPayment(type: PaymentType): boolean {
  return type === 'owner_requisition' || type === 'progress_billing';
}

/**
 * Calculate days until due from a date string
 */
export function calculateDaysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get priority based on days until due
 */
export function getPriorityFromDueDate(daysUntilDue: number): PaymentPriority {
  if (daysUntilDue < 0) {
    return 'critical' // Overdue
  }
  if (daysUntilDue <= 3) {
    return 'high'
  }
  if (daysUntilDue <= 7) {
    return 'medium'
  }
  return 'low'
}
