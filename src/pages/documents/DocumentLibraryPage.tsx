// File: /src/pages/documents/DocumentLibraryPage.tsx
// Main document library page with folder navigation

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderPlus,
  ChevronRight,
  Folder,
  FolderOpen,
  Grid3x3,
  List,
  Menu,
  X,
  Loader2,
  FileText
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from '@/components/ui'
import { DocumentUpload } from '@/features/documents/components/DocumentUpload'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { DocumentTypeIcon } from '@/features/documents/components/DocumentTypeIcon'
import { DocumentStatusBadge } from '@/features/documents/components/DocumentStatusBadge'
import { useDocuments, useFolders } from '@/features/documents/hooks/useDocuments'
import {
  useCreateFolderWithNotification,
  useDeleteDocumentWithNotification,
  useUpdateDocumentWithNotification,
} from '@/features/documents/hooks/useDocumentsMutations'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { cn } from '@/lib/utils'
import type { Document, Folder as FolderType, DocumentStatus, DocumentType } from '@/types/database'

/**
 * DocumentLibraryPage Component
 *
 * Main document library with folder navigation, filtering, and document management.
 *
 * Features:
 * - Project selector dropdown (required)
 * - Left sidebar with folder tree navigation
 * - Breadcrumb navigation
 * - Document upload
 * - Status and type filtering
 * - List/grid view toggle
 * - Create folder functionality
 * - Responsive design (collapsible sidebar on mobile)
 *
 * Usage:
 * This is a full page component used in App routing:
 * <Route path="/documents" element={<DocumentLibraryPage />} />
 */
function DocumentLibraryPage() {
  const navigate = useNavigate()

  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null)
  const [editFormData, setEditFormData] = useState({ name: '', description: '' })

  // Queries
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: allFolders, isLoading: foldersLoading } = useFolders(selectedProjectId || undefined)
  const { data: documents, isLoading: documentsLoading } = useDocuments(
    selectedProjectId || undefined,
    currentFolderId
  )

  // Mutations
  const createFolder = useCreateFolderWithNotification()
  const deleteDocument = useDeleteDocumentWithNotification()
  const updateDocument = useUpdateDocumentWithNotification()

  // Build folder tree structure
  const folderTree = useMemo(() => {
    if (!allFolders) {return []}

    const buildTree = (parentId: string | null): FolderType[] => {
      return allFolders
        .filter(folder => folder.parent_folder_id === parentId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }

    return buildTree(null)
  }, [allFolders])

  // Get child folders for a given parent
  const getChildFolders = (parentId: string): FolderType[] => {
    if (!allFolders) {return []}
    return allFolders
      .filter(folder => folder.parent_folder_id === parentId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId || !allFolders) {return []}

    const path: FolderType[] = []
    let folderId: string | null = currentFolderId

    while (folderId) {
      const folder = allFolders.find(f => f.id === folderId)
      if (folder) {
        path.unshift(folder)
        folderId = folder.parent_folder_id
      } else {
        break
      }
    }

    return path
  }, [currentFolderId, allFolders])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!documents) {return []}

    return documents.filter(doc => {
      const statusMatch = statusFilter === 'all' || doc.status === statusFilter
      const typeMatch = typeFilter === 'all' || doc.document_type === typeFilter

      // Search term matching
      const searchLower = searchTerm.toLowerCase()
      const searchMatch = !searchTerm ||
        doc.name.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.drawing_number?.toLowerCase().includes(searchLower) ||
        doc.specification_section?.toLowerCase().includes(searchLower)

      return statusMatch && typeMatch && searchMatch
    })
  }, [documents, statusFilter, typeFilter, searchTerm])

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Handle folder navigation
  const handleFolderClick = (folderId: string | null) => {
    setCurrentFolderId(folderId)
  }

  // Handle create folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !selectedProjectId) {return}

    createFolder.mutate(
      {
        project_id: selectedProjectId,
        parent_folder_id: currentFolderId,
        name: newFolderName.trim(),
        description: null,
        sort_order: allFolders?.filter(f => f.parent_folder_id === currentFolderId).length || 0,
        deleted_at: null,
        created_by: null, // Set by mutation hook
      },
      {
        onSuccess: () => {
          setNewFolderName('')
          setCreateFolderDialogOpen(false)
        }
      }
    )
  }

  // Handle document actions
  const handleViewDocument = (doc: Document) => {
    navigate(`/documents/${doc.id}`)
  }

  const handleEditDocument = (doc: Document) => {
    setDocumentToEdit(doc)
    setEditFormData({ name: doc.name, description: doc.description || '' })
    setEditDialogOpen(true)
  }

  const handleDeleteDocument = (doc: Document) => {
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!documentToDelete) {return}
    deleteDocument.mutate(documentToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setDocumentToDelete(null)
      },
    })
  }

  const handleUpdateDocument = () => {
    if (!documentToEdit) {return}
    updateDocument.mutate(
      {
        id: documentToEdit.id,
        updates: {
          name: editFormData.name.trim(),
          description: editFormData.description.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false)
          setDocumentToEdit(null)
          setEditFormData({ name: '', description: '' })
        },
      }
    )
  }

  // Recursive folder tree renderer
  const renderFolderTree = (folders: FolderType[], level = 0) => {
    return folders.map(folder => {
      const isExpanded = expandedFolders.has(folder.id)
      const isSelected = currentFolderId === folder.id
      const childFolders = getChildFolders(folder.id)
      const hasChildren = childFolders.length > 0

      return (
        <div key={folder.id}>
          <button
            onClick={() => handleFolderClick(folder.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              isSelected
                ? 'bg-info-light text-blue-900 font-medium'
                : 'text-secondary hover:bg-muted',
            )}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform flex-shrink-0',
                  isExpanded && 'rotate-90'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFolder(folder.id)
                }}
              />
            )}
            {!hasChildren && <span className="w-4" />}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate flex-1 text-left">{folder.name}</span>
          </button>

          {hasChildren && isExpanded && (
            <div>{renderFolderTree(childFolders, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground" className="heading-page">Document Library</h1>
              <p className="text-sm text-secondary mt-1">
                Manage drawings, specifications, and project documents
              </p>
            </div>

            {/* Mobile sidebar toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>

          {/* Project Selector */}
          <div className="max-w-md">
            <Label htmlFor="project-select">Select Project *</Label>
            <Select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value)
                setCurrentFolderId(null) // Reset folder selection
              }}
              className="mt-1"
              disabled={projectsLoading}
            >
              <option value="">
                {projectsLoading ? 'Loading projects...' : 'Select a project'}
              </option>
              {projects?.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Main Content Area */}
        {!selectedProjectId ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-foreground mb-2" className="heading-subsection">
                  Select a Project
                </h3>
                <p className="text-secondary">
                  Please select a project from the dropdown above to view documents.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Folder Navigation */}
            <aside
              className={cn(
                'w-64 border-r bg-card overflow-y-auto transition-all lg:block',
                sidebarOpen ? 'block' : 'hidden'
              )}
            >
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground" className="heading-subsection">Folders</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateFolderDialogOpen(true)}
                    title="Create new folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                </div>

                {/* All Documents option */}
                <button
                  onClick={() => handleFolderClick(null)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    currentFolderId === null
                      ? 'bg-info-light text-blue-900 font-medium'
                      : 'text-secondary hover:bg-muted'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  All Documents
                </button>

                {/* Folder Tree */}
                {foldersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-disabled" />
                  </div>
                ) : folderTree.length > 0 ? (
                  renderFolderTree(folderTree)
                ) : (
                  <p className="text-sm text-muted text-center py-4">
                    No folders yet
                  </p>
                )}
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <button
                    onClick={() => handleFolderClick(null)}
                    className="hover:text-foreground transition-colors"
                  >
                    All Documents
                  </button>
                  {breadcrumbPath.map((folder, index) => (
                    <div key={folder.id} className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      <button
                        onClick={() => handleFolderClick(folder.id)}
                        className={cn(
                          'hover:text-foreground transition-colors',
                          index === breadcrumbPath.length - 1 && 'text-foreground font-medium'
                        )}
                      >
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Document Upload */}
                <DocumentUpload
                  projectId={selectedProjectId}
                  folderId={currentFolderId}
                  onUploadSuccess={(doc) => {
                    console.log('Document uploaded:', doc)
                  }}
                />

                {/* Filters and View Toggle */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Search Input */}
                      <div className="flex-1">
                        <Label htmlFor="search-docs">Search Documents</Label>
                        <Input
                          id="search-docs"
                          type="text"
                          placeholder="Search by name, drawing number, or section..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        {/* Status Filter */}
                        <div className="flex-1">
                        <Label htmlFor="status-filter">Status</Label>
                        <Select
                          id="status-filter"
                          value={statusFilter ?? 'all'}
                          onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                          className="mt-1"
                        >
                          <option value="all">All Statuses</option>
                          <option value="current">Current</option>
                          <option value="superseded">Superseded</option>
                          <option value="archived">Archived</option>
                          <option value="void">Void</option>
                        </Select>
                      </div>

                      {/* Type Filter */}
                      <div className="flex-1">
                        <Label htmlFor="type-filter">Document Type</Label>
                        <Select
                          id="type-filter"
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
                          className="mt-1"
                        >
                          <option value="all">All Types</option>
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

                      {/* View Toggle */}
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          title="List view"
                        >
                          <List className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          title="Grid view"
                        >
                          <Grid3x3 className="w-4 h-4" />
                        </Button>
                      </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document List */}
                {viewMode === 'list' ? (
                  <DocumentList
                    documents={filteredDocuments}
                    isLoading={documentsLoading}
                    onView={handleViewDocument}
                    onEdit={handleEditDocument}
                    onDelete={handleDeleteDocument}
                    searchTerm={searchTerm}
                  />
                ) : (
                  // Grid view (simplified for now)
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {documentsLoading ? (
                      <div className="col-span-full flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-disabled" />
                      </div>
                    ) : filteredDocuments.length === 0 ? (
                      <div className="col-span-full">
                        <Card>
                          <CardContent className="p-12 text-center">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-foreground mb-2" className="heading-subsection">
                              No documents found
                            </h3>
                            <p className="text-muted">
                              Upload your first document to get started.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      filteredDocuments.map(doc => (
                        <Card
                          key={doc.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                              <DocumentTypeIcon
                                type={doc.document_type}
                                className="w-12 h-12 mb-3 text-primary"
                              />
                              <h4 className="font-medium text-foreground text-sm mb-2 line-clamp-2" className="heading-card">
                                {doc.name}
                              </h4>
                              <DocumentStatusBadge status={doc.status ?? 'draft'} className="text-xs" />
                              <p className="text-xs text-muted mt-2">
                                v{doc.version}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder()
                }
              }}
              autoFocus
            />
            {currentFolderId && (
              <p className="text-sm text-muted mt-2">
                Parent folder: {breadcrumbPath[breadcrumbPath.length - 1]?.name || 'Root'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateFolderDialogOpen(false)
                setNewFolderName('')
              }}
              disabled={createFolder.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-secondary">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {documentToDelete?.name}
              </span>
              ?
            </p>
            <p className="text-sm text-muted mt-2">
              This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDocumentToDelete(null)
              }}
              disabled={deleteDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="edit-doc-name">Document Name</Label>
              <Input
                id="edit-doc-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter document name"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="edit-doc-description">Description (optional)</Label>
              <Input
                id="edit-doc-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Enter description"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setDocumentToEdit(null)
                setEditFormData({ name: '', description: '' })
              }}
              disabled={updateDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDocument}
              disabled={!editFormData.name.trim() || updateDocument.isPending}
            >
              {updateDocument.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default DocumentLibraryPage
