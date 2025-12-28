/**
 * BidPackagesPage
 * Main page for managing bid packages
 */

import { useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Filter,
  Grid3X3,
  List,
  Package,
  Plus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BidPackageCard, CreateBidPackageDialog, SendInvitationDialog } from '@/features/bidding/components'
import { useBidPackages, usePublishBidPackage } from '@/features/bidding/hooks/useBidding'
import { BID_PACKAGE_STATUSES, CSI_DIVISIONS, type BidPackageStatus } from '@/types/bidding'
import { toast } from 'sonner'

export default function BidPackagesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<BidPackageStatus[]>([])
  const [divisionFilter, setDivisionFilter] = useState<string>('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)

  const activeTab = searchParams.get('tab') || 'all'

  const { data: bidPackages, isLoading, error } = useBidPackages({
    projectId,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    division: divisionFilter || undefined,
    search: searchTerm || undefined,
  })

  const publishBidPackage = usePublishBidPackage()

  // Filter packages by tab
  const filteredPackages = useMemo(() => {
    if (!bidPackages) {return []}

    let filtered = [...bidPackages]

    switch (activeTab) {
      case 'active':
        filtered = filtered.filter((bp) =>
          ['published', 'questions_period', 'bids_due', 'under_review'].includes(bp.status)
        )
        break
      case 'draft':
        filtered = filtered.filter((bp) => bp.status === 'draft')
        break
      case 'awarded':
        filtered = filtered.filter((bp) => bp.status === 'awarded')
        break
      case 'closed':
        filtered = filtered.filter((bp) => ['awarded', 'cancelled'].includes(bp.status))
        break
    }

    return filtered
  }, [bidPackages, activeTab])

  // Stats for tabs
  const stats = useMemo(() => {
    if (!bidPackages) {return { all: 0, active: 0, draft: 0, awarded: 0, closed: 0 }}

    return {
      all: bidPackages.length,
      active: bidPackages.filter((bp) =>
        ['published', 'questions_period', 'bids_due', 'under_review'].includes(bp.status)
      ).length,
      draft: bidPackages.filter((bp) => bp.status === 'draft').length,
      awarded: bidPackages.filter((bp) => bp.status === 'awarded').length,
      closed: bidPackages.filter((bp) => ['awarded', 'cancelled'].includes(bp.status)).length,
    }
  }, [bidPackages])

  const handlePublish = async (id: string) => {
    try {
      await publishBidPackage.mutateAsync(id)
      toast.success('Bid package published')
    } catch (_error) {
      toast.error('Failed to publish bid package')
    }
  }

  const handleInvite = (id: string) => {
    setSelectedPackageId(id)
    setInviteDialogOpen(true)
  }

  const toggleStatusFilter = (status: BidPackageStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center text-error">
          Failed to load bid packages. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
            <Package className="w-6 h-6" />
            Bid Packages
          </h1>
          <p className="text-muted-foreground">
            Manage bid packages and subcontractor invitations
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Bid Package
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-2">{stats.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active <Badge variant="secondary" className="ml-2">{stats.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts <Badge variant="secondary" className="ml-2">{stats.draft}</Badge>
            </TabsTrigger>
            <TabsTrigger value="awarded">
              Awarded <Badge variant="secondary" className="ml-2">{stats.awarded}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 pt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bid packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <RadixSelect value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Divisions</SelectItem>
              {CSI_DIVISIONS.map((div) => (
                <SelectItem key={div.code} value={div.code}>
                  {div.code} - {div.name}
                </SelectItem>
              ))}
            </SelectContent>
          </RadixSelect>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Status
                {statusFilter.length > 0 && (
                  <Badge variant="secondary">{statusFilter.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BID_PACKAGE_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={statusFilter.includes(status.value)}
                  onCheckedChange={() => toggleStatusFilter(status.value)}
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(statusFilter.length > 0 || divisionFilter || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter([])
                setDivisionFilter('')
                setSearchTerm('')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 heading-subsection">No bid packages found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter.length > 0 || divisionFilter
                  ? 'Try adjusting your filters'
                  : 'Create your first bid package to get started'}
              </p>
              {!searchTerm && statusFilter.length === 0 && !divisionFilter && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bid Package
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((bidPackage) => (
                <BidPackageCard
                  key={bidPackage.id}
                  bidPackage={bidPackage}
                  onPublish={handlePublish}
                  onInvite={handleInvite}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPackages.map((bidPackage) => (
                <BidPackageCard
                  key={bidPackage.id}
                  bidPackage={bidPackage}
                  onPublish={handlePublish}
                  onInvite={handleInvite}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {projectId && (
        <CreateBidPackageDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
          onSuccess={() => setCreateDialogOpen(false)}
        />
      )}

      {selectedPackageId && (
        <SendInvitationDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          bidPackageId={selectedPackageId}
          onSuccess={() => {
            setInviteDialogOpen(false)
            setSelectedPackageId(null)
          }}
        />
      )}
    </div>
  )
}
