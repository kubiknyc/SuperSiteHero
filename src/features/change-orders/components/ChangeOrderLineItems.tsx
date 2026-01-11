/**
 * Change Order Line Items Component
 * Full-featured line item editor with category breakdown
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, X, Edit2, GripVertical, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  LineItemCategory,
  LineItemBreakdown,
  CreateLineItemDTO,
  calculateLineItemTotal,
  getLineItemCategoryLabel,
  getLineItemCategoryColor,
} from '../types/changeOrder';

interface ChangeOrderLineItemsProps {
  changeOrderId: string;
  items: LineItemBreakdown[];
  isEditable?: boolean;
  defaultMarkupPercent?: number;
  onAddItem: (item: CreateLineItemDTO) => Promise<void>;
  onUpdateItem: (id: string, item: Partial<CreateLineItemDTO>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onReorderItems?: (itemIds: string[]) => Promise<void>;
  className?: string;
}

interface ItemFormData {
  category: LineItemCategory;
  description: string;
  cost_code: string;
  quantity: string;
  unit: string;
  unit_price: string;
  markup_percent: string;
  notes: string;
}

const defaultFormData: ItemFormData = {
  category: LineItemCategory.LABOR,
  description: '',
  cost_code: '',
  quantity: '1',
  unit: 'LS',
  unit_price: '0',
  markup_percent: '0',
  notes: '',
};

const UNIT_OPTIONS = [
  { value: 'LS', label: 'Lump Sum' },
  { value: 'HR', label: 'Hour' },
  { value: 'EA', label: 'Each' },
  { value: 'SF', label: 'Square Foot' },
  { value: 'LF', label: 'Linear Foot' },
  { value: 'CY', label: 'Cubic Yard' },
  { value: 'TON', label: 'Ton' },
  { value: 'GAL', label: 'Gallon' },
  { value: 'DAY', label: 'Day' },
  { value: 'WK', label: 'Week' },
  { value: 'MO', label: 'Month' },
];

export function ChangeOrderLineItems({
  changeOrderId: _changeOrderId,
  items,
  isEditable = true,
  defaultMarkupPercent = 0,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems: _onReorderItems,
  className,
}: ChangeOrderLineItemsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemFormData>({
    ...defaultFormData,
    markup_percent: String(defaultMarkupPercent),
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate summary by category
  const categorySummary = useMemo(() => {
    const summary = new Map<LineItemCategory, { subtotal: number; markup: number; total: number; count: number }>();

    items.forEach((item) => {
      const existing = summary.get(item.category) || { subtotal: 0, markup: 0, total: 0, count: 0 };
      existing.subtotal += item.extended_price;
      existing.markup += item.markup_amount;
      existing.total += item.total_amount;
      existing.count += 1;
      summary.set(item.category, existing);
    });

    return summary;
  }, [items]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.extended_price,
        markup: acc.markup + item.markup_amount,
        total: acc.total + item.total_amount,
      }),
      { subtotal: 0, markup: 0, total: 0 }
    );
  }, [items]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate preview total from form
  const formPreview = useMemo(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    const markupPercent = parseFloat(formData.markup_percent) || 0;
    return calculateLineItemTotal(quantity, unitPrice, markupPercent);
  }, [formData.quantity, formData.unit_price, formData.markup_percent]);

  // Handle form change
  const handleFormChange = useCallback((field: keyof ItemFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Start editing item
  const startEditing = useCallback((item: LineItemBreakdown) => {
    setEditingId(item.id);
    setFormData({
      category: item.category,
      description: item.description,
      cost_code: item.cost_code || '',
      quantity: String(item.quantity),
      unit: item.unit,
      unit_price: String(item.unit_price),
      markup_percent: String(item.markup_percent),
      notes: item.notes || '',
    });
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      ...defaultFormData,
      markup_percent: String(defaultMarkupPercent),
    });
  }, [defaultMarkupPercent]);

  // Save item
  const handleSave = async () => {
    if (!formData.description.trim()) {return;}

    setIsSubmitting(true);
    try {
      const itemData: CreateLineItemDTO = {
        category: formData.category,
        description: formData.description.trim(),
        cost_code: formData.cost_code.trim() || undefined,
        quantity: parseFloat(formData.quantity) || 1,
        unit: formData.unit,
        unit_price: parseFloat(formData.unit_price) || 0,
        markup_percent: parseFloat(formData.markup_percent) || 0,
        notes: formData.notes.trim() || undefined,
      };

      if (editingId) {
        await onUpdateItem(editingId, itemData);
      } else {
        await onAddItem(itemData);
      }
      cancelEditing();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!deleteConfirmId) {return;}
    setIsSubmitting(true);
    try {
      await onDeleteItem(deleteConfirmId);
    } finally {
      setDeleteConfirmId(null);
      setIsSubmitting(false);
    }
  };

  // Duplicate item
  const handleDuplicate = useCallback((item: LineItemBreakdown) => {
    setFormData({
      category: item.category,
      description: `${item.description} (Copy)`,
      cost_code: item.cost_code || '',
      quantity: String(item.quantity),
      unit: item.unit,
      unit_price: String(item.unit_price),
      markup_percent: String(item.markup_percent),
      notes: item.notes || '',
    });
    setShowAddForm(true);
  }, []);

  // Render form
  const renderForm = () => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <Label>Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleFormChange('category', value as LineItemCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LineItemCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {getLineItemCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cost Code */}
        <div>
          <Label>Cost Code</Label>
          <Input
            value={formData.cost_code}
            onChange={(e) => handleFormChange('cost_code', e.target.value)}
            placeholder="e.g., 03-2100"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label>Description *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Enter line item description..."
            rows={2}
          />
        </div>

        {/* Quantity */}
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => handleFormChange('quantity', e.target.value)}
          />
        </div>

        {/* Unit */}
        <div>
          <Label>Unit</Label>
          <Select
            value={formData.unit}
            onValueChange={(value) => handleFormChange('unit', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unit Price */}
        <div>
          <Label>Unit Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => handleFormChange('unit_price', e.target.value)}
          />
        </div>

        {/* Markup */}
        <div>
          <Label>Markup (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.markup_percent}
            onChange={(e) => handleFormChange('markup_percent', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
            placeholder="Optional notes..."
            rows={2}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white p-3 rounded-lg border">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Extended:</span>
            <span className="ml-2 font-medium">{formatCurrency(formPreview.extendedPrice)}</span>
          </div>
          <div>
            <span className="text-gray-500">Markup:</span>
            <span className="ml-2 font-medium">{formatCurrency(formPreview.markupAmount)}</span>
          </div>
          <div>
            <span className="text-gray-500">Total:</span>
            <span className="ml-2 font-bold text-primary">{formatCurrency(formPreview.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.description.trim() || isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : editingId ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Line Item Breakdown</CardTitle>
          {isEditable && !showAddForm && !editingId && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Form */}
        {showAddForm && !editingId && renderForm()}

        {/* Items Table */}
        {items.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {isEditable && <TableHead className="w-8"></TableHead>}
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-24">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-16">Unit</TableHead>
                  <TableHead className="w-24 text-right">Unit Price</TableHead>
                  <TableHead className="w-24 text-right">Extended</TableHead>
                  <TableHead className="w-20 text-right">Markup</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  {isEditable && <TableHead className="w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {editingId === item.id ? (
                      <TableCell colSpan={isEditable ? 11 : 10}>
                        {renderForm()}
                      </TableCell>
                    ) : (
                      <>
                        {isEditable && (
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-sm">
                          {item.item_number}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', getLineItemCategoryColor(item.category))}>
                            {getLineItemCategoryLabel(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.cost_code && (
                              <p className="text-xs text-gray-500">{item.cost_code}</p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-gray-400 italic mt-1">{item.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.extended_price)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.markup_percent}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(item.total_amount)}
                        </TableCell>
                        {isEditable && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicate(item)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setDeleteConfirmId(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={isEditable ? 7 : 6} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(grandTotals.subtotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(grandTotals.markup)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-lg">
                    {formatCurrency(grandTotals.total)}
                  </TableCell>
                  {isEditable && <TableCell></TableCell>}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Category Summary */}
        {categorySummary.size > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.values(LineItemCategory).map((category) => {
              const data = categorySummary.get(category);
              if (!data) {return null;}
              return (
                <div
                  key={category}
                  className={cn(
                    'p-3 rounded-lg border',
                    getLineItemCategoryColor(category).replace('text-', 'border-').split(' ')[0]
                  )}
                >
                  <p className="text-xs text-gray-500">{getLineItemCategoryLabel(category)}</p>
                  <p className="text-lg font-bold">{formatCurrency(data.total)}</p>
                  <p className="text-xs text-gray-400">{data.count} item(s)</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No line items yet</p>
            {isEditable && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Line Item
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this line item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default ChangeOrderLineItems;
