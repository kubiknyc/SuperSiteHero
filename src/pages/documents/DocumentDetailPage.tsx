// File: /src/pages/documents/DocumentDetailPage.tsx
// Document detail page with comprehensive metadata, version history, and actions

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  Pin,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
  User,
  Ruler,
  Calendar,
  CheckCircle2,
  XCircle,
  Pencil,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { DocumentTypeIcon } from '@/features/documents/components/DocumentTypeIcon'
import { DocumentStatusBadge } from '@/features/documents/components/DocumentStatusBadge'
import { DocumentViewer } from '@/features/documents/components/viewers'
import { DocumentVersionHistory } from '@/features/documents/components/DocumentVersionHistory'
import { UploadDocumentVersion } from '@/features/documents/components/UploadDocumentVersion'
import { DocumentAiPanel } from '@/features/documents/components/DocumentAiPanel'
import { SubmitForApprovalButton, ApprovalStatusBadge } from '@/features/approvals/components'
import { useEntityApprovalStatus } from '@/features/approvals/hooks'
import {
  useDocument,
  useDocumentVersions,
} from '@/features/documents/hooks/useDocuments'
import {
  useUpdateDocumentWithNotification,
  useDeleteDocumentWithNotification,
} from '@/features/documents/hooks/useDocumentsMutations'
import { cn } from '@/lib/utils'
import type { Document, DocumentType, DocumentStatus } from '@/types/database'

/**
 * DocumentDetailPage Component
 *
 * Comprehensive document detail view with metadata, version history, and actions.
 *
 * Features:
 * - Back button navigation
 * - Document preview area with file information
 * - Complete metadata display
 * - Action buttons: Download, Edit, Delete, Pin
 * - Version history with current version highlighted
 * - Related documents (superseded by)
 * - Edit dialog for metadata
 * - Delete confirmation dialog
 * - Mobile responsive layout
 *
 * Usage:
 * This is a full page component used in App routing:
 * <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
 */
export function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()

  // State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Document>>({})

  // Queries
  const { data: document, isLoading, error } = useDocument(documentId)
  const { data: versions, isLoading: versionsLoading } = useDocumentVersions(documentId)
  const { data: approvalStatus } = useEntityApprovalStatus('document', documentId)

  // Mutations
  const updateDocument = useUpdateDocumentWithNotification()
  const deleteDocument = useDeleteDocumentWithNotification()

  // Handle pin toggle
  const handlePinToggle = () => {
    if (!document) {return}
    updateDocument.mutate({
      id: document.id,
      updates: { is_pinned: !document.is_pinned }
    })
  }

  // Handle edit dialog open
  const handleEditOpen = () => {
    if (!document) {return}
    setEditFormData({
      name: document.name,
      description: document.description,
      document_type: document.document_type,
      discipline: document.discipline,
      drawing_number: document.drawing_number,
      specification_section: document.specification_section,
      version: document.version,
      revision: document.revision,
      status: document.status,
      issue_date: document.issue_date,
    })
    setEditDialogOpen(true)
  }

  // Handle edit save
  const handleEditSave = () => {
    if (!document) {return}
    updateDocument.mutate(
      {
        id: document.id,
        updates: editFormData
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false)
        }
      }
    )
  }

  // Handle delete
  const handleDelete = () => {
    if (!document) {return}
    deleteDocument.mutate(document.id, {
      onSuccess: () => {
        navigate('/documents')
      }
    })
  }

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes || bytes === 0) {return 'Unknown size'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Get file icon component
  const getFileIcon = () => {
    if (!document) {return <File className="w-20 h-20 text-disabled" />}

    const ext = document.file_name.split('.').pop()?.toLowerCase()

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-20 h-20 text-primary" />
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-20 h-20 text-error" />
    }
    return <File className="w-20 h-20 text-muted" />
  }

  // Find documents that supersede this one
  const supersededBy = versions?.find(v => v.supersedes_document_id === document?.id)

  // Filter versions to show history (exclude current)
  const versionHistory = versions?.filter(v => v.id !== document?.id) || []

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-disabled" />
            <p className="ml-3 text-muted">Loading document...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state
  if (error || !document) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Button variant="outline" onClick={() => navigate('/documents')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">
                Error Loading Document
              </h3>
              <p className="text-secondary">
                {error?.message || 'Document not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <div>
          <Button variant="outline" onClick={() => navigate('/documents')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>

        {/* Document Title Header */}
        <div className="flex items-start gap-4">
          <DocumentTypeIcon type={document.document_type} className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground mb-2 heading-page">{document.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <DocumentStatusBadge status={document.status ?? 'draft'} />
              {document.is_pinned && (
                <Badge className="bg-amber-100 text-amber-800">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {document.requires_approval && (
                <Badge className="bg-purple-100 text-purple-800">Requires Approval</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <DocumentViewer
            document={document}
            allowMarkup={true}
            readOnly={false}
            height="h-96"
            enableMarkup={false}
          />
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Preview and Metadata */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Preview Card */}
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">{getFileIcon()}</div>
                <CardTitle className="text-xl">{document.file_name}</CardTitle>
                <p className="text-sm text-muted mt-2">
                  {formatFileSize(document.file_size)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Actions */}
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open File
                    </Button>
                  </a>
                  <a href={document.file_url} download>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                </div>

                {/* File Information */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-foreground heading-card">File Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-secondary">File Name</Label>
                      <p className="text-foreground break-all">{document.file_name}</p>
                    </div>
                    <div>
                      <Label className="text-secondary">File Size</Label>
                      <p className="text-foreground">{formatFileSize(document.file_size)}</p>
                    </div>
                    <div>
                      <Label className="text-secondary">File Type</Label>
                      <p className="text-foreground">{document.file_type || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata Section */}
            <Card>
              <CardHeader>
                <CardTitle>Document Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document.description && (
                  <div>
                    <Label className="text-secondary">Description</Label>
                    <p className="mt-1 text-foreground whitespace-pre-wrap">
                      {document.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-secondary">Document Type</Label>
                    <p className="mt-1 text-foreground capitalize">
                      {document.document_type.replace('_', ' ')}
                    </p>
                  </div>

                  <div>
                    <Label className="text-secondary">Version</Label>
                    <p className="mt-1 text-foreground">
                      {document.version}
                      {document.revision && ` (Rev ${document.revision})`}
                    </p>
                  </div>

                  {document.drawing_number && (
                    <div>
                      <Label className="text-secondary">Drawing Number</Label>
                      <p className="mt-1 text-foreground">{document.drawing_number}</p>
                    </div>
                  )}

                  {document.discipline && (
                    <div>
                      <Label className="text-secondary">Discipline</Label>
                      <p className="mt-1 text-foreground capitalize">{document.discipline}</p>
                    </div>
                  )}

                  {document.specification_section && (
                    <div>
                      <Label className="text-secondary">Specification Section</Label>
                      <p className="mt-1 text-foreground">{document.specification_section}</p>
                    </div>
                  )}

                  {document.issue_date && (
                    <div>
                      <Label className="text-secondary">Issue Date</Label>
                      <p className="mt-1 text-foreground">
                        {document.issue_date ? format(new Date(document.issue_date), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  )}

                  {document.received_date && (
                    <div>
                      <Label className="text-secondary">Received Date</Label>
                      <p className="mt-1 text-foreground">
                        {document.received_date ? format(new Date(document.received_date), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-secondary">Created Date</Label>
                    <p className="mt-1 text-foreground">
                      {document.created_at ? format(new Date(document.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </p>
                  </div>

                  {document.updated_at && document.updated_at !== document.created_at && (
                    <div>
                      <Label className="text-secondary">Last Modified</Label>
                      <p className="mt-1 text-foreground">
                        {document.updated_at ? format(new Date(document.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  {/* Primary Action - Open Markup Mode */}
                  <Button
                    onClick={() => navigate(`/documents/${document.id}/markup`)}
                    size="lg"
                    className="bg-primary hover:bg-primary-hover"
                  >
                    <Pencil className="w-5 h-5 mr-2" />
                    Open Markup Mode
                  </Button>

                  {/* Secondary Actions */}
                  <div className="flex flex-wrap gap-3">
                    <UploadDocumentVersion
                      documentId={document.id}
                      documentName={document.name}
                      projectId={document.project_id}
                    />
                    <DocumentVersionHistory documentId={document.id} />
                    <Button onClick={handleEditOpen} variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Metadata
                    </Button>
                    {document.project_id && (
                      <Button
                        onClick={() => navigate(`/projects/${document.project_id}/documents/${document.id}/takeoff`)}
                        variant="outline"
                      >
                        <Ruler className="w-4 h-4 mr-2" />
                        Takeoffs
                      </Button>
                    )}
                    <Button
                      onClick={handlePinToggle}
                      variant="outline"
                      disabled={updateDocument.isPending}
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {document.is_pinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <Button
                      onClick={() => setDeleteDialogOpen(true)}
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Status and Approval */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-secondary">Document Status</Label>
                  <div className="mt-2">
                    <DocumentStatusBadge status={document.status ?? 'draft'} className="text-base px-3 py-1" />
                  </div>
                </div>

                {/* Approval Status */}
                {approvalStatus?.has_active_request && (
                  <div>
                    <Label className="text-secondary">Approval Status</Label>
                    <div className="mt-2">
                      <ApprovalStatusBadge
                        status={approvalStatus.status!}
                        conditions={approvalStatus.conditions}
                        showConditions
                      />
                    </div>
                  </div>
                )}

                {/* Submit for Approval */}
                {document.requires_approval && approvalStatus?.can_submit && (
                  <div className="pt-2">
                    <SubmitForApprovalButton
                      entityType="document"
                      entityId={document.id}
                      entityName={document.name}
                      projectId={document.project_id}
                    />
                  </div>
                )}

                {document.requires_approval && !approvalStatus?.has_active_request && !approvalStatus?.can_submit && (
                  <div>
                    <Label className="text-secondary">Approval Status</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span className="text-sm font-medium text-success-dark">Already Approved</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Version History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Version History</CardTitle>
              </CardHeader>
              <CardContent>
                {versionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-disabled" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Current Version */}
                    <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-blue-900">
                          Version {document.version}
                        </span>
                        <Badge className="bg-primary text-white text-xs">Current</Badge>
                      </div>
                      {document.revision && (
                        <p className="text-sm text-primary-hover">Revision {document.revision}</p>
                      )}
                      <p className="text-xs text-primary mt-1">
                        {document.created_at ? format(new Date(document.created_at), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>

                    {/* Previous Versions */}
                    {versionHistory.length > 0 ? (
                      versionHistory.map(version => (
                        <div
                          key={version.id}
                          className="border-l-4 border-input pl-3 py-2 hover:bg-surface cursor-pointer transition-colors"
                          onClick={() => navigate(`/documents/${version.id}`)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground">
                              Version {version.version}
                            </span>
                            <DocumentStatusBadge status={version.status ?? 'draft'} className="text-xs" />
                          </div>
                          {version.revision && (
                            <p className="text-sm text-secondary">Revision {version.revision}</p>
                          )}
                          <p className="text-xs text-muted mt-1">
                            {version.created_at ? format(new Date(version.created_at), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted text-center py-4">
                        No previous versions
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Documents */}
            {supersededBy && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-secondary">Superseded By</Label>
                    <div
                      className="p-3 bg-warning-light border border-amber-200 rounded-md cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => navigate(`/documents/${supersededBy.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <DocumentTypeIcon
                          type={supersededBy.document_type}
                          className="w-4 h-4 text-amber-700"
                        />
                        <span className="font-medium text-amber-900">{supersededBy.name}</span>
                      </div>
                      <p className="text-xs text-amber-700">
                        Version {supersededBy.version} • {supersededBy.created_at ? format(new Date(supersededBy.created_at), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Panel */}
            <DocumentAiPanel
              documentId={document.id}
              projectId={document.project_id}
              onNavigateToDocument={(id) => navigate(`/documents/${id}`)}
            />
          </div>
        </div>
      </div>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document Metadata</DialogTitle>
            <DialogDescription>
              Update document information and metadata. File cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Document Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Document Type</Label>
                <Select
                  id="edit-type"
                  value={editFormData.document_type || 'general'}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, document_type: e.target.value as DocumentType })
                  }
                  className="mt-1"
                >
                  <option value="drawing">Drawing</option>
                  <option value="specification">Specification</option>
                  <option value="submittal">Submittal</option>
                  <option value="shop_drawing">Shop Drawing</option>
                  <option value="scope">Scope of Work</option>
                  <option value="general">General</option>
                  <option value="photo">Photo</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  id="edit-status"
                  value={editFormData.status || 'current'}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value as DocumentStatus })
                  }
                  className="mt-1"
                >
                  <option value="current">Current</option>
                  <option value="superseded">Superseded</option>
                  <option value="archived">Archived</option>
                  <option value="void">Void</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-version">Version</Label>
                <Input
                  id="edit-version"
                  value={editFormData.version || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, version: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-revision">Revision</Label>
                <Input
                  id="edit-revision"
                  value={editFormData.revision || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, revision: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-discipline">Discipline</Label>
                <Input
                  id="edit-discipline"
                  value={editFormData.discipline || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, discipline: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-drawing-number">Drawing Number</Label>
                <Input
                  id="edit-drawing-number"
                  value={editFormData.drawing_number || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, drawing_number: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-spec-section">Spec Section</Label>
                <Input
                  id="edit-spec-section"
                  value={editFormData.specification_section || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, specification_section: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-issue-date">Issue Date</Label>
                <Input
                  id="edit-issue-date"
                  type="date"
                  value={editFormData.issue_date || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, issue_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editFormData.name?.trim() || updateDocument.isPending}
            >
              {updateDocument.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-error-light border border-red-200 rounded-md">
              <XCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">{document.name}</p>
                <p className="text-sm text-error-dark mt-1">{document.file_name}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Delete Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
