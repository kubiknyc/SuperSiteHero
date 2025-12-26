// File: /src/pages/projects/ProjectsPage.tsx
// Projects list and management page
// Performance: Optimized with React.memo, useMemo and useCallback

import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, MapPin, Calendar, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { EditProjectDialog } from '@/features/projects/components/EditProjectDialog'
import { DeleteProjectConfirmation } from '@/features/projects/components/DeleteProjectConfirmation'
import type { Project } from '@/types/database'

// Status badge variant mapping - moved outside component for stability
const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' | 'outline' => {
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

// Format status helper - moved outside component for stability
const formatStatus = (status: string): string => {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export function ProjectsPage() {
  const { data: projects, isLoading, error, refetch } = useMyProjects()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Memoize filtered projects - only recalculate when projects or searchQuery changes
  const filteredProjects = useMemo(() => {
    if (!projects) return []

    if (!searchQuery) return projects

    const query = searchQuery.toLowerCase()
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query) ||
      project.address?.toLowerCase().includes(query)
    )
  }, [projects, searchQuery])

  // Memoize search handler - stable reference for Input component
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Memoize create button handler - stable reference
  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  // Memoize edit handler - stable reference for project cards
  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project)
    setEditDialogOpen(true)
  }, [])

  // Memoize edit dialog change handler - stable reference
  const handleEditDialogChange = useCallback((open: boolean) => {
    setEditDialogOpen(open)
    if (!open) {
      setEditingProject(null)
      refetch()
    }
  }, [refetch])

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground heading-page">Projects</h1>
            <p className="text-secondary mt-1">
              Manage and track your construction projects
            </p>
          </div>
          <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </CreateProjectDialog>
        </div>

        {/* Search bar - Using memoized handler */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-disabled" />
          <Input
            type="text"
            placeholder="Search projects by name or address..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted">Loading projects...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-error">Error loading projects: {error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredProjects && filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted mb-4">
              {searchQuery ? 'No projects found matching your search.' : 'No projects yet.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Button>
            )}
          </div>
        )}

        {/* Project grid */}
        {filteredProjects && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link to={`/projects/${project.id}`} className="hover:underline">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </Link>
                      {project.project_number && (
                        <p className="text-sm text-muted mt-1">
                          #{project.project_number}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(project.status ?? 'planning')}>
                      {formatStatus(project.status ?? 'planning')}
                    </Badge>
                  </div>
                  {project.address && (
                    <CardDescription className="flex items-start gap-2 mt-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{project.address}</span>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm">
                    {project.start_date && (
                      <div className="flex items-center gap-2 text-secondary">
                        <Calendar className="h-4 w-4" />
                        <span>Started {format(new Date(project.start_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {project.description && (
                      <p className="text-secondary line-clamp-2 mt-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </CardContent>

                {/* Edit and Delete actions */}
                <div className="border-t pt-4 px-6 pb-6 flex gap-2">
                  <Button
                    onClick={() => handleEditProject(project)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <DeleteProjectConfirmation
                    projectId={project.id}
                    projectName={project.name}
                    onSuccess={refetch}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Project Dialog - Using memoized handler */}
        {editingProject && (
          <EditProjectDialog
            project={editingProject}
            open={editDialogOpen}
            onOpenChange={handleEditDialogChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
