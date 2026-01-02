/**
 * Stat Drilldown Panel
 * Modal panel showing filtered items when clicking dashboard stats
 * Provides inline expansion instead of full page navigation
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  ClipboardList,
  AlertCircle,
  ListChecks,
  Shield,
  FileText,
  ChevronRight,
  Clock,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Filter,
} from 'lucide-react'
import { getStatusVariant } from '@/lib/theme/tokens'

// ============================================================================
// Types
// ============================================================================

export type DrilldownType = 'tasks' | 'rfis' | 'punch_items' | 'submittals' | 'safety' | 'change_orders'

export interface DrilldownItem {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  dueDate?: string
  projectId: string
  projectName: string
  assignedTo?: string
  createdAt: string
  isOverdue?: boolean
  additionalInfo?: Record<string, any>
}

export interface StatDrilldownPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: DrilldownType
  title: string
  projectId?: string
  filter?: 'all' | 'overdue' | 'pending' | 'open' | 'in_progress'
}

// ============================================================================
// Type Configuration
// ============================================================================

const typeConfig: Record<DrilldownType, {
  icon: typeof ClipboardList
  color: string
  tabs: { value: string; label: string }[]
  baseUrl: string
}> = {
  tasks: {
    icon: ClipboardList,
    color: '#1E40AF',
    tabs: [
      { value: 'all', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'overdue', label: 'Overdue' },
    ],
    baseUrl: '/tasks',
  },
  rfis: {
    icon: AlertCircle,
    color: '#D97706',
    tabs: [
      { value: 'all', label: 'All Open' },
      { value: 'pending_response', label: 'Pending Response' },
      { value: 'overdue', label: 'Overdue' },
    ],
    baseUrl: '/rfis',
  },
  punch_items: {
    icon: ListChecks,
    color: '#8B5CF6',
    tabs: [
      { value: 'all', label: 'All Open' },
      { value: 'ready_for_review', label: 'Ready for Review' },
      { value: 'in_progress', label: 'In Progress' },
    ],
    baseUrl: '/punch-lists',
  },
  submittals: {
    icon: FileText,
    color: '#06B6D4',
    tabs: [
      { value: 'all', label: 'All Pending' },
      { value: 'under_review', label: 'Under Review' },
      { value: 'overdue', label: 'Overdue' },
    ],
    baseUrl: '/submittals',
  },
  safety: {
    icon: Shield,
    color: '#10B981',
    tabs: [
      { value: 'all', label: 'All Incidents' },
      { value: 'open', label: 'Open' },
      { value: 'under_investigation', label: 'Under Investigation' },
    ],
    baseUrl: '/safety',
  },
  change_orders: {
    icon: FileText,
    color: '#EF4444',
    tabs: [
      { value: 'all', label: 'All Pending' },
      { value: 'pending_approval', label: 'Awaiting Approval' },
      { value: 'submitted', label: 'Submitted' },
    ],
    baseUrl: '/change-orders',
  },
}

// ============================================================================
// Data Fetching
// ============================================================================

function useDrilldownData(type: DrilldownType, projectId?: string, filter?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['drilldown', type, projectId, filter, userProfile?.company_id],
    queryFn: async (): Promise<DrilldownItem[]> => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }

      let query
      let items: DrilldownItem[] = []

      switch (type) {
        case 'tasks':
          query = supabase
            .from('tasks')
            .select(`
              id, title, description, status, priority, due_date, created_at,
              project_id, project:projects(name),
              assigned_to_user:users!tasks_assigned_to_user_id_fkey(first_name, last_name)
            `)
            .is('deleted_at', null)
            .neq('status', 'completed')

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          if (filter === 'pending') {
            query = query.eq('status', 'pending')
          } else if (filter === 'in_progress') {
            query = query.eq('status', 'in_progress')
          } else if (filter === 'overdue') {
            query = query.lt('due_date', new Date().toISOString()).neq('status', 'completed')
          }

          const { data: tasksData } = await query.order('due_date', { ascending: true }).limit(50)

          items = (tasksData || []).map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.due_date,
            projectId: task.project_id,
            projectName: (task.project as any)?.name || 'Unknown',
            assignedTo: task.assigned_to_user
              ? `${(task.assigned_to_user as any).first_name} ${(task.assigned_to_user as any).last_name}`
              : undefined,
            createdAt: task.created_at,
            isOverdue: task.due_date ? isPast(new Date(task.due_date)) : false,
          }))
          break

        case 'rfis':
          query = supabase
            .from('rfis')
            .select(`
              id, rfi_number, subject, question, status, priority, date_required, created_at,
              project_id, project:projects(name),
              ball_in_court_user:users!rfis_ball_in_court_fkey(first_name, last_name)
            `)
            .eq('company_id', userProfile.company_id)
            .is('deleted_at', null)
            .not('status', 'in', '("closed","void")')

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          if (filter === 'pending_response') {
            query = query.eq('status', 'pending_response')
          } else if (filter === 'overdue') {
            query = query.lt('date_required', new Date().toISOString()).not('status', 'in', '("closed","void")')
          }

          const { data: rfisData } = await query.order('date_required', { ascending: true }).limit(50)

          items = (rfisData || []).map((rfi) => ({
            id: rfi.id,
            title: `RFI ${rfi.rfi_number}: ${rfi.subject}`,
            description: rfi.question?.substring(0, 150),
            status: rfi.status,
            priority: rfi.priority,
            dueDate: rfi.date_required,
            projectId: rfi.project_id,
            projectName: (rfi.project as any)?.name || 'Unknown',
            assignedTo: rfi.ball_in_court_user
              ? `${(rfi.ball_in_court_user as any).first_name} ${(rfi.ball_in_court_user as any).last_name}`
              : undefined,
            createdAt: rfi.created_at,
            isOverdue: rfi.date_required ? isPast(new Date(rfi.date_required)) : false,
          }))
          break

        case 'punch_items':
          query = supabase
            .from('punch_items')
            .select(`
              id, title, description, status, priority, due_date, created_at,
              project_id, project:projects(name),
              assigned_to_user:users!punch_items_assigned_to_fkey(first_name, last_name)
            `)
            .is('deleted_at', null)
            .not('status', 'in', '("completed","verified")')

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          if (filter === 'ready_for_review') {
            query = query.eq('status', 'ready_for_review')
          } else if (filter === 'in_progress') {
            query = query.eq('status', 'in_progress')
          }

          const { data: punchData } = await query.order('created_at', { ascending: false }).limit(50)

          items = (punchData || []).map((punch) => ({
            id: punch.id,
            title: punch.title,
            description: punch.description,
            status: punch.status,
            priority: punch.priority,
            dueDate: punch.due_date,
            projectId: punch.project_id,
            projectName: (punch.project as any)?.name || 'Unknown',
            assignedTo: punch.assigned_to_user
              ? `${(punch.assigned_to_user as any).first_name} ${(punch.assigned_to_user as any).last_name}`
              : undefined,
            createdAt: punch.created_at,
            isOverdue: punch.due_date ? isPast(new Date(punch.due_date)) : false,
          }))
          break

        case 'submittals':
          query = supabase
            .from('submittals')
            .select(`
              id, submittal_number, title, description, status, priority, required_date, created_at,
              spec_section,
              project_id, project:projects(name)
            `)
            .eq('company_id', userProfile.company_id)
            .is('deleted_at', null)
            .in('status', ['draft', 'pending', 'submitted', 'under_review'])

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          if (filter === 'under_review') {
            query = query.eq('status', 'under_review')
          } else if (filter === 'overdue') {
            query = query.lt('required_date', new Date().toISOString())
          }

          const { data: submittalsData } = await query.order('required_date', { ascending: true }).limit(50)

          items = (submittalsData || []).map((sub) => ({
            id: sub.id,
            title: `${sub.submittal_number}: ${sub.title}`,
            description: sub.description,
            status: sub.status,
            priority: sub.priority,
            dueDate: sub.required_date,
            projectId: sub.project_id,
            projectName: (sub.project as any)?.name || 'Unknown',
            createdAt: sub.created_at,
            isOverdue: sub.required_date ? isPast(new Date(sub.required_date)) : false,
            additionalInfo: { specSection: sub.spec_section },
          }))
          break

        case 'safety':
          query = supabase
            .from('safety_incidents')
            .select(`
              id, incident_number, title, description, status, severity, incident_date, created_at,
              project_id, project:projects(name)
            `)
            .eq('company_id', userProfile.company_id)
            .is('deleted_at', null)

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          if (filter === 'open') {
            query = query.eq('status', 'open')
          } else if (filter === 'under_investigation') {
            query = query.eq('status', 'under_investigation')
          }

          const { data: safetyData } = await query.order('incident_date', { ascending: false }).limit(50)

          items = (safetyData || []).map((incident) => ({
            id: incident.id,
            title: incident.title || `Incident ${incident.incident_number}`,
            description: incident.description,
            status: incident.status,
            priority: incident.severity,
            dueDate: incident.incident_date,
            projectId: incident.project_id,
            projectName: (incident.project as any)?.name || 'Unknown',
            createdAt: incident.created_at,
          }))
          break

        case 'change_orders':
          query = supabase
            .from('change_orders')
            .select(`
              id, co_number, title, description, status, proposed_amount, created_at,
              project_id, project:projects(name)
            `)
            .is('deleted_at', null)
            .in('status', ['draft', 'pending', 'submitted', 'pending_approval'])

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          if (filter === 'pending_approval') {
            query = query.eq('status', 'pending_approval')
          } else if (filter === 'submitted') {
            query = query.eq('status', 'submitted')
          }

          const { data: coData } = await query.order('created_at', { ascending: false }).limit(50)

          items = (coData || []).map((co) => ({
            id: co.id,
            title: `CO ${co.co_number}: ${co.title}`,
            description: co.description,
            status: co.status,
            projectId: co.project_id,
            projectName: (co.project as any)?.name || 'Unknown',
            createdAt: co.created_at,
            additionalInfo: { proposedAmount: co.proposed_amount },
          }))
          break
      }

      return items
    },
    enabled: !!userProfile?.company_id,
  })
}

// ============================================================================
// Component
// ============================================================================

export function StatDrilldownPanel({
  open,
  onOpenChange,
  type,
  title,
  projectId,
  filter: initialFilter = 'all',
}: StatDrilldownPanelProps) {
  const [activeTab, setActiveTab] = useState(initialFilter)
  const config = typeConfig[type]
  const Icon = config.icon

  const { data: items, isLoading } = useDrilldownData(
    type,
    projectId,
    activeTab === 'all' ? undefined : activeTab
  )

  // Count items by tab
  const tabCounts = useMemo(() => {
    if (!items) return {}

    return config.tabs.reduce((acc, tab) => {
      if (tab.value === 'all') {
        acc[tab.value] = items.length
      } else if (tab.value === 'overdue') {
        acc[tab.value] = items.filter((item) => item.isOverdue).length
      } else {
        acc[tab.value] = items.filter((item) => item.status === tab.value).length
      }
      return acc
    }, {} as Record<string, number>)
  }, [items, config.tabs])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-[600px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color: config.color }} />
            </div>
            <div>
              <SheetTitle className="text-lg">{title}</SheetTitle>
              <SheetDescription>
                {items?.length || 0} items found
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-3 border-b bg-slate-50">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-white">
              {config.tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-slate-100"
                >
                  {tab.label}
                  {tabCounts[tab.value] !== undefined && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {tabCounts[tab.value]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-3">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border bg-white">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))
            ) : items && items.length > 0 ? (
              items.map((item) => (
                <DrilldownItemCard
                  key={item.id}
                  item={item}
                  type={type}
                  baseUrl={config.baseUrl}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Icon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-muted-foreground">No items found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-slate-50">
          <Button asChild variant="outline" className="w-full gap-2">
            <Link to={config.baseUrl}>
              View All in {title}
              <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Item Card Component
// ============================================================================

interface DrilldownItemCardProps {
  item: DrilldownItem
  type: DrilldownType
  baseUrl: string
}

function DrilldownItemCard({ item, type, baseUrl }: DrilldownItemCardProps) {
  const statusVariant = getStatusVariant(item.status)

  return (
    <Link
      to={`${baseUrl}/${item.id}`}
      className="block p-4 rounded-lg border bg-white hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.isOverdue && (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary">
              {item.title}
            </h4>
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={statusVariant} className="text-[10px]">
              {item.status.replace(/_/g, ' ')}
            </Badge>

            {item.priority && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  item.priority === 'urgent' && 'border-red-300 text-red-700 bg-red-50',
                  item.priority === 'high' && 'border-orange-300 text-orange-700 bg-orange-50'
                )}
              >
                {item.priority}
              </Badge>
            )}

            <span className="flex items-center gap-1 text-muted-foreground">
              <Building2 className="w-3 h-3" />
              {item.projectName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {item.dueDate && (
              <span className={cn(
                'flex items-center gap-1',
                item.isOverdue && 'text-red-600 font-medium'
              )}>
                <Clock className="w-3 h-3" />
                {item.isOverdue ? 'Overdue: ' : 'Due: '}
                {format(new Date(item.dueDate), 'MMM d, yyyy')}
              </span>
            )}

            {item.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {item.assignedTo}
              </span>
            )}

            {item.additionalInfo?.proposedAmount && (
              <span className="font-medium text-foreground">
                ${item.additionalInfo.proposedAmount.toLocaleString()}
              </span>
            )}

            {item.additionalInfo?.specSection && (
              <span>
                Spec: {item.additionalInfo.specSection}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  )
}

export default StatDrilldownPanel
