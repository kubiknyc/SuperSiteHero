// File: /src/features/onboarding/components/HelpTooltip.tsx
// Inline contextual help tooltip component

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ExternalLink, Play, BookOpen } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  /** Short help text shown in tooltip */
  content: string
  /** Longer detailed help text */
  details?: string
  /** URL to documentation */
  docsUrl?: string
  /** URL to video tutorial */
  videoUrl?: string
  /** Size of the help icon */
  size?: 'sm' | 'md' | 'lg'
  /** Custom trigger element */
  children?: React.ReactNode
  /** Position of the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Show as popover for more content */
  asPopover?: boolean
  /** Additional class name */
  className?: string
}

export function HelpTooltip({
  content,
  details,
  docsUrl,
  videoUrl,
  size = 'sm',
  children,
  side = 'top',
  asPopover = false,
  className,
}: HelpTooltipProps) {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const trigger = children || (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
      aria-label="Help"
    >
      <HelpCircle className={iconSizes[size]} />
    </button>
  )

  // Simple tooltip for short content
  if (!asPopover && !details && !docsUrl && !videoUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side={side} className="max-w-xs">
            <p className="text-xs">{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Popover for more detailed content
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side={side} className="w-80">
        <div className="space-y-3">
          <p className="text-sm font-medium">{content}</p>

          {details && (
            <p className="text-xs text-muted-foreground">{details}</p>
          )}

          {(docsUrl || videoUrl) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {docsUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-7"
                >
                  <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Read docs
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
              {videoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-7"
                >
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="w-3 h-3 mr-1" />
                    Watch video
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Inline help text with optional tooltip
interface InlineHelpProps {
  children: React.ReactNode
  help: string
  details?: string
  className?: string
}

export function InlineHelp({
  children,
  help,
  details,
  className,
}: InlineHelpProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {children}
      <HelpTooltip
        content={help}
        details={details}
        size="sm"
        asPopover={!!details}
      />
    </span>
  )
}

// Form field with integrated help
interface FieldHelpProps {
  label: string
  help: string
  details?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FieldHelp({
  label,
  help,
  details,
  required = false,
  children,
  className,
}: FieldHelpProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
        <HelpTooltip
          content={help}
          details={details}
          size="sm"
          asPopover={!!details}
        />
      </div>
      {children}
    </div>
  )
}

// Help badge for section headers
interface HelpBadgeProps {
  content: string
  details?: string
  docsUrl?: string
  videoUrl?: string
  variant?: 'default' | 'subtle'
  className?: string
}

export function HelpBadge({
  content,
  details,
  docsUrl,
  videoUrl,
  variant = 'default',
  className,
}: HelpBadgeProps) {
  return (
    <HelpTooltip
      content={content}
      details={details}
      docsUrl={docsUrl}
      videoUrl={videoUrl}
      asPopover
      className={className}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-help',
          variant === 'default'
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground hover:text-foreground',
          className
        )}
      >
        <HelpCircle className="w-3 h-3" />
        <span>Help</span>
      </span>
    </HelpTooltip>
  )
}

// Section with help button
interface HelpSectionProps {
  title: string
  description?: string
  help: string
  helpDetails?: string
  docsUrl?: string
  videoUrl?: string
  children: React.ReactNode
  className?: string
}

export function HelpSection({
  title,
  description,
  help,
  helpDetails,
  docsUrl,
  videoUrl,
  children,
  className,
}: HelpSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <HelpTooltip
          content={help}
          details={helpDetails}
          docsUrl={docsUrl}
          videoUrl={videoUrl}
          asPopover
          size="md"
        />
      </div>
      {children}
    </section>
  )
}

export default HelpTooltip
