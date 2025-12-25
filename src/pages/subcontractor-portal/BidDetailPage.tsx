/**
 * Bid Detail Page
 * Shows full bid details and allows submission
 */

import { useParams, Link } from 'react-router-dom'
import { useSubcontractorBid } from '@/features/subcontractor-portal/hooks'
import { BidSubmissionForm } from '@/features/subcontractor-portal/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Building2, Calendar, FileText, User } from 'lucide-react'
import { format } from 'date-fns'

function BidDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export function BidDetailPage() {
  const { bidId } = useParams<{ bidId: string }>()
  const { data: bid, isLoading, isError, error } = useSubcontractorBid(bidId || '')

  if (isLoading) {
    return <BidDetailSkeleton />
  }

  if (isError || !bid) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>Failed to load bid details</p>
              <p className="text-sm">{error?.message || 'Bid not found'}</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/portal/bids">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Bids
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/portal/bids">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold heading-page">
            {bid.workflow_item?.title || 'Change Order Bid'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {bid.project?.name}
            </span>
            {bid.workflow_item?.item_number && (
              <span>CO #{bid.workflow_item.item_number}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scope Description */}
          {bid.workflow_item && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Scope of Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {bid.workflow_item.description ? (
                    <p className="whitespace-pre-wrap">{bid.workflow_item.description}</p>
                  ) : (
                    <p className="text-muted-foreground">No description provided</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bid Form */}
          <BidSubmissionForm bid={bid} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bid Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bid Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={
                    bid.bid_status === 'pending'
                      ? 'bg-warning-light text-amber-700 border-amber-200'
                      : bid.bid_status === 'submitted'
                      ? 'bg-blue-50 text-primary-hover border-blue-200'
                      : bid.bid_status === 'awarded'
                      ? 'bg-success-light text-success-dark border-green-200'
                      : 'bg-surface text-secondary border-border'
                  }
                >
                  {bid.bid_status.charAt(0).toUpperCase() + bid.bid_status.slice(1)}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Requested</p>
                <p className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(bid.created_at), 'MMM d, yyyy')}
                </p>
              </div>

              {bid.submitted_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(bid.submitted_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {bid.is_awarded && bid.awarded_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Awarded</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(bid.awarded_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">{bid.project?.name}</p>
              </div>
              {bid.project?.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p>{bid.project.address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Your Trade</p>
                <p>{bid.subcontractor?.trade}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default BidDetailPage
