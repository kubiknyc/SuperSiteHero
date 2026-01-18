// File: /src/pages/material-lists/MaterialListsPage.tsx
// Material Lists management page - displays procurement lists generated from takeoffs

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { MaterialListTable } from '@/features/material-lists'
import { useMaterialLists, useDeleteMaterialList } from '@/features/material-lists/hooks'
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
  Search,
  Filter,
  Plus,
  MoreVertical,
  FileDown,
  Trash2,
  Eye,
  ClipboardList,
} from 'lucide-react'
import type { MaterialList } from '@/types/drawing-sheets'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: lists, isLoading, refetch } = useMaterialLists(projectId)
  const deleteList = useDeleteMaterialList()

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

  const handleDeleteList = async (listId: string) => {
    if (confirm('Are you sure you want to delete this material list?')) {
      await deleteList.mutateAsync(listId)
    }
  }

  const handleCreateNew = () => {
    // Navigate to takeoffs page to create a new material list
    navigate(`/projects/${projectId}/takeoffs`)
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
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search material lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'No material lists match your filters'
                  : 'No material lists yet'}
              </div>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate from Takeoff
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default MaterialListsPage
