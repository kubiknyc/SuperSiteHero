// File: /src/pages/projects/ProjectDetailPage.tsx
// Project detail page with editing capabilities

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProject } from '@/features/projects/hooks/useProjects'
import { EditProjectDialog } from '@/features/projects/components/EditProjectDialog'
import { DeleteProjectConfirmation } from '@/features/projects/components/DeleteProjectConfirmation'
import { DocumentsList } from '@/features/documents/components'
import { RFIsList } from '@/features/rfis/components'
import { SubmittalsList } from '@/features/submittals/components'
import { Button } from '@/components/ui/button'
import { PunchListsProjectView } from '@/features/punch-lists/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Edit, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  if (!projectId) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-600">Project ID not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const { data: project, isLoading, error } = useProject(projectId)

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="ml-2 text-gray-500">Loading project details...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-red-600">
              {error?.message || 'Failed to load project details'}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'planning':
        return 'secondary'
      case 'active':
        return 'success'
      case 'on_hold':
        return 'warning'
      case 'completed':
        return 'default'
      case 'archived':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.project_number && (
              <p className="text-gray-600 mt-1">#{project.project_number}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <DeleteProjectConfirmation
              projectId={project.id}
              projectName={project.name}
              onSuccess={() => navigate('/projects')}
            />
          </div>
        </div>

        {/* Status badge */}
        <div className="mb-6">
          <Badge variant={getStatusVariant(project.status)}>
            {formatStatus(project.status)}
          </Badge>
        </div>

        {/* Project details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {project.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.address && (
                  <div>
                    <Label className="text-sm text-gray-600">Address</Label>
                    <p className="text-gray-900">{project.address}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  {project.city && (
                    <div>
                      <Label className="text-sm text-gray-600">City</Label>
                      <p className="text-gray-900">{project.city}</p>
                    </div>
                  )}
                  {project.state && (
                    <div>
                      <Label className="text-sm text-gray-600">State</Label>
                      <p className="text-gray-900">{project.state}</p>
                    </div>
                  )}
                  {project.zip && (
                    <div>
                      <Label className="text-sm text-gray-600">ZIP</Label>
                      <p className="text-gray-900">{project.zip}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <DocumentsList projectId={project.id} />

            {/* RFIs */}
            <RFIsList projectId={project.id} />

            {/* Submittals */}
            <SubmittalsList projectId={project.id} />

            {/* Punch Lists */}
            <PunchListsProjectView projectId={project.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.start_date && (
                  <div>
                    <Label className="text-sm text-gray-600">Start Date</Label>
                    <p className="text-gray-900">
                      {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}
                {project.end_date && (
                  <div>
                    <Label className="text-sm text-gray-600">Est. End Date</Label>
                    <p className="text-gray-900">
                      {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-600">Status</Label>
                  <Badge variant={getStatusVariant(project.status)} className="mt-1">
                    {formatStatus(project.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <EditProjectDialog
          project={project}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </div>
    </AppLayout>
  )
}
