import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, X } from 'lucide-react'

interface AcknowledgmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAcknowledge: (data: { acknowledgedBy: string; signature?: string; notes?: string }) => Promise<void>
  isSubmitting?: boolean
}

export function AcknowledgmentDialog({
  open,
  onOpenChange,
  onAcknowledge,
  isSubmitting = false,
}: AcknowledgmentDialogProps) {
  const [acknowledgedBy, setAcknowledgedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {return}
    const canvas = canvasRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const handleCanvasMouseUp = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) {return}
    setSignature(canvas.toDataURL())
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature(null)
  }

  const handleSubmit = async () => {
    if (!acknowledgedBy.trim()) {return}
    await onAcknowledge({
      acknowledgedBy: acknowledgedBy.trim(),
      signature: signature || undefined,
      notes: notes.trim() || undefined,
    })
    // Reset form
    setAcknowledgedBy('')
    setNotes('')
    clearSignature()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acknowledge Site Instruction</DialogTitle>
          <DialogDescription>
            By acknowledging, you confirm receipt of this instruction and understand the requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="acknowledgedBy">Your Name *</Label>
            <Input
              id="acknowledgedBy"
              placeholder="Enter your full name"
              value={acknowledgedBy}
              onChange={(e) => setAcknowledgedBy(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signature (optional)</Label>
              {signature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="border rounded-md bg-white">
              <canvas
                ref={canvasRef}
                width={380}
                height={100}
                className="cursor-crosshair w-full"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
            <p className="text-xs text-muted-foreground">Draw your signature above</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any comments or questions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!acknowledgedBy.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acknowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
