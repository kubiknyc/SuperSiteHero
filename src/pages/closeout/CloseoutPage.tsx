/**
 * Closeout Page
 *
 * Project closeout document tracking and warranty management.
 * Provides a comprehensive view of all closeout requirements.
 */

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  CloseoutDocumentList,
  WarrantyList,
  CloseoutDocumentFormDialog,
  WarrantyFormDialog,
  PunchListCloseoutSummary,
  useCloseoutDocuments,
  useWarranties,
  useCloseoutStatistics,
  useWarrantyStatistics,
  useCreateCloseoutDocument,
  useUpdateCloseoutDocument,
  useCreateWarranty,
  useUpdateWarranty,
  usePunchListCloseout,
} from '@/features/closeout'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import {
  CLOSEOUT_DOCUMENT_TYPES,
  WARRANTY_TYPES,
  type CloseoutDocumentWithDetails,
  type WarrantyWithDetails,
  type CreateCloseoutDocumentDTO,
  type UpdateCloseoutDocumentDTO,
  type CreateWarrantyDTO,
  type UpdateWarrantyDTO,
} from '@/types/closeout'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  FolderCheck,
  Building2,
  FileCheck,
  Shield,
  Loader2,
  CheckCircle2,
  Clock,
  CheckSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

/**
 * Export closeout documents to CSV format
 */
function exportDocumentsToCSV(documents: CloseoutDocumentWithDetails[]): void {
  const headers = [
    'Document Type',
    'Title',
    'Status',
    'Spec Section',
    'Subcontractor',
    'Responsible Party',
    'Required',
    'Required Date',
    'Submitted Date',
    'Approved Date',
    'Notes',
  ]

  const rows = documents.map((doc) => [
    CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type,
    doc.title,
    doc.status,
    doc.spec_section || '',
    doc.subcontractor?.company_name || '',
    doc.responsible_party || '',
    doc.required ? 'Yes' : 'No',
    doc.required_date ? format(new Date(doc.required_date), 'yyyy-MM-dd') : '',
    doc.submitted_date ? format(new Date(doc.submitted_date), 'yyyy-MM-dd') : '',
    doc.approved_date ? format(new Date(doc.approved_date), 'yyyy-MM-dd') : '',
    doc.notes || '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell)
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `closeout_documents_${format(new Date(), 'yyyy-MM-dd')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export warranties to CSV format
 */
function exportWarrantiesToCSV(warranties: WarrantyWithDetails[]): void {
  const headers = [
    'Title',
    'Warranty Type',
    'Status',
    'Spec Section',
    'Subcontractor',
    'Manufacturer',
    'Manufacturer Contact',
    'Manufacturer Phone',
    'Manufacturer Email',
    'Start Date',
    'End Date',
    'Duration (Years)',
    'Coverage Description',
    'Notes',
  ]

  const rows = warranties.map((w) => [
    w.title,
    WARRANTY_TYPES.find((t) => t.value === w.warranty_type)?.label || w.warranty_type || '',
    w.status,
    w.spec_section || '',
    w.subcontractor?.company_name || '',
    w.manufacturer_name || '',
    w.manufacturer_contact || '',
    w.manufacturer_phone || '',
    w.manufacturer_email || '',
    w.start_date ? format(new Date(w.start_date), 'yyyy-MM-dd') : '',
    w.end_date ? format(new Date(w.end_date), 'yyyy-MM-dd') : '',
    w.duration_years?.toString() || '',
    w.coverage_description || '',
    w.notes || '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell)
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `warranties_${format(new Date(), 'yyyy-MM-dd')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


export function CloseoutPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('documents')
  const [currentTime] = useState(() => Date.now())

  // Dialog state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false)
  const [editingDocument, setEditingDocument] = useState<CloseoutDocumentWithDetails | null>(null)
  const [showWarrantyDialog, setShowWarrantyDialog] = useState(false)
  const [editingWarranty, setEditingWarranty] = useState<WarrantyWithDetails | null>(null)
  const [, setIsExportingDocuments] = useState(false)
  const [, setIsExportingWarranties] = useState(false)

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useProjects()

  // Fetch closeout data
  const {
    data: documents = [],
    isLoading: documentsLoading,
  } = useCloseoutDocuments(selectedProjectId || undefined)

  const {
    data: warranties = [],
    isLoading: warrantiesLoading,
  } = useWarranties(selectedProjectId || undefined)

  const { data: closeoutStats } = useCloseoutStatistics(selectedProjectId || undefined)
  const { data: warrantyStats } = useWarrantyStatistics(selectedProjectId || undefined)
  const { data: punchListStatus } = usePunchListCloseout(selectedProjectId || undefined)

  // Fetch subcontractors for form dialogs
  const { data: contacts = [] } = useContacts(selectedProjectId || undefined, {
    contactType: 'subcontractor',
  })
  const subcontractors = contacts.map((c) => ({
    id: c.id,
    company_name: c.company_name || `${c.first_name} ${c.last_name}`,
  }))

  // Mutations
  const createDocument = useCreateCloseoutDocument()
  const updateDocument = useUpdateCloseoutDocument()
  const createWarranty = useCreateWarranty()
  const updateWarranty = useUpdateWarranty()

  // Calculate overview stats
  const totalDocuments = documents.length
  const receivedDocuments = documents.filter((d: CloseoutDocumentWithDetails) => d.status === 'approved' || d.status === 'submitted').length
  const _pendingDocuments = documents.filter((d: CloseoutDocumentWithDetails) => d.status === 'pending' || d.status === 'under_review').length
  const completionPercent = totalDocuments > 0 ? Math.round((receivedDocuments / totalDocuments) * 100) : 0

  const totalWarranties = warranties.length
  const activeWarranties = warranties.filter((w: WarrantyWithDetails) => w.status === 'active').length
  const expiringWarranties = warranties.filter((w: WarrantyWithDetails) => {
    const daysUntil = Math.ceil(
      (new Date(w.end_date).getTime() - currentTime) / (1000 * 60 * 60 * 24)
    )
    return w.status === 'active' && daysUntil <= 90 && daysUntil > 0
  }).length

  const isLoading = documentsLoading || warrantiesLoading

  // Document handlers
  const handleDocumentClick = (doc: CloseoutDocumentWithDetails) => {
    setEditingDocument(doc)
    setShowDocumentDialog(true)
  }

  const handleCreateDocument = () => {
    setEditingDocument(null)
    setShowDocumentDialog(true)
  }

  const handleDocumentSubmit = async (data: CreateCloseoutDocumentDTO | UpdateCloseoutDocumentDTO) => {
    try {
      if (editingDocument) {
        await updateDocument.mutateAsync({ id: editingDocument.id, ...data })
        toast.success('Document updated successfully')
      } else {
        await createDocument.mutateAsync(data as CreateCloseoutDocumentDTO)
        toast.success('Document created successfully')
      }
      setShowDocumentDialog(false)
      setEditingDocument(null)
    } catch (_error) {
      toast.error(editingDocument ? 'Failed to update document' : 'Failed to create document')
    }
  }

  const handleExportDocuments = () => {
    if (!documents || documents.length === 0) {
      toast.error('No documents to export')
      return
    }
    setIsExportingDocuments(true)
    try {
      exportDocumentsToCSV(documents)
      toast.success(`Exported ${documents.length} documents to CSV`)
    } catch (_error) {
      toast.error('Failed to export documents')
    } finally {
      setIsExportingDocuments(false)
    }
  }

  // Warranty handlers
  const handleWarrantyClick = (warranty: WarrantyWithDetails) => {
    setEditingWarranty(warranty)
    setShowWarrantyDialog(true)
  }

  const handleCreateWarranty = () => {
    setEditingWarranty(null)
    setShowWarrantyDialog(true)
  }

  const handleWarrantySubmit = async (data: CreateWarrantyDTO | UpdateWarrantyDTO) => {
    try {
      if (editingWarranty) {
        await updateWarranty.mutateAsync({ id: editingWarranty.id, ...data })
        toast.success('Warranty updated successfully')
      } else {
        await createWarranty.mutateAsync(data as CreateWarrantyDTO)
        toast.success('Warranty created successfully')
      }
      setShowWarrantyDialog(false)
      setEditingWarranty(null)
    } catch (_error) {
      toast.error(editingWarranty ? 'Failed to update warranty' : 'Failed to create warranty')
    }
  }

  const handleExportWarranties = () => {
    if (!warranties || warranties.length === 0) {
      toast.error('No warranties to export')
      return
    }
    setIsExportingWarranties(true)
    try {
      exportWarrantiesToCSV(warranties)
      toast.success(`Exported ${warranties.length} warranties to CSV`)
    } catch (_error) {
      toast.error('Failed to export warranties')
    } finally {
      setIsExportingWarranties(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 heading-page">
              <FolderCheck className="h-7 w-7 text-success" />
              Project Closeout
            </h1>
            <p className="text-secondary mt-1">
              Track closeout documents and warranty information
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Select Project
                </label>
                <Select
                  value={selectedProjectId || 'none'}
                  onValueChange={(value) => setSelectedProjectId(value === 'none' ? '' : value)}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a project...</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">Select a Project</h3>
              <p className="text-muted">
                Choose a project above to view closeout documents and warranties
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
              <p className="text-muted">Loading closeout data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-info-light rounded-lg p-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Documents</p>
                      <p className="text-xl font-bold">
                        {receivedDocuments}/{totalDocuments}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-success-light rounded-lg p-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Completion</p>
                      <p className="text-xl font-bold text-success">
                        {completionPercent}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${
                      punchListStatus?.isReadyForCloseout
                        ? 'bg-green-100'
                        : (punchListStatus?.open || 0) + (punchListStatus?.inProgress || 0) > 0
                          ? 'bg-orange-100'
                          : 'bg-muted'
                    }`}>
                      <CheckSquare className={`h-5 w-5 ${
                        punchListStatus?.isReadyForCloseout
                          ? 'text-green-600'
                          : (punchListStatus?.open || 0) + (punchListStatus?.inProgress || 0) > 0
                            ? 'text-orange-600'
                            : 'text-secondary'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Punch List</p>
                      <p className={`text-xl font-bold ${
                        punchListStatus?.isReadyForCloseout
                          ? 'text-green-600'
                          : (punchListStatus?.open || 0) + (punchListStatus?.inProgress || 0) > 0
                            ? 'text-orange-600'
                            : ''
                      }`}>
                        {punchListStatus?.verified || 0}/{punchListStatus?.total || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-lg p-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Active Warranties</p>
                      <p className="text-xl font-bold">{activeWarranties}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${expiringWarranties > 0 ? 'bg-orange-100' : 'bg-muted'}`}>
                      <Clock className={`h-5 w-5 ${expiringWarranties > 0 ? 'text-orange-600' : 'text-secondary'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Expiring Soon</p>
                      <p className={`text-xl font-bold ${expiringWarranties > 0 ? 'text-orange-600' : ''}`}>
                        {expiringWarranties}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Documents, Warranties, and Punch Lists */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Documents ({totalDocuments})
                </TabsTrigger>
                <TabsTrigger value="warranties" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Warranties ({totalWarranties})
                </TabsTrigger>
                <TabsTrigger value="punchlist" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Punch List
                  {punchListStatus && !punchListStatus.isReadyForCloseout && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-6">
                <CloseoutDocumentList
                  documents={documents}
                  statistics={closeoutStats}
                  onDocumentClick={handleDocumentClick}
                  onCreateDocument={handleCreateDocument}
                  onExport={handleExportDocuments}
                />
              </TabsContent>

              <TabsContent value="warranties" className="mt-6">
                <WarrantyList
                  warranties={warranties}
                  statistics={warrantyStats}
                  onWarrantyClick={handleWarrantyClick}
                  onCreateWarranty={handleCreateWarranty}
                  onExport={handleExportWarranties}
                />
              </TabsContent>

              <TabsContent value="punchlist" className="mt-6">
                <PunchListCloseoutSummary projectId={selectedProjectId} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Closeout Document Form Dialog */}
        <CloseoutDocumentFormDialog
          open={showDocumentDialog}
          onOpenChange={(open) => {
            setShowDocumentDialog(open)
            if (!open) {setEditingDocument(null)}
          }}
          document={editingDocument}
          projectId={selectedProjectId}
          subcontractors={subcontractors}
          onSubmit={handleDocumentSubmit}
          isLoading={createDocument.isPending || updateDocument.isPending}
        />

        {/* Warranty Form Dialog */}
        <WarrantyFormDialog
          open={showWarrantyDialog}
          onOpenChange={(open) => {
            setShowWarrantyDialog(open)
            if (!open) {setEditingWarranty(null)}
          }}
          warranty={editingWarranty}
          projectId={selectedProjectId}
          subcontractors={subcontractors}
          onSubmit={handleWarrantySubmit}
          isLoading={createWarranty.isPending || updateWarranty.isPending}
        />
      </div>
    </AppLayout>
  )
}

export default CloseoutPage
