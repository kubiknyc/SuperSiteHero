// File: /src/pages/projects/components/ProjectCard.tsx
// Optimized memoized project card component

import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar, Edit } from 'lucide-react'
import { format } from 'date-fns'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: () => void
  getStatusVariant: (status: string) => 'default' | 'secondary' | 'success' | 'warning' | 'outline'
  formatStatus: (status: string) => string
}

/**
 * Memoized Project Card Component
 * Only re-renders when project data or handlers change
 */
export const ProjectCard = memo<ProjectCardProps>(function ProjectCard({
  project,
  onEdit,
  onDelete,
  getStatusVariant,
  formatStatus,
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
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
              <span>
                Started {format(new Date(project.start_date), 'MMM d, yyyy')}
              </span>
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
          onClick={() => onEdit(project)}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        {onDelete}
      </div>
    </Card>
  )
})
