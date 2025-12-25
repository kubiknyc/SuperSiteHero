/**
 * Report Template Card Component
 *
 * Displays a report template with actions.
 */

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Play,
  Calendar,
  Users,
  Lock,
  Share2,
} from 'lucide-react'
import { DataSourceBadge } from './DataSourceSelector'
import type { ReportTemplate } from '@/types/report-builder'

interface ReportTemplateCardProps {
  template: ReportTemplate
  onEdit: (template: ReportTemplate) => void
  onDuplicate: (template: ReportTemplate) => void
  onDelete: (template: ReportTemplate) => void
  onRun: (template: ReportTemplate) => void
  onSchedule: (template: ReportTemplate) => void
  onShare?: (template: ReportTemplate) => void
  className?: string
}

export function ReportTemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onRun,
  onSchedule,
  onShare,
  className,
}: ReportTemplateCardProps) {
  const isSystemTemplate = template.is_system_template
  const canEdit = !isSystemTemplate

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate heading-subsection">{template.name}</h3>
              {isSystemTemplate && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  System
                </Badge>
              )}
              {template.is_shared && !isSystemTemplate && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Shared
                </Badge>
              )}
            </div>

            {template.description && (
              <p className="text-sm text-muted line-clamp-2 mb-2">
                {template.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted">
              <DataSourceBadge source={template.data_source} />
              <span>
                {format(new Date(template.created_at), 'MMM d, yyyy')}
              </span>
              {template.creator && (
                <span>by {template.creator.full_name || template.creator.email}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onRun(template)}
            >
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDuplicate(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSchedule(template)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </DropdownMenuItem>
                {onShare && (
                  <DropdownMenuItem onClick={() => onShare(template)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(template)}
                      className="text-error"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader for template card
 */
export function ReportTemplateCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="h-5 bg-muted rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-full mb-2 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export default ReportTemplateCard
