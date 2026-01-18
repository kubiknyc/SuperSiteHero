// File: /src/pages/material-lists/MaterialListsPage.tsx
// Material Lists management page - displays procurement lists generated from takeoffs

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { MaterialListGenerator } from '@/features/material-lists'
import { useMaterialLists, useDeleteMaterialList, useCreateMaterialList } from '@/features/material-lists/hooks'
import { useTakeoffItems } from '@/features/takeoffs/hooks/useTakeoffItems'
import { useAssemblies } from '@/features/takeoffs/hooks/useAssemblies'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  FileDown,
  Trash2,
  Eye,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import type { MaterialList, MaterialListInsert } from '@/types/drawing-sheets'
import type { TakeoffItemWithCategory } from '@/features/material-lists/components/MaterialListGenerator'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'exported', label: 'Exported' },
  { value: 'ordered', label: 'Ordered' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  finalized: 'bg-blue-500',
  exported: 'bg-green-500',
  ordered: 'bg-purple-500',
}

export function MaterialListsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showGenerator, setShowGenerator] = useState(false)
  const [deleteListId, setDeleteListId] = useState<string | null>(null)

  // Material lists data
  const { data: lists, isLoading, refetch } = useMaterialLists(projectId)
  const deleteList = useDeleteMaterialList()
  const createList = useCreateMaterialList()

  // Takeoff data for generator
  const { data: takeoffItems, isLoading: takeoffsLoading } = useTakeoffItems(
    showGenerator ? projectId : undefined
  )
  const { data: assemblies } = useAssemblies()

  // Enrich takeoff items with assembly categories
  const enrichedTakeoffItems: TakeoffItemWithCategory[] = (takeoffItems || []).map((item) => {
    const assembly = assemblies?.find((a) => a.id === item.assembly_id)
    return {
      ...item,
      category: assembly?.category || null,
      assembly: assembly || null,
    }
  })

  // Filter lists
  const filteredLists = lists?.filter((list) => {
    const matchesSearch =
      !searchTerm ||
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || list.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewList = (list: MaterialList) => {
    navigate(`/projects/${projectId}/material-lists/${list.id}`)
  }

  const handleDeleteList = (listId: string) => {
    setDeleteListId(listId)
  }

  const confirmDelete = async () => {
    if (deleteListId) {
      await deleteList.mutateAsync(deleteListId)
      setDeleteListId(null)
    }
  }

  const handleCreateNew = () => {
    setShowGenerator(true)
  }

  const handleGenerate = async (materialList: MaterialListInsert) => {
    const result = await createList.mutateAsync(materialList)
    setShowGenerator(false)
    refetch()
    // Navigate to the new list
    if (result?.id) {
      navigate(`/projects/${projectId}/material-lists/${result.id}`)
    }
  }

  const handleCancelGenerator = () => {
    setShowGenerator(false)
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-none border-b border-border bg-background p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Material Lists</h1>
              <p className="text-muted-foreground text-sm">
                Procurement lists generated from takeoffs with waste factors
              </p>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Generate from Takeoff
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search material lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label="Search material lists"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredLists && filteredLists.length > 0 ? (
            <div className="space-y-4">
              {filteredLists.map((list) => (
                <div
                  key={list.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{list.name}</h3>
                        <Badge
                          className={`${STATUS_COLORS[list.status] || 'bg-gray-500'} text-white`}
                        >
                          {list.status}
                        </Badge>
                      </div>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {list.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          <ClipboardList className="h-4 w-4 inline mr-1" />
                          {list.totals.total_line_items} items
                        </span>
                        <span>
                          Created {new Date(list.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewList(list)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteList(list.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              {searchTerm || statusFilter !== 'all' ? (
                <>
                  <h3 className="font-medium mb-2">No material lists match your filters</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-md">
                    Try adjusting your search term or status filter to find what you're looking for.
                  </p>
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="font-medium mb-2">No material lists yet</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-md">
                    Generate your first material list from takeoff measurements. Material lists help you
                    track procurement items with waste factors and export them for ordering.
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate from Takeoff
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Material List Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Material List</DialogTitle>
          </DialogHeader>

          {takeoffsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading takeoff items...</span>
            </div>
          ) : enrichedTakeoffItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No takeoff items found</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                Material lists are generated from takeoff measurements. Start by creating takeoffs
                on your drawing sheets to measure quantities, then return here to generate
                procurement lists.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerator(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowGenerator(false)
                    navigate(`/projects/${projectId}/takeoffs`)
                  }}
                >
                  Go to Takeoffs
                </Button>
              </div>
            </div>
          ) : (
            <MaterialListGenerator
              projectId={projectId!}
              companyId={userProfile?.company_id || ''}
              takeoffItems={enrichedTakeoffItems}
              onGenerate={handleGenerate}
              onCancel={handleCancelGenerator}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteListId} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

export default MaterialListsPage
