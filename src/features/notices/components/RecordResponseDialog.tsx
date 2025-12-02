// File: /src/features/notices/components/RecordResponseDialog.tsx
// Dialog for recording a response to a notice

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useRecordNoticeResponseWithNotification } from '../hooks'
import { RESPONSE_STATUSES } from '../types'
import { NoticeDocumentUpload } from './NoticeDocumentUpload'
import { CheckCircle } from 'lucide-react'
import type { Notice } from '../types'
import { logger } from '@/lib/utils/logger'

interface RecordResponseDialogProps {
  notice: Notice
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function RecordResponseDialog({
  notice,
  trigger,
  onSuccess,
}: RecordResponseDialogProps) {
  const [open, setOpen] = useState(false)

  // Form state
  const [responseDate, setResponseDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [responseStatus, setResponseStatus] = useState('submitted')
  const [responseDocumentUrl, setResponseDocumentUrl] = useState<string | null>(
    notice.response_document_url || null
  )

  const recordResponse = useRecordNoticeResponseWithNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!responseDate) {
      return
    }

    try {
      await recordResponse.mutateAsync({
        id: notice.id,
        projectId: notice.project_id,
        response: {
          response_date: responseDate,
          response_status: responseStatus,
          response_document_url: responseDocumentUrl,
        },
      })

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      logger.error('Failed to record response:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Record Response
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Response</DialogTitle>
        </DialogHeader>

        {/* Notice reference */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-500">Recording response for:</p>
          <p className="font-medium">
            {notice.reference_number && `${notice.reference_number} - `}
            {notice.subject}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Response Date */}
          <div className="space-y-2">
            <Label htmlFor="response-date">Response Date *</Label>
            <Input
              id="response-date"
              type="date"
              value={responseDate}
              onChange={(e) => setResponseDate(e.target.value)}
              required
            />
          </div>

          {/* Response Status */}
          <div className="space-y-2">
            <Label htmlFor="response-status">Response Status *</Label>
            <Select
              id="response-status"
              value={responseStatus}
              onChange={(e) => setResponseStatus(e.target.value)}
            >
              {RESPONSE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Response Document Upload */}
          <div className="space-y-2">
            <Label>Response Document</Label>
            <NoticeDocumentUpload
              projectId={notice.project_id}
              noticeId={notice.id}
              type="response"
              currentUrl={responseDocumentUrl}
              onUploadComplete={(url) => setResponseDocumentUrl(url)}
              onRemove={() => setResponseDocumentUrl(null)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={recordResponse.isPending}>
              {recordResponse.isPending ? 'Saving...' : 'Save Response'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
