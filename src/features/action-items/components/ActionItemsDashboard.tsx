/**
 * Action Items Dashboard
 *
 * Cross-meeting action item tracking with status overview,
 * urgency alerts, and pipeline management.
 */

import { useState, useMemo } from 'react'
import {
  useProjectActionItems,
  useActionItemSummary,
  useActionItemsByAssignee,
  useOverdueActionItems,
  useActionItemsDueSoon,
  useEscalatedActionItems,
  useUpdateActionItemStatus,
  useConvertToTask,
} from '../hooks/useActionItems'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  ArrowRight,
  ListTodo,
  Users,
  TrendingUp,
  Calendar,
  Link2,
  Play,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type {
  ActionItemWithContext,
  ActionItemStatus,
  ActionItemCategory,
  UrgencyStatus,
} from '@/types/action-items'
import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_CATEGORIES,
  getUrgencyStatusConfig,
  getActionItemPriorityConfig,
} from '@/types/action-items'

interface ActionItemsDashboardProps {
  projectId: string
}

export function ActionItemsDashboard({ projectId }: ActionItemsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ActionItemStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ActionItemCategory | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'due-soon' | 'escalated'>('all')

  // Queries
  const { data: summary, isLoading: summaryLoading } = useActionItemSummary(projectId)
  const { data: byAssignee } = useActionItemsByAssignee(projectId)
  const { data: allItems, isLoading: itemsLoading } = useProjectActionItems(projectId, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: searchQuery || undefined,
  })
  const { data: overdueItems } = useOverdueActionItems(projectId, 20)
  const { data: dueSoonItems } = useActionItemsDueSoon(projectId, 20)
  const { data: escalatedItems } = useEscalatedActionItems(projectId, 20)

  // Get items for current tab
  const displayItems = useMemo(() => {
    switch (activeTab) {
      case 'overdue':
        return overdueItems || []
      case 'due-soon':
        return dueSoonItems || []
      case 'escalated':
        return escalatedItems || []
      default:
        return allItems || []
    }
  }, [activeTab, allItems, overdueItems, dueSoonItems, escalatedItems])

  const isLoading = summaryLoading || itemsLoading

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Open Items"
          value={summary?.open_items ?? 0}
          subtitle={`of ${summary?.total_items ?? 0} total`}
          icon={<Circle className="h-5 w-5" />}
          color="blue"
        />
        <SummaryCard
          title="Overdue"
          value={summary?.overdue_items ?? 0}
          subtitle="require attention"
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
          highlight={summary?.overdue_items ? summary.overdue_items > 0 : false}
        />
        <SummaryCard
          title="Completion Rate"
          value={`${summary?.completion_rate ?? 0}%`}
          subtitle="items completed"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <SummaryCard
          title="Escalated"
          value={summary?.escalated_items ?? 0}
          subtitle="need escalation"
          icon={<Clock className="h-5 w-5" />}
          color="orange"
        />
      </div>

      {/* Progress Bar */}
      {summary && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Overall Progress</span>
              <span className="font-medium">
                {summary.completed_items} of {summary.total_items} completed
              </span>
            </div>
            <Progress value={summary.completion_rate} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Action Items List (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search action items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ActionItemStatus | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {ACTION_ITEM_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ActionItemCategory | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {ACTION_ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({allItems?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-red-600">
                Overdue ({overdueItems?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="due-soon" className="text-orange-600">
                Due Soon ({dueSoonItems?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="escalated">
                Escalated ({escalatedItems?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="flex items-center justify-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading action items...
                    </div>
                  </CardContent>
                </Card>
              ) : displayItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-gray-500">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
                      <p className="font-medium">
                        {activeTab === 'all' ? 'No action items found' :
                         activeTab === 'overdue' ? 'No overdue items' :
                         activeTab === 'due-soon' ? 'No items due soon' :
                         'No escalated items'}
                      </p>
                      <p className="text-sm">
                        {activeTab === 'all' && searchQuery
                          ? 'Try a different search term'
                          : 'Great job keeping things on track!'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayItems.map((item) => (
                    <ActionItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar (1 column) */}
        <div className="space-y-4">
          {/* By Assignee */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                By Assignee
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!byAssignee || byAssignee.length === 0 ? (
                <p className="text-sm text-gray-500">No assignees yet</p>
              ) : (
                <div className="space-y-3">
                  {byAssignee.slice(0, 5).map((assignee, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {assignee.assignee}
                        </p>
                        {assignee.assigned_company && (
                          <p className="text-xs text-gray-500 truncate">
                            {assignee.assigned_company}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {assignee.open_items} open
                        </Badge>
                        {assignee.overdue_items > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {assignee.overdue_items} late
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">In Progress</span>
                <span className="font-medium">{summary?.in_progress_items ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Chronic Items (3+ carryovers)</span>
                <span className="font-medium text-red-600">{summary?.chronic_items ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completed This Week</span>
                <span className="font-medium text-green-600">
                  {/* Would need separate query */}
                  --
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
  highlight = false,
}: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'red' | 'orange'
  highlight?: boolean
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
  }

  return (
    <Card className={cn(highlight && 'border-red-300 bg-red-50/50')}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionItemRow({ item }: { item: ActionItemWithContext }) {
  const updateStatus = useUpdateActionItemStatus()
  const convertToTask = useConvertToTask()

  const urgencyConfig = getUrgencyStatusConfig(item.urgency_status)
  const priorityConfig = item.priority ? getActionItemPriorityConfig(item.priority) : null

  const handleComplete = () => {
    updateStatus.mutate({ id: item.id, status: 'completed' })
  }

  const handleStartProgress = () => {
    updateStatus.mutate({ id: item.id, status: 'in_progress' })
  }

  const handleConvertToTask = () => {
    convertToTask.mutate(item.id)
  }

  return (
    <Card className={cn(
      item.urgency_status === 'overdue' && 'border-red-200 bg-red-50/30',
      item.escalation_level > 0 && 'border-orange-200'
    )}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div className="mt-1">
            {item.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : item.status === 'in_progress' ? (
              <div className="h-5 w-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              </div>
            ) : (
              <Circle className="h-5 w-5 text-gray-300" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn(
                  'font-medium',
                  item.status === 'completed' && 'line-through text-gray-500'
                )}>
                  {item.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                  {item.meeting_title && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.meeting_title}
                    </span>
                  )}
                  {item.assigned_to && (
                    <span>• {item.assigned_to}</span>
                  )}
                  {item.task_id && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Link2 className="h-3 w-3" />
                      Task linked
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.status === 'open' && (
                    <DropdownMenuItem onClick={handleStartProgress}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Progress
                    </DropdownMenuItem>
                  )}
                  {item.status !== 'completed' && (
                    <DropdownMenuItem onClick={handleComplete}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {!item.task_id && (
                    <DropdownMenuItem onClick={handleConvertToTask}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Convert to Task
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Urgency */}
              {item.urgency_status !== 'completed' && item.urgency_status !== 'no_date' && (
                <Badge
                  variant={item.urgency_status === 'overdue' ? 'destructive' : 'secondary'}
                  className={cn(
                    'text-xs',
                    item.urgency_status === 'due_today' && 'bg-orange-100 text-orange-800',
                    item.urgency_status === 'due_soon' && 'bg-yellow-100 text-yellow-800',
                    item.urgency_status === 'on_track' && 'bg-green-100 text-green-800'
                  )}
                >
                  {urgencyConfig.label}
                  {item.days_until_due !== null && item.days_until_due < 0 && (
                    <span className="ml-1">({Math.abs(item.days_until_due)}d)</span>
                  )}
                </Badge>
              )}

              {/* Priority */}
              {priorityConfig && item.priority !== 'normal' && (
                <Badge variant="outline" className="text-xs">
                  {priorityConfig.label}
                </Badge>
              )}

              {/* Category */}
              {item.category && (
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              )}

              {/* Escalation */}
              {item.escalation_level > 0 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                  Escalated L{item.escalation_level}
                </Badge>
              )}

              {/* Carryover */}
              {item.carryover_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Carried {item.carryover_count}x
                </Badge>
              )}

              {/* Due date */}
              {item.due_date && (
                <span className="text-xs text-gray-500">
                  Due: {formatDate(item.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActionItemsDashboard
