/**
 * Payment Forecast React Query Hooks
 *
 * Query and mutation hooks for payment forecasts, calendar events,
 * and cash flow projections.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentForecastApi } from '@/lib/api/services/payment-forecast'
import { useToast } from '@/components/ui/use-toast'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import type {
  PaymentForecastFilters,
  CashFlowForecastFilters,
  CreatePaymentForecastDTO,
  UpdatePaymentForecastDTO,
  PaymentType,
  PaymentStatus,
} from '@/types/payment-forecast'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const paymentForecastKeys = {
  all: ['payment-forecast'] as const,

  // Payments
  payments: () => [...paymentForecastKeys.all, 'payments'] as const,
  paymentsList: (filters: PaymentForecastFilters) =>
    [...paymentForecastKeys.payments(), 'list', filters] as const,
  paymentsByMonth: (projectId: string | undefined, year: number, month: number) =>
    [...paymentForecastKeys.payments(), 'month', projectId, year, month] as const,
  overduePayments: (projectId?: string) =>
    [...paymentForecastKeys.payments(), 'overdue', projectId] as const,

  // Calendar
  calendar: () => [...paymentForecastKeys.all, 'calendar'] as const,
  calendarEvents: (projectId: string | undefined, startDate: string, endDate: string) =>
    [...paymentForecastKeys.calendar(), projectId, startDate, endDate] as const,

  // Cash Flow
  cashFlow: () => [...paymentForecastKeys.all, 'cash-flow'] as const,
  cashFlowForecast: (filters: CashFlowForecastFilters) =>
    [...paymentForecastKeys.cashFlow(), 'forecast', filters] as const,

  // Patterns
  patterns: (projectId?: string, companyId?: string) =>
    [...paymentForecastKeys.all, 'patterns', projectId, companyId] as const,
}

// ============================================================================
// PAYMENT QUERY HOOKS
// ============================================================================

/**
 * Get upcoming payments with filters
 */
export function useUpcomingPayments(filters: PaymentForecastFilters) {
  return useQuery({
    queryKey: paymentForecastKeys.paymentsList(filters),
    queryFn: () => paymentForecastApi.getUpcomingPayments(filters),
    enabled: !!(filters.startDate && filters.endDate),
  })
}

/**
 * Get payments for a specific month
 */
export function usePaymentsByMonth(
  projectId: string | undefined,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: paymentForecastKeys.paymentsByMonth(projectId, year, month),
    queryFn: () => paymentForecastApi.getPaymentsByMonth(projectId, year, month),
    enabled: year > 0 && month > 0,
  })
}

/**
 * Get overdue payments
 */
export function useOverduePayments(projectId?: string) {
  return useQuery({
    queryKey: paymentForecastKeys.overduePayments(projectId),
    queryFn: () => paymentForecastApi.getOverduePayments(projectId),
  })
}

// ============================================================================
// CALENDAR HOOKS
// ============================================================================

/**
 * Get calendar events for a date range
 */
export function usePaymentCalendarEvents(
  projectId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: paymentForecastKeys.calendarEvents(projectId, startDate, endDate),
    queryFn: () =>
      paymentForecastApi.getPaymentCalendarEvents(projectId, startDate, endDate),
    enabled: !!(startDate && endDate),
  })
}

/**
 * Hook for payment forecast calendar with current month navigation
 */
export function usePaymentForecastCalendar(
  projectId: string | undefined,
  initialDate: Date = new Date()
) {
  const startDate = format(startOfMonth(initialDate), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(initialDate), 'yyyy-MM-dd')

  const query = usePaymentCalendarEvents(projectId, startDate, endDate)

  return {
    ...query,
    year: initialDate.getFullYear(),
    month: initialDate.getMonth() + 1,
    monthName: format(initialDate, 'MMMM yyyy'),
  }
}

// ============================================================================
// CASH FLOW HOOKS
// ============================================================================

/**
 * Get cash flow forecast for upcoming months
 */
export function useCashFlowForecast(filters: CashFlowForecastFilters) {
  return useQuery({
    queryKey: paymentForecastKeys.cashFlowForecast(filters),
    queryFn: () => paymentForecastApi.calculateCashFlowForecast(filters),
  })
}

/**
 * Hook for cash flow projections with default 6 months
 */
export function useProjectCashFlow(projectId?: string, months: number = 6) {
  return useCashFlowForecast({
    projectId,
    months,
    includeHistorical: false,
  })
}

// ============================================================================
// PATTERN HOOKS
// ============================================================================

/**
 * Get historical payment patterns
 */
export function usePaymentPatterns(projectId?: string, companyId?: string) {
  return useQuery({
    queryKey: paymentForecastKeys.patterns(projectId, companyId),
    queryFn: () => paymentForecastApi.getPaymentPatterns(projectId, companyId),
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new payment forecast entry
 */
export function useCreatePaymentForecast() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreatePaymentForecastDTO) =>
      paymentForecastApi.createPaymentForecast(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentForecastKeys.all })
      toast({
        title: 'Payment scheduled',
        description: 'Payment forecast has been created.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment forecast.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a payment forecast entry
 */
export function useUpdatePaymentForecast() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePaymentForecastDTO }) =>
      paymentForecastApi.updatePaymentForecast(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentForecastKeys.all })
      toast({
        title: 'Payment updated',
        description: 'Payment forecast has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment forecast.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a payment forecast entry
 */
export function useDeletePaymentForecast() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => paymentForecastApi.deletePaymentForecast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentForecastKeys.all })
      toast({
        title: 'Payment deleted',
        description: 'Payment forecast has been removed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment forecast.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Mark a payment as completed
 */
export function useMarkPaymentCompleted() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, paymentDate }: { id: string; paymentDate: string }) =>
      paymentForecastApi.markPaymentCompleted(id, paymentDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentForecastKeys.all })
      toast({
        title: 'Payment completed',
        description: 'Payment has been marked as completed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark payment as completed.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Combined hook for payment forecast dashboard data
 */
export function usePaymentForecastDashboard(
  projectId: string | undefined,
  currentDate: Date = new Date()
) {
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(addMonths(currentDate, 2)), 'yyyy-MM-dd')

  const paymentsQuery = useUpcomingPayments({
    projectId,
    startDate,
    endDate,
  })

  const cashFlowQuery = useCashFlowForecast({
    projectId,
    months: 6,
  })

  const overdueQuery = useOverduePayments(projectId)

  const calendarQuery = usePaymentCalendarEvents(
    projectId,
    format(startOfMonth(currentDate), 'yyyy-MM-dd'),
    format(endOfMonth(currentDate), 'yyyy-MM-dd')
  )

  return {
    payments: paymentsQuery.data,
    cashFlow: cashFlowQuery.data,
    overdue: overdueQuery.data,
    calendar: calendarQuery.data,
    isLoading:
      paymentsQuery.isLoading ||
      cashFlowQuery.isLoading ||
      overdueQuery.isLoading ||
      calendarQuery.isLoading,
    error:
      paymentsQuery.error ||
      cashFlowQuery.error ||
      overdueQuery.error ||
      calendarQuery.error,
    refetch: () => {
      paymentsQuery.refetch()
      cashFlowQuery.refetch()
      overdueQuery.refetch()
      calendarQuery.refetch()
    },
  }
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for payment type filter options
 */
export function usePaymentTypeOptions(): Array<{ value: PaymentType; label: string }> {
  return [
    { value: 'subcontractor_pay_application', label: 'Subcontractor Pay App' },
    { value: 'invoice_payment', label: 'Invoice Payment' },
    { value: 'retention_release', label: 'Retention Release' },
    { value: 'owner_requisition', label: 'Owner Requisition' },
    { value: 'vendor_payment', label: 'Vendor Payment' },
    { value: 'progress_billing', label: 'Progress Billing' },
  ]
}

/**
 * Hook for payment status filter options
 */
export function usePaymentStatusOptions(): Array<{ value: PaymentStatus; label: string }> {
  return [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ]
}
