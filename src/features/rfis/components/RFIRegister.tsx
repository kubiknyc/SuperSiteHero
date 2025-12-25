// File: src/features/rfis/components/RFIRegister.tsx
// RFI Register/Log View - Industry-standard RFI tracking

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
import type { RFIStatus, RFIPriority, RFIResponseType, BallInCourtRole } from '@/types/rfi'
import {
  RFI_STATUSES,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
  formatRFINumber,
  getRFIStatusColor,
  getRFIPriorityColor,
} from '@/types/rfi'
import { ResponseTypeBadge } from './ResponseTypeBadge'

// =============================================
// Types
// =============================================

interface RFIRegisterEntry {
  id: string
  rfi_number: number
  subject: string
  status: RFIStatus
  priority: RFIPriority
  response_type: RFIResponseType | null
  date_submitted: string | null
  date_required: string | null
  date_responded: string | null
  ball_in_court: string | null
  ball_in_court_role: BallInCourtRole | null
  discipline: string | null
  days_open: number | null
  days_overdue: number
  is_overdue: boolean
  is_internal: boolean
  cost_impact: number | null
  schedule_impact_days: number | null
}

interface RFIRegisterProps {
  rfis: RFIRegisterEntry[]
  onRFIClick?: (id: string) => void
  onExport?: () => void
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Aging indicator for RFIs
 */
function AgingBadge({ daysOpen, isOverdue }: { daysOpen: number | null; isOverdue: boolean }) {
  if (daysOpen === null) {return <span className="text-disabled">-</span>}

  let colorClass = 'bg-success-light text-green-800'
  if (isOverdue) {
    colorClass = 'bg-error-light text-red-800'
  } else if (daysOpen > 14) {
    colorClass = 'bg-orange-100 text-orange-800'
  } else if (daysOpen > 7) {
    colorClass = 'bg-warning-light text-yellow-800'
  }

  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colorClass)}>
      {daysOpen}d
    </span>
  )
}

/**
 * Status badge for RFI
 */
function StatusBadge({ status }: { status: RFIStatus }) {
  const color = getRFIStatusColor(status)
  const config = RFI_STATUSES.find(s => s.value === status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-muted text-foreground',
    blue: 'bg-info-light text-blue-800',
    yellow: 'bg-warning-light text-yellow-800',
    green: 'bg-success-light text-green-800',
    red: 'bg-error-light text-red-800',
    slate: 'bg-slate-100 text-slate-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[color])}>
      {config?.label || status}
    </Badge>
  )
}

/**
 * Priority indicator
 */
function PriorityIndicator({ priority }: { priority: RFIPriority }) {
  const colors: Record<RFIPriority, string> = {
    low: 'bg-green-500',
    normal: 'bg-blue-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  }

  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full', colors[priority])}
      title={priority.charAt(0).toUpperCase() + priority.slice(1)}
    />
  )
}

/**
 * Impact indicator
 */
function ImpactIndicator({ cost, schedule }: { cost: number | null; schedule: number | null }) {
  const hasCost = cost !== null && cost > 0
  const hasSchedule = schedule !== null && schedule > 0

  if (!hasCost && !hasSchedule) {return <span className="text-disabled">-</span>}

  return (
    <div className="flex items-center gap-1">
      {hasCost && (
        <span className="text-xs text-orange-600" title={`Cost: $${cost?.toLocaleString()}`}>
          $
        </span>
      )}
      {hasSchedule && (
        <span className="text-xs text-error" title={`Schedule: ${schedule}d`}>
          {schedule}d
        </span>
      )}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * RFI Register - Industry standard RFI log view
 *
 * Features:
 * - Aging report (days open, overdue)
 * - Ball-in-court summary by role
 * - Cost/schedule impact totals
 * - Filterable by status, priority, ball-in-court
 * - Export capability
 *
 * @example
 * ```tsx
 * <RFIRegister
 *   rfis={rfis}
 *   onRFIClick={(id) => navigate(`/rfis/${id}`)}
 *   onExport={() => exportToExcel(rfis)}
 * />
 * ```
 */
export function RFIRegister({
  rfis,
  onRFIClick,
  onExport,
  className,
}: RFIRegisterProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')
  const [bicFilter, setBicFilter] = React.useState<string>('all')

  // Filter RFIs
  const filteredRFIs = React.useMemo(() => {
    return rfis.filter((r) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !r.subject.toLowerCase().includes(searchLower) &&
          !formatRFINumber(r.rfi_number).toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) {
        return false
      }

      // Ball-in-court filter
      if (bicFilter !== 'all' && r.ball_in_court_role !== bicFilter) {
        return false
      }

      return true
    })
  }, [rfis, search, statusFilter, priorityFilter, bicFilter])

  // Summary stats
  const stats = React.useMemo(() => {
    const open = filteredRFIs.filter(r => !['closed', 'responded', 'rejected'].includes(r.status))
    const overdue = filteredRFIs.filter(r => r.is_overdue)
    const totalCost = filteredRFIs.reduce((sum, r) => sum + (r.cost_impact || 0), 0)
    const totalSchedule = filteredRFIs.reduce((sum, r) => sum + (r.schedule_impact_days || 0), 0)

    // Ball-in-court summary
    const bicSummary: Record<string, number> = {}
    open.forEach((r) => {
      const role = r.ball_in_court_role || 'unassigned'
      bicSummary[role] = (bicSummary[role] || 0) + 1
    })

    return {
      total: filteredRFIs.length,
      open: open.length,
      overdue: overdue.length,
      totalCost,
      totalSchedule,
      bicSummary,
    }
  }, [filteredRFIs])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold heading-section">RFI Register</h2>
          <p className="text-sm text-muted">
            {stats.total} RFIs | {stats.open} open | {stats.overdue} overdue
            {stats.totalCost > 0 && ` | $${stats.totalCost.toLocaleString()} cost impact`}
            {stats.totalSchedule > 0 && ` | ${stats.totalSchedule}d schedule impact`}
          </p>
        </div>
        {onExport && (
          <Button variant="outline" onClick={onExport} size="sm">
            Export to Excel
          </Button>
        )}
      </div>

      {/* Ball-in-Court Summary */}
      {Object.keys(stats.bicSummary).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.bicSummary)
            .sort((a, b) => b[1] - a[1])
            .map(([role, count]) => {
              const config = BALL_IN_COURT_ROLES.find(r => r.value === role)
              return (
                <Button
                  key={role}
                  variant={bicFilter === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBicFilter(bicFilter === role ? 'all' : role)}
                >
                  {config?.label || role}: {count}
                </Button>
              )
            })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search RFIs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {RFI_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {RFI_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aging Legend */}
      <div className="flex items-center gap-4 text-xs text-secondary">
        <span>Aging:</span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-success-light text-green-800 rounded">0-7d</span> Good
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-warning-light text-yellow-800 rounded">7-14d</span> Watch
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded">14d+</span> Aging
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-error-light text-red-800 rounded">Overdue</span> Past Due
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-8">P</th>
                <th className="px-3 py-2 text-left font-medium">RFI No.</th>
                <th className="px-3 py-2 text-left font-medium min-w-[200px]">Subject</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Response</th>
                <th className="px-3 py-2 text-left font-medium">Submitted</th>
                <th className="px-3 py-2 text-left font-medium">Required</th>
                <th className="px-3 py-2 text-center font-medium">Days</th>
                <th className="px-3 py-2 text-left font-medium">Ball-in-Court</th>
                <th className="px-3 py-2 text-center font-medium">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRFIs.map((rfi) => (
                <tr
                  key={rfi.id}
                  className={cn(
                    'hover:bg-surface cursor-pointer',
                    rfi.is_overdue && 'bg-error-light'
                  )}
                  onClick={() => onRFIClick?.(rfi.id)}
                >
                  <td className="px-3 py-2">
                    <PriorityIndicator priority={rfi.priority} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatRFINumber(rfi.rfi_number)}
                    {rfi.is_internal && (
                      <span className="ml-1 text-disabled" title="Internal RFI">(I)</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="line-clamp-2">{rfi.subject}</div>
                    {rfi.discipline && (
                      <div className="text-xs text-muted">{rfi.discipline}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={rfi.status} />
                  </td>
                  <td className="px-3 py-2">
                    <ResponseTypeBadge responseType={rfi.response_type} size="sm" />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {rfi.date_submitted
                      ? new Date(rfi.date_submitted).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {rfi.date_required
                      ? new Date(rfi.date_required).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <AgingBadge daysOpen={rfi.days_open} isOverdue={rfi.is_overdue} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {rfi.ball_in_court || '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ImpactIndicator cost={rfi.cost_impact} schedule={rfi.schedule_impact_days} />
                  </td>
                </tr>
              ))}
              {filteredRFIs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted">
                    No RFIs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RFIRegister
