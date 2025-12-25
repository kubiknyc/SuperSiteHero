/**
 * BidAddendaSection
 * Manages bid addenda - viewing and creating changes/clarifications
 */

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  FileEdit,
  FileText,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  useBidAddenda,
  useCreateAddendum,
} from '@/features/bidding/hooks/useBidding'
import type { BidAddendum } from '@/types/bidding'
import { cn } from '@/lib/utils'

interface BidAddendaSectionProps {
  packageId: string
  currentBidDueDate: string
  readOnly?: boolean
}

interface AddendumCardProps {
  addendum: BidAddendum
}

function AddendumCard({ addendum }: AddendumCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono">
              Addendum #{addendum.addendum_number}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(addendum.issue_date), 'MMM d, yyyy')}
            </span>
            {addendum.extends_bid_date && (
              <Badge variant="secondary" className="text-xs">
                Extends Bid Date
              </Badge>
            )}
          </div>
          <h4 className="font-medium heading-card">{addendum.title}</h4>
          {addendum.description && (
            <p className="text-sm text-muted-foreground mt-1">{addendum.description}</p>
          )}
        </div>
        {addendum.document_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={addendum.document_url} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 mr-1" />
              View
            </a>
          </Button>
        )}
      </div>

      {addendum.changes_summary && (
        <div className="mt-3 pt-3 border-t">
          <Label className="text-xs text-muted-foreground">Changes Summary</Label>
          <p className="text-sm mt-1 whitespace-pre-wrap">{addendum.changes_summary}</p>
        </div>
      )}

      {addendum.affected_documents && addendum.affected_documents.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <Label className="text-xs text-muted-foreground">Affected Documents</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {addendum.affected_documents.map((doc, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {doc}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {addendum.extends_bid_date && addendum.new_bid_due_date && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-orange-500" />
          <span>
            New bid due date: <strong>{format(new Date(addendum.new_bid_due_date), 'MMMM d, yyyy')}</strong>
          </span>
        </div>
      )}
    </div>
  )
}

interface CreateAddendumDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageId: string
  currentBidDueDate: string
}

function CreateAddendumDialog({
  open,
  onOpenChange,
  packageId,
  currentBidDueDate,
}: CreateAddendumDialogProps) {
  const createAddendum = useCreateAddendum()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [changesSummary, setChangesSummary] = useState('')
  const [affectedDocuments, setAffectedDocuments] = useState('')
  const [extendsBidDate, setExtendsBidDate] = useState(false)
  const [newBidDueDate, setNewBidDueDate] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {return}

    await createAddendum.mutateAsync({
      bid_package_id: packageId,
      title: title.trim(),
      description: description.trim() || undefined,
      changes_summary: changesSummary.trim() || undefined,
      affected_documents: affectedDocuments
        ? affectedDocuments.split(',').map((d) => d.trim()).filter(Boolean)
        : undefined,
      extends_bid_date: extendsBidDate,
      new_bid_due_date: extendsBidDate && newBidDueDate ? newBidDueDate : undefined,
      document_url: documentUrl.trim() || undefined,
    })

    // Reset form
    setTitle('')
    setDescription('')
    setChangesSummary('')
    setAffectedDocuments('')
    setExtendsBidDate(false)
    setNewBidDueDate('')
    setDocumentUrl('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Issue Addendum</DialogTitle>
          <DialogDescription>
            Issue a formal change or clarification to the bid package
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Clarification on Structural Requirements"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the addendum..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="changes">Changes Summary</Label>
            <Textarea
              id="changes"
              placeholder="List the specific changes or clarifications..."
              value={changesSummary}
              onChange={(e) => setChangesSummary(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="affected">Affected Documents (comma-separated)</Label>
            <Input
              id="affected"
              placeholder="e.g., Spec Section 03300, Drawing S-101, Drawing S-102"
              value={affectedDocuments}
              onChange={(e) => setAffectedDocuments(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentUrl">Addendum Document URL</Label>
            <Input
              id="documentUrl"
              type="url"
              placeholder="https://..."
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="extends"
                checked={extendsBidDate}
                onCheckedChange={(checked) => setExtendsBidDate(checked === true)}
              />
              <Label htmlFor="extends" className="font-normal">
                Extend bid due date
              </Label>
            </div>

            {extendsBidDate && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="newDueDate">New Bid Due Date</Label>
                <Input
                  id="newDueDate"
                  type="date"
                  value={newBidDueDate}
                  onChange={(e) => setNewBidDueDate(e.target.value)}
                  min={currentBidDueDate}
                />
                <p className="text-xs text-muted-foreground">
                  Current due date: {format(new Date(currentBidDueDate), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createAddendum.isPending}>
              {createAddendum.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileEdit className="w-4 h-4 mr-2" />
              )}
              Issue Addendum
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BidAddendaSection({
  packageId,
  currentBidDueDate,
  readOnly = false,
}: BidAddendaSectionProps) {
  const { data: addenda, isLoading } = useBidAddenda(packageId)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              Addenda
            </CardTitle>
            <CardDescription>
              Changes and clarifications to the bid package
            </CardDescription>
          </div>
          {!readOnly && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Issue Addendum
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!addenda || addenda.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileEdit className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No addenda have been issued</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addenda.map((addendum) => (
                <AddendumCard key={addendum.id} addendum={addendum} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateAddendumDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        packageId={packageId}
        currentBidDueDate={currentBidDueDate}
      />
    </>
  )
}
