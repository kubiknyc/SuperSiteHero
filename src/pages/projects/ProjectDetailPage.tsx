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
import { SubcontractorPortalAccessList } from '@/features/subcontractor-portal/components'
import { Button } from '@/components/ui/button'
import { PunchListsProjectView } from '@/features/punch-lists/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Edit, Loader2, Calendar, LayoutTemplate } from 'lucide-react'
import { format } from 'date-fns'
import { SaveAsTemplateDialog } from '@/features/project-templates/components'
import { useAuth } from '@/hooks/useAuth'

export function ProjectDetailPage() {
  // Call all hooks at the top level, before any conditional returns
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const { data: project, isLoading, error } = useProject(projectId || '')

  // Early return after all hooks are called
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

        {/* Header - Enhanced typography */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="heading-page text-gray-900 dark:text-white tracking-tight leading-tight">{project.name}</h1>
            {project.project_number && (
              <p className="body-base text-gray-600 dark:text-gray-400 mt-2">#{project.project_number}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/schedule`)}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button variant="outline" onClick={() => setSaveAsTemplateOpen(true)}>
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Save as Template
            </Button>
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
          <Badge variant={getStatusVariant(project.status ?? 'planning')}>
            {formatStatus(project.status ?? 'planning')}
          </Badge>
        </div>

        {/* Project details grid - Enhanced spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {project.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="heading-card">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="heading-card">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.address && (
                  <div>
                    <Label className="text-label text-gray-600 dark:text-gray-400">Address</Label>
                    <p className="text-gray-900 dark:text-white">{project.address}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  {project.city && (
                    <div>
                      <Label className="text-label text-gray-600 dark:text-gray-400">City</Label>
                      <p className="text-gray-900 dark:text-white">{project.city}</p>
                    </div>
                  )}
                  {project.state && (
                    <div>
                      <Label className="text-label text-gray-600 dark:text-gray-400">State</Label>
                      <p className="text-gray-900 dark:text-white">{project.state}</p>
                    </div>
                  )}
                  {project.zip && (
                    <div>
                      <Label className="text-label text-gray-600 dark:text-gray-400">ZIP</Label>
                      <p className="text-gray-900 dark:text-white">{project.zip}</p>
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

            {/* Subcontractor Portal Access */}
            <SubcontractorPortalAccessList projectId={project.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="heading-card">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.start_date && (
                  <div>
                    <Label className="text-label text-gray-600 dark:text-gray-400">Start Date</Label>
                    <p className="text-gray-900 dark:text-white">
                      {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}
                {project.end_date && (
                  <div>
                    <Label className="text-label text-gray-600 dark:text-gray-400">Est. End Date</Label>
                    <p className="text-gray-900 dark:text-white">
                      {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="heading-card">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <Label className="text-caption text-gray-600 dark:text-gray-400">Status</Label>
                  <Badge variant={getStatusVariant(project.status ?? 'planning')} className="mt-1">
                    {formatStatus(project.status ?? 'planning')}
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

        {/* Save as Template Dialog */}
        {user && (
          <SaveAsTemplateDialog
            open={saveAsTemplateOpen}
            onOpenChange={setSaveAsTemplateOpen}
            projectId={project.id}
            projectName={project.name}
            userId={user.id}
          />
        )}
      </div>
    </AppLayout>
  )
}
