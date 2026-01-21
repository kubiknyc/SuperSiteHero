// File: /src/pages/shop-drawings/ShopDrawingDetailPage.tsx
// Shop Drawing detail page with status transitions and revision history

import { useParams, useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Building2,
  Clock,
  Lock,
  Edit2,
  ExternalLink,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  ShopDrawingStatusBadge,
  PriorityBadge,
  DisciplineBadge,
  ShopDrawingStatusTransition,
  ShopDrawingRevisionHistory,
} from '@/features/shop-drawings/components'
import { useShopDrawing, isShopDrawingLocked } from '@/features/shop-drawings/hooks'
import type { SubmittalReviewStatus } from '@/types/database-extensions'

export function ShopDrawingDetailPage() {
  const { projectId, shopDrawingId } = useParams<{ projectId: string; shopDrawingId: string }>()
  const navigate = useNavigate()

  const { data: shopDrawing, isLoading, error, refetch } = useShopDrawing(shopDrawingId)

  const handleBack = () => {
    navigate(`/shop-drawings`)
  }

  if (isLoading) {
    return (
      <SmartLayout title="Shop Drawing Details">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (error || !shopDrawing) {
    return (
      <SmartLayout title="Shop Drawing Details">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="heading-section">Shop Drawing Not Found</h2>
          <p className="text-muted-foreground mt-2">
            {(error as Error)?.message || 'The requested shop drawing could not be found.'}
          </p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop Drawings
          </Button>
        </div>
      </SmartLayout>
    )
  }

  const isLocked = isShopDrawingLocked(shopDrawing.review_status as SubmittalReviewStatus)

  return (
    <SmartLayout title="Shop Drawing Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="heading-page">
                  {shopDrawing.drawing_number || shopDrawing.submittal_number}
                </h1>
                <ShopDrawingStatusBadge status={shopDrawing.review_status} />
                {shopDrawing.priority && (
                  <PriorityBadge priority={shopDrawing.priority} />
                )}
                {shopDrawing.long_lead_item && (
                  <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded dark:bg-orange-900/30 dark:text-orange-300">
                    <Clock className="h-3 w-3" />
                    Long Lead
                  </span>
                )}
              </div>
              <p className="text-lg mt-1">{shopDrawing.title}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                {shopDrawing.project && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {shopDrawing.project.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {shopDrawing.spec_section}
                  {shopDrawing.spec_section_title && ` - ${shopDrawing.spec_section_title}`}
                </span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {shopDrawing.revision_label || `Rev ${shopDrawing.revision_number || 0}`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isLocked && (
              <Button variant="outline" size="sm">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Status Transition Actions */}
        <Card>
          <CardContent className="pt-6">
            <ShopDrawingStatusTransition
              shopDrawingId={shopDrawing.id}
              currentStatus={shopDrawing.review_status as SubmittalReviewStatus}
              onTransitionComplete={() => refetch()}
            />
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                {shopDrawing.description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                    <p className="text-sm whitespace-pre-wrap">{shopDrawing.description}</p>
                  </div>
                )}

                {/* Key Information Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Discipline</h4>
                    {shopDrawing.discipline ? (
                      <DisciplineBadge discipline={shopDrawing.discipline} />
                    ) : (
                      <span className="text-muted-foreground">Not specified</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Subcontractor</h4>
                    <p className="text-sm">
                      {shopDrawing.subcontractor?.company_name || 'Not assigned'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Submitted By</h4>
                    {shopDrawing.submitted_by_user ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{shopDrawing.submitted_by_user.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not submitted yet</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Reviewer</h4>
                    {shopDrawing.reviewer ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{shopDrawing.reviewer.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not assigned</span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Review Comments */}
                {shopDrawing.review_comments && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Review Comments</h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm whitespace-pre-wrap">{shopDrawing.review_comments}</p>
                      {shopDrawing.approval_code && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Approval Code: {shopDrawing.approval_code}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs for Attachments, Reviews, etc. */}
            <Card>
              <Tabs defaultValue="revisions">
                <CardHeader>
                  <TabsList>
                    <TabsTrigger value="revisions">Revisions</TabsTrigger>
                    <TabsTrigger value="attachments">Attachments</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="revisions" className="mt-0">
                    <ShopDrawingRevisionHistory
                      shopDrawingId={shopDrawing.id}
                      currentStatus={shopDrawing.review_status}
                    />
                  </TabsContent>
                  <TabsContent value="attachments" className="mt-0">
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">Attachments feature coming soon</p>
                      <p className="text-xs">Use the submittal attachments for now</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="history" className="mt-0">
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">Activity history coming soon</p>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Important Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {shopDrawing.created_at
                      ? format(new Date(shopDrawing.created_at), 'MMM d, yyyy')
                      : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Submitted</span>
                  <span className="text-sm">
                    {shopDrawing.date_submitted
                      ? format(new Date(shopDrawing.date_submitted), 'MMM d, yyyy')
                      : '—'}
                  </span>
                </div>

                <div className={cn(
                  'flex items-center justify-between',
                  shopDrawing.is_overdue && 'text-red-600'
                )}>
                  <span className="text-sm text-muted-foreground">Required</span>
                  <div className="text-right">
                    <span className="text-sm">
                      {shopDrawing.date_required
                        ? format(new Date(shopDrawing.date_required), 'MMM d, yyyy')
                        : '—'}
                    </span>
                    {shopDrawing.is_overdue && (
                      <p className="text-xs text-red-600">Overdue</p>
                    )}
                    {shopDrawing.days_until_required && shopDrawing.days_until_required > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {shopDrawing.days_until_required} days remaining
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Returned</span>
                  <span className="text-sm">
                    {shopDrawing.date_returned
                      ? format(new Date(shopDrawing.date_returned), 'MMM d, yyyy')
                      : '—'}
                  </span>
                </div>

                {shopDrawing.days_in_review && shopDrawing.days_in_review > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Days in Review</span>
                    <span className="text-sm font-medium">{shopDrawing.days_in_review} days</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days for Review</span>
                  <span className="text-sm">{shopDrawing.days_for_review || 14} days</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ball in Court</span>
                  <span className="text-sm capitalize">
                    {shopDrawing.ball_in_court_entity?.replace('_', ' ') || '—'}
                  </span>
                </div>

                {shopDrawing.approval_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approval Code</span>
                    <span className="text-sm font-mono font-medium">
                      {shopDrawing.approval_code}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Items */}
            {shopDrawing.related_rfi_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => navigate(`/projects/${projectId}/rfis/${shopDrawing.related_rfi_id}`)}
                  >
                    <span>Related RFI</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SmartLayout>
  )
}

export default ShopDrawingDetailPage
