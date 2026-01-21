/**
 * Attic Stock Tracker Component
 *
 * Manages attic stock items, deliveries, locations, and owner verification.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAtticStockItems,
  useAtticStockItem,
  useCreateAtticStockItem,
  useUpdateAtticStockItem,
  useDeleteAtticStockItem,
  useVerifyAtticStockItem,
  useAddAtticStockDelivery,
  useAtticStockStatistics,
} from '../hooks/useAtticStock'
import type {
  AtticStockItemWithDetails,
  CreateAtticStockItemDTO,
} from '@/types/closeout-extended'
import {
  Package,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  Camera,
  ClipboardCheck,
  Loader2,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  Building,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface AtticStockTrackerProps {
  projectId: string
  subcontractors?: { id: string; company_name: string }[]
  className?: string
}

export function AtticStockTracker({ projectId, subcontractors = [], className }: AtticStockTrackerProps) {
  const [showAddItem, setShowAddItem] = React.useState(false)
  const [showDeliveryDialog, setShowDeliveryDialog] = React.useState(false)
  const [showVerifyDialog, setShowVerifyDialog] = React.useState(false)
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)
  const [viewingItem, setViewingItem] = React.useState<AtticStockItemWithDetails | null>(null)

  // Form state for new item
  const [formData, setFormData] = React.useState<Partial<CreateAtticStockItemDTO>>({
    quantity_required: 0,
    unit: 'each',
  })

  // Delivery form state
  const [deliveryData, setDeliveryData] = React.useState({
    delivery_date: new Date().toISOString().split('T')[0],
    quantity_delivered: 0,
    notes: '',
  })

  // Verification form state
  const [verificationNotes, setVerificationNotes] = React.useState('')

  // Queries
  const { data: items = [], isLoading } = useAtticStockItems(projectId)
  const { data: statistics } = useAtticStockStatistics(projectId)
  const { data: selectedItem } = useAtticStockItem(selectedItemId || undefined)

  // Mutations
  const createItem = useCreateAtticStockItem()
  const updateItem = useUpdateAtticStockItem()
  const deleteItem = useDeleteAtticStockItem()
  const verifyItem = useVerifyAtticStockItem()
  const addDelivery = useAddAtticStockDelivery()

  // Reset form
  const resetForm = () => {
    setFormData({
      quantity_required: 0,
      unit: 'each',
    })
    setShowAddItem(false)
  }

  // Handle add item
  const handleAddItem = async () => {
    if (!formData.item_name?.trim()) {
      toast.error('Please enter an item name')
      return
    }

    try {
      await createItem.mutateAsync({
        project_id: projectId,
        item_name: formData.item_name.trim(),
        description: formData.description?.trim(),
        spec_section: formData.spec_section?.trim(),
        manufacturer: formData.manufacturer?.trim(),
        model_number: formData.model_number?.trim(),
        color_finish: formData.color_finish?.trim(),
        quantity_required: formData.quantity_required || 0,
        unit: formData.unit,
        building_location: formData.building_location?.trim(),
        floor_level: formData.floor_level?.trim(),
        room_area: formData.room_area?.trim(),
        storage_notes: formData.storage_notes?.trim(),
        subcontractor_id: formData.subcontractor_id,
      })
      toast.success('Attic stock item added')
      resetForm()
    } catch {
      toast.error('Failed to add item')
    }
  }

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {return}

    try {
      await deleteItem.mutateAsync(itemId)
      toast.success('Item deleted')
    } catch {
      toast.error('Failed to delete item')
    }
  }

  // Handle add delivery
  const handleAddDelivery = async () => {
    if (!selectedItemId || deliveryData.quantity_delivered <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    try {
      await addDelivery.mutateAsync({
        attic_stock_item_id: selectedItemId,
        delivery_date: deliveryData.delivery_date,
        quantity_delivered: deliveryData.quantity_delivered,
        notes: deliveryData.notes.trim() || undefined,
      })
      toast.success('Delivery recorded')
      setShowDeliveryDialog(false)
      setDeliveryData({
        delivery_date: new Date().toISOString().split('T')[0],
        quantity_delivered: 0,
        notes: '',
      })
    } catch {
      toast.error('Failed to record delivery')
    }
  }

  // Handle verification
  const handleVerify = async () => {
    if (!selectedItemId) {return}

    try {
      await verifyItem.mutateAsync({
        id: selectedItemId,
        verificationNotes: verificationNotes.trim() || undefined,
      })
      toast.success('Item verified by owner')
      setShowVerifyDialog(false)
      setVerificationNotes('')
      setSelectedItemId(null)
    } catch {
      toast.error('Failed to verify item')
    }
  }

  // Get delivery status
  const getDeliveryStatus = (item: AtticStockItemWithDetails) => {
    if (item.quantity_delivered === 0) {return 'not_delivered'}
    if (item.quantity_delivered >= item.quantity_required) {return 'fully_delivered'}
    return 'partially_delivered'
  }

  // Get status badge
  const getStatusBadge = (item: AtticStockItemWithDetails) => {
    const status = getDeliveryStatus(item)

    if (item.owner_verified) {
      return <Badge className="bg-success-light text-success-dark dark:bg-success/20 dark:text-success">Verified</Badge>
    }

    switch (status) {
      case 'fully_delivered':
        return <Badge className="bg-info-light text-info-dark dark:bg-info/20 dark:text-info">Delivered</Badge>
      case 'partially_delivered':
        return <Badge className="bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning">Partial</Badge>
      default:
        return <Badge className="bg-muted text-muted-foreground">Pending</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading attic stock...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Attic Stock Tracker
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold">{statistics.total_items}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-2 bg-success-light dark:bg-success/10 rounded-lg">
                <div className="text-xl font-bold text-success-dark dark:text-success">{statistics.fully_delivered}</div>
                <div className="text-xs text-muted-foreground">Delivered</div>
              </div>
              <div className="text-center p-2 bg-warning-light dark:bg-warning/10 rounded-lg">
                <div className="text-xl font-bold text-warning-dark dark:text-warning">{statistics.partially_delivered}</div>
                <div className="text-xs text-muted-foreground">Partial</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold text-foreground">{statistics.not_delivered}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-2 bg-info-light dark:bg-info/10 rounded-lg">
                <div className="text-xl font-bold text-info-dark dark:text-info">{statistics.owner_verified}</div>
                <div className="text-xs text-muted-foreground">Verified</div>
              </div>
              <div className="text-center p-2 bg-warning-light dark:bg-warning/10 rounded-lg">
                <div className="text-xl font-bold text-warning">{statistics.pending_verification}</div>
                <div className="text-xs text-muted-foreground">To Verify</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Attic Stock Items</h3>
            <p className="text-muted-foreground mb-4">
              Add items that need to be delivered and stored as attic stock.
            </p>
            <Button onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {items.map((item) => {
                const deliveryPercent = item.quantity_required > 0
                  ? Math.min(100, (item.quantity_delivered / item.quantity_required) * 100)
                  : 0

                return (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.item_name}</span>
                          {getStatusBadge(item)}
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                          {item.manufacturer && (
                            <span>Mfr: {item.manufacturer}</span>
                          )}
                          {item.model_number && (
                            <span>Model: {item.model_number}</span>
                          )}
                          {item.spec_section && (
                            <span>Spec: {item.spec_section}</span>
                          )}
                        </div>

                        {/* Location */}
                        {(item.building_location || item.floor_level || item.room_area) && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3" />
                            {[item.building_location, item.floor_level, item.room_area]
                              .filter(Boolean)
                              .join(' / ')}
                          </div>
                        )}

                        {/* Quantity Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>
                              {item.quantity_delivered} / {item.quantity_required} {item.unit}
                            </span>
                            <span>{Math.round(deliveryPercent)}%</span>
                          </div>
                          <Progress value={deliveryPercent} className="h-2" />
                        </div>

                        {/* Subcontractor */}
                        {item.subcontractor && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Responsible: {item.subcontractor.company_name}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItemId(item.id)
                            setShowDeliveryDialog(true)
                          }}
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Delivery
                        </Button>
                        {item.quantity_delivered >= item.quantity_required && !item.owner_verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItemId(item.id)
                              setShowVerifyDialog(true)
                            }}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingItem(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Verification Info */}
                    {item.owner_verified && item.verified_at && (
                      <div className="mt-3 pt-3 border-t text-sm text-success-dark dark:text-success bg-success-light dark:bg-success/10 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />
                        Verified by {item.verified_by_user?.full_name || 'Owner'} on{' '}
                        {format(new Date(item.verified_at), 'MMM d, yyyy')}
                        {item.verification_notes && (
                          <span className="block mt-1 text-muted-foreground">
                            {item.verification_notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Attic Stock Item</DialogTitle>
            <DialogDescription>
              Add a new item that needs to be delivered and stored as attic stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <Input
                  value={formData.item_name || ''}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="e.g., Ceiling Tiles"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the item"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity Required</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_required || 0}
                  onChange={(e) => setFormData({ ...formData, quantity_required: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <Select
                  value={formData.unit || 'each'}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="carton">Carton</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                    <SelectItem value="pallet">Pallet</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="roll">Roll</SelectItem>
                    <SelectItem value="gallon">Gallon</SelectItem>
                    <SelectItem value="sqft">Sq Ft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Manufacturer</label>
                <Input
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model Number</label>
                <Input
                  value={formData.model_number || ''}
                  onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color/Finish</label>
                <Input
                  value={formData.color_finish || ''}
                  onChange={(e) => setFormData({ ...formData, color_finish: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Spec Section</label>
                <Input
                  value={formData.spec_section || ''}
                  onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
                  placeholder="e.g., 09 51 00"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Responsible Subcontractor</label>
                <Select
                  value={formData.subcontractor_id || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, subcontractor_id: v === 'none' ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subcontractors.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Building Location</label>
                <Input
                  value={formData.building_location || ''}
                  onChange={(e) => setFormData({ ...formData, building_location: e.target.value })}
                  placeholder="e.g., Building A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Floor Level</label>
                <Input
                  value={formData.floor_level || ''}
                  onChange={(e) => setFormData({ ...formData, floor_level: e.target.value })}
                  placeholder="e.g., 2nd Floor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Room/Area</label>
                <Input
                  value={formData.room_area || ''}
                  onChange={(e) => setFormData({ ...formData, room_area: e.target.value })}
                  placeholder="e.g., Storage Room 201"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Storage Notes</label>
                <Textarea
                  value={formData.storage_notes || ''}
                  onChange={(e) => setFormData({ ...formData, storage_notes: e.target.value })}
                  placeholder="Special storage instructions"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={createItem.isPending}>
              {createItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Delivery</DialogTitle>
            <DialogDescription>
              Record a delivery of attic stock items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedItem && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedItem.item_name}</div>
                <div className="text-sm text-muted-foreground">
                  Current: {selectedItem.quantity_delivered} / {selectedItem.quantity_required} {selectedItem.unit}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Delivery Date</label>
              <Input
                type="date"
                value={deliveryData.delivery_date}
                onChange={(e) => setDeliveryData({ ...deliveryData, delivery_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity Delivered</label>
              <Input
                type="number"
                min="1"
                value={deliveryData.quantity_delivered || ''}
                onChange={(e) => setDeliveryData({ ...deliveryData, quantity_delivered: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={deliveryData.notes}
                onChange={(e) => setDeliveryData({ ...deliveryData, notes: e.target.value })}
                placeholder="Delivery notes, ticket number, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDelivery} disabled={addDelivery.isPending}>
              {addDelivery.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Item Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Owner Verification</DialogTitle>
            <DialogDescription>
              Confirm that the attic stock has been received and stored properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedItem && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedItem.item_name}</div>
                <div className="text-sm text-muted-foreground">
                  Delivered: {selectedItem.quantity_delivered} {selectedItem.unit}
                </div>
                {selectedItem.building_location && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {[selectedItem.building_location, selectedItem.floor_level, selectedItem.room_area]
                      .filter(Boolean)
                      .join(' / ')}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Verification Notes (Optional)</label>
              <Textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Any notes about the condition or location of the stock"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={verifyItem.isPending}>
              {verifyItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify & Sign Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item Details Dialog */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingItem?.item_name}</DialogTitle>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <div className="font-medium">
                    {viewingItem.quantity_delivered} / {viewingItem.quantity_required} {viewingItem.unit}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div>{getStatusBadge(viewingItem)}</div>
                </div>
                {viewingItem.manufacturer && (
                  <div>
                    <span className="text-muted-foreground">Manufacturer:</span>
                    <div className="font-medium">{viewingItem.manufacturer}</div>
                  </div>
                )}
                {viewingItem.model_number && (
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <div className="font-medium">{viewingItem.model_number}</div>
                  </div>
                )}
                {viewingItem.color_finish && (
                  <div>
                    <span className="text-muted-foreground">Color/Finish:</span>
                    <div className="font-medium">{viewingItem.color_finish}</div>
                  </div>
                )}
                {viewingItem.spec_section && (
                  <div>
                    <span className="text-muted-foreground">Spec Section:</span>
                    <div className="font-medium">{viewingItem.spec_section}</div>
                  </div>
                )}
              </div>

              {(viewingItem.building_location || viewingItem.floor_level || viewingItem.room_area) && (
                <div>
                  <span className="text-sm text-muted-foreground">Location:</span>
                  <div className="font-medium flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[viewingItem.building_location, viewingItem.floor_level, viewingItem.room_area]
                      .filter(Boolean)
                      .join(' / ')}
                  </div>
                </div>
              )}

              {viewingItem.subcontractor && (
                <div>
                  <span className="text-sm text-muted-foreground">Responsible Subcontractor:</span>
                  <div className="font-medium">{viewingItem.subcontractor.company_name}</div>
                </div>
              )}

              {viewingItem.deliveries && viewingItem.deliveries.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Delivery History:</span>
                  <div className="space-y-2">
                    {viewingItem.deliveries.map((delivery) => (
                      <div key={delivery.id} className="text-sm p-2 bg-muted rounded">
                        <div className="flex justify-between">
                          <span>{format(new Date(delivery.delivery_date), 'MMM d, yyyy')}</span>
                          <span className="font-medium">+{delivery.quantity_delivered}</span>
                        </div>
                        {delivery.notes && (
                          <div className="text-muted-foreground mt-1">{delivery.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AtticStockTracker
