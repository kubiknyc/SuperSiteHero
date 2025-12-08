// File: src/features/closeout/components/CloseoutDocumentList.tsx
// Closeout document register/list for project closeout tracking

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
import { Progress } from '@/components/ui/progress'
import type {
  CloseoutDocumentWithDetails,
  CloseoutStatus,
  CloseoutDocumentType,
  CloseoutCategory,
  CloseoutStatistics,
} from '@/types/closeout'
import {
  CLOSEOUT_DOCUMENT_TYPES,
  CLOSEOUT_STATUSES,
  getCloseoutDocumentTypeLabel,
  getCloseoutDocumentCategory,
  getCloseoutStatusColor,
  groupDocumentsByCategory,
} from '@/types/closeout'

// =============================================
// Types
// =============================================

interface CloseoutDocumentListProps {
  documents: CloseoutDocumentWithDetails[]
  statistics?: CloseoutStatistics | null
  onDocumentClick?: (doc: CloseoutDocumentWithDetails) => void
  onCreateDocument?: () => void
  onExport?: () => void
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Status badge for closeout documents
 */
function CloseoutStatusBadge({ status }: { status: CloseoutStatus }) {
  const config = CLOSEOUT_STATUSES.find((s) => s.value === status)
  const color = getCloseoutStatusColor(status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    slate: 'bg-slate-100 text-slate-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[color])}>
      {config?.label || status}
    </Badge>
  )
}

/**
 * Category badge
 */
function CategoryBadge({ category }: { category: CloseoutCategory }) {
  const categoryLabels: Record<CloseoutCategory, string> = {
    documentation: 'Documentation',
    training: 'Training',
    inspection: 'Inspection',
    administrative: 'Administrative',
    warranty: 'Warranty',
    turnover: 'Turnover',
  }

  const categoryColors: Record<CloseoutCategory, string> = {
    documentation: 'bg-blue-100 text-blue-800',
    training: 'bg-purple-100 text-purple-800',
    inspection: 'bg-orange-100 text-orange-800',
    administrative: 'bg-gray-100 text-gray-800',
    warranty: 'bg-green-100 text-green-800',
    turnover: 'bg-teal-100 text-teal-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', categoryColors[category])}>
      {categoryLabels[category]}
    </Badge>
  )
}

/**
 * Due date indicator
 */
function DueDateIndicator({ dueDate, status }: { dueDate: string | null; status: CloseoutStatus }) {
  if (!dueDate) return <span className="text-gray-400">-</span>

  if (['approved', 'waived', 'not_required', 'na'].includes(status)) {
    return <span className="text-xs text-gray-500">{new Date(dueDate).toLocaleDateString()}</span>
  }

  const date = new Date(dueDate)
  const today = new Date()
  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntil < 0

  let colorClass = 'text-gray-600'
  if (isOverdue) {
    colorClass = 'text-red-600 font-medium'
  } else if (daysUntil <= 7) {
    colorClass = 'text-orange-600'
  } else if (daysUntil <= 14) {
    colorClass = 'text-yellow-600'
  }

  return (
    <span className={cn('text-xs', colorClass)}>
      {date.toLocaleDateString()}
      {isOverdue && <span className="ml-1">({Math.abs(daysUntil)}d late)</span>}
    </span>
  )
}

// =============================================
// Statistics Card
// =============================================

function CloseoutStatsCard({ stats }: { stats: CloseoutStatistics }) {
  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Closeout Progress</span>
          <span className="font-medium">{stats.completion_percentage}%</span>
        </div>
        <Progress value={stats.completion_percentage} className="h-3" />
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-700">{stats.total_documents}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending_count}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{stats.by_status.submitted || 0}</div>
          <div className="text-xs text-gray-500">Submitted</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{stats.approved_count}</div>
          <div className="text-xs text-gray-500">Approved</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-700">{stats.rejected_count}</div>
          <div className="text-xs text-gray-500">Rejected</div>
        </div>
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-slate-700">{stats.required_count}</div>
          <div className="text-xs text-gray-500">Required</div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Grouped View Component
// =============================================

interface GroupedDocumentsProps {
  documents: CloseoutDocumentWithDetails[]
  onDocumentClick?: (doc: CloseoutDocumentWithDetails) => void
}

function GroupedDocuments({ documents, onDocumentClick }: GroupedDocumentsProps) {
  const grouped = groupDocumentsByCategory(documents)
  const categories: CloseoutCategory[] = ['documentation', 'inspection', 'administrative', 'warranty', 'training', 'turnover']

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryDocs = grouped[category] || []
        if (categoryDocs.length === 0) return null

        const approved = categoryDocs.filter((d) => d.status === 'approved').length
        const total = categoryDocs.length

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryBadge category={category} />
                <span className="text-sm text-gray-500">
                  {approved}/{total} complete
                </span>
              </div>
            </div>

            <div className="border rounded-lg divide-y">
              {categoryDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    'p-3 flex items-center gap-4',
                    'hover:bg-gray-50 cursor-pointer',
                    doc.status === 'rejected' && 'bg-red-50'
                  )}
                  onClick={() => onDocumentClick?.(doc)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{doc.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{getCloseoutDocumentTypeLabel(doc.document_type)}</span>
                      {doc.spec_section && <span>| {doc.spec_section}</span>}
                      {doc.subcontractor?.company_name && (
                        <span>| {doc.subcontractor.company_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <CloseoutStatusBadge status={doc.status} />
                    <div className="text-xs">
                      <DueDateIndicator dueDate={doc.required_date} status={doc.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * Closeout Document List/Register Component
 *
 * Features:
 * - Progress tracking with percentage
 * - Grouped by category view
 * - Filter by status, type, spec section
 * - Due date tracking
 * - Export capability
 *
 * @example
 * ```tsx
 * <CloseoutDocumentList
 *   documents={closeoutDocs}
 *   statistics={closeoutStats}
 *   onDocumentClick={(doc) => openDocumentDialog(doc)}
 *   onCreateDocument={() => setShowCreateDialog(true)}
 * />
 * ```
 */
export function CloseoutDocumentList({
  documents,
  statistics,
  onDocumentClick,
  onCreateDocument,
  onExport,
  className,
}: CloseoutDocumentListProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [viewMode, setViewMode] = React.useState<'list' | 'grouped'>('grouped')

  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !(doc.title.toLowerCase().includes(searchLower) ||
            doc.spec_section?.toLowerCase().includes(searchLower) ||
            doc.subcontractor?.company_name?.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false
      }

      // Category filter
      if (categoryFilter !== 'all' && getCloseoutDocumentCategory(doc.document_type) !== categoryFilter) {
        return false
      }

      return true
    })
  }, [documents, search, statusFilter, categoryFilter])

  // Status counts for quick filters
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    documents.forEach((doc) => {
      counts[doc.status] = (counts[doc.status] || 0) + 1
    })
    return counts
  }, [documents])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Closeout Documents</h2>
          <p className="text-sm text-gray-500">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grouped')}
              className="rounded-none"
            >
              Grouped
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              List
            </Button>
          </div>
          {onCreateDocument && (
            <Button onClick={onCreateDocument} size="sm">
              Add Document
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
      {statistics && <CloseoutStatsCard stats={statistics} />}

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All ({documents.length})
        </Button>
        {CLOSEOUT_STATUSES.filter((s) => statusCounts[s.value]).map((status) => (
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
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="documentation">Documentation</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="administrative">Administrative</SelectItem>
            <SelectItem value="warranty">Warranty</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="turnover">Turnover</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents View */}
      {viewMode === 'grouped' ? (
        <GroupedDocuments documents={filteredDocuments} onDocumentClick={onDocumentClick} />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Title</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Spec Section</th>
                  <th className="px-3 py-2 text-left font-medium">Responsible</th>
                  <th className="px-3 py-2 text-left font-medium">Due Date</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      'hover:bg-gray-50 cursor-pointer',
                      doc.status === 'rejected' && 'bg-red-50'
                    )}
                    onClick={() => onDocumentClick?.(doc)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{doc.title}</div>
                      {doc.description && (
                        <div className="text-xs text-gray-500 line-clamp-1">{doc.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {getCloseoutDocumentTypeLabel(doc.document_type)}
                    </td>
                    <td className="px-3 py-2">
                      <CategoryBadge category={getCloseoutDocumentCategory(doc.document_type)} />
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {doc.spec_section || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {doc.subcontractor?.company_name || doc.responsible_party || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <DueDateIndicator dueDate={doc.required_date} status={doc.status} />
                    </td>
                    <td className="px-3 py-2">
                      <CloseoutStatusBadge status={doc.status} />
                    </td>
                  </tr>
                ))}
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                      No closeout documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default CloseoutDocumentList
