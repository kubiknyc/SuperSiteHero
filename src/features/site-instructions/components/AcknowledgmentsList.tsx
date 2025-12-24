// File: /src/features/site-instructions/components/AcknowledgmentsList.tsx
// List of acknowledgments for a site instruction
// Milestone 1.2: Site Instructions QR Code Workflow

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  CheckCircle2,
  MapPin,
  Clock,
  FileSignature,
  User,
  WifiOff,
  Eye,
  FileText,
} from 'lucide-react'
import { useAcknowledgmentsByInstruction } from '../hooks/useSiteInstructionAcknowledgment'
import type { SiteInstructionAcknowledgment } from '@/types/site-instruction-acknowledgment'
import { format, parseISO } from 'date-fns'

interface AcknowledgmentsListProps {
  instructionId: string
  className?: string
}

export function AcknowledgmentsList({ instructionId, className }: AcknowledgmentsListProps) {
  const { data: acknowledgments = [], isLoading, error } = useAcknowledgmentsByInstruction(instructionId)
  const [selectedAcknowledgment, setSelectedAcknowledgment] = useState<SiteInstructionAcknowledgment | null>(null)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load acknowledgments. Please try again.
        </CardContent>
      </Card>
    )
  }

  if (acknowledgments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Acknowledgments
          </CardTitle>
          <CardDescription>
            No acknowledgments yet. Share the QR code to collect signatures.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Acknowledgments will appear here when subcontractors confirm receipt.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Acknowledgments
              </CardTitle>
              <CardDescription>
                {acknowledgments.length} acknowledgment{acknowledgments.length !== 1 ? 's' : ''} received
              </CardDescription>
            </div>
            <Badge variant="secondary">{acknowledgments.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acknowledgments.map((ack) => (
                  <TableRow key={ack.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {ack.acknowledged_by_user?.full_name || ack.acknowledged_by_name || 'Unknown'}
                          </div>
                          {ack.is_offline_submission && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <WifiOff className="h-3 w-3" />
                              Offline submission
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(parseISO(ack.acknowledged_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ack.location_lat && ack.location_lng ? (
                        <div className="flex items-center gap-1 text-sm text-success">
                          <MapPin className="h-3 w-3" />
                          <span>Captured</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAcknowledgment(ack)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedAcknowledgment} onOpenChange={() => setSelectedAcknowledgment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledgment Details</DialogTitle>
          </DialogHeader>
          {selectedAcknowledgment && (
            <AcknowledgmentDetail acknowledgment={selectedAcknowledgment} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

interface AcknowledgmentDetailProps {
  acknowledgment: SiteInstructionAcknowledgment
}

function AcknowledgmentDetail({ acknowledgment: ack }: AcknowledgmentDetailProps) {
  return (
    <div className="space-y-4">
      {/* Name and Time */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {ack.acknowledged_by_user?.full_name || ack.acknowledged_by_name || 'Unknown'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {format(parseISO(ack.acknowledged_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
        </div>
      </div>

      {/* Signature */}
      {ack.signature_data && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Signature</label>
          <div className="border rounded-lg p-2 bg-card">
            <img
              src={ack.signature_data}
              alt="Signature"
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Location */}
      {ack.location_lat && ack.location_lng && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </label>
          <div className="text-sm text-muted-foreground">
            <p>Latitude: {ack.location_lat.toFixed(6)}</p>
            <p>Longitude: {ack.location_lng.toFixed(6)}</p>
            {ack.location_accuracy && (
              <p>Accuracy: {ack.location_accuracy.toFixed(0)} meters</p>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.google.com/maps?q=${ack.location_lat},${ack.location_lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Map
            </a>
          </Button>
        </div>
      )}

      {/* Notes */}
      {ack.notes && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </label>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {ack.notes}
          </p>
        </div>
      )}

      {/* Offline Submission Info */}
      {ack.is_offline_submission && (
        <div className="flex items-center gap-2 text-sm text-warning bg-warning-light p-2 rounded">
          <WifiOff className="h-4 w-4" />
          <span>
            Submitted offline
            {ack.offline_submitted_at && (
              <> at {format(parseISO(ack.offline_submitted_at), 'h:mm a')}</>
            )}
            {ack.synced_at && (
              <>, synced {format(parseISO(ack.synced_at), 'MMM d h:mm a')}</>
            )}
          </span>
        </div>
      )}

      {/* Device Info */}
      {ack.device_info && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Device Information
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(ack.device_info, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

/**
 * Compact acknowledgment count badge for use in cards/lists
 */
export function AcknowledgmentCountBadge({
  instructionId,
  className,
}: {
  instructionId: string
  className?: string
}) {
  const { data: acknowledgments = [], isLoading } = useAcknowledgmentsByInstruction(instructionId)

  if (isLoading) {
    return <Badge variant="outline" className={className}>...</Badge>
  }

  if (acknowledgments.length === 0) {
    return null
  }

  return (
    <Badge variant="secondary" className={className}>
      <CheckCircle2 className="h-3 w-3 mr-1" />
      {acknowledgments.length}
    </Badge>
  )
}
