/**
 * Agent Quick Actions
 * Displays suggested quick action buttons
 */

import React from 'react'
import {
  FileText,
  Search,
  Calendar,
  FileStack,
  ListTodo,
  HelpCircle,
  Route,
  PenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  command: string
  category: 'document' | 'report' | 'rfi' | 'search' | 'general'
}

interface AgentQuickActionsProps {
  onAction: (command: string) => void
  variant?: 'grid' | 'list'
  showAll?: boolean
}

// ============================================================================
// Quick Actions Data
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'summarize_today',
    label: 'Summarize today',
    description: "Get a summary of today's activities",
    icon: <FileText className="h-4 w-4" />,
    command: 'Summarize today\'s daily reports',
    category: 'report',
  },
  {
    id: 'find_open_rfis',
    label: 'Open RFIs',
    description: 'Find all open RFIs',
    icon: <Search className="h-4 w-4" />,
    command: 'Find all open RFIs in this project',
    category: 'rfi',
  },
  {
    id: 'weekly_status',
    label: 'Weekly status',
    description: 'Generate weekly report',
    icon: <Calendar className="h-4 w-4" />,
    command: 'Generate a weekly status report for this project',
    category: 'report',
  },
  {
    id: 'process_documents',
    label: 'Process documents',
    description: 'Classify new uploads',
    icon: <FileStack className="h-4 w-4" />,
    command: 'Process and classify any unprocessed documents',
    category: 'document',
  },
  {
    id: 'extract_actions',
    label: 'Extract actions',
    description: 'Find action items',
    icon: <ListTodo className="h-4 w-4" />,
    command: 'Extract action items from recent daily reports',
    category: 'report',
  },
  {
    id: 'help',
    label: 'What can you do?',
    description: 'Learn about capabilities',
    icon: <HelpCircle className="h-4 w-4" />,
    command: 'What can you help me with?',
    category: 'general',
  },
]

// ============================================================================
// Component
// ============================================================================

export function AgentQuickActions({
  onAction,
  variant = 'grid',
  showAll = false,
}: AgentQuickActionsProps) {
  const actions = showAll ? QUICK_ACTIONS : QUICK_ACTIONS.slice(0, 4)

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start h-auto py-2 px-3"
            onClick={() => onAction(action.command)}
          >
            <span className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {action.icon}
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium text-sm">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </span>
            </span>
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          className={cn(
            'h-auto py-3 px-3 flex flex-col items-start gap-1',
            'hover:bg-primary/5 hover:border-primary/30'
          )}
          onClick={() => onAction(action.command)}
        >
          <span className="flex items-center gap-2">
            <span className="text-primary">{action.icon}</span>
            <span className="font-medium text-sm">{action.label}</span>
          </span>
          <span className="text-xs text-muted-foreground text-left line-clamp-1">
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
  onAction: (command: string) => void
}

export function ContextQuickActions({
  entityType,
  entityId,
  onAction,
}: ContextQuickActionsProps) {
  // Generate context-aware actions based on current entity
  const contextActions: QuickAction[] = []

  if (entityType === 'rfi') {
    contextActions.push(
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
      }
    )
  }

  if (entityType === 'document') {
    contextActions.push(
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
      }
    )
  }

  if (entityType === 'daily_report') {
    contextActions.push(
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
      }
    )
  }

  if (contextActions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {contextActions.map((action) => (
        <Button
          key={action.id}
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => onAction(action.command)}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  )
}
