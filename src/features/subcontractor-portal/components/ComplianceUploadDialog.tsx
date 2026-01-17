/**
 * Compliance Upload Dialog Component
 * Dialog for uploading new compliance documents
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, Plus } from 'lucide-react'
import { useUploadComplianceDocument, getDocumentTypeLabel } from '../hooks/useComplianceDocuments'
import { useSubcontractorProjects } from '../hooks/useSubcontractorDashboard'
import type { ComplianceDocumentType, CreateComplianceDocumentDTO } from '@/types/subcontractor-portal'

interface ComplianceUploadDialogProps {
  subcontractorId: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const DOCUMENT_TYPES: ComplianceDocumentType[] = [
  'insurance_certificate',
  'license',
  'w9',
  'bond',
  'safety_cert',
  'other',
]

export function ComplianceUploadDialog({
  subcontractorId,
  trigger,
  onSuccess,
}: ComplianceUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    document_type: '' as ComplianceDocumentType | '',
    document_name: '',
    description: '',
    file_url: '',
    project_id: '',
    issue_date: '',
    expiration_date: '',
    coverage_amount: '',
    policy_number: '',
    provider_name: '',
  })

  const { data: projects } = useSubcontractorProjects()
  const uploadMutation = useUploadComplianceDocument()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.document_type || !formData.document_name || !formData.file_url) {
      return
    }

    const payload: CreateComplianceDocumentDTO = {
      subcontractor_id: subcontractorId,
      document_type: formData.document_type as ComplianceDocumentType,
      document_name: formData.document_name,
      file_url: formData.file_url,
    }

    if (formData.description) { payload.description = formData.description }
    if (formData.project_id) { payload.project_id = formData.project_id }
    if (formData.issue_date) { payload.issue_date = formData.issue_date }
    if (formData.expiration_date) { payload.expiration_date = formData.expiration_date }
    if (formData.coverage_amount) { payload.coverage_amount = parseFloat(formData.coverage_amount) }
    if (formData.policy_number) { payload.policy_number = formData.policy_number }
    if (formData.provider_name) { payload.provider_name = formData.provider_name }

    await uploadMutation.mutateAsync(payload)

    // Reset form and close
    setFormData({
      document_type: '',
      document_name: '',
      description: '',
      file_url: '',
      project_id: '',
      issue_date: '',
      expiration_date: '',
      coverage_amount: '',
      policy_number: '',
      provider_name: '',
    })
    setOpen(false)
    onSuccess?.()
  }

  const showInsuranceFields = formData.document_type === 'insurance_certificate' || formData.document_type === 'bond'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-card">Upload Compliance Document</DialogTitle>
          <DialogDescription>
            Upload a new compliance document. It will be reviewed by the project administrator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, document_type: value as ComplianceDocumentType }))
              }
            >
              <SelectTrigger id="document_type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getDocumentTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="document_name">Document Name *</Label>
            <Input
              id="document_name"
              placeholder="e.g., General Liability Insurance 2024"
              value={formData.document_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, document_name: e.target.value }))}
              required
            />
          </div>

          {/* File URL */}
          <div className="space-y-2">
            <Label htmlFor="file_url">File URL *</Label>
            <Input
              id="file_url"
              type="url"
              placeholder="https://..."
              value={formData.file_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, file_url: e.target.value }))}
              required
            />
            <p className="text-xs text-muted-foreground">
              Upload your document to a storage service and paste the URL here.
            </p>
          </div>

          {/* Project (Optional) */}
          {projects && projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_id: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger id="project_id">
                  <SelectValue placeholder="Select project (or leave blank for all)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Projects (General)</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, issue_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiration_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Insurance-specific fields */}
          {showInsuranceFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="provider_name">Insurance Provider</Label>
                <Input
                  id="provider_name"
                  placeholder="e.g., State Farm"
                  value={formData.provider_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, provider_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    placeholder="e.g., POL-123456"
                    value={formData.policy_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, policy_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage_amount">Coverage Amount</Label>
                  <Input
                    id="coverage_amount"
                    type="number"
                    placeholder="e.g., 1000000"
                    value={formData.coverage_amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, coverage_amount: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any additional notes about this document..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                uploadMutation.isPending ||
                !formData.document_type ||
                !formData.document_name ||
                !formData.file_url
              }
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ComplianceUploadDialog
