/**
 * Distribution Lists Settings Page
 *
 * Manage company-wide and project-specific distribution lists
 */

import * as React from 'react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
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
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Users,
  AlertCircle,
  Globe,
  FolderOpen,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useDistributionLists,
  useDeleteDistributionList,
  useCreateDistributionList,
} from '@/features/distribution-lists/hooks/useDistributionLists'
import {
  DistributionListFormDialog,
  DistributionListCard,
} from '@/features/distribution-lists/components'
import {
  DISTRIBUTION_LIST_TYPES,
  type DistributionListWithCount,
  type DistributionListType,
} from '@/types/distribution-list'

export function DistributionListsPage() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  // State
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<DistributionListType | 'all'>('all')
  const [activeTab, setActiveTab] = React.useState<'all' | 'company' | 'project'>('all')
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [editingList, setEditingList] = React.useState<DistributionListWithCount | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [listToDelete, setListToDelete] = React.useState<DistributionListWithCount | null>(null)

  // Queries
  const { data: lists, isLoading, error } = useDistributionLists({
    companyId: companyId ?? undefined,
    listType: selectedType !== 'all' ? selectedType : undefined,
  })

  // Mutations
  const deleteMutation = useDeleteDistributionList()
  const duplicateMutation = useCreateDistributionList()

  // Filter lists
  const filteredLists = React.useMemo(() => {
    let result = lists || []

    // Filter by scope (tab)
    if (activeTab === 'company') {
      result = result.filter(l => !l.project_id)
    } else if (activeTab === 'project') {
      result = result.filter(l => !!l.project_id)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.name.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      )
    }

    return result
  }, [lists, activeTab, searchQuery])

  // Stats
  const stats = React.useMemo(() => {
    const all = lists || []
    return {
      total: all.length,
      company: all.filter(l => !l.project_id).length,
      project: all.filter(l => !!l.project_id).length,
      totalMembers: all.reduce((sum, l) => sum + l.member_count, 0),
    }
  }, [lists])

  // Handlers
  const handleEdit = (list: DistributionListWithCount) => {
    setEditingList(list)
    setFormDialogOpen(true)
  }

  const handleDuplicate = async (list: DistributionListWithCount) => {
    try {
      await duplicateMutation.mutateAsync({
        name: `${list.name} (Copy)`,
        description: list.description || undefined,
        list_type: list.list_type as DistributionListType,
        is_default: false,
      })
      toast.success('List duplicated successfully')
    } catch {
      toast.error('Failed to duplicate list')
    }
  }

  const handleDeleteClick = (list: DistributionListWithCount) => {
    setListToDelete(list)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!listToDelete) {return}

    try {
      await deleteMutation.mutateAsync(listToDelete.id)
      toast.success('Distribution list deleted')
      setDeleteConfirmOpen(false)
      setListToDelete(null)
    } catch {
      toast.error('Failed to delete list')
    }
  }

  const handleFormClose = () => {
    setFormDialogOpen(false)
    setEditingList(null)
  }

  // Not authenticated
  if (!companyId) {
    return (
      <SmartLayout title="Distribution Lists" subtitle="Contact groups">
        <div className="container max-w-5xl py-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please log in to manage distribution lists</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <SmartLayout title="Distribution Lists" subtitle="Contact groups">
        <div className="container max-w-5xl py-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <p className="text-error">Failed to load distribution lists</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="Distribution Lists" subtitle="Contact groups">
      <div className="container max-w-5xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold heading-page">Distribution Lists</h1>
            <p className="text-muted-foreground">
              Create reusable contact groups for RFIs, submittals, and other notifications
            </p>
          </div>
          <Button onClick={() => setFormDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New List
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-success" />
                <CardTitle className="text-sm font-medium">Company-wide</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.company}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-medium">Project-specific</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.project}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="company">Company ({stats.company})</TabsTrigger>
              <TabsTrigger value="project">Project ({stats.project})</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                <SelectTrigger className="w-[160px]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DISTRIBUTION_LIST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredLists.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-surface">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1 heading-subsection">No distribution lists found</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery
                    ? 'Try adjusting your search criteria'
                    : 'Create your first list to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setFormDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLists.map((list) => (
                  <DistributionListCard
                    key={list.id}
                    list={list}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <DistributionListFormDialog
          open={formDialogOpen}
          onOpenChange={handleFormClose}
          list={editingList}
          onSuccess={handleFormClose}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Distribution List</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{listToDelete?.name}"? This action cannot be undone.
                {listToDelete && listToDelete.member_count > 0 && (
                  <span className="block mt-2 text-orange-600">
                    This list has {listToDelete.member_count} member{listToDelete.member_count !== 1 ? 's' : ''}.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-error hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SmartLayout>
  )
}

export default DistributionListsPage
