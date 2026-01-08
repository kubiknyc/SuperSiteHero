/**
 * EmptyState Component
 * Reusable empty state placeholder for lists, tables, and pages
 */

import * as React from 'react'
import {
  FileQuestion,
  Search,
  FolderOpen,
  AlertCircle,
  Lock,
  Inbox,
  FileX,
  Users,
  Calendar,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main title */
  title: string
  /** Description text */
  description?: string
  /** Icon to display */
  icon?: LucideIcon
  /** Preset type for common scenarios */
  type?: EmptyStateType
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'outline'
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Compact mode for smaller containers */
  compact?: boolean
  /** Custom children to render below description */
  children?: React.ReactNode
}

export type EmptyStateType =
  | 'no-data'
  | 'no-results'
  | 'empty-folder'
  | 'error'
  | 'no-permission'
  | 'no-items'
  | 'no-files'
  | 'no-members'
  | 'no-events'

// ============================================================================
// Preset Configurations
// ============================================================================

const PRESETS: Record<
  EmptyStateType,
  { icon: LucideIcon; title: string; description: string }
> = {
  'no-data': {
    icon: Inbox,
    title: 'No data yet',
    description: 'Get started by creating your first item.',
  },
  'no-results': {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  'empty-folder': {
    icon: FolderOpen,
    title: 'This folder is empty',
    description: 'Upload files or create subfolders to organize your content.',
  },
  'error': {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'We encountered an error loading this content. Please try again.',
  },
  'no-permission': {
    icon: Lock,
    title: 'Access restricted',
    description: 'You don\'t have permission to view this content.',
  },
  'no-items': {
    icon: FileQuestion,
    title: 'No items',
    description: 'There are no items to display.',
  },
  'no-files': {
    icon: FileX,
    title: 'No files',
    description: 'No files have been uploaded yet.',
  },
  'no-members': {
    icon: Users,
    title: 'No team members',
    description: 'Invite team members to collaborate on this project.',
  },
  'no-events': {
    icon: Calendar,
    title: 'No events scheduled',
    description: 'There are no upcoming events on your calendar.',
  },
}

// ============================================================================
// Component
// ============================================================================

export function EmptyState({
  title,
  description,
  icon,
  type,
  action,
  secondaryAction,
  compact = false,
  className,
  children,
  ...props
}: EmptyStateProps) {
  // Get preset values if type is specified
  const preset = type ? PRESETS[type] : null
  const Icon = icon ?? preset?.icon ?? FileQuestion
  const displayTitle = title ?? preset?.title ?? 'No items'
  const displayDescription = description ?? preset?.description

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
      {...props}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted',
          compact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-4'
        )}
      >
        <Icon
          className={cn(
            'text-muted-foreground',
            compact ? 'h-6 w-6' : 'h-8 w-8'
          )}
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-base' : 'text-lg'
        )}
      >
        {displayTitle}
      </h3>

      {/* Description */}
      {displayDescription && (
        <p
          className={cn(
            'text-muted-foreground mt-1 max-w-sm',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {displayDescription}
        </p>
      )}

      {/* Custom children */}
      {children && <div className="mt-4">{children}</div>}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-3',
            compact ? 'mt-4' : 'mt-6'
          )}
        >
          {action && (
            <Button
              variant={action.variant ?? 'default'}
              size={compact ? 'sm' : 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'default'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Preset Components for Common Scenarios
// ============================================================================

/** Empty state for search results */
export function EmptySearchResults({
  query,
  onClear,
  ...props
}: Omit<EmptyStateProps, 'type' | 'title' | 'description' | 'icon'> & {
  query?: string
  onClear?: () => void
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `No results found for "${query}". Try a different search term.`
          : 'Try adjusting your search or filters.'
      }
      action={onClear ? { label: 'Clear search', onClick: onClear, variant: 'outline' } : undefined}
      {...props}
    />
  )
}

/** Empty state for lists with a create action */
export function EmptyList({
  itemName = 'item',
  onCreate,
  title,
  description,
  ...props
}: Omit<EmptyStateProps, 'type'> & {
  itemName?: string
  onCreate?: () => void
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={title ?? `No ${itemName}s yet`}
      description={description ?? `Get started by creating your first ${itemName}.`}
      action={onCreate ? { label: `Create ${itemName}`, onClick: onCreate } : undefined}
      {...props}
    />
  )
}

/** Empty state for error scenarios */
export function EmptyError({
  onRetry,
  title,
  description,
  ...props
}: Omit<EmptyStateProps, 'type'> & {
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title ?? 'Something went wrong'}
      description={description ?? 'We encountered an error loading this content.'}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
      {...props}
    />
  )
}

/** Empty state for permission denied */
export function EmptyNoPermission({
  title,
  description,
  ...props
}: Omit<EmptyStateProps, 'type'>) {
  return (
    <EmptyState
      icon={Lock}
      title={title ?? 'Access restricted'}
      description={description ?? "You don't have permission to view this content."}
      {...props}
    />
  )
}

/** Empty state for upload areas */
export function EmptyUpload({
  onUpload,
  acceptedTypes,
  title,
  description,
  ...props
}: Omit<EmptyStateProps, 'type'> & {
  onUpload?: () => void
  acceptedTypes?: string
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={title ?? 'No files uploaded'}
      description={
        description ??
        (acceptedTypes
          ? `Drag and drop files here, or click to upload. Accepted: ${acceptedTypes}`
          : 'Drag and drop files here, or click to upload.')
      }
      action={onUpload ? { label: 'Upload files', onClick: onUpload } : undefined}
      {...props}
    />
  )
}

/** Empty state for tables */
export function EmptyTable({
  itemName = 'record',
  onCreate,
  columns,
  title,
  description,
  ...props
}: Omit<EmptyStateProps, 'type'> & {
  itemName?: string
  onCreate?: () => void
  columns?: number
}) {
  const content = (
    <EmptyState
      icon={Inbox}
      title={title ?? `No ${itemName}s`}
      description={description ?? `No ${itemName}s have been created yet.`}
      action={onCreate ? { label: `Add ${itemName}`, onClick: onCreate } : undefined}
      compact
      {...props}
    />
  )

  // If columns specified, wrap in table row
  if (columns) {
    return (
      <tr>
        <td colSpan={columns} className="p-0">
          {content}
        </td>
      </tr>
    )
  }

  return content
}
