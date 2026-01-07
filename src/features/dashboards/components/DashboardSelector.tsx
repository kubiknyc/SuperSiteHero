/**
 * Dashboard Selector Component
 *
 * Routes users to appropriate dashboard based on their role,
 * with option to manually select a different view.
 */

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { SuperintendentDashboard } from './SuperintendentDashboard'
import { ProjectManagerDashboard } from './ProjectManagerDashboard'
import { ExecutiveDashboard } from './ExecutiveDashboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  HardHat,
  Briefcase,
  Building2,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'

export type DashboardView = 'superintendent' | 'project_manager' | 'executive' | 'default'

interface DashboardSelectorProps {
  project?: Project | null
  projectId?: string
  allowViewSwitch?: boolean
}

const ROLE_TO_VIEW_MAP: Record<string, DashboardView> = {
  owner: 'executive',
  admin: 'executive',
  project_manager: 'project_manager',
  superintendent: 'superintendent',
  foreman: 'superintendent',
  worker: 'default',
  subcontractor: 'default',
  client: 'default',
}

const VIEW_CONFIG = {
  superintendent: {
    label: 'Field Operations',
    icon: HardHat,
    description: 'Workforce, safety, punch lists, inspections',
    color: 'text-warning',
    bgColor: 'bg-warning-light',
  },
  project_manager: {
    label: 'Project Management',
    icon: Briefcase,
    description: 'Budget, schedule, RFIs, submittals, change orders',
    color: 'text-primary',
    bgColor: 'bg-info-light',
  },
  executive: {
    label: 'Executive Overview',
    icon: Building2,
    description: 'Portfolio, financials, KPIs, risk assessment',
    color: 'text-accent-foreground',
    bgColor: 'bg-accent',
  },
  default: {
    label: 'General Dashboard',
    icon: LayoutDashboard,
    description: 'Standard project overview',
    color: 'text-secondary',
    bgColor: 'bg-muted',
  },
}

export function DashboardSelector({
  project,
  projectId,
  allowViewSwitch = true,
}: DashboardSelectorProps) {
  const { userProfile } = useAuth()

  // Determine default view based on user role
  const defaultView = useMemo(() => {
    const role = userProfile?.role || 'worker'
    return ROLE_TO_VIEW_MAP[role] || 'default'
  }, [userProfile?.role])

  const [currentView, setCurrentView] = useState<DashboardView>(defaultView)

  // Available views based on user role permissions
  const availableViews = useMemo(() => {
    const role = userProfile?.role || 'worker'

    // Executives can see all views
    if (role === 'owner' || role === 'admin') {
      return ['executive', 'project_manager', 'superintendent'] as DashboardView[]
    }

    // PMs can see PM and superintendent views
    if (role === 'project_manager') {
      return ['project_manager', 'superintendent'] as DashboardView[]
    }

    // Superintendents/foremen can only see superintendent view
    if (role === 'superintendent' || role === 'foreman') {
      return ['superintendent'] as DashboardView[]
    }

    // Others get default
    return ['default'] as DashboardView[]
  }, [userProfile?.role])

  const currentConfig = VIEW_CONFIG[currentView]
  const CurrentIcon = currentConfig.icon

  // Render the appropriate dashboard
  const renderDashboard = () => {
    switch (currentView) {
      case 'superintendent':
        return <SuperintendentDashboard project={project} projectId={projectId} />
      case 'project_manager':
        return <ProjectManagerDashboard project={project} projectId={projectId} />
      case 'executive':
        return <ExecutiveDashboard companyId={userProfile?.company_id ?? undefined} />
      default:
        return null // Will fall back to original dashboard in parent
    }
  }

  // Don't render if no dashboard selected or only default available
  if (currentView === 'default' || availableViews.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* View Selector */}
      {allowViewSwitch && availableViews.length > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`${currentConfig.bgColor} ${currentConfig.color}`}>
              <CurrentIcon className="h-3 w-3 mr-1" />
              {currentConfig.label}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Switch View
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {availableViews.map((view) => {
                const config = VIEW_CONFIG[view]
                const Icon = config.icon
                return (
                  <DropdownMenuItem
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={cn(
                      "flex items-start gap-3 py-2",
                      currentView === view && "bg-accent/50 border-l-2 border-primary"
                    )}
                  >
                    <div className={`p-2 rounded ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                    {currentView === view && (
                      <Badge variant="secondary" className="ml-2">Active</Badge>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Dashboard Content */}
      {renderDashboard()}
    </div>
  )
}

/**
 * Hook to get the appropriate dashboard view for the current user
 */
export function useDashboardView(): DashboardView {
  const { userProfile } = useAuth()
  const role = userProfile?.role || 'worker'
  return ROLE_TO_VIEW_MAP[role] || 'default'
}

export default DashboardSelector
