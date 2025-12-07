// File: /src/features/takeoffs/components/TemplateCard.tsx
// Card component for displaying takeoff template information

import { useState } from 'react'
import {
  Ruler,
  Square,
  Hash,
  ArrowDown,
  Home,
  TrendingUp,
  Box,
  Tag,
  Users,
  Edit2,
  Trash2,
  Star,
  StarOff,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { TakeoffTemplate } from '@/types/database-extensions'

interface TemplateCardProps {
  template: TakeoffTemplate
  onApply: (template: TakeoffTemplate) => void
  onEdit?: (template: TakeoffTemplate) => void
  onDelete?: (templateId: string) => void
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => void
  currentUserId?: string
  isFavorite?: boolean
}

/**
 * Get icon for measurement type
 */
function getMeasurementIcon(type: string) {
  switch (type) {
    case 'linear':
      return <Ruler className="w-5 h-5" />
    case 'area':
      return <Square className="w-5 h-5" />
    case 'count':
      return <Hash className="w-5 h-5" />
    case 'linear_with_drop':
      return <ArrowDown className="w-5 h-5" />
    case 'pitched_area':
      return <Home className="w-5 h-5" />
    case 'pitched_linear':
      return <TrendingUp className="w-5 h-5" />
    case 'surface_area':
      return <Box className="w-5 h-5" />
    case 'volume_2d':
    case 'volume_3d':
      return <Box className="w-5 h-5" />
    default:
      return <Ruler className="w-5 h-5" />
  }
}

/**
 * Format measurement type for display
 */
function formatMeasurementType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * TemplateCard Component
 *
 * Displays a single takeoff template in card format with actions.
 * Features:
 * - Visual indicator for measurement type
 * - Company-wide or project-specific badge
 * - Tags display
 * - Usage count
 * - Action buttons: Apply, Edit (owner only), Delete (owner only)
 * - Favorite toggle
 */
export function TemplateCard({
  template,
  onApply,
  onEdit,
  onDelete,
  onToggleFavorite,
  currentUserId,
  isFavorite = false,
}: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const isOwner = currentUserId && template.created_by === currentUserId
  const isCompanyWide = !template.project_id

  const handleDelete = () => {
    if (onDelete) {
      onDelete(template.id)
    }
    setShowDeleteDialog(false)
  }

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(template.id, !isFavorite)
    }
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow relative group">
        {/* Favorite Star - Top Right */}
        {onToggleFavorite && (
          <button
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? (
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="w-5 h-5 text-muted-foreground hover:text-yellow-400" />
            )}
          </button>
        )}

        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="p-2 bg-primary/10 rounded-lg">
              {getMeasurementIcon(template.measurement_type)}
            </div>

            {/* Title and Type */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{template.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {formatMeasurementType(template.measurement_type)}
                </Badge>
                {isCompanyWide ? (
                  <Badge variant="default" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Company-wide
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Project Only
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Body */}
        <CardContent className="space-y-3">
          {/* Description */}
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
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

          {/* Usage Count */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>Used {template.usage_count || 0} times</span>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="flex gap-2 pt-3 border-t">
          {/* Apply Button - Always Visible */}
          <Button
            onClick={() => onApply(template)}
            className="flex-1"
            size="sm"
          >
            Apply Template
          </Button>

          {/* Edit Button - Owner Only */}
          {isOwner && onEdit && (
            <Button
              onClick={() => onEdit(template)}
              variant="outline"
              size="sm"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}

          {/* Delete Button - Owner Only */}
          {isOwner && onDelete && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
