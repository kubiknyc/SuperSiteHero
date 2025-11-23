// File: /src/pages/workflows/WorkflowsPage.tsx
// Main workflows page with workflow types and items

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useWorkflowItems } from '@/features/workflows/hooks/useWorkflowItems'
import { WorkflowsProjectView } from '@/features/workflows/components/WorkflowsProjectView'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Workflow type configurations
const workflowTypes = [
  { id: 'rfi', name: 'RFIs', singular: 'Request for Information', icon: '📋' },
  { id: 'change-order', name: 'Change Orders', singular: 'Change Order', icon: '📝' },
  { id: 'submittal', name: 'Submittals', singular: 'Submittal', icon: '📤' },
]

export function WorkflowsPage() {
  const { data: projects } = useMyProjects()

  // Selected project
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Fetch workflow items for all types
  const { data: rfiItems, isLoading: rfiLoading } = useWorkflowItems(activeProjectId, 'rfi')
  const { data: coItems, isLoading: coLoading } = useWorkflowItems(activeProjectId, 'change-order')
  const { data: submittalItems, isLoading: submittalLoading } = useWorkflowItems(activeProjectId, 'submittal')

  if (!activeProjectId) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900">No Projects Available</CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-800">
              Please create a project first to view workflows.
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Workflows</h1>
            <p className="text-gray-600">Manage RFIs, Change Orders, and Submittals</p>
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
          {/* RFIs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{workflowTypes[0].icon}</span>
                {workflowTypes[0].name}
              </CardTitle>
              <CardDescription>
                Manage requests for information from contractors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rfiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <WorkflowsProjectView
                  projectId={activeProjectId}
                  workflowTypeId="rfi"
                  workflowTypeName={workflowTypes[0].name}
                />
              )}
            </CardContent>
          </Card>

          {/* Change Orders Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{workflowTypes[1].icon}</span>
                {workflowTypes[1].name}
              </CardTitle>
              <CardDescription>
                Track change orders and scope adjustments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <WorkflowsProjectView
                  projectId={activeProjectId}
                  workflowTypeId="change-order"
                  workflowTypeName={workflowTypes[1].name}
                />
              )}
            </CardContent>
          </Card>

          {/* Submittals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{workflowTypes[2].icon}</span>
                {workflowTypes[2].name}
              </CardTitle>
              <CardDescription>
                Manage material and equipment submittals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submittalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <WorkflowsProjectView
                  projectId={activeProjectId}
                  workflowTypeId="submittal"
                  workflowTypeName={workflowTypes[2].name}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
