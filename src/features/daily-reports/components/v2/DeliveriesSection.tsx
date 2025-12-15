/**
 * DeliveriesSection - Track material deliveries and inspection status
 * Documents receiving, inspection, and storage of materials
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { DeliveryEntryV2, DeliveryInspectionStatus } from '@/types/daily-reports-v2';

const INSPECTION_STATUS_CONFIG: Record<
  DeliveryInspectionStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending_inspection: {
    label: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <Clock className="h-4 w-4" />,
  },
  accepted: {
    label: 'Accepted',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-4 w-4" />,
  },
  partial: {
    label: 'Partial',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

interface DeliveriesSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function DeliveriesSection({ expanded, onToggle }: DeliveriesSectionProps) {
  const deliveries = useDailyReportStoreV2((state) => state.deliveries);
  const addDeliveryEntry = useDailyReportStoreV2((state) => state.addDeliveryEntry);
  const updateDeliveryEntry = useDailyReportStoreV2((state) => state.updateDeliveryEntry);
  const removeDeliveryEntry = useDailyReportStoreV2((state) => state.removeDeliveryEntry);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DeliveryEntryV2 | null>(null);
  const [formData, setFormData] = useState<Partial<DeliveryEntryV2>>({});

  const stats = useMemo(() => ({
    accepted: deliveries.filter((d) => d.inspection_status === 'accepted').length,
    rejected: deliveries.filter((d) => d.inspection_status === 'rejected').length,
    pending: deliveries.filter((d) => d.inspection_status === 'pending_inspection').length,
  }), [deliveries]);

  const handleAdd = useCallback(() => {
    setFormData({ inspection_status: 'pending_inspection' });
    setEditingEntry(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((entry: DeliveryEntryV2) => {
    setFormData({ ...entry });
    setEditingEntry(entry);
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<DeliveryEntryV2>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.material_description?.trim()) {return;}

    if (editingEntry) {
      updateDeliveryEntry(editingEntry.id, formData);
    } else {
      addDeliveryEntry(formData);
    }
    setDialogOpen(false);
    setFormData({});
    setEditingEntry(null);
  }, [editingEntry, formData, addDeliveryEntry, updateDeliveryEntry]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setEditingEntry(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this delivery?')) {
      removeDeliveryEntry(id);
    }
  }, [removeDeliveryEntry]);

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Truck className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                Deliveries
                {deliveries.length > 0 && (
                  <Badge variant="secondary">{deliveries.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {deliveries.length > 0
                  ? `${stats.accepted} accepted, ${stats.pending} pending`
                  : 'Track material deliveries and receiving'}
              </CardDescription>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expanded && (
          <CardContent className="border-t p-0">
            <div className="p-4 bg-gray-50 border-b">
              <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Delivery
              </Button>
            </div>

            <div className="divide-y">
              {deliveries.map((delivery) => {
                const statusConfig = INSPECTION_STATUS_CONFIG[delivery.inspection_status];
                return (
                  <div key={delivery.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{delivery.material_description}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(delivery)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(delivery.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      {delivery.vendor && <div>Vendor: {delivery.vendor}</div>}
                      {delivery.quantity && <div>Qty: {delivery.quantity}</div>}
                      {delivery.po_number && <div>PO#: {delivery.po_number}</div>}
                      {delivery.delivery_time && <div>Time: {delivery.delivery_time}</div>}
                    </div>

                    {delivery.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                        Rejection: {delivery.rejection_reason}
                      </div>
                    )}
                  </div>
                );
              })}

              {deliveries.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No deliveries today.</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Delivery' : 'Add Delivery'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Material Description *</Label>
              <Input
                value={formData.material_description || ''}
                onChange={(e) => handleFormChange({ material_description: e.target.value })}
                placeholder="e.g., Concrete Block 8x8x16"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  value={formData.quantity || ''}
                  onChange={(e) => handleFormChange({ quantity: e.target.value })}
                  placeholder="e.g., 500 ea"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={formData.vendor || ''}
                  onChange={(e) => handleFormChange({ vendor: e.target.value })}
                  placeholder="Vendor name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input
                  value={formData.po_number || ''}
                  onChange={(e) => handleFormChange({ po_number: e.target.value })}
                  placeholder="PO#"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Time</Label>
                <Input
                  type="time"
                  value={formData.delivery_time || ''}
                  onChange={(e) => handleFormChange({ delivery_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Inspection Status</Label>
              <Select
                value={formData.inspection_status || 'pending_inspection'}
                onValueChange={(value) => handleFormChange({ inspection_status: value as DeliveryInspectionStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INSPECTION_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.inspection_status === 'rejected' || formData.inspection_status === 'partial') && (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <textarea
                  value={formData.rejection_reason || ''}
                  onChange={(e) => handleFormChange({ rejection_reason: e.target.value })}
                  placeholder="Reason for rejection..."
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                value={formData.storage_location || ''}
                onChange={(e) => handleFormChange({ storage_location: e.target.value })}
                placeholder="e.g., Laydown Area B"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.material_description?.trim()}>
              {editingEntry ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DeliveriesSection;
