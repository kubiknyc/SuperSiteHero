// File: src/features/closeout/components/WarrantyList.tsx
// Warranty tracking list for project closeout

import * as React from 'react'
import { cn } from '@/lib/utils'
// Card imports available for future use
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
import {
  WARRANTY_TYPES,
  WARRANTY_STATUSES,
  getWarrantyStatusColor,
  getDaysUntilWarrantyExpiration,
  isWarrantyExpiringSoon,
  type WarrantyWithDetails,
  type WarrantyStatus,
  type WarrantyType,
  type WarrantyStatistics,
} from '@/types/closeout'

// =============================================
// Types
// =============================================

interface WarrantyListProps {
  warranties: WarrantyWithDetails[]
  statistics?: WarrantyStatistics | null
  onWarrantyClick?: (warranty: WarrantyWithDetails) => void
  onCreateWarranty?: () => void
  onExport?: () => void
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Warranty status badge
 */
function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  const config = WARRANTY_STATUSES.find((s) => s.value === status)
  const color = getWarrantyStatusColor(status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-muted text-foreground',
    green: 'bg-success-light text-green-800',
    yellow: 'bg-warning-light text-yellow-800',
    red: 'bg-error-light text-red-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[color])}>
      {config?.label || status}
    </Badge>
  )
}

/**
 * Warranty type badge
 */
function WarrantyTypeBadge({ type }: { type: WarrantyType | null }) {
  if (!type) {return null}

  const config = WARRANTY_TYPES.find((t) => t.value === type)

  return (
    <Badge variant="outline" className="text-xs bg-blue-50 text-primary-hover">
      {config?.label || type}
    </Badge>
  )
}

/**
 * Expiration countdown display
 */
function ExpirationDisplay({ warranty }: { warranty: WarrantyWithDetails }) {
  const daysUntil = getDaysUntilWarrantyExpiration(warranty)
  const isExpiringSoon = isWarrantyExpiringSoon(warranty)
  const isExpired = daysUntil <= 0

  let colorClass = 'text-secondary'
  let bgClass = ''

  if (isExpired) {
    colorClass = 'text-error-dark font-medium'
    bgClass = 'bg-error-light px-2 py-0.5 rounded'
  } else if (isExpiringSoon) {
    colorClass = 'text-orange-700'
    bgClass = 'bg-orange-50 px-2 py-0.5 rounded'
  } else if (warranty.status === 'active') {
    colorClass = 'text-success-dark'
  }

  return (
    <div className="text-right">
      <div className="text-xs text-muted">
        {new Date(warranty.end_date).toLocaleDateString()}
      </div>
      {warranty.status === 'active' && (
        <div className={cn('text-xs', colorClass, bgClass)}>
          {isExpired ? (
            <span>Expired {Math.abs(daysUntil)}d ago</span>
          ) : daysUntil <= 365 ? (
            <span>{daysUntil}d remaining</span>
          ) : (
            <span>{Math.floor(daysUntil / 365)}y {daysUntil % 365}d</span>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// Statistics Card
// =============================================

function WarrantyStatsCard({ stats }: { stats: WarrantyStatistics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="text-center p-3 bg-surface rounded-lg">
        <div className="text-2xl font-bold text-secondary">{stats.total_warranties}</div>
        <div className="text-xs text-muted">Total</div>
      </div>
      <div className="text-center p-3 bg-success-light rounded-lg">
        <div className="text-2xl font-bold text-success-dark">{stats.active_count}</div>
        <div className="text-xs text-muted">Active</div>
      </div>
      <div className="text-center p-3 bg-orange-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-700">{stats.expiring_soon_count}</div>
        <div className="text-xs text-muted">Expiring Soon</div>
      </div>
      <div className="text-center p-3 bg-error-light rounded-lg">
        <div className="text-2xl font-bold text-error-dark">{stats.expired_count}</div>
        <div className="text-xs text-muted">Expired</div>
      </div>
    </div>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * Warranty List Component
 *
 * Features:
 * - Active warranty tracking
 * - Expiration countdown
 * - Filter by status and type
 * - Expiring soon highlighting
 *
 * @example
 * ```tsx
 * <WarrantyList
 *   warranties={projectWarranties}
 *   statistics={warrantyStats}
 *   onWarrantyClick={(w) => openWarrantyDialog(w)}
 *   onCreateWarranty={() => setShowCreateDialog(true)}
 * />
 * ```
 */
export function WarrantyList({
  warranties,
  statistics,
  onWarrantyClick,
  onCreateWarranty,
  onExport,
  className,
}: WarrantyListProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('active')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')

  // Filter warranties
  const filteredWarranties = React.useMemo(() => {
    return warranties.filter((w) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !(w.title.toLowerCase().includes(searchLower) ||
            w.manufacturer_name?.toLowerCase().includes(searchLower) ||
            w.subcontractor?.company_name?.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && w.status !== statusFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== 'all' && w.warranty_type !== typeFilter) {
        return false
      }

      return true
    })
  }, [warranties, search, statusFilter, typeFilter])

  // Sort: expiring soon first, then by end date
  const sortedWarranties = React.useMemo(() => {
    return [...filteredWarranties].sort((a, b) => {
      // Active warranties first
      if (a.status === 'active' && b.status !== 'active') {return -1}
      if (a.status !== 'active' && b.status === 'active') {return 1}

      // Then by end date (earliest first for active)
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    })
  }, [filteredWarranties])

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    warranties.forEach((w) => {
      counts[w.status] = (counts[w.status] || 0) + 1
    })
    return counts
  }, [warranties])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold heading-section">Warranties</h2>
          <p className="text-sm text-muted">
            {filteredWarranties.length} warrant{filteredWarranties.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div className="flex gap-2">
          {onCreateWarranty && (
            <Button onClick={onCreateWarranty} size="sm">
              Add Warranty
            </Button>
          )}
          {onExport && (
            <Button variant="outline" onClick={onExport} size="sm">
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {statistics && <WarrantyStatsCard stats={statistics} />}

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All ({warranties.length})
        </Button>
        {WARRANTY_STATUSES.filter((s) => statusCounts[s.value]).map((status) => (
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
          placeholder="Search warranties..."
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
            {WARRANTY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Warranties Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium min-w-[200px]">Title</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Manufacturer</th>
                <th className="px-3 py-2 text-left font-medium">Subcontractor</th>
                <th className="px-3 py-2 text-left font-medium">Duration</th>
                <th className="px-3 py-2 text-left font-medium">Start Date</th>
                <th className="px-3 py-2 text-right font-medium">Expiration</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedWarranties.map((warranty) => {
                const isExpiringSoon = isWarrantyExpiringSoon(warranty)
                const isExpired = getDaysUntilWarrantyExpiration(warranty) <= 0

                return (
                  <tr
                    key={warranty.id}
                    className={cn(
                      'hover:bg-surface cursor-pointer',
                      isExpired && warranty.status === 'active' && 'bg-error-light',
                      isExpiringSoon && 'bg-orange-50'
                    )}
                    onClick={() => onWarrantyClick?.(warranty)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{warranty.title}</div>
                      {warranty.spec_section && (
                        <div className="text-xs text-muted">{warranty.spec_section}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <WarrantyTypeBadge type={warranty.warranty_type} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{warranty.manufacturer_name || '-'}</div>
                      {warranty.manufacturer_contact && (
                        <div className="text-muted">{warranty.manufacturer_contact}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {warranty.subcontractor?.company_name || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {warranty.duration_years ? `${warranty.duration_years}yr` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(warranty.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <ExpirationDisplay warranty={warranty} />
                    </td>
                    <td className="px-3 py-2">
                      <WarrantyStatusBadge status={warranty.status} />
                    </td>
                  </tr>
                )
              })}
              {sortedWarranties.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted">
                    No warranties found
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

export default WarrantyList
