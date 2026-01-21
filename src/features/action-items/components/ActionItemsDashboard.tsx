/**
 * Action Items Dashboard
 *
 * Cross-meeting action item tracking with status overview,
 * urgency alerts, and pipeline management.
 */

import { useState, useMemo, useCallback } from 'react'
import {
  useProjectActionItems,
  useActionItemSummary,
  useActionItemsByAssignee,
  useOverdueActionItems,
  useActionItemsDueSoon,
  useEscalatedActionItems,
} from '../hooks/useActionItems'
import { ActionItemRow } from './ActionItemRow'
import { SummaryCard } from './SummaryCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
  ListTodo,
  Users,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_CATEGORIES,
  type ActionItemStatus,
  type ActionItemCategory,
} from '@/types/action-items'

interface ActionItemsDashboardProps {
  projectId?: string
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

  // Memoized event handlers to prevent child re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v as ActionItemStatus | 'all')
  }, [])

  const handleCategoryFilterChange = useCallback((v: string) => {
    setCategoryFilter(v as ActionItemCategory | 'all')
  }, [])

  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v as typeof activeTab)
  }, [])

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
              <span className="text-muted">Overall Progress</span>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      placeholder="Search action items..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
                <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
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
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({allItems?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-error">
                Overdue ({overdueItems?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="due-soon" className="text-warning">
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
                    <div className="flex items-center justify-center text-muted">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading action items...
                    </div>
                  </CardContent>
                </Card>
              ) : displayItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success" />
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
                <p className="text-sm text-muted">No assignees yet</p>
              ) : (
                <div className="space-y-3">
                  {byAssignee.slice(0, 5).map((assignee, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {assignee.assignee}
                        </p>
                        {assignee.assigned_company && (
                          <p className="text-xs text-muted truncate">
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
                <span className="text-muted">In Progress</span>
                <span className="font-medium">{summary?.in_progress_items ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Chronic Items (3+ carryovers)</span>
                <span className="font-medium text-error">{summary?.chronic_items ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Completed This Week</span>
                <span className="font-medium text-success">
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

// Re-export for backward compatibility
export { ActionItemRow } from './ActionItemRow'
export default ActionItemsDashboard
