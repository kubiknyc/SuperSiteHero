/**
 * Field Dashboard Page
 * Main page for field personnel with customizable dashboard
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectContext } from '@/lib/contexts/ProjectContext'
import { CustomizableDashboard } from '@/features/field-dashboard/components/CustomizableDashboard'
import { EnhancedOfflineIndicator } from '@/components/offline/EnhancedOfflineIndicator'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  Plus,
  ClipboardCheck,
  HardHat,
  Camera,
  FileText,
  AlertTriangle,
  LayoutDashboard,
} from 'lucide-react'
// cn utility available if needed for conditional classes

export default function FieldDashboardPage() {
  const { currentProject, isLoading } = useProjectContext()
  const navigate = useNavigate()
  const [syncStatus] = useState({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: Date.now(),
  })

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2 heading-section">No Project Selected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please select a project to view the field dashboard
            </p>
            <Button onClick={() => navigate('/projects')}>
              Browse Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quickActions = [
    {
      label: 'Create Punch Item',
      icon: ClipboardCheck,
      onClick: () => navigate(`/projects/${currentProject.id}/punch-lists?new=true`),
      variant: 'default' as const,
      description: 'Log a new punch item',
    },
    {
      label: 'Safety Observation',
      icon: HardHat,
      onClick: () => navigate(`/projects/${currentProject.id}/safety/observations?new=true`),
      variant: 'default' as const,
      description: 'Report safety observation',
    },
    {
      label: 'Take Photo',
      icon: Camera,
      onClick: () => navigate(`/projects/${currentProject.id}/photos?capture=true`),
      variant: 'outline' as const,
      description: 'Capture site photo',
    },
    {
      label: 'Daily Report',
      icon: FileText,
      onClick: () => navigate(`/projects/${currentProject.id}/daily-reports/new`),
      variant: 'outline' as const,
      description: 'Start daily report',
    },
  ]

  return (
    <div className="container max-w-6xl mx-auto p-4 pb-20 space-y-6">
      {/* Enhanced Offline Indicator */}
      <EnhancedOfflineIndicator
        syncStatus={syncStatus}
        position="top-right"
        showDetails={true}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight heading-page">Field Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            {currentProject.name}
            {currentProject.project_number && ` - ${currentProject.project_number}`}
          </p>
        </div>
      </div>

      {/* Quick Actions - Compact for mobile */}
      <Card className="lg:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 text-center min-h-[72px]"
                  onClick={action.onClick}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">{action.label}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Desktop Quick Actions - Inline */}
      <div className="hidden lg:flex gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className="gap-2"
              onClick={action.onClick}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          )
        })}
      </div>

      {/* Customizable Dashboard */}
      <CustomizableDashboard projectId={currentProject.id} />

      {/* Additional Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate(`/projects/${currentProject.id}/inspections`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-info-light dark:bg-blue-950 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-primary dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Inspections</p>
                <p className="text-xs text-muted-foreground">View schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate(`/projects/${currentProject.id}/safety`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <HardHat className="h-5 w-5 text-warning dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Safety</p>
                <p className="text-xs text-muted-foreground">View alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
