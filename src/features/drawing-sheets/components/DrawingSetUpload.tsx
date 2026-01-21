// File: /src/features/drawing-sheets/components/DrawingSetUpload.tsx
// Upload component for multipage PDF drawing sets with AI processing

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, FileIcon, X, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/AuthContext'

interface DrawingSetUploadProps {
  projectId: string
  companyId: string
  onUploadComplete?: (documentId: string, sheetsCreated: number) => void
  onCancel?: () => void
}

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'processing' | 'complete' | 'error'

interface UploadState {
  status: UploadStatus
  progress: number
  message: string
  documentId?: string
  sheetsCreated?: number
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ACCEPTED_TYPES = ['application/pdf']

/**
 * DrawingSetUpload Component
 *
 * Handles uploading multipage PDF drawing sets with automatic AI processing.
 *
 * Flow:
 * 1. User drops or selects a PDF file
 * 2. File is validated (type, size)
 * 3. File is uploaded to Supabase Storage
 * 4. Document record is created
 * 5. Edge Function is called to split PDF into sheets
 * 6. AI extraction is queued for each sheet
 */
export function DrawingSetUpload({
  projectId,
  companyId,
  onUploadComplete,
  onCancel,
}: DrawingSetUploadProps) {
  const { userProfile } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle drag over
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  // Handle drag leave
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only PDF files are accepted' }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 100MB' }
    }
    return { valid: true }
  }

  // Handle file selection
  const handleFileSelection = (file: File) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }
    setSelectedFile(file)
    setUploadState({ status: 'idle', progress: 0, message: '' })
  }

  // Handle drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  // Handle browse button click
  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  // Clear selected file
  const handleClearFile = () => {
    setSelectedFile(null)
    setUploadState({ status: 'idle', progress: 0, message: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {return `${bytes} B`}
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`}
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !userProfile) {return}

    try {
      // Step 1: Validating
      setUploadState({
        status: 'validating',
        progress: 10,
        message: 'Validating file...',
      })

      // Step 2: Uploading to storage
      setUploadState({
        status: 'uploading',
        progress: 20,
        message: 'Uploading to storage...',
      })

      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}_${selectedFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      const fileUrl = urlData?.publicUrl

      setUploadState({
        status: 'uploading',
        progress: 50,
        message: 'Creating document record...',
      })

      // Step 3: Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: selectedFile.name.replace(`.${fileExt}`, ''),
          file_url: fileUrl,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          document_type: 'drawing',
          uploaded_by: userProfile.id,
          status: 'processing',
        } as any)
        .select()
        .single()

      if (docError || !document) {
        throw new Error(`Failed to create document: ${docError?.message}`)
      }

      setUploadState({
        status: 'processing',
        progress: 70,
        message: 'Processing PDF and extracting sheets...',
      })

      // Step 4: Call the Edge Function to process the PDF
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      const processResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-drawing-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            document_id: document.id,
            project_id: projectId,
            company_id: companyId,
          }),
        }
      )

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Processing failed')
      }

      const processResult = await processResponse.json()

      if (!processResult.success) {
        throw new Error(processResult.error || 'Processing failed')
      }

      // Step 5: Complete
      setUploadState({
        status: 'complete',
        progress: 100,
        message: `Successfully created ${processResult.sheets_created} sheets`,
        documentId: document.id,
        sheetsCreated: processResult.sheets_created,
      })

      toast.success(`Drawing set uploaded! ${processResult.sheets_created} sheets created.`)

      // Call callback
      onUploadComplete?.(document.id, processResult.sheets_created)
    } catch (error) {
      logger.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'

      setUploadState({
        status: 'error',
        progress: 0,
        message: errorMessage,
      })

      toast.error(errorMessage)
    }
  }

  const isProcessing = ['validating', 'uploading', 'processing'].includes(uploadState.status)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Drawing Set
        </CardTitle>
        <CardDescription>
          Upload a multipage PDF to automatically extract and process individual sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            isProcessing && 'pointer-events-none opacity-60'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!selectedFile ? handleBrowseClick : undefined}
        >
          {!selectedFile ? (
            <div className="space-y-2">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to upload</span> or drag and
                drop
              </div>
              <p className="text-xs text-muted-foreground">PDF files up to 100MB</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <FileIcon className="h-10 w-10 text-primary" />
              <div className="text-left">
                <p className="font-medium truncate max-w-[300px]">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFile()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />
        </div>

        {/* Progress */}
        {uploadState.status !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {uploadState.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : uploadState.status === 'error' ? (
                  <X className="h-4 w-4 text-destructive" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {uploadState.message}
              </span>
              {uploadState.status !== 'error' && (
                <Badge variant={uploadState.status === 'complete' ? 'default' : 'secondary'}>
                  {uploadState.progress}%
                </Badge>
              )}
            </div>
            {uploadState.status !== 'error' && (
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    uploadState.status === 'complete' ? 'bg-success' : 'bg-primary'
                  )}
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing || uploadState.status === 'complete'}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : uploadState.status === 'complete' ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
