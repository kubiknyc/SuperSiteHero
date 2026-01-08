/**
 * Change Order Audit Log Component
 *
 * Displays a comprehensive timeline of all modifications made to a change order.
 * Shows who made changes, when, and what was modified.
 */

import { useState, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  History,
  User,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  FileEdit,
  CheckCircle2,
  XCircle,
  ArrowUp,
  MessageSquare,
  Paperclip,
  UserPlus,
  UserMinus,
  Trash2,
  RotateCcw,
  DollarSign,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useChangeOrderAuditLog,
  useAuditLogStats,
  type AuditAction,
  type AuditLogEntry,
  formatCurrency,
  formatFieldName,
  formatStatus,
} from '../hooks/useChangeOrderAuditLog'

// ============================================================================
// Types
// ============================================================================

interface ChangeOrderAuditLogProps {
  changeOrderId: string
  maxHeight?: string
  showStats?: boolean
  showFilters?: boolean
}

interface AuditEntryProps {
  entry: AuditLogEntry
  isExpanded: boolean
  onToggle: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActionIcon(action: AuditAction) {
  switch (action) {
    case 'created':
      return FileEdit
    case 'updated':
      return RefreshCw
    case 'status_changed':
      return RefreshCw
    case 'amount_changed':
      return DollarSign
    case 'approved':
      return CheckCircle2
    case 'rejected':
      return XCircle
    case 'escalated':
      return ArrowUp
    case 'comment_added':
      return MessageSquare
    case 'attachment_added':
      return Paperclip
    case 'attachment_removed':
      return Paperclip
    case 'assigned':
      return UserPlus
    case 'unassigned':
      return UserMinus
    case 'deleted':
      return Trash2
    case 'restored':
      return RotateCcw
    default:
      return History
  }
}

function getActionColor(action: AuditAction): string {
  switch (action) {
    case 'created':
      return 'text-blue-600 bg-blue-100'
    case 'approved':
      return 'text-green-600 bg-green-100'
    case 'rejected':
      return 'text-red-600 bg-red-100'
    case 'escalated':
      return 'text-orange-600 bg-orange-100'
    case 'amount_changed':
      return 'text-purple-600 bg-purple-100'
    case 'status_changed':
      return 'text-indigo-600 bg-indigo-100'
    case 'deleted':
      return 'text-red-600 bg-red-100'
    case 'restored':
      return 'text-green-600 bg-green-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

function getActionLabel(action: AuditAction): string {
  switch (action) {
    case 'created':
      return 'Created'
    case 'updated':
      return 'Updated'
    case 'status_changed':
      return 'Status Changed'
    case 'amount_changed':
      return 'Amount Changed'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'escalated':
      return 'Escalated'
    case 'comment_added':
      return 'Comment'
    case 'attachment_added':
      return 'Attachment Added'
    case 'attachment_removed':
      return 'Attachment Removed'
    case 'assigned':
      return 'Assigned'
    case 'unassigned':
      return 'Unassigned'
    case 'deleted':
      return 'Deleted'
    case 'restored':
      return 'Restored'
    default:
      return 'Modified'
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function AuditEntry({ entry, isExpanded, onToggle }: AuditEntryProps) {
  const ActionIcon = getActionIcon(entry.action)
  const actionColor = getActionColor(entry.action)
  const hasDetails =
    entry.previousValue !== undefined ||
    entry.newValue !== undefined ||
    entry.metadata

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline connector */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border last:hidden" />

      {/* Icon */}
      <div
        className={cn(
          'absolute left-0 top-0 rounded-full p-1.5',
          actionColor
        )}
      >
        <ActionIcon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{entry.description}</span>
              <Badge variant="outline" className="text-xs">
                {getActionLabel(entry.action)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span>{entry.performedByName || entry.performedBy}</span>
              <span>-</span>
              <Clock className="h-3 w-3" />
              <span title={format(new Date(entry.performedAt), 'PPpp')}>
                {formatDistanceToNow(new Date(entry.performedAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && hasDetails && (
          <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
            {entry.fieldName && (
              <div>
                <span className="text-muted-foreground">Field: </span>
                <span className="font-medium">{formatFieldName(entry.fieldName)}</span>
              </div>
            )}
            {entry.previousValue !== undefined && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">From: </span>
                <span className="line-through text-red-600">
                  {entry.fieldName?.includes('amount')
                    ? formatCurrency(entry.previousValue)
                    : entry.fieldName === 'status'
                    ? formatStatus(entry.previousValue)
                    : String(entry.previousValue)}
                </span>
              </div>
            )}
            {entry.newValue !== undefined && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">To: </span>
                <span className="font-medium text-green-600">
                  {entry.fieldName?.includes('amount')
                    ? formatCurrency(entry.newValue)
                    : entry.fieldName === 'status'
                    ? formatStatus(entry.newValue)
                    : String(entry.newValue)}
                </span>
              </div>
            )}
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <div>
                <span className="text-muted-foreground">Additional Info: </span>
                <pre className="text-xs mt-1 p-2 bg-background rounded">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AuditStats({ changeOrderId }: { changeOrderId: string }) {
  const stats = useAuditLogStats(changeOrderId)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{stats.totalEntries}</div>
        <div className="text-xs text-muted-foreground">Total Changes</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.approvals}</div>
        <div className="text-xs text-muted-foreground">Approvals</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{stats.amountChanges}</div>
        <div className="text-xs text-muted-foreground">Amount Changes</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.uniqueUsers}</div>
        <div className="text-xs text-muted-foreground">Contributors</div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ChangeOrderAuditLog({
  changeOrderId,
  maxHeight = '500px',
  showStats = true,
  showFilters = true,
}: ChangeOrderAuditLogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const { data: auditLog, isLoading, error, refetch } = useChangeOrderAuditLog(
    changeOrderId,
    actionFilter ? { action: actionFilter } : undefined
  )

  // Filter by search query
  const filteredLog = useMemo(() => {
    if (!auditLog) return []
    if (!searchQuery.trim()) return auditLog

    const query = searchQuery.toLowerCase()
    return auditLog.filter(
      (entry) =>
        entry.description.toLowerCase().includes(query) ||
        entry.performedByName?.toLowerCase().includes(query) ||
        entry.fieldName?.toLowerCase().includes(query)
    )
  }, [auditLog, searchQuery])

  const toggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedEntries(new Set(filteredLog.map((e) => e.id)))
  }

  const collapseAll = () => {
    setExpandedEntries(new Set())
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-error">
          Failed to load audit log. Please try again.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {showStats && <AuditStats changeOrderId={changeOrderId} />}

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={actionFilter || '__all__'}
              onValueChange={(value) => setActionFilter(value === '__all__' ? '' : value as AuditAction | '')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="status_changed">Status Changed</SelectItem>
                <SelectItem value="amount_changed">Amount Changed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="comment_added">Comments</SelectItem>
                <SelectItem value="attachment_added">Attachments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Expand/Collapse Controls */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filteredLog.length} {filteredLog.length === 1 ? 'entry' : 'entries'}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No audit entries found</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try adjusting your search</p>
            )}
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-1">
              {filteredLog.map((entry) => (
                <AuditEntry
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedEntries.has(entry.id)}
                  onToggle={() => toggleEntry(entry.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default ChangeOrderAuditLog
