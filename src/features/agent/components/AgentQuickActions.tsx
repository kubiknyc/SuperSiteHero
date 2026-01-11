/**
 * Agent Quick Actions
 * Displays suggested quick action buttons with context-awareness and categories
 */

import React, { useMemo } from 'react'
import {
  FileText,
  Search,
  Calendar,
  FileStack,
  ListTodo,
  HelpCircle,
  Route,
  PenLine,
  AlertTriangle,
  DollarSign,
  Users,
  CloudSun,
  HardHat,
  ClipboardCheck,
  Sparkles,
  Clock,
  TrendingUp,
  MessageSquare,
  BarChart2,
  Wrench,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  command: string
  category: QuickActionCategory
  tags?: string[]
  isNew?: boolean
  isPremium?: boolean
}

export type QuickActionCategory =
  | 'report'
  | 'search'
  | 'rfi'
  | 'document'
  | 'safety'
  | 'cost'
  | 'schedule'
  | 'general'

interface AgentQuickActionsProps {
  onAction: (command: string) => void
  variant?: 'grid' | 'list' | 'chips' | 'carousel'
  showAll?: boolean
  category?: QuickActionCategory
  projectId?: string
  maxItems?: number
}

interface CategoryConfig {
  label: string
  icon: React.ReactNode
  color: string
}

// ============================================================================
// Category Configuration
// ============================================================================

const CATEGORY_CONFIG: Record<QuickActionCategory, CategoryConfig> = {
  report: {
    label: 'Reports',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  search: {
    label: 'Search',
    icon: <Search className="h-4 w-4" />,
    color: 'text-purple-500',
  },
  rfi: {
    label: 'RFIs',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-orange-500',
  },
  document: {
    label: 'Documents',
    icon: <FileStack className="h-4 w-4" />,
    color: 'text-cyan-500',
  },
  safety: {
    label: 'Safety',
    icon: <HardHat className="h-4 w-4" />,
    color: 'text-yellow-500',
  },
  cost: {
    label: 'Cost',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-emerald-500',
  },
  schedule: {
    label: 'Schedule',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-indigo-500',
  },
  general: {
    label: 'General',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-gray-500',
  },
}

// ============================================================================
// Quick Actions Data
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  // Report actions
  {
    id: 'summarize_today',
    label: 'Summarize today',
    description: "Get a summary of today's activities and progress",
    icon: <FileText className="h-4 w-4" />,
    command: "Summarize today's daily reports and activities",
    category: 'report',
    tags: ['daily', 'summary'],
  },
  {
    id: 'weekly_status',
    label: 'Weekly status',
    description: 'Generate comprehensive weekly report',
    icon: <Calendar className="h-4 w-4" />,
    command: 'Generate a weekly status report for this project',
    category: 'report',
    tags: ['weekly', 'status'],
  },
  {
    id: 'extract_actions',
    label: 'Extract actions',
    description: 'Find action items from recent reports',
    icon: <ListTodo className="h-4 w-4" />,
    command: 'Extract action items from recent daily reports',
    category: 'report',
    tags: ['actions', 'tasks'],
  },
  {
    id: 'progress_metrics',
    label: 'Progress metrics',
    description: 'View project progress and KPIs',
    icon: <TrendingUp className="h-4 w-4" />,
    command: 'Show me the current project progress metrics and KPIs',
    category: 'report',
    tags: ['metrics', 'kpi'],
    isNew: true,
  },

  // Search actions
  {
    id: 'find_open_rfis',
    label: 'Open RFIs',
    description: 'Find all open RFIs in this project',
    icon: <Search className="h-4 w-4" />,
    command: 'Find all open RFIs in this project',
    category: 'search',
    tags: ['rfi', 'open'],
  },
  {
    id: 'search_documents',
    label: 'Search documents',
    description: 'Search across all project documents',
    icon: <FileStack className="h-4 w-4" />,
    command: 'Search project documents for ',
    category: 'search',
    tags: ['documents', 'files'],
  },
  {
    id: 'find_overdue',
    label: 'Find overdue items',
    description: 'Show all overdue tasks and items',
    icon: <Clock className="h-4 w-4" />,
    command: 'Find all overdue items including RFIs, submittals, and tasks',
    category: 'search',
    tags: ['overdue', 'late'],
  },

  // RFI actions
  {
    id: 'route_rfi',
    label: 'Route RFI',
    description: 'Get routing recommendation for RFI',
    icon: <Route className="h-4 w-4" />,
    command: 'Suggest routing for RFI ',
    category: 'rfi',
    tags: ['route', 'assign'],
  },
  {
    id: 'draft_rfi',
    label: 'Draft RFI response',
    description: 'Generate draft response for RFI',
    icon: <PenLine className="h-4 w-4" />,
    command: 'Draft a response for RFI ',
    category: 'rfi',
    tags: ['draft', 'response'],
  },
  {
    id: 'rfi_status',
    label: 'RFI status overview',
    description: 'View RFI status and aging',
    icon: <BarChart2 className="h-4 w-4" />,
    command: 'Show me the RFI status overview and aging report',
    category: 'rfi',
    tags: ['status', 'aging'],
  },

  // Document actions
  {
    id: 'process_documents',
    label: 'Process documents',
    description: 'Classify and process new uploads',
    icon: <FileStack className="h-4 w-4" />,
    command: 'Process and classify any unprocessed documents',
    category: 'document',
    tags: ['classify', 'process'],
  },
  {
    id: 'compare_revisions',
    label: 'Compare revisions',
    description: 'Compare document revisions',
    icon: <FileText className="h-4 w-4" />,
    command: 'Compare the latest revisions of ',
    category: 'document',
    tags: ['compare', 'revisions'],
  },

  // Safety actions
  {
    id: 'safety_checklist',
    label: 'Safety checklist',
    description: 'Generate safety checklist for today',
    icon: <ClipboardCheck className="h-4 w-4" />,
    command: "Generate a safety checklist for today's work activities",
    category: 'safety',
    tags: ['checklist', 'safety'],
  },
  {
    id: 'hazard_assessment',
    label: 'Hazard assessment',
    description: 'Identify potential hazards',
    icon: <AlertTriangle className="h-4 w-4" />,
    command: "Identify potential safety hazards for today's scheduled work",
    category: 'safety',
    tags: ['hazard', 'risk'],
  },

  // Cost actions
  {
    id: 'budget_variance',
    label: 'Budget variance',
    description: 'Analyze budget vs actual costs',
    icon: <DollarSign className="h-4 w-4" />,
    command: 'Analyze the current budget variance and cost trends',
    category: 'cost',
    tags: ['budget', 'variance'],
  },
  {
    id: 'change_order_impact',
    label: 'Change order impact',
    description: 'Assess change order impacts',
    icon: <TrendingUp className="h-4 w-4" />,
    command: 'Analyze the impact of pending change orders on the budget',
    category: 'cost',
    tags: ['change order', 'impact'],
  },

  // Schedule actions
  {
    id: 'delay_analysis',
    label: 'Delay analysis',
    description: 'Identify schedule delays and impacts',
    icon: <Clock className="h-4 w-4" />,
    command: 'Analyze current schedule delays and their impact on completion',
    category: 'schedule',
    tags: ['delay', 'schedule'],
  },
  {
    id: 'weather_impact',
    label: 'Weather forecast',
    description: 'Weather impact on schedule',
    icon: <CloudSun className="h-4 w-4" />,
    command: 'Get weather forecast and assess impact on upcoming work',
    category: 'schedule',
    tags: ['weather', 'forecast'],
  },
  {
    id: 'upcoming_inspections',
    label: 'Upcoming inspections',
    description: 'View scheduled inspections',
    icon: <ClipboardCheck className="h-4 w-4" />,
    command: 'Show upcoming inspections and their status',
    category: 'schedule',
    tags: ['inspection', 'schedule'],
  },

  // General actions
  {
    id: 'help',
    label: 'What can you do?',
    description: 'Learn about capabilities',
    icon: <HelpCircle className="h-4 w-4" />,
    command: 'What can you help me with?',
    category: 'general',
    tags: ['help', 'capabilities'],
  },
  {
    id: 'contractor_performance',
    label: 'Contractor performance',
    description: 'Evaluate contractor performance',
    icon: <Users className="h-4 w-4" />,
    command: 'Evaluate the performance of contractors on this project',
    category: 'general',
    tags: ['contractor', 'performance'],
  },
  {
    id: 'risk_assessment',
    label: 'Risk assessment',
    description: 'Assess project risks',
    icon: <AlertTriangle className="h-4 w-4" />,
    command: 'Perform a risk assessment for this project',
    category: 'general',
    tags: ['risk', 'assessment'],
  },
]

// ============================================================================
// Component
// ============================================================================

export function AgentQuickActions({
  onAction,
  variant = 'grid',
  showAll = false,
  category,
  projectId,
  maxItems = 6,
}: AgentQuickActionsProps) {
  // Filter actions by category if specified
  const filteredActions = useMemo(() => {
    let actions = QUICK_ACTIONS

    if (category) {
      actions = actions.filter((a) => a.category === category)
    }

    if (!showAll) {
      actions = actions.slice(0, maxItems)
    }

    return actions
  }, [category, showAll, maxItems])

  if (variant === 'chips') {
    return (
      <div className="flex flex-wrap gap-2">
        {filteredActions.map((action) => (
          <Button
            key={action.id}
            variant="secondary"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => onAction(action.command)}
          >
            <span className={CATEGORY_CONFIG[action.category].color}>
              {action.icon}
            </span>
            {action.label}
            {action.isNew && (
              <Badge variant="default" className="text-[10px] px-1 py-0 ml-1">
                New
              </Badge>
            )}
          </Button>
        ))}
      </div>
    )
  }

  if (variant === 'carousel') {
    return (
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {filteredActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className={cn(
                'flex flex-col items-center gap-1 h-auto py-3 px-4 min-w-[100px]',
                'hover:bg-primary/5 hover:border-primary/30'
              )}
              onClick={() => onAction(action.command)}
            >
              <span className={CATEGORY_CONFIG[action.category].color}>
                {action.icon}
              </span>
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-1">
        {filteredActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start h-auto py-2.5 px-3"
            onClick={() => onAction(action.command)}
          >
            <span className="flex items-center gap-3 w-full">
              <span
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  'bg-primary/10'
                )}
              >
                <span className={CATEGORY_CONFIG[action.category].color}>
                  {action.icon}
                </span>
              </span>
              <span className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-medium text-sm flex items-center gap-2">
                  {action.label}
                  {action.isNew && (
                    <Badge variant="default" className="text-[10px] px-1 py-0">
                      New
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {action.description}
                </span>
              </span>
            </span>
          </Button>
        ))}
      </div>
    )
  }

  // Default: grid variant
  return (
    <div className="grid grid-cols-2 gap-2">
      {filteredActions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          className={cn(
            'h-auto py-3 px-3 flex flex-col items-start gap-1.5',
            'hover:bg-primary/5 hover:border-primary/30'
          )}
          onClick={() => onAction(action.command)}
        >
          <span className="flex items-center gap-2 w-full">
            <span className={CATEGORY_CONFIG[action.category].color}>
              {action.icon}
            </span>
            <span className="font-medium text-sm flex-1 text-left">
              {action.label}
            </span>
            {action.isNew && (
              <Badge variant="default" className="text-[10px] px-1 py-0">
                New
              </Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground text-left line-clamp-2">
            {action.description}
          </span>
        </Button>
      ))}
    </div>
  )
}

// ============================================================================
// Context-Aware Quick Actions
// ============================================================================

interface ContextQuickActionsProps {
  entityType?: string
  entityId?: string
  entityName?: string
  onAction: (command: string) => void
  variant?: 'chips' | 'buttons'
}

export function ContextQuickActions({
  entityType,
  entityId,
  entityName,
  onAction,
  variant = 'chips',
}: ContextQuickActionsProps) {
  // Generate context-aware actions based on current entity
  const contextActions = useMemo(() => {
    const actions: QuickAction[] = []
    const name = entityName || entityId || 'this item'

    if (entityType === 'rfi' || entityType === 'workflow_item') {
      actions.push(
        {
          id: 'route_rfi',
          label: 'Suggest routing',
          description: 'Get routing recommendation',
          icon: <Route className="h-4 w-4" />,
          command: `Suggest routing for this RFI`,
          category: 'rfi',
        },
        {
          id: 'draft_response',
          label: 'Draft response',
          description: 'Generate draft answer',
          icon: <PenLine className="h-4 w-4" />,
          command: `Draft a response to this RFI`,
          category: 'rfi',
        },
        {
          id: 'find_related',
          label: 'Find related',
          description: 'Find related RFIs and documents',
          icon: <Search className="h-4 w-4" />,
          command: `Find items related to this RFI`,
          category: 'search',
        }
      )
    }

    if (entityType === 'document') {
      actions.push(
        {
          id: 'classify_document',
          label: 'Classify',
          description: 'Auto-classify this document',
          icon: <FileStack className="h-4 w-4" />,
          command: `Classify this document`,
          category: 'document',
        },
        {
          id: 'find_related',
          label: 'Find related',
          description: 'Find related items',
          icon: <Search className="h-4 w-4" />,
          command: `Find items related to this document`,
          category: 'search',
        },
        {
          id: 'summarize',
          label: 'Summarize',
          description: 'Generate document summary',
          icon: <FileText className="h-4 w-4" />,
          command: `Summarize this document`,
          category: 'document',
        }
      )
    }

    if (entityType === 'daily_report') {
      actions.push(
        {
          id: 'summarize_report',
          label: 'Summarize',
          description: 'Generate AI summary',
          icon: <FileText className="h-4 w-4" />,
          command: `Summarize this daily report`,
          category: 'report',
        },
        {
          id: 'extract_actions',
          label: 'Extract actions',
          description: 'Find action items',
          icon: <ListTodo className="h-4 w-4" />,
          command: `Extract action items from this report`,
          category: 'report',
        },
        {
          id: 'compare_previous',
          label: 'Compare to yesterday',
          description: 'Compare with previous report',
          icon: <BarChart2 className="h-4 w-4" />,
          command: `Compare this report with yesterday's report`,
          category: 'report',
        }
      )
    }

    if (entityType === 'project') {
      actions.push(
        {
          id: 'project_status',
          label: 'Project status',
          description: 'Get overall project status',
          icon: <Building2 className="h-4 w-4" />,
          command: `Give me a complete status overview for ${name}`,
          category: 'report',
        },
        {
          id: 'risk_assessment',
          label: 'Risk assessment',
          description: 'Assess project risks',
          icon: <AlertTriangle className="h-4 w-4" />,
          command: `Perform a risk assessment for ${name}`,
          category: 'general',
        },
        {
          id: 'upcoming_milestones',
          label: 'Upcoming milestones',
          description: 'View upcoming milestones',
          icon: <Calendar className="h-4 w-4" />,
          command: `Show upcoming milestones for ${name}`,
          category: 'schedule',
        }
      )
    }

    if (entityType === 'submittal') {
      actions.push(
        {
          id: 'track_submittal',
          label: 'Track status',
          description: 'View submittal tracking',
          icon: <ClipboardCheck className="h-4 w-4" />,
          command: `Track the status of this submittal`,
          category: 'document',
        },
        {
          id: 'find_related_specs',
          label: 'Find specs',
          description: 'Find related specifications',
          icon: <Search className="h-4 w-4" />,
          command: `Find specifications related to this submittal`,
          category: 'search',
        }
      )
    }

    if (entityType === 'punch_item') {
      actions.push(
        {
          id: 'suggest_resolution',
          label: 'Suggest resolution',
          description: 'Get resolution suggestions',
          icon: <Wrench className="h-4 w-4" />,
          command: `Suggest how to resolve this punch item`,
          category: 'general',
        },
        {
          id: 'find_similar',
          label: 'Find similar',
          description: 'Find similar punch items',
          icon: <Search className="h-4 w-4" />,
          command: `Find similar punch items in this project`,
          category: 'search',
        }
      )
    }

    return actions
  }, [entityType, entityId, entityName])

  if (contextActions.length === 0) {
    return null
  }

  if (variant === 'buttons') {
    return (
      <div className="flex flex-wrap gap-2">
        {contextActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5',
              'hover:bg-primary/5 hover:border-primary/30'
            )}
            onClick={() => onAction(action.command)}
          >
            <span className={CATEGORY_CONFIG[action.category].color}>
              {action.icon}
            </span>
            {action.label}
          </Button>
        ))}
      </div>
    )
  }

  // Chips variant (default)
  return (
    <div className="flex flex-wrap gap-2">
      {contextActions.map((action) => (
        <Button
          key={action.id}
          variant="secondary"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => onAction(action.command)}
        >
          <span className={CATEGORY_CONFIG[action.category].color}>
            {action.icon}
          </span>
          {action.label}
        </Button>
      ))}
    </div>
  )
}

// ============================================================================
// Categorized Quick Actions
// ============================================================================

interface CategorizedQuickActionsProps {
  onAction: (command: string) => void
  defaultCategory?: QuickActionCategory
  showCategoryTabs?: boolean
}

export function CategorizedQuickActions({
  onAction,
  defaultCategory,
  showCategoryTabs = true,
}: CategorizedQuickActionsProps) {
  const [activeCategory, setActiveCategory] = React.useState<QuickActionCategory | undefined>(
    defaultCategory
  )

  const categories = useMemo(() => {
    const cats = new Set(QUICK_ACTIONS.map((a) => a.category))
    return Array.from(cats)
  }, [])

  const filteredActions = useMemo(() => {
    if (!activeCategory) {return QUICK_ACTIONS.slice(0, 8)}
    return QUICK_ACTIONS.filter((a) => a.category === activeCategory)
  }, [activeCategory])

  return (
    <div className="space-y-3">
      {showCategoryTabs && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <Button
            variant={!activeCategory ? 'secondary' : 'ghost'}
            size="sm"
            className="shrink-0"
            onClick={() => setActiveCategory(undefined)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'secondary' : 'ghost'}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setActiveCategory(cat)}
            >
              <span className={CATEGORY_CONFIG[cat].color}>
                {CATEGORY_CONFIG[cat].icon}
              </span>
              {CATEGORY_CONFIG[cat].label}
            </Button>
          ))}
        </div>
      )}

      <AgentQuickActions
        onAction={onAction}
        variant="grid"
        category={activeCategory}
        showAll={!!activeCategory}
        maxItems={activeCategory ? 20 : 8}
      />
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { QUICK_ACTIONS, CATEGORY_CONFIG }
export type { QuickActionCategory as ActionCategory }
