/**
 * Procurement Page
 *
 * Main dashboard for material procurement with purchase orders,
 * vendor management, and statistics.
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  POCard,
  POFormDialog,
  VendorFormDialog,
  ProcurementStatsCards,
} from '@/features/procurement/components';
import {
  usePurchaseOrders,
  useVendors,
  useProjectProcurementStats,
} from '@/features/procurement/hooks';
import { useMyProjects } from '@/features/projects/hooks/useProjects';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Plus,
  ShoppingCart,
  Building2,
  Search,
  Filter,
} from 'lucide-react';
import type { PurchaseOrderFilters, POStatus } from '@/types/procurement';

export function ProcurementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projects, isLoading: isLoadingProjects } = useMyProjects();
  const { userProfile } = useAuth();

  // Get project from URL or default to first project
  const selectedProjectId = searchParams.get('project') || projects?.[0]?.id || '';
  const activeTab = searchParams.get('tab') || 'orders';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');

  // Dialog states
  const [showPODialog, setShowPODialog] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);

  // Build filter object
  const poFilters: PurchaseOrderFilters = useMemo(() => ({
    project_id: selectedProjectId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
  }), [selectedProjectId, statusFilter, search]);

  // Fetch data
  const { data: purchaseOrders = [], isLoading: isLoadingPOs } = usePurchaseOrders(poFilters);
  const { data: vendors = [], isLoading: isLoadingVendors } = useVendors({
    company_id: userProfile?.company_id,
    is_active: true,
  });
  const { data: stats } = useProjectProcurementStats(selectedProjectId);

  const handleProjectChange = (projectId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('project', projectId);
    setSearchParams(newParams);
  };

  const handleTabChange = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  const isLoading = isLoadingProjects || isLoadingPOs;

  // Show message if no projects
  if (!isLoadingProjects && !selectedProjectId && projects?.length === 0) {
    return (
      <SmartLayout title="Procurement" subtitle="Material procurement">
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4">
              No Projects Found
            </h3>
            <p className="text-muted mt-2">
              You need to be assigned to a project to view procurement data.
            </p>
          </div>
        </div>
      </SmartLayout>
    );
  }

  return (
    <SmartLayout title="Procurement" subtitle="Material procurement">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-page text-foreground">Procurement</h1>
            <p className="text-muted mt-1">
              Manage purchase orders and vendor relationships
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowVendorDialog(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
            <Button disabled={!selectedProjectId} onClick={() => setShowPODialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-2">
            Select Project
          </label>
          <Select value={selectedProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProjectId && (
          <>
            {/* Statistics Cards */}
            {stats && <ProcurementStatsCards stats={stats} />}
            {!stats && isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="orders" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Orders
                  {purchaseOrders.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {purchaseOrders.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="vendors" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendors
                  {vendors.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {vendors.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Purchase Orders Tab */}
              <TabsContent value="orders">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search purchase orders..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as POStatus | 'all')}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="ordered">Ordered</SelectItem>
                      <SelectItem value="partially_received">Partially Received</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PO Grid */}
                {isLoadingPOs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48" />
                    ))}
                  </div>
                ) : purchaseOrders.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-medium text-foreground mt-4">
                      No Purchase Orders Found
                    </h3>
                    <p className="text-muted mt-2">
                      {search || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first purchase order to get started'}
                    </p>
                    {!search && statusFilter === 'all' && (
                      <Button className="mt-4" onClick={() => setShowPODialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Purchase Order
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {purchaseOrders.map((po) => (
                      <POCard key={po.id} po={po} projectId={selectedProjectId} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Vendors Tab */}
              <TabsContent value="vendors">
                {isLoadingVendors ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : vendors.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-medium text-foreground mt-4">
                      No Vendors Found
                    </h3>
                    <p className="text-muted mt-2">
                      Add your first vendor to start creating purchase orders
                    </p>
                    <Button className="mt-4" onClick={() => setShowVendorDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vendor
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="p-4 bg-card rounded-lg border hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                            {vendor.code && (
                              <p className="text-xs text-muted-foreground">{vendor.code}</p>
                            )}
                          </div>
                          {!vendor.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {vendor.contact_name && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {vendor.contact_name}
                          </p>
                        )}
                        {vendor.email && (
                          <p className="text-sm text-muted-foreground">{vendor.email}</p>
                        )}
                        {vendor.phone && (
                          <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* PO Form Dialog */}
        {selectedProjectId && (
          <POFormDialog
            projectId={selectedProjectId}
            open={showPODialog}
            onOpenChange={setShowPODialog}
          />
        )}

        {/* Vendor Form Dialog */}
        <VendorFormDialog
          open={showVendorDialog}
          onOpenChange={setShowVendorDialog}
        />
      </div>
    </SmartLayout>
  );
}

export default ProcurementPage;
