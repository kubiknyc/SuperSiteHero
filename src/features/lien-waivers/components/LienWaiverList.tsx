// File: src/features/lien-waivers/components/LienWaiverList.tsx
// Comprehensive lien waiver list/register view

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type {
  LienWaiverWithDetails,
  LienWaiverStatus,
  LienWaiverType,
  ProjectWaiverSummary,
} from '@/types/lien-waiver'
import {
  LIEN_WAIVER_STATUSES,
  LIEN_WAIVER_TYPES,
  formatWaiverAmount,
  isWaiverOverdue,
  getDaysUntilDue,
} from '@/types/lien-waiver'
import { LienWaiverStatusBadge, LienWaiverTypeBadge } from './LienWaiverStatusBadge'

// =============================================
// Types
// =============================================

interface LienWaiverListProps {
  waivers: LienWaiverWithDetails[]
  summary?: ProjectWaiverSummary | null
  onWaiverClick?: (waiver: LienWaiverWithDetails) => void
  onCreateWaiver?: () => void
  onSendReminder?: (waiver: LienWaiverWithDetails) => void
  onExport?: () => void
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Due date indicator with urgency coloring
 */
function DueDateIndicator({ dueDate, status }: { dueDate: string | null; status: LienWaiverStatus }) {
  if (!dueDate) return <span className="text-gray-400">-</span>

  // Don't show urgency for completed statuses
  if (['approved', 'void'].includes(status)) {
    return (
      <span className="text-xs text-gray-600">
        {new Date(dueDate).toLocaleDateString()}
      </span>
    )
  }

  const daysUntil = getDaysUntilDue(dueDate)
  let colorClass = 'text-gray-600'
  let bgClass = ''

  if (daysUntil < 0) {
    colorClass = 'text-red-700'
    bgClass = 'bg-red-50 px-2 py-0.5 rounded'
  } else if (daysUntil <= 3) {
    colorClass = 'text-orange-700'
    bgClass = 'bg-orange-50 px-2 py-0.5 rounded'
  } else if (daysUntil <= 7) {
    colorClass = 'text-yellow-700'
    bgClass = 'bg-yellow-50 px-2 py-0.5 rounded'
  }

  return (
    <span className={cn('text-xs', colorClass, bgClass)}>
      {new Date(dueDate).toLocaleDateString()}
      {daysUntil < 0 && <span className="ml-1 font-medium">({Math.abs(daysUntil)}d overdue)</span>}
      {daysUntil >= 0 && daysUntil <= 7 && <span className="ml-1">({daysUntil}d)</span>}
    </span>
  )
}

/**
 * Amount display
 */
function AmountDisplay({ amount }: { amount: number }) {
  return (
    <span className="font-mono text-sm">
      {formatWaiverAmount(amount)}
    </span>
  )
}

/**
 * Signature status indicator
 */
function SignatureIndicator({ waiver }: { waiver: LienWaiverWithDetails }) {
  const hasSigned = !!waiver.signed_at
  const hasNotarized = !!waiver.notarized_at
  const needsNotary = waiver.notarization_required

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          hasSigned ? 'bg-green-500' : 'bg-gray-300'
        )}
        title={hasSigned ? 'Signed' : 'Not signed'}
      />
      {needsNotary && (
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            hasNotarized ? 'bg-purple-500' : 'bg-gray-300'
          )}
          title={hasNotarized ? 'Notarized' : 'Not notarized'}
        />
      )}
    </div>
  )
}

// =============================================
// Summary Card
// =============================================

function WaiverSummaryCard({ summary }: { summary: ProjectWaiverSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-700">{summary.total_waivers}</div>
        <div className="text-xs text-gray-500">Total</div>
      </div>
      <div className="text-center p-3 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-700">{summary.pending_count}</div>
        <div className="text-xs text-gray-500">Pending</div>
      </div>
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-700">{summary.received_count}</div>
        <div className="text-xs text-gray-500">Received</div>
      </div>
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-700">{summary.approved_count}</div>
        <div className="text-xs text-gray-500">Approved</div>
      </div>
      <div className="text-center p-3 bg-orange-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-700">{summary.missing_count}</div>
        <div className="text-xs text-gray-500">Missing</div>
      </div>
      <div className="text-center p-3 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-700">{summary.overdue_count}</div>
        <div className="text-xs text-gray-500">Overdue</div>
      </div>
      <div className="text-center p-3 bg-slate-50 rounded-lg">
        <div className="text-lg font-bold text-slate-700">
          {formatWaiverAmount(summary.total_waived_amount)}
        </div>
        <div className="text-xs text-gray-500">Total Waived</div>
      </div>
    </div>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * Lien Waiver List/Register Component
 *
 * Features:
 * - Summary statistics
 * - Filter by status, type, subcontractor
 * - Overdue tracking with color indicators
 * - Signature and notarization status
 * - Amount tracking
 * - Export capability
 *
 * @example
 * ```tsx
 * <LienWaiverList
 *   waivers={projectWaivers}
 *   summary={waiverSummary}
 *   onWaiverClick={(w) => navigate(`/waivers/${w.id}`)}
 *   onCreateWaiver={() => setShowCreateDialog(true)}
 * />
 * ```
 */
export function LienWaiverList({
  waivers,
  summary,
  onWaiverClick,
  onCreateWaiver,
  onSendReminder,
  onExport,
  className,
}: LienWaiverListProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')

  // Filter waivers
  const filteredWaivers = React.useMemo(() => {
    return waivers.filter((w) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !(w.waiver_number.toLowerCase().includes(searchLower) ||
            w.vendor_name?.toLowerCase().includes(searchLower) ||
            w.subcontractor?.company_name?.toLowerCase().includes(searchLower) ||
            w.claimant_name?.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && w.status !== statusFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== 'all' && w.waiver_type !== typeFilter) {
        return false
      }

      return true
    })
  }, [waivers, search, statusFilter, typeFilter])

  // Group by status for quick filters
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    waivers.forEach((w) => {
      counts[w.status] = (counts[w.status] || 0) + 1
    })
    return counts
  }, [waivers])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Lien Waiver Register</h2>
          <p className="text-sm text-gray-500">
            {filteredWaivers.length} waiver{filteredWaivers.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` (filtered)`}
          </p>
        </div>
        <div className="flex gap-2">
          {onCreateWaiver && (
            <Button onClick={onCreateWaiver} size="sm">
              Request Waiver
            </Button>
          )}
          {onExport && (
            <Button variant="outline" onClick={onExport} size="sm">
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && <WaiverSummaryCard summary={summary} />}

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All ({waivers.length})
        </Button>
        {LIEN_WAIVER_STATUSES.filter((s) => statusCounts[s.value])
          .map((status) => (
            <Button
              key={status.value}
              variant={statusFilter === status.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status.value ? 'all' : status.value)}
            >
              {status.label} ({statusCounts[status.value]})
            </Button>
          ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search waivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LIEN_WAIVER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="font-medium">Type Legend:</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span> Conditional
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500"></span> Unconditional
        </span>
        <span className="font-medium ml-4">Signatures:</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500"></span> Signed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-500"></span> Notarized
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Waiver No.</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium min-w-[150px]">Vendor/Sub</th>
                <th className="px-3 py-2 text-left font-medium">Through Date</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-center font-medium">Signed</th>
                <th className="px-3 py-2 text-left font-medium">Due Date</th>
                <th className="px-3 py-2 text-left font-medium">Pay App</th>
                <th className="px-3 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredWaivers.map((waiver) => {
                const isOverdue = isWaiverOverdue(waiver)
                return (
                  <tr
                    key={waiver.id}
                    className={cn(
                      'hover:bg-gray-50',
                      onWaiverClick && 'cursor-pointer',
                      isOverdue && 'bg-red-50'
                    )}
                    onClick={() => onWaiverClick?.(waiver)}
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {waiver.waiver_number}
                    </td>
                    <td className="px-3 py-2">
                      <LienWaiverTypeBadge type={waiver.waiver_type} />
                    </td>
                    <td className="px-3 py-2">
                      <LienWaiverStatusBadge status={waiver.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm">
                        {waiver.subcontractor?.company_name || waiver.vendor_name || '-'}
                      </div>
                      {waiver.claimant_name && (
                        <div className="text-xs text-gray-500">{waiver.claimant_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(waiver.through_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <AmountDisplay amount={waiver.payment_amount} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <SignatureIndicator waiver={waiver} />
                    </td>
                    <td className="px-3 py-2">
                      <DueDateIndicator dueDate={waiver.due_date} status={waiver.status} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {waiver.payment_application?.application_number
                        ? `#${waiver.payment_application.application_number}`
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {onSendReminder && ['pending', 'sent'].includes(waiver.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSendReminder(waiver)
                          }}
                        >
                          Remind
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredWaivers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    No lien waivers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Amount */}
      {filteredWaivers.length > 0 && (
        <div className="text-right text-sm text-gray-600">
          Total Waived Amount: <span className="font-mono font-medium">
            {formatWaiverAmount(filteredWaivers.reduce((sum, w) => sum + w.payment_amount, 0))}
          </span>
        </div>
      )}
    </div>
  )
}

export default LienWaiverList
