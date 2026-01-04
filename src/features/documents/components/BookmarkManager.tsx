// File: /src/features/documents/components/BookmarkManager.tsx
// Bookmark manager for saving and navigating to drawing locations

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Checkbox,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui'
import {
  Star,
  Bookmark,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Share2,
  ChevronDown,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface DrawingBookmark {
  id: string
  project_id: string
  user_id: string
  document_id: string
  page_number: number
  viewport: Viewport
  name: string
  folder: string | null
  shared: boolean
  created_at: string
  updated_at: string
}

interface BookmarkManagerProps {
  projectId: string
  documentId: string
  currentPage: number
  currentViewport: Viewport
  onNavigate: (documentId: string, page: number, viewport?: Viewport) => void
  variant?: 'dropdown' | 'panel'
}

interface BookmarkFormData {
  name: string
  folder: string
  shared: boolean
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchBookmarks(
  projectId: string,
  documentId: string
): Promise<DrawingBookmark[]> {
  const { data, error } = await supabase
    .from('drawing_bookmarks')
    .select('*')
    .eq('project_id', projectId)
    .eq('document_id', documentId)
    .order('folder', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching bookmarks:', error)
    throw error
  }

  return data || []
}

async function createBookmark(
  bookmark: Omit<DrawingBookmark, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<DrawingBookmark> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('drawing_bookmarks')
    .insert({
      ...bookmark,
      user_id: userData.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating bookmark:', error)
    throw error
  }

  return data
}

async function updateBookmark(
  id: string,
  updates: Partial<Pick<DrawingBookmark, 'name' | 'folder' | 'shared' | 'viewport'>>
): Promise<DrawingBookmark> {
  const { data, error } = await supabase
    .from('drawing_bookmarks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating bookmark:', error)
    throw error
  }

  return data
}

async function deleteBookmark(id: string): Promise<void> {
  const { error } = await supabase
    .from('drawing_bookmarks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting bookmark:', error)
    throw error
  }
}

// ============================================================================
// BOOKMARK MANAGER COMPONENT
// ============================================================================

export function BookmarkManager({
  projectId,
  documentId,
  currentPage,
  currentViewport,
  onNavigate,
  variant = 'dropdown',
}: BookmarkManagerProps) {
  const queryClient = useQueryClient()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<DrawingBookmark | null>(null)
  const [deleteDialogBookmark, setDeleteDialogBookmark] = useState<DrawingBookmark | null>(null)
  const [formData, setFormData] = useState<BookmarkFormData>({
    name: '',
    folder: '',
    shared: false,
  })

  // Fetch bookmarks
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['drawing_bookmarks', projectId, documentId],
    queryFn: () => fetchBookmarks(projectId, documentId),
  })

  // Create bookmark mutation
  const createMutation = useMutation({
    mutationFn: createBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing_bookmarks', projectId, documentId] })
      toast.success('Bookmark created successfully')
      setIsAddDialogOpen(false)
      resetForm()
    },
    onError: (error) => {
      console.error('Error creating bookmark:', error)
      toast.error('Failed to create bookmark')
    },
  })

  // Update bookmark mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateBookmark>[1] }) =>
      updateBookmark(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing_bookmarks', projectId, documentId] })
      toast.success('Bookmark updated successfully')
      setIsEditDialogOpen(false)
      setEditingBookmark(null)
      resetForm()
    },
    onError: (error) => {
      console.error('Error updating bookmark:', error)
      toast.error('Failed to update bookmark')
    },
  })

  // Delete bookmark mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing_bookmarks', projectId, documentId] })
      toast.success('Bookmark deleted successfully')
      setDeleteDialogBookmark(null)
    },
    onError: (error) => {
      console.error('Error deleting bookmark:', error)
      toast.error('Failed to delete bookmark')
    },
  })

  // Group bookmarks by folder
  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, DrawingBookmark[]> = {
      '': [], // No folder group
    }

    bookmarks.forEach((bookmark) => {
      const folder = bookmark.folder || ''
      if (!groups[folder]) {
        groups[folder] = []
      }
      groups[folder].push(bookmark)
    })

    return groups
  }, [bookmarks])

  const resetForm = () => {
    setFormData({
      name: '',
      folder: '',
      shared: false,
    })
  }

  const handleAddBookmark = () => {
    if (!formData.name.trim()) {
      toast.error('Bookmark name is required')
      return
    }

    createMutation.mutate({
      project_id: projectId,
      document_id: documentId,
      page_number: currentPage,
      viewport: currentViewport,
      name: formData.name.trim(),
      folder: formData.folder.trim() || null,
      shared: formData.shared,
    })
  }

  const handleEditBookmark = () => {
    if (!editingBookmark) return

    if (!formData.name.trim()) {
      toast.error('Bookmark name is required')
      return
    }

    updateMutation.mutate({
      id: editingBookmark.id,
      updates: {
        name: formData.name.trim(),
        folder: formData.folder.trim() || null,
        shared: formData.shared,
      },
    })
  }

  const handleDeleteBookmark = (bookmark: DrawingBookmark) => {
    setDeleteDialogBookmark(bookmark)
  }

  const confirmDelete = () => {
    if (deleteDialogBookmark) {
      deleteMutation.mutate(deleteDialogBookmark.id)
    }
  }

  const handleNavigateToBookmark = (bookmark: DrawingBookmark) => {
    onNavigate(bookmark.document_id, bookmark.page_number, bookmark.viewport)
    toast.success(`Navigated to bookmark: ${bookmark.name}`)
  }

  const openEditDialog = (bookmark: DrawingBookmark) => {
    setEditingBookmark(bookmark)
    setFormData({
      name: bookmark.name,
      folder: bookmark.folder || '',
      shared: bookmark.shared,
    })
    setIsEditDialogOpen(true)
  }

  // Auto-populate form when opening add dialog
  useEffect(() => {
    if (isAddDialogOpen) {
      setFormData({
        name: `Page ${currentPage} - Zoom ${Math.round(currentViewport.zoom * 100)}%`,
        folder: '',
        shared: false,
      })
    }
  }, [isAddDialogOpen, currentPage, currentViewport.zoom])

  if (variant === 'dropdown') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
              title="Bookmarks"
            >
              <Bookmark className="w-4 h-4 mr-1" />
              Bookmarks
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 max-h-[500px] overflow-y-auto bg-surface border-gray-700"
          >
            <DropdownMenuLabel className="flex items-center justify-between text-gray-200">
              <span>Drawing Bookmarks</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="h-6 px-2 text-xs text-primary hover:text-primary-hover"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />

            {isLoading && (
              <div className="p-4 text-center text-sm text-gray-400">
                Loading bookmarks...
              </div>
            )}

            {!isLoading && bookmarks.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">
                No bookmarks yet. Click Add to save current view.
              </div>
            )}

            {!isLoading && bookmarks.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto">
                {Object.entries(groupedBookmarks).map(([folder, folderBookmarks]) => {
                  if (folderBookmarks.length === 0) return null

                  return (
                    <div key={folder}>
                      {folder && (
                        <DropdownMenuLabel className="text-xs text-gray-400 flex items-center gap-1 py-1">
                          <FolderOpen className="w-3 h-3" />
                          {folder}
                        </DropdownMenuLabel>
                      )}
                      <DropdownMenuGroup>
                        {folderBookmarks.map((bookmark) => (
                          <div
                            key={bookmark.id}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700 group"
                          >
                            <button
                              onClick={() => handleNavigateToBookmark(bookmark)}
                              className="flex-1 text-left text-sm text-gray-200 hover:text-white flex items-center gap-2"
                            >
                              <Star
                                className={cn(
                                  'w-3 h-3',
                                  bookmark.shared ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                                )}
                              />
                              <span className="flex-1 truncate">{bookmark.name}</span>
                              <span className="text-xs text-gray-500">
                                pg. {bookmark.page_number}
                              </span>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {bookmark.shared && (
                                <Share2 className="w-3 h-3 text-gray-400" title="Shared" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditDialog(bookmark)
                                }}
                                className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteBookmark(bookmark)
                                }}
                                className="h-5 w-5 p-0 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </DropdownMenuGroup>
                      {folder !== '' && <DropdownMenuSeparator className="bg-gray-700" />}
                    </div>
                  )
                })}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Bookmark Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="bg-surface border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Add Bookmark</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bookmark-name" className="text-gray-200">
                  Bookmark Name *
                </Label>
                <Input
                  id="bookmark-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Lobby Detail"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookmark-folder" className="text-gray-200">
                  Folder (optional)
                </Label>
                <Input
                  id="bookmark-folder"
                  value={formData.folder}
                  onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                  placeholder="e.g., Floor Plans"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bookmark-shared"
                  checked={formData.shared}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, shared: checked as boolean })
                  }
                />
                <Label
                  htmlFor="bookmark-shared"
                  className="text-sm text-gray-200 cursor-pointer flex items-center gap-1"
                >
                  <Share2 className="w-3 h-3" />
                  Share with team
                </Label>
              </div>
              <div className="text-xs text-gray-400 bg-gray-800 p-3 rounded border border-gray-700">
                <p className="mb-1">
                  <strong>Page:</strong> {currentPage}
                </p>
                <p className="mb-1">
                  <strong>Zoom:</strong> {Math.round(currentViewport.zoom * 100)}%
                </p>
                <p>
                  <strong>Position:</strong> ({Math.round(currentViewport.x)},{' '}
                  {Math.round(currentViewport.y)})
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBookmark}
                disabled={createMutation.isPending || !formData.name.trim()}
                className="bg-primary hover:bg-primary-hover"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Bookmark'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Bookmark Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-surface border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Edit Bookmark</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bookmark-name" className="text-gray-200">
                  Bookmark Name *
                </Label>
                <Input
                  id="edit-bookmark-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Lobby Detail"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bookmark-folder" className="text-gray-200">
                  Folder (optional)
                </Label>
                <Input
                  id="edit-bookmark-folder"
                  value={formData.folder}
                  onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                  placeholder="e.g., Floor Plans"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-bookmark-shared"
                  checked={formData.shared}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, shared: checked as boolean })
                  }
                />
                <Label
                  htmlFor="edit-bookmark-shared"
                  className="text-sm text-gray-200 cursor-pointer flex items-center gap-1"
                >
                  <Share2 className="w-3 h-3" />
                  Share with team
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingBookmark(null)
                  resetForm()
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditBookmark}
                disabled={updateMutation.isPending || !formData.name.trim()}
                className="bg-primary hover:bg-primary-hover"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteDialogBookmark}
          onOpenChange={(open) => !open && setDeleteDialogBookmark(null)}
        >
          <AlertDialogContent className="bg-surface border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">Delete Bookmark</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to delete the bookmark "{deleteDialogBookmark?.name}"? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Panel variant (for future implementation)
  return (
    <div className="p-4 bg-surface border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Bookmarks
        </h3>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-primary hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading && (
        <div className="text-center text-sm text-gray-400 py-8">Loading bookmarks...</div>
      )}

      {!isLoading && bookmarks.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-8">
          No bookmarks yet. Click Add to save current view.
        </div>
      )}

      {!isLoading && bookmarks.length > 0 && (
        <div className="space-y-2">
          {Object.entries(groupedBookmarks).map(([folder, folderBookmarks]) => {
            if (folderBookmarks.length === 0) return null

            return (
              <div key={folder}>
                {folder && (
                  <div className="text-xs text-gray-400 flex items-center gap-1 py-2">
                    <FolderOpen className="w-3 h-3" />
                    {folder}
                  </div>
                )}
                <div className="space-y-1">
                  {folderBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 group"
                    >
                      <button
                        onClick={() => handleNavigateToBookmark(bookmark)}
                        className="flex-1 text-left text-sm text-gray-200 hover:text-white flex items-center gap-2"
                      >
                        <Star
                          className={cn(
                            'w-4 h-4',
                            bookmark.shared ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                          )}
                        />
                        <span className="flex-1">{bookmark.name}</span>
                        <span className="text-xs text-gray-500">pg. {bookmark.page_number}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        {bookmark.shared && (
                          <Share2 className="w-3 h-3 text-gray-400" title="Shared" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(bookmark)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBookmark(bookmark)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
