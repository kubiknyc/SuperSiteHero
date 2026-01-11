/**
 * Transmittal Form Component
 * Create and manage document transmittals
 */

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { format } from 'date-fns'
import {
  Send,
  Plus,
  Trash2,
  FileText,
  Building2,
  User,
  Calendar,
  MessageSquare,
  Package,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useTransmittals,
  useCreateTransmittal,
  useUpdateTransmittalStatus,
  useDrawingRegister,
  type DocumentTransmittal,
} from '../hooks/useDrawingRevisions'

// Transmittal purposes
const TRANSMITTAL_PURPOSES = [
  { value: 'approval', label: 'For Approval' },
  { value: 'review', label: 'For Review' },
  { value: 'information', label: 'For Information' },
  { value: 'construction', label: 'Issued for Construction' },
  { value: 'record', label: 'For Record' },
  { value: 'resubmit', label: 'Resubmit as Noted' },
  { value: 'reference', label: 'For Reference' },
]

interface TransmittalFormProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (transmittal: DocumentTransmittal) => void
}

interface TransmittalFormData {
  toCompany: string
  toContact: string
  transmittedFor: string
  remarks: string
  items: Array<{
    documentId?: string
    drawingNumber: string
    title: string
    revision: string
    copies: number
    notes: string
  }>
}

export function TransmittalForm({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: TransmittalFormProps) {
  const { data: drawings } = useDrawingRegister(projectId)
  const createTransmittal = useCreateTransmittal()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransmittalFormData>({
    defaultValues: {
      toCompany: '',
      toContact: '',
      transmittedFor: 'information',
      remarks: '',
      items: [
        {
          drawingNumber: '',
          title: '',
          revision: '',
          copies: 1,
          notes: '',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const onSubmit = async (data: TransmittalFormData) => {
    try {
      const transmittal = await createTransmittal.mutateAsync({
        projectId,
        toCompany: data.toCompany,
        toContact: data.toContact || undefined,
        transmittedFor: data.transmittedFor,
        remarks: data.remarks || undefined,
        items: data.items
          .filter((item) => item.drawingNumber || item.title)
          .map((item) => ({
            documentId: item.documentId,
            drawingNumber: item.drawingNumber || undefined,
            title: item.title || undefined,
            revision: item.revision || undefined,
            copies: item.copies || 1,
            notes: item.notes || undefined,
          })),
      })

      toast.success(`Transmittal ${transmittal.transmittal_number} created`)
      reset()
      onOpenChange(false)
      onSuccess?.(transmittal)
    } catch (error) {
      toast.error('Failed to create transmittal')
      console.error('Transmittal creation error:', error)
    }
  }

  // Add drawing from register
  const handleAddDrawing = (drawing: NonNullable<typeof drawings>[0]) => {
    append({
      documentId: drawing.id,
      drawingNumber: drawing.drawing_number || '',
      title: drawing.drawing_title || drawing.title,
      revision: `${drawing.revision_number || 0}${drawing.revision_letter ? drawing.revision_letter : ''}`,
      copies: 1,
      notes: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create Transmittal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Recipient Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                To Company *
              </Label>
              <Input
                {...register('toCompany', { required: 'Company is required' })}
                placeholder="Recipient company name"
              />
              {errors.toCompany && (
                <p className="text-sm text-destructive">{errors.toCompany.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-4 w-4 text-muted-foreground" />
                Attention
              </Label>
              <Input {...register('toContact')} placeholder="Contact name" />
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              Transmitted For
            </Label>
            <Select
              value={watch('transmittedFor')}
              onValueChange={(value) => setValue('transmittedFor', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSMITTAL_PURPOSES.map((purpose) => (
                  <SelectItem key={purpose.value} value={purpose.value}>
                    {purpose.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Documents / Drawings
              </Label>
              <div className="flex gap-2">
                {drawings && drawings.length > 0 && (
                  <Select onValueChange={(id) => {
                    const drawing = drawings.find((d) => d.id === id)
                    if (drawing) {handleAddDrawing(drawing)}
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add from register..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drawings.map((drawing) => (
                        <SelectItem key={drawing.id} value={drawing.id}>
                          {drawing.drawing_number} - {drawing.drawing_title || drawing.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      drawingNumber: '',
                      title: '',
                      revision: '',
                      copies: 1,
                      notes: '',
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Drawing #</TableHead>
                    <TableHead>Title / Description</TableHead>
                    <TableHead className="w-[80px]">Rev</TableHead>
                    <TableHead className="w-[80px]">Copies</TableHead>
                    <TableHead className="w-[150px]">Notes</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input
                          {...register(`items.${index}.drawingNumber`)}
                          placeholder="A-101"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`items.${index}.title`)}
                          placeholder="Document title..."
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`items.${index}.revision`)}
                          placeholder="1"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.copies`, { valueAsNumber: true })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`items.${index}.notes`)}
                          placeholder="Notes..."
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Remarks
            </Label>
            <Textarea
              {...register('remarks')}
              placeholder="Additional notes or instructions..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransmittal.isPending}>
              {createTransmittal.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Create Transmittal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Transmittal List Component
// =============================================

interface TransmittalListProps {
  projectId: string
  className?: string
}

export function TransmittalList({ projectId, className }: TransmittalListProps) {
  const [showForm, setShowForm] = useState(false)
  const { data: transmittals, isLoading } = useTransmittals(projectId)
  const updateStatus = useUpdateTransmittalStatus()

  const handleAcknowledge = async (transmittalId: string) => {
    try {
      await updateStatus.mutateAsync({ transmittalId, status: 'acknowledged' })
      toast.success('Transmittal acknowledged')
    } catch (error) {
      toast.error('Failed to acknowledge transmittal')
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Transmittals</h2>
          <Badge variant="secondary">{transmittals?.length || 0}</Badge>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Transmittal
        </Button>
      </div>

      {/* List */}
      {!transmittals || transmittals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No transmittals yet</p>
            <p className="text-sm mt-1">Create a transmittal to send documents</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transmittals.map((transmittal) => (
            <Card key={transmittal.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {transmittal.transmittal_number}
                      <TransmittalStatusBadge status={transmittal.status} />
                    </CardTitle>
                    <CardDescription>
                      To: {transmittal.to_company}
                      {transmittal.to_contact && ` - ${transmittal.to_contact}`}
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(transmittal.date_sent), 'MMM d, yyyy')}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Purpose: </span>
                    <span className="font-medium">
                      {TRANSMITTAL_PURPOSES.find((p) => p.value === transmittal.transmitted_for)?.label ||
                        transmittal.transmitted_for}
                    </span>
                    {transmittal.items && transmittal.items.length > 0 && (
                      <span className="ml-4 text-muted-foreground">
                        {transmittal.items.length} item(s)
                      </span>
                    )}
                  </div>
                  {transmittal.status === 'sent' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(transmittal.id)}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <TransmittalForm
        projectId={projectId}
        open={showForm}
        onOpenChange={setShowForm}
      />
    </div>
  )
}

// Status Badge Component
function TransmittalStatusBadge({ status }: { status: DocumentTransmittal['status'] }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: 'Draft' },
    sent: { variant: 'default', label: 'Sent' },
    acknowledged: { variant: 'outline', label: 'Acknowledged' },
    returned: { variant: 'destructive', label: 'Returned' },
  }

  const config = variants[status] || { variant: 'secondary', label: status }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

// =============================================
// Printable Transmittal Component
// =============================================

interface PrintableTransmittalProps {
  transmittal: DocumentTransmittal
  projectName?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  className?: string
}

/**
 * Print-ready transmittal layout
 * Uses print-friendly CSS for professional document output
 */
export function PrintableTransmittal({
  transmittal,
  projectName = 'Project',
  companyName = 'Company Name',
  companyAddress = '',
  companyPhone = '',
  companyEmail = '',
  className,
}: PrintableTransmittalProps) {
  const handlePrint = () => {
    window.print()
  }

  const purposeLabel = TRANSMITTAL_PURPOSES.find(
    (p) => p.value === transmittal.transmitted_for
  )?.label || transmittal.transmitted_for || 'For Information'

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-transmittal,
          .printable-transmittal * {
            visibility: visible;
          }
          .printable-transmittal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.5in;
            font-size: 10pt;
            line-height: 1.4;
          }
          .no-print {
            display: none !important;
          }
          .print-table {
            border-collapse: collapse;
            width: 100%;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 4px 8px;
            text-align: left;
          }
          .print-table th {
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-header {
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .print-signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 4px;
          }
        }
      `}</style>

      <div className={cn('printable-transmittal bg-white', className)}>
        {/* Print Button - Hidden when printing */}
        <div className="no-print mb-4 flex justify-end">
          <Button onClick={handlePrint} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Print Transmittal
          </Button>
        </div>

        {/* Header */}
        <div className="print-header flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">{companyName}</h1>
            {companyAddress && <p className="text-sm text-gray-600">{companyAddress}</p>}
            <div className="flex gap-4 text-sm text-gray-600 mt-1">
              {companyPhone && <span>Tel: {companyPhone}</span>}
              {companyEmail && <span>Email: {companyEmail}</span>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">TRANSMITTAL</h2>
            <p className="text-lg font-semibold mt-1">{transmittal.transmittal_number}</p>
            <p className="text-sm text-gray-600">
              Date: {format(new Date(transmittal.date_sent), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Project & Recipient Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* To */}
          <div className="border border-gray-300 p-4 rounded">
            <h3 className="font-semibold text-sm text-gray-500 mb-2">TO:</h3>
            <p className="font-bold">{transmittal.to_company}</p>
            {transmittal.to_contact && (
              <p className="text-sm">Attn: {transmittal.to_contact}</p>
            )}
          </div>

          {/* From / Project */}
          <div className="border border-gray-300 p-4 rounded">
            <h3 className="font-semibold text-sm text-gray-500 mb-2">PROJECT:</h3>
            <p className="font-bold">{projectName}</p>
            {transmittal.from_company && (
              <p className="text-sm mt-2">From: {transmittal.from_company}</p>
            )}
          </div>
        </div>

        {/* Purpose */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-gray-500 mb-2">TRANSMITTED FOR:</h3>
          <div className="flex flex-wrap gap-4">
            {TRANSMITTAL_PURPOSES.map((purpose) => (
              <label key={purpose.value} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'w-4 h-4 border border-gray-400 inline-flex items-center justify-center',
                    transmittal.transmitted_for === purpose.value && 'bg-black'
                  )}
                >
                  {transmittal.transmitted_for === purpose.value && (
                    <span className="text-white text-xs">X</span>
                  )}
                </span>
                {purpose.label}
              </label>
            ))}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-gray-500 mb-2">DOCUMENTS TRANSMITTED:</h3>
          <table className="print-table w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold w-24">
                  No.
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold w-32">
                  Drawing #
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  Title / Description
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold w-20">
                  Rev
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold w-20">
                  Copies
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold w-40">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {transmittal.items && transmittal.items.length > 0 ? (
                transmittal.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono">
                      {item.drawing_number || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {item.title || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                      {item.revision || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                      {item.copies}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border border-gray-300 px-3 py-4 text-sm text-center text-gray-500">
                    No items attached to this transmittal
                  </td>
                </tr>
              )}
              {/* Empty rows for manual additions */}
              {Array.from({ length: Math.max(0, 5 - (transmittal.items?.length || 0)) }).map(
                (_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {(transmittal.items?.length || 0) + idx + 1}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Remarks */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-gray-500 mb-2">REMARKS:</h3>
          <div className="border border-gray-300 p-3 min-h-[80px] rounded">
            {transmittal.remarks || (
              <span className="text-gray-400 italic">No remarks</span>
            )}
          </div>
        </div>

        {/* Signature Lines */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <div className="print-signature-line border-t border-black mt-10 pt-1">
              <p className="text-sm">Sent By (Signature)</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Date: {format(new Date(transmittal.date_sent), 'MM/dd/yyyy')}
            </p>
          </div>
          <div>
            <div className="print-signature-line border-t border-black mt-10 pt-1">
              <p className="text-sm">Received By (Signature)</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">Date: _______________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
          <p>
            Please acknowledge receipt by signing and returning a copy of this transmittal.
          </p>
          <p className="mt-1">
            Transmittal ID: {transmittal.id}
          </p>
        </div>
      </div>
    </>
  )
}

export default TransmittalForm
