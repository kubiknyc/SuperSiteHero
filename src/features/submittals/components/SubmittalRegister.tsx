// File: src/features/submittals/components/SubmittalRegister.tsx
// Submittal Register/Log View - Industry-standard submittal tracking

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
import type { SubmittalReviewStatus, SubmittalApprovalCode } from '@/types/submittal'
import { SUBMITTAL_REVIEW_STATUSES, SUBMITTAL_APPROVAL_CODES, formatSubmittalNumber, getSubmittalStatusColor } from '@/types/submittal'
import { ApprovalCodeBadge } from './ApprovalCodeBadge'

// =============================================
// Types
// =============================================

interface SubmittalRegisterEntry {
  id: string
  submittal_number: string
  title: string
  spec_section: string | null
  status: SubmittalReviewStatus
  approval_code: SubmittalApprovalCode | null
  required_date: string | null
  submitted_date: string | null
  approved_date: string | null
  ball_in_court: string | null
  subcontractor_name: string | null
  days_in_review: number | null
  is_overdue: boolean
}

interface SubmittalRegisterProps {
  submittals: SubmittalRegisterEntry[]
  onSubmittalClick?: (id: string) => void
  onExport?: () => void
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Traffic light indicator for submittal status
 */
function TrafficLight({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }

  return (
    <span
      className={cn(
        'inline-block h-3 w-3 rounded-full',
        colors[status]
      )}
      title={status === 'green' ? 'On Track' : status === 'yellow' ? 'At Risk' : 'Overdue'}
    />
  )
}

/**
 * Get traffic light status based on dates and status
 */
function getTrafficLightStatus(entry: SubmittalRegisterEntry): 'green' | 'yellow' | 'red' {
  if (entry.is_overdue) {return 'red'}
  if (entry.status === 'approved' || entry.status === 'approved_as_noted') {return 'green'}

  // Check if approaching required date
  if (entry.required_date) {
    const required = new Date(entry.required_date)
    const today = new Date()
    const daysUntilRequired = Math.ceil((required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilRequired < 0) {return 'red'}
    if (daysUntilRequired <= 7) {return 'yellow'}
  }

  return 'green'
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: SubmittalReviewStatus }) {
  const color = getSubmittalStatusColor(status)
  const config = SUBMITTAL_REVIEW_STATUSES.find(s => s.value === status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[color])}>
      {config?.label || status}
    </Badge>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * Submittal Register - Industry standard submittal log view
 *
 * Features:
 * - Traffic light status indicators (green/yellow/red)
 * - Grouped by spec section
 * - Filterable by status, trade, ball-in-court
 * - Export capability
 *
 * @example
 * ```tsx
 * <SubmittalRegister
 *   submittals={submittals}
 *   onSubmittalClick={(id) => navigate(`/submittals/${id}`)}
 *   onExport={() => exportToExcel(submittals)}
 * />
 * ```
 */
export function SubmittalRegister({
  submittals,
  onSubmittalClick,
  onExport,
  className,
}: SubmittalRegisterProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [specDivision, setSpecDivision] = React.useState<string>('all')

  // Filter submittals
  const filteredSubmittals = React.useMemo(() => {
    return submittals.filter((s) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !s.title.toLowerCase().includes(searchLower) &&
          !s.submittal_number.toLowerCase().includes(searchLower) &&
          !s.spec_section?.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false
      }

      // Spec division filter (first 2 digits)
      if (specDivision !== 'all') {
        const division = s.spec_section?.substring(0, 2)
        if (division !== specDivision) {
          return false
        }
      }

      return true
    })
  }, [submittals, search, statusFilter, specDivision])

  // Group by spec section
  const groupedBySpec = React.useMemo(() => {
    const groups: Record<string, SubmittalRegisterEntry[]> = {}

    filteredSubmittals.forEach((s) => {
      const key = s.spec_section?.substring(0, 2) || 'Other'
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(s)
    })

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredSubmittals])

  // Get unique spec divisions for filter
  const specDivisions = React.useMemo(() => {
    const divisions = new Set<string>()
    submittals.forEach((s) => {
      if (s.spec_section) {
        divisions.add(s.spec_section.substring(0, 2))
      }
    })
    return Array.from(divisions).sort()
  }, [submittals])

  // Summary stats
  const stats = React.useMemo(() => ({
    total: filteredSubmittals.length,
    approved: filteredSubmittals.filter(s => s.status === 'approved' || s.status === 'approved_as_noted').length,
    pending: filteredSubmittals.filter(s => ['submitted', 'under_gc_review', 'submitted_to_architect'].includes(s.status)).length,
    overdue: filteredSubmittals.filter(s => s.is_overdue).length,
  }), [filteredSubmittals])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Submittal Register</h2>
          <p className="text-sm text-gray-500">
            {stats.total} submittals | {stats.approved} approved | {stats.pending} pending | {stats.overdue} overdue
          </p>
        </div>
        {onExport && (
          <Button variant="outline" onClick={onExport} size="sm">
            Export to Excel
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search submittals..."
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
            {SUBMITTAL_REVIEW_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specDivision} onValueChange={setSpecDivision}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {specDivisions.map((d) => (
              <SelectItem key={d} value={d}>Division {d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Traffic Light Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><TrafficLight status="green" /> On Track</span>
        <span className="flex items-center gap-1.5"><TrafficLight status="yellow" /> At Risk</span>
        <span className="flex items-center gap-1.5"><TrafficLight status="red" /> Overdue</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-8"></th>
                <th className="px-3 py-2 text-left font-medium">No.</th>
                <th className="px-3 py-2 text-left font-medium">Spec</th>
                <th className="px-3 py-2 text-left font-medium min-w-[200px]">Description</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Code</th>
                <th className="px-3 py-2 text-left font-medium">Required</th>
                <th className="px-3 py-2 text-left font-medium">Submitted</th>
                <th className="px-3 py-2 text-left font-medium">Ball-in-Court</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedBySpec.map(([division, entries]) => (
                <React.Fragment key={division}>
                  {/* Division header */}
                  <tr className="bg-gray-100">
                    <td colSpan={9} className="px-3 py-1.5 font-medium text-gray-700">
                      Division {division}
                    </td>
                  </tr>
                  {/* Entries */}
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={cn(
                        'hover:bg-gray-50 cursor-pointer',
                        entry.is_overdue && 'bg-red-50'
                      )}
                      onClick={() => onSubmittalClick?.(entry.id)}
                    >
                      <td className="px-3 py-2">
                        <TrafficLight status={getTrafficLightStatus(entry)} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {entry.submittal_number}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {entry.spec_section || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="line-clamp-2">{entry.title}</div>
                        {entry.subcontractor_name && (
                          <div className="text-xs text-gray-500">{entry.subcontractor_name}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-3 py-2">
                        <ApprovalCodeBadge code={entry.approval_code} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {entry.required_date
                          ? new Date(entry.required_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {entry.submitted_date
                          ? new Date(entry.submitted_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {entry.ball_in_court || '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {filteredSubmittals.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No submittals found
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

export default SubmittalRegister
