/**
 * Subcontractor Lien Waivers Page
 * View and sign lien waivers from the subcontractor portal
 */

import { useState, useMemo } from 'react'
import {
  useSubcontractorLienWaivers,
  useLienWaiverSummary,
  getWaiverTypeLabel,
  getWaiverStatusLabel,
  getWaiverStatusBadgeVariant,
  waiverNeedsAction,
  isWaiverOverdue,
  getDaysUntilDue,
  formatWaiverAmount,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  FileSignature,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Building2,
  ExternalLink,
  Pen,
} from 'lucide-react'
import { format } from 'date-fns'
import type { SubcontractorLienWaiver } from '@/types/subcontractor-portal'
import { LienWaiverSignDialog } from '@/features/subcontractor-portal/components/LienWaiverSignDialog'

function WaiverSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  )
}

type TabValue = 'all' | 'pending' | 'signed' | 'approved'

export function SubcontractorLienWaiversPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [selectedWaiver, setSelectedWaiver] = useState<SubcontractorLienWaiver | null>(null)
  const [signDialogOpen, setSignDialogOpen] = useState(false)

  const { data: allWaivers, isLoading, isError } = useSubcontractorLienWaivers()
  const { data: summary } = useLienWaiverSummary()

  // Calculate counts
  const counts = useMemo(() => {
    if (!allWaivers) { return { all: 0, pending: 0, signed: 0, approved: 0 } }

    return {
      all: allWaivers.length,
      pending: allWaivers.filter((w) => waiverNeedsAction(w.status)).length,
      signed: allWaivers.filter((w) => ['received', 'under_review'].includes(w.status)).length,
      approved: allWaivers.filter((w) => w.status === 'approved').length,
    }
  }, [allWaivers])

  // Filter waivers based on active tab
  const filteredWaivers = useMemo(() => {
    if (!allWaivers) { return [] }

    switch (activeTab) {
      case 'pending':
        return allWaivers.filter((w) => waiverNeedsAction(w.status))
      case 'signed':
        return allWaivers.filter((w) => ['received', 'under_review'].includes(w.status))
      case 'approved':
        return allWaivers.filter((w) => w.status === 'approved')
      default:
        return allWaivers
    }
  }, [allWaivers, activeTab])

  // Count overdue waivers
  const overdueCount = useMemo(() => {
    return allWaivers?.filter((w) => isWaiverOverdue(w)).length || 0
  }, [allWaivers])

  const handleSignWaiver = (waiver: SubcontractorLienWaiver) => {
    setSelectedWaiver(waiver)
    setSignDialogOpen(true)
  }

  const handleViewDocument = (waiver: SubcontractorLienWaiver) => {
    if (waiver.document_url) {
      window.open(waiver.document_url, '_blank')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 heading-page">
          <FileSignature className="h-6 w-6" />
          Lien Waivers
        </h1>
        <p className="text-muted-foreground">
          View and sign lien waivers for your projects. Lien waivers must be signed before payment can be released.
        </p>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            You have {overdueCount} overdue lien waiver{overdueCount > 1 ? 's' : ''} that require{overdueCount === 1 ? 's' : ''} immediate attention.
            Please sign them to avoid payment delays.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="heading-section">{summary.awaiting_signature_count}</p>
                  <p className="text-sm text-muted-foreground">Awaiting Signature</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Pen className="h-5 w-5 text-primary" />
                <div>
                  <p className="heading-section">{summary.signed_count}</p>
                  <p className="text-sm text-muted-foreground">Signed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="heading-section">{summary.approved_count}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <div>
                  <p className="heading-section">{formatWaiverAmount(summary.total_waived_amount)}</p>
                  <p className="text-sm text-muted-foreground">Total Waived</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {counts.pending > 0 && (
              <Badge variant="destructive" className="ml-1">{counts.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signed" className="gap-2">
            <Pen className="h-4 w-4" />
            Signed
            <Badge variant="secondary" className="ml-1">{counts.signed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved
            <Badge variant="secondary" className="ml-1">{counts.approved}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <WaiverSkeleton />
          ) : isError ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load lien waivers. Please try again later.
              </AlertDescription>
            </Alert>
          ) : filteredWaivers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="mb-2 heading-subsection">No Lien Waivers</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'all'
                    ? 'You have no lien waivers at this time.'
                    : `No lien waivers in this category.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredWaivers.map((waiver) => (
                <WaiverCard
                  key={waiver.id}
                  waiver={waiver}
                  onSign={() => handleSignWaiver(waiver)}
                  onViewDocument={() => handleViewDocument(waiver)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sign Dialog */}
      {selectedWaiver && (
        <LienWaiverSignDialog
          waiver={selectedWaiver}
          open={signDialogOpen}
          onOpenChange={setSignDialogOpen}
          onSuccess={() => {
            setSignDialogOpen(false)
            setSelectedWaiver(null)
          }}
        />
      )}
    </div>
  )
}

interface WaiverCardProps {
  waiver: SubcontractorLienWaiver
  onSign: () => void
  onViewDocument: () => void
}

function WaiverCard({ waiver, onSign, onViewDocument }: WaiverCardProps) {
  const isOverdue = isWaiverOverdue(waiver)
  const daysUntilDue = getDaysUntilDue(waiver.due_date)
  const needsAction = waiverNeedsAction(waiver.status)

  return (
    <Card className={isOverdue ? 'border-destructive' : needsAction ? 'border-warning' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 heading-card">
              {waiver.waiver_number}
              {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </CardTitle>
            <CardDescription>{getWaiverTypeLabel(waiver.waiver_type)}</CardDescription>
          </div>
          <Badge variant={getWaiverStatusBadgeVariant(waiver.status)}>
            {getWaiverStatusLabel(waiver.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project & Amount */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{waiver.project_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{formatWaiverAmount(waiver.payment_amount)}</span>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Through Date</p>
            <p>{format(new Date(waiver.through_date), 'MMM d, yyyy')}</p>
          </div>
          {waiver.due_date && (
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className={isOverdue ? 'text-destructive font-semibold' : ''}>
                {format(new Date(waiver.due_date), 'MMM d, yyyy')}
                {daysUntilDue !== null && daysUntilDue > 0 && (
                  <span className="text-muted-foreground ml-1">({daysUntilDue} days)</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Pay App Reference */}
        {waiver.payment_application_number && (
          <div className="text-sm">
            <span className="text-muted-foreground">Pay App: </span>
            <span>#{waiver.payment_application_number}</span>
          </div>
        )}

        {/* Rejection Reason */}
        {waiver.status === 'rejected' && waiver.rejection_reason && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm">
              <strong>Rejection reason:</strong> {waiver.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {needsAction && (
            <Button onClick={onSign} className="flex-1">
              <Pen className="h-4 w-4 mr-2" />
              Sign Waiver
            </Button>
          )}
          {waiver.document_url && (
            <Button variant="outline" onClick={onViewDocument}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SubcontractorLienWaiversPage
