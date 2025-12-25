/**
 * Template Card Component
 *
 * Displays a project template with category icon, usage stats, and actions
 */

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  Home,
  Factory,
  Hammer,
  Route,
  School,
  Settings,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  Calendar,
  Hash,
} from 'lucide-react'
import type { ProjectTemplate, TemplateCategory } from '@/types/project-template'
import { formatDistanceToNow } from 'date-fns'

// Category icon mapping
const CATEGORY_ICONS: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  commercial: Building2,
  residential: Home,
  industrial: Factory,
  renovation: Hammer,
  civil: Route,
  institutional: School,
  custom: Settings,
}

// Category colors
const CATEGORY_COLORS: Record<TemplateCategory, { bg: string; text: string }> = {
  commercial: { bg: 'bg-info-light', text: 'text-primary-hover' },
  residential: { bg: 'bg-success-light', text: 'text-success-dark' },
  industrial: { bg: 'bg-orange-100', text: 'text-orange-700' },
  renovation: { bg: 'bg-warning-light', text: 'text-yellow-700' },
  civil: { bg: 'bg-purple-100', text: 'text-purple-700' },
  institutional: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  custom: { bg: 'bg-muted', text: 'text-secondary' },
}

interface TemplateCardProps {
  template: ProjectTemplate
  onEdit?: (template: ProjectTemplate) => void
  onDuplicate?: (template: ProjectTemplate) => void
  onDelete?: (template: ProjectTemplate) => void
  onPreview?: (template: ProjectTemplate) => void
}

export function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
}: TemplateCardProps) {
  const category = template.category || 'custom'
  const Icon = CATEGORY_ICONS[category]
  const colors = CATEGORY_COLORS[category]

  const lastUsedText = template.last_used_at
    ? `Last used ${formatDistanceToNow(new Date(template.last_used_at), { addSuffix: true })}`
    : 'Never used'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Category Icon */}
          <div className={`p-3 rounded-lg ${colors.bg}`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate heading-subsection">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted mt-1 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onPreview && (
                    <DropdownMenuItem onClick={() => onPreview(template)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => onDuplicate(template)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(template)}
                        className="text-error focus:text-error"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats and Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>

              {template.visibility === 'private' && (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              )}

              <div className="flex items-center gap-1 text-xs text-muted">
                <Hash className="h-3 w-3" />
                <span>Used {template.usage_count} times</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted">
                <Calendar className="h-3 w-3" />
                <span>{lastUsedText}</span>
              </div>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TemplateCard
