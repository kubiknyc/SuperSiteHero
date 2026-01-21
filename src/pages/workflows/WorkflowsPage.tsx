// File: /src/pages/workflows/WorkflowsPage.tsx
// Main workflows page with workflow types and items

import { useState } from 'react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { WorkflowsProjectView } from '@/features/workflows/components/WorkflowsProjectView'
import { useWorkflowTypes, getWorkflowTypeIcon } from '@/features/workflows/hooks/useWorkflowTypes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function WorkflowsPage() {
  const { selectedProjectId, setSelectedProjectId, projects } = useSelectedProject()
  const { data: workflowTypes, isLoading: typesLoading, error: typesError } = useWorkflowTypes()

  // Use persistent selected project or first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Filter to only active workflow types
  const activeWorkflowTypes = workflowTypes?.filter(wt => wt.is_active !== false) || []

  if (!activeProjectId) {
    return (
      <SmartLayout title="Workflows" subtitle="Process management">
        <div className="p-6">
          <Card className="border-warning bg-warning-light dark:bg-warning/10">
            <CardHeader>
              <CardTitle className="text-warning-dark dark:text-warning">No Projects Available</CardTitle>
            </CardHeader>
            <CardContent className="text-warning-dark dark:text-warning">
              Please create a project first to view workflows.
            </CardContent>
          </Card>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Workflows" subtitle="Process management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold heading-page">Workflows</h1>
            <p className="text-secondary">Manage RFIs, Change Orders, and Submittals</p>
          </div>
        </div>

        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
            >
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Workflow Types Grid */}
        <div className="grid gap-6">
          {/* Loading State */}
          {typesLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Error State */}
          {typesError && (
            <Card className="border-error bg-error-light dark:bg-error/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-error-dark dark:text-error">
                  <AlertCircle className="h-5 w-5" />
                  <p>Failed to load workflow types. Please try again.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!typesLoading && !typesError && activeWorkflowTypes.length === 0 && (
            <Card className="border-warning bg-warning-light dark:bg-warning/10">
              <CardContent className="pt-6 text-center">
                <p className="text-warning-dark dark:text-warning">
                  No workflow types configured for your company.
                </p>
                <p className="text-sm text-warning dark:text-warning mt-1">
                  Contact your administrator to set up workflow types.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Workflow Type Sections */}
          {!typesLoading && activeWorkflowTypes.map((workflowType) => (
            <Card key={workflowType.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{getWorkflowTypeIcon(workflowType)}</span>
                  {workflowType.name_plural}
                </CardTitle>
                <CardDescription>
                  Manage {workflowType.name_plural.toLowerCase()} for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowsProjectView
                  projectId={activeProjectId}
                  workflowTypeId={workflowType.id}
                  workflowTypeName={workflowType.name_plural}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SmartLayout>
  )
}
