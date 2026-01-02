import { useState } from 'react'
import { useCreateDocumentVersion } from '../hooks/useDocuments'
import { validateFile } from '../utils/fileUtils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { logger } from '../../../lib/utils/logger';


interface UploadDocumentVersionProps {
  documentId: string
  documentName: string
  projectId: string
}

export function UploadDocumentVersion({
  documentId,
  documentName,
  projectId,
}: UploadDocumentVersionProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const createVersion = useCreateDocumentVersion()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    // Validate file before upload
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file type or size')
      return
    }

    setUploading(true)

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${documentId}_v${Date.now()}.${fileExt}`
      const filePath = `${projectId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {throw uploadError}

      // Get public URL for the uploaded file
      const {
        data: { publicUrl },
      } = supabase.storage.from('documents').getPublicUrl(filePath)

      // Create new version in database
      await createVersion.mutateAsync({
        documentId,
        newFileUrl: publicUrl,
        versionNotes: versionNotes || undefined,
      })

      toast.success('New document version uploaded successfully')

      // Reset form and close dialog
      setFile(null)
      setVersionNotes('')
      setOpen(false)
    } catch (error) {
      logger.error('Upload error:', error)
      toast.error('Failed to upload new version')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload New Version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1 block">
              Current Document
            </Label>
            <p className="text-sm text-secondary">{documentName}</p>
          </div>

          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium mb-1 block">
              New File *
            </Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="version-notes" className="text-sm font-medium mb-1 block">
              Version Notes
            </Label>
            <Textarea
              id="version-notes"
              placeholder="Describe what changed in this version..."
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              rows={4}
              disabled={uploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UploadDocumentVersion
