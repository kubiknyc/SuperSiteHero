/**
 * My Assignments View
 * Tabbed view showing all subcontractor assignments: Punch Items, RFIs, Documents, Payments
 * Milestone 4.1: Mobile-Optimized Portal UI
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  MessageSquare,
  FileText,
  DollarSign,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { SwipeableListItem, createCompleteAction } from '@/components/ui/swipeable-list-item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  useSubcontractorPunchItems,
  useSubcontractorTasks,
  useSubcontractorAssignmentCounts,
  useSubcontractorRFIs,
  useSubcontractorDocuments,
  useSubcontractorPayments,
} from '../hooks'
import { useSubcontractorPunchActions } from '@/features/punch-lists/hooks/useSubcontractorPunchActions'
import { formatDistanceToNow, format } from 'date-fns'

type TabType = 'punch' | 'rfis' | 'documents' | 'payments'
type SortOption = 'newest' | 'oldest' | 'priority' | 'due_date'
type FilterStatus = 'all' | 'open' | 'in_progress' | 'completed'

interface TabConfig {
  id: TabType
  label: string
  icon: React.ReactNode
  count?: number
}

interface AssignmentItemProps {
  id: string
  title: string
  subtitle?: string
  status: string
  priority?: string
  dueDate?: string
  hasPhotos?: boolean
  onClick: () => void
  onComplete?: () => void
}

function AssignmentItem({
  id,
  title,
  subtitle,
  status,
  priority,
  dueDate,
  hasPhotos,
  onClick,
  onComplete,
}: AssignmentItemProps) {
  const isOverdue = dueDate && new Date(dueDate) < new Date()

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'in_progress':
      case 'ready_for_review':
        return <Clock className="h-4 w-4 text-warning" />
      default:
        return <Circle className="h-4 w-4 text-disabled" />
    }
  }

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical':
        return 'bg-error-light text-error-dark border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-warning-light text-yellow-700 border-yellow-200'
      default:
        return 'bg-muted text-secondary border-border'
    }
  }

  const content = (
    <div
      className="flex items-center gap-3 p-4 bg-card border-b border-border active:bg-surface"
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground truncate heading-card">
            {title}
          </h4>
          {hasPhotos && (
            <Camera className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted truncate mt-0.5">
            {subtitle}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {priority && priority !== 'low' && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getPriorityColor())}>
              {priority}
            </Badge>
          )}
          {dueDate && (
            <span className={cn(
              'text-[10px]',
              isOverdue ? 'text-error font-medium' : 'text-muted'
            )}>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {formatDistanceToNow(new Date(dueDate), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-disabled flex-shrink-0" />
    </div>
  )

  if (onComplete && status !== 'completed' && status !== 'verified') {
    return (
      <SwipeableListItem
        rightActions={[createCompleteAction(onComplete)]}
      >
        {content}
      </SwipeableListItem>
    )
  }

  return content
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages: Record<TabType, { title: string; description: string }> = {
    punch: {
      title: 'No Punch Items',
      description: 'You have no punch items assigned to you.',
    },
    rfis: {
      title: 'No RFIs',
      description: 'You have no RFIs requiring your attention.',
    },
    documents: {
      title: 'No Documents',
      description: 'No documents are pending your review.',
    },
    payments: {
      title: 'No Payments',
      description: 'No payment information available.',
    },
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-disabled" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1 heading-subsection">
        {messages[tab].title}
      </h3>
      <p className="text-xs text-muted">
        {messages[tab].description}
      </p>
    </div>
  )
}

export function MyAssignments() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('punch')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch data
  const { data: punchItems, isLoading: loadingPunch, refetch: refetchPunch } = useSubcontractorPunchItems()
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useSubcontractorTasks()
  const { data: assignmentCounts, refetch: refetchCounts } = useSubcontractorAssignmentCounts()
  const { data: rfis, isLoading: loadingRFIs, refetch: refetchRFIs } = useSubcontractorRFIs()
  const { data: documents, isLoading: loadingDocuments, refetch: refetchDocuments } = useSubcontractorDocuments()
  const { data: payments, isLoading: loadingPayments, refetch: refetchPayments } = useSubcontractorPayments()
  const { requestStatusChange } = useSubcontractorPunchActions()

  // Tab configurations with counts
  const tabs: TabConfig[] = [
    {
      id: 'punch',
      label: 'Punch Items',
      icon: <ClipboardList className="h-4 w-4" />,
      count: punchItems?.filter(p => ['open', 'in_progress'].includes(p.status)).length || 0,
    },
    {
      id: 'rfis',
      label: 'RFIs',
      icon: <MessageSquare className="h-4 w-4" />,
      count: assignmentCounts?.rfis || 0,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="h-4 w-4" />,
      count: assignmentCounts?.documents || 0,
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: <DollarSign className="h-4 w-4" />,
      count: assignmentCounts?.payments || 0,
    },
  ]

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchPunch(),
      refetchTasks(),
      refetchCounts(),
      refetchRFIs(),
      refetchDocuments(),
      refetchPayments(),
    ])
  }, [refetchPunch, refetchTasks, refetchCounts, refetchRFIs, refetchDocuments, refetchPayments])

  // Filter and sort punch items
  const filteredPunchItems = (punchItems || [])
    .filter(item => {
      if (filterStatus === 'all') {return true}
      return item.status === filterStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'priority': {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 3)
        }
        case 'due_date':
          if (!a.due_date) {return 1}
          if (!b.due_date) {return -1}
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        default: // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const handlePunchItemComplete = async (punchItemId: string) => {
    await requestStatusChange(punchItemId, 'completed', 'Marked as complete from mobile')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'punch':
        if (loadingPunch) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )
        }
        if (!filteredPunchItems.length) {
          return <EmptyState tab="punch" />
        }
        return (
          <div className="divide-y divide-gray-100">
            {filteredPunchItems.map(item => (
              <AssignmentItem
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={item.location_notes || item.area || item.room}
                status={item.status}
                priority={item.priority}
                dueDate={item.due_date}
                hasPhotos={(item.photo_count || 0) > 0}
                onClick={() => navigate(`/portal/punch-items/${item.id}`)}
                onComplete={() => handlePunchItemComplete(item.id)}
              />
            ))}
          </div>
        )
      case 'rfis':
        if (loadingRFIs) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )
        }
        if (!rfis?.length) {
          return <EmptyState tab="rfis" />
        }
        return (
          <div className="divide-y divide-gray-100">
            {rfis.map(rfi => (
              <AssignmentItem
                key={rfi.id}
                id={rfi.id}
                title={`RFI #${rfi.rfi_number || 'N/A'}: ${rfi.title}`}
                subtitle={rfi.project_name}
                status={rfi.status}
                priority={rfi.priority || undefined}
                dueDate={rfi.due_date || undefined}
                onClick={() => navigate(`/portal/rfis/${rfi.id}`)}
              />
            ))}
          </div>
        )
      case 'documents':
        if (loadingDocuments) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )
        }
        if (!documents?.length) {
          return <EmptyState tab="documents" />
        }
        return (
          <div className="divide-y divide-gray-100">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-4 bg-card border-b border-border active:bg-surface cursor-pointer"
                onClick={() => window.open(doc.file_url, '_blank')}
              >
                <div className="flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate heading-card">
                    {doc.name}
                  </h4>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {doc.project_name} • {doc.category || 'Document'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {doc.file_size && (
                      <span className="text-[10px] text-muted">
                        {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                    <span className="text-[10px] text-muted">
                      Shared {formatDistanceToNow(new Date(doc.shared_at), { addSuffix: true })}
                    </span>
                    {doc.expires_at && (
                      <span className="text-[10px] text-warning">
                        Expires {formatDistanceToNow(new Date(doc.expires_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-disabled flex-shrink-0" />
              </div>
            ))}
          </div>
        )
      case 'payments':
        if (loadingPayments) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )
        }
        if (!payments?.length) {
          return <EmptyState tab="payments" />
        }
        return (
          <div className="divide-y divide-gray-100">
            {payments.map(payment => {
              const statusColors: Record<string, string> = {
                draft: 'bg-muted text-secondary',
                submitted: 'bg-blue-100 text-blue-700',
                approved: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-700',
                paid: 'bg-emerald-100 text-emerald-700',
              }
              return (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 p-4 bg-card border-b border-border active:bg-surface cursor-pointer"
                  onClick={() => navigate(`/portal/payments/${payment.id}`)}
                >
                  <div className="flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate heading-card">
                      Pay App #{payment.application_number || 'N/A'}
                    </h4>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {payment.project_name}
                      {payment.period_from && payment.period_to && (
                        <> • {format(new Date(payment.period_from), 'MMM d')} - {format(new Date(payment.period_to), 'MMM d, yyyy')}</>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColors[payment.status] || '')}>
                        {payment.status.replace('_', ' ')}
                      </Badge>
                      {payment.current_payment_due != null && (
                        <span className="text-[10px] text-muted">
                          ${payment.current_payment_due.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-disabled flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground heading-page">My Assignments</h1>
          <div className="flex items-center gap-2">
            {/* Sort Button */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-auto h-8 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Sheet */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Filter
                  {filterStatus !== 'all' && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      1
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[300px]">
                <SheetHeader>
                  <SheetTitle>Filter Assignments</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary mb-2 block">
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['all', 'open', 'in_progress', 'completed'] as FilterStatus[]).map(status => (
                        <Button
                          key={status}
                          variant={filterStatus === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFilterStatus(status)}
                          className="justify-start"
                        >
                          {status === 'all' ? 'All' : status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFilterStatus('all')
                        setShowFilters(false)
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setShowFilters(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap',
                'border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-secondary'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant={activeTab === tab.id ? 'default' : 'secondary'}
                  className="ml-1 h-5 px-1.5 text-[10px]"
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content with Pull to Refresh */}
      <PullToRefresh
        onRefresh={handleRefresh}
        className="flex-1 overflow-auto"
      >
        {renderContent()}
      </PullToRefresh>
    </div>
  )
}

export default MyAssignments
