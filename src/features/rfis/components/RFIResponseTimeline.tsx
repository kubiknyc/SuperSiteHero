/**
 * RFI Response Timeline Component
 *
 * Displays the response history for an RFI including:
 * - Official responses with revision history
 * - Discussion responses
 * - Response action types (answered, see drawings, deferred, etc.)
 * - Version tracking with superseded responses
 */

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  MessageSquare,
  CheckCircle,
  FileText,
  History,
  ChevronDown,
  ChevronUp,
  Paperclip,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useRFIResponseHistory,
  type RFIResponse,
  getResponseTypeLabel,
  getResponseTypeColor,
  getActionTypeLabel,
  getActionTypeColor,
  getVersionLabel,
  isSuperseded,
} from '../hooks/useRFIResponseHistory'

export interface RFIResponseTimelineProps {
  rfiId: string
  showSuperseded?: boolean
  className?: string
}

/**
 * RFIResponseTimeline Component
 *
 * Shows a chronological timeline of all responses to an RFI,
 * with support for viewing revision history and superseded versions.
 *
 * @example
 * ```tsx
 * <RFIResponseTimeline
 *   rfiId="123e4567-e89b-12d3-a456-426614174000"
 *   showSuperseded={false}
 * />
 * ```
 */
export function RFIResponseTimeline({
  rfiId,
  showSuperseded = false,
  className,
}: RFIResponseTimelineProps) {
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set())
  const [showAllVersions, setShowAllVersions] = useState(showSuperseded)

  const { data: responses, isLoading, error, refetch } = useRFIResponseHistory(rfiId)

  // Filter responses based on showAllVersions
  const displayedResponses = showAllVersions
    ? responses
    : responses?.filter((r) => r.is_current_version)

  // Toggle expanded state for a response
  const toggleExpanded = (responseId: string) => {
    setExpandedResponses((prev) => {
      const next = new Set(prev)
      if (next.has(responseId)) {
        next.delete(responseId)
      } else {
        next.add(responseId)
      }
      return next
    })
  }

  // Get user initials for avatar fallback
  const getInitials = (name: string | undefined): string => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Render a single response
  const renderResponse = (response: RFIResponse) => {
    const isExpanded = expandedResponses.has(response.id)
    const superseded = isSuperseded(response)

    return (
      <div
        key={response.id}
        className={cn(
          'relative pl-10',
          superseded && 'opacity-60'
        )}
      >
        {/* Timeline icon */}
        <div
          className={cn(
            'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
            response.response_type === 'official'
              ? 'bg-green-100 text-green-600'
              : 'bg-blue-100 text-blue-600'
          )}
        >
          {response.response_type === 'official' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>

        {/* Response card */}
        <div
          className={cn(
            'border rounded-lg p-4',
            response.response_type === 'official'
              ? 'border-green-200 bg-green-50/50'
              : 'border-blue-200 bg-blue-50/50',
            superseded && 'border-dashed'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={response.responded_by_user?.avatar_url || undefined}
                  alt={response.responded_by_user?.full_name || 'User'}
                />
                <AvatarFallback className="text-xs">
                  {getInitials(response.responded_by_user?.full_name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {response.responded_by_user?.full_name || 'Unknown User'}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getResponseTypeColor(response.response_type))}
                  >
                    {getResponseTypeLabel(response.response_type)}
                  </Badge>
                  {superseded && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                      Superseded
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {response.responder_company && (
                    <>
                      <Building2 className="h-3 w-3" />
                      <span>{response.responder_company}</span>
                      <span className="text-gray-300">|</span>
                    </>
                  )}
                  <span>
                    {format(new Date(response.responded_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>{getVersionLabel(response)}</span>
                </div>
              </div>
            </div>

            {/* Action type badge */}
            {response.action_type && (
              <Badge className={cn('text-xs', getActionTypeColor(response.action_type))}>
                {getActionTypeLabel(response.action_type)}
              </Badge>
            )}
          </div>

          {/* Response content */}
          <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(response.id)}>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {isExpanded ? (
                response.response_text
              ) : (
                <>
                  {response.response_text.length > 300
                    ? `${response.response_text.slice(0, 300)}...`
                    : response.response_text}
                </>
              )}
            </div>

            {response.response_text.length > 300 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </Collapsible>

          {/* Attachments indicator */}
          {response.attachment_ids && response.attachment_ids.length > 0 && (
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{response.attachment_ids.length} attachment(s)</span>
            </div>
          )}

          {/* Superseded info */}
          {response.superseded_by_id && (
            <div className="flex items-center gap-1 mt-3 text-xs text-amber-600">
              <RefreshCw className="h-3 w-3" />
              <span>This version has been superseded by a newer response</span>
            </div>
          )}

          {/* Relative time */}
          <div className="mt-3 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(response.responded_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Response History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Response History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Failed to load response history</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!displayedResponses || displayedResponses.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Response History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground">No responses yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Responses will appear here once someone replies to this RFI
          </p>
        </CardContent>
      </Card>
    )
  }

  // Count versions
  const totalVersions = responses?.length || 0
  const currentVersions = responses?.filter((r) => r.is_current_version).length || 0
  const hasSupersededVersions = totalVersions > currentVersions

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Response History
            <span className="text-sm font-normal text-muted-foreground">
              ({currentVersions} response{currentVersions !== 1 ? 's' : ''})
            </span>
          </CardTitle>

          {hasSupersededVersions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllVersions(!showAllVersions)}
              className="text-xs"
            >
              {showAllVersions ? (
                <>Hide superseded ({totalVersions - currentVersions})</>
              ) : (
                <>Show all versions ({totalVersions})</>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Response items */}
          <div className="space-y-6">
            {displayedResponses.map(renderResponse)}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-2.5 w-2.5 text-green-600" />
            </div>
            <span>Official Response</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-2.5 w-2.5 text-blue-600" />
            </div>
            <span>Discussion</span>
          </div>
          {hasSupersededVersions && showAllVersions && (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3 text-amber-600" />
              <span>Superseded versions shown</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export type { RFIResponseTimelineProps }
