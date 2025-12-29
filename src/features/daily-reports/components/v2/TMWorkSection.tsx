/**
 * TMWorkSection - Time & Materials Work Tracking
 * CRITICAL component for cost recovery and change order documentation
 * Features nested tables for labor, materials, and equipment with auto-calculations
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DollarSign,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Users,
  Package,
  Truck,
  Calculator,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { TMWorkEntry, LaborEntry, MaterialEntry, EquipmentUsageEntry } from '@/types/daily-reports-v2';

// Common trades for quick selection
const COMMON_TRADES = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Laborer',
  'Operator',
  'Foreman',
  'Superintendent',
  'Ironworker',
  'Pipefitter',
  'Sheet Metal',
];

interface TMWorkSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function TMWorkSection({ expanded, onToggle }: TMWorkSectionProps) {
  const tmWork = useDailyReportStoreV2((state) => state.tmWork);
  const addTMWork = useDailyReportStoreV2((state) => state.addTMWork);
  const updateTMWork = useDailyReportStoreV2((state) => state.updateTMWork);
  const removeTMWork = useDailyReportStoreV2((state) => state.removeTMWork);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TMWorkEntry | null>(null);
  const [formData, setFormData] = useState<Partial<TMWorkEntry>>({
    labor_entries: [],
    materials_used: [],
    equipment_used: [],
  });

  // Calculate totals
  const totals = useMemo(() => {
    return tmWork.reduce(
      (acc, entry) => ({
        labor: acc.labor + (entry.total_labor_cost || 0),
        materials: acc.materials + (entry.total_materials_cost || 0),
        equipment: acc.equipment + (entry.total_equipment_cost || 0),
        total: acc.total + (entry.total_cost || 0),
      }),
      { labor: 0, materials: 0, equipment: 0, total: 0 }
    );
  }, [tmWork]);

  const formatCurrency = (value: number | undefined) => {
    if (!value) {return '$0.00';}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const calculateLaborCost = useCallback((entries: LaborEntry[]): { hours: number; cost: number } => {
    return entries.reduce(
      (acc, entry) => ({
        hours: acc.hours + (entry.hours || 0),
        cost: acc.cost + ((entry.hours || 0) * (entry.rate || 0)),
      }),
      { hours: 0, cost: 0 }
    );
  }, []);

  const calculateMaterialsCost = useCallback((entries: MaterialEntry[]): number => {
    return entries.reduce((acc, entry) => acc + ((entry.quantity || 0) * (entry.unit_cost || 0)), 0);
  }, []);

  const calculateEquipmentCost = useCallback((entries: EquipmentUsageEntry[]): number => {
    return entries.reduce((acc, entry) => acc + ((entry.hours || 0) * (entry.rate || 0)), 0);
  }, []);

  const recalculateTotals = useCallback((data: Partial<TMWorkEntry>) => {
    const laborCalc = calculateLaborCost(data.labor_entries || []);
    const materialsCost = calculateMaterialsCost(data.materials_used || []);
    const equipmentCost = calculateEquipmentCost(data.equipment_used || []);

    return {
      ...data,
      total_labor_hours: laborCalc.hours,
      total_labor_cost: laborCalc.cost,
      total_materials_cost: materialsCost,
      total_equipment_cost: equipmentCost,
      total_cost: laborCalc.cost + materialsCost + equipmentCost,
    };
  }, [calculateLaborCost, calculateMaterialsCost, calculateEquipmentCost]);

  const handleAdd = useCallback(() => {
    setFormData({
      labor_entries: [],
      materials_used: [],
      equipment_used: [],
    });
    setEditingEntry(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((entry: TMWorkEntry) => {
    setFormData({ ...entry });
    setEditingEntry(entry);
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<TMWorkEntry>) => {
    setFormData((prev) => recalculateTotals({ ...prev, ...updates }));
  }, [recalculateTotals]);

  // Labor entry handlers
  const handleAddLabor = useCallback(() => {
    const newLabor: LaborEntry = { trade: '', hours: 0, rate: 0, cost: 0 };
    handleFormChange({
      labor_entries: [...(formData.labor_entries || []), newLabor],
    });
  }, [formData.labor_entries, handleFormChange]);

  const handleUpdateLabor = useCallback((index: number, updates: Partial<LaborEntry>) => {
    const entries = [...(formData.labor_entries || [])];
    const updated = { ...entries[index], ...updates };
    updated.cost = (updated.hours || 0) * (updated.rate || 0);
    entries[index] = updated;
    handleFormChange({ labor_entries: entries });
  }, [formData.labor_entries, handleFormChange]);

  const handleRemoveLabor = useCallback((index: number) => {
    const entries = (formData.labor_entries || []).filter((_, i) => i !== index);
    handleFormChange({ labor_entries: entries });
  }, [formData.labor_entries, handleFormChange]);

  // Material entry handlers
  const handleAddMaterial = useCallback(() => {
    const newMaterial: MaterialEntry = { item: '', quantity: 0, unit: '', unit_cost: 0, total: 0 };
    handleFormChange({
      materials_used: [...(formData.materials_used || []), newMaterial],
    });
  }, [formData.materials_used, handleFormChange]);

  const handleUpdateMaterial = useCallback((index: number, updates: Partial<MaterialEntry>) => {
    const entries = [...(formData.materials_used || [])];
    const updated = { ...entries[index], ...updates };
    updated.total = (updated.quantity || 0) * (updated.unit_cost || 0);
    entries[index] = updated;
    handleFormChange({ materials_used: entries });
  }, [formData.materials_used, handleFormChange]);

  const handleRemoveMaterial = useCallback((index: number) => {
    const entries = (formData.materials_used || []).filter((_, i) => i !== index);
    handleFormChange({ materials_used: entries });
  }, [formData.materials_used, handleFormChange]);

  // Equipment entry handlers
  const handleAddEquipment = useCallback(() => {
    const newEquipment: EquipmentUsageEntry = { type: '', hours: 0, rate: 0, cost: 0 };
    handleFormChange({
      equipment_used: [...(formData.equipment_used || []), newEquipment],
    });
  }, [formData.equipment_used, handleFormChange]);

  const handleUpdateEquipment = useCallback((index: number, updates: Partial<EquipmentUsageEntry>) => {
    const entries = [...(formData.equipment_used || [])];
    const updated = { ...entries[index], ...updates };
    updated.cost = (updated.hours || 0) * (updated.rate || 0);
    entries[index] = updated;
    handleFormChange({ equipment_used: entries });
  }, [formData.equipment_used, handleFormChange]);

  const handleRemoveEquipment = useCallback((index: number) => {
    const entries = (formData.equipment_used || []).filter((_, i) => i !== index);
    handleFormChange({ equipment_used: entries });
  }, [formData.equipment_used, handleFormChange]);

  const handleSave = useCallback(() => {
    if (!formData.description?.trim()) {return;}

    const finalData = recalculateTotals(formData);

    if (editingEntry) {
      updateTMWork(editingEntry.id, finalData);
    } else {
      addTMWork(finalData);
    }
    setDialogOpen(false);
    setFormData({ labor_entries: [], materials_used: [], equipment_used: [] });
    setEditingEntry(null);
  }, [editingEntry, formData, recalculateTotals, addTMWork, updateTMWork]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({ labor_entries: [], materials_used: [], equipment_used: [] });
    setEditingEntry(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this T&M entry?')) {
      removeTMWork(id);
    }
  }, [removeTMWork]);

  return (
    <>
      <Card className={totals.total > 0 ? 'border-green-200' : ''}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-lg">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                T&M Work
                {tmWork.length > 0 && (
                  <Badge variant="secondary" className="bg-success-light text-success-dark">
                    {tmWork.length} {tmWork.length === 1 ? 'entry' : 'entries'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {totals.total > 0
                  ? `Total: ${formatCurrency(totals.total)}`
                  : 'Track Time & Materials work for change orders'}
              </CardDescription>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-disabled" />
          ) : (
            <ChevronDown className="h-5 w-5 text-disabled" />
          )}
        </button>

        {expanded && (
          <CardContent className="border-t p-0">
            {/* Add Button */}
            <div className="p-4 bg-surface border-b">
              <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add T&M Entry
              </Button>
            </div>

            {/* T&M Entries List */}
            <div className="divide-y">
              {tmWork.map((entry) => (
                <div key={entry.id} className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.work_order_number && (
                        <Badge variant="outline">WO# {entry.work_order_number}</Badge>
                      )}
                      <span className="font-medium">{entry.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-success">
                        {formatCurrency(entry.total_cost)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-disabled hover:text-primary hover:bg-blue-50 rounded transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-disabled hover:text-error hover:bg-error-light rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <Users className="h-4 w-4" />
                        Labor
                      </div>
                      <div>{entry.total_labor_hours || 0} hrs</div>
                      <div className="font-semibold">{formatCurrency(entry.total_labor_cost)}</div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded">
                      <div className="flex items-center gap-1 text-orange-600 font-medium">
                        <Package className="h-4 w-4" />
                        Materials
                      </div>
                      <div>{(entry.materials_used || []).length} items</div>
                      <div className="font-semibold">{formatCurrency(entry.total_materials_cost)}</div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <div className="flex items-center gap-1 text-purple-600 font-medium">
                        <Truck className="h-4 w-4" />
                        Equipment
                      </div>
                      <div>{(entry.equipment_used || []).length} items</div>
                      <div className="font-semibold">{formatCurrency(entry.total_equipment_cost)}</div>
                    </div>
                  </div>

                  {/* Authorization */}
                  {entry.authorized_by && (
                    <div className="mt-3 text-sm text-secondary">
                      Authorized by: {entry.authorized_by}
                      {entry.authorization_date && ` on ${entry.authorization_date}`}
                    </div>
                  )}
                </div>
              ))}

              {/* Empty State */}
              {tmWork.length === 0 && (
                <div className="p-8 text-center text-muted">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-disabled" />
                  <p>No Time & Materials work recorded today.</p>
                  <p className="text-sm">Add T&M entries to document extra work for change orders.</p>
                </div>
              )}
            </div>

            {/* Summary Footer */}
            {tmWork.length > 0 && (
              <div className="p-4 bg-success-light border-t">
                <div className="flex justify-between items-center">
                  <div className="text-sm space-y-1">
                    <div>Labor: {formatCurrency(totals.labor)}</div>
                    <div>Materials: {formatCurrency(totals.materials)}</div>
                    <div>Equipment: {formatCurrency(totals.equipment)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-secondary">Grand Total</div>
                    <div className="text-2xl font-bold text-success">
                      {formatCurrency(totals.total)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* T&M Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {editingEntry ? 'Edit T&M Entry' : 'Add T&M Entry'}
            </DialogTitle>
            <DialogDescription>
              Document labor, materials, and equipment for Time & Materials work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Order Number</Label>
                <Input
                  type="text"
                  value={formData.work_order_number || ''}
                  onChange={(e) => handleFormChange({ work_order_number: e.target.value })}
                  placeholder="e.g., CO-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange({ description: e.target.value })}
                  placeholder="Describe the work performed"
                />
              </div>
            </div>

            {/* Nested Tables Accordion */}
            <Accordion type="multiple" defaultValue={['labor', 'materials', 'equipment']} className="space-y-2">
              {/* Labor Section */}
              <AccordionItem value="labor" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:bg-blue-50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Labor</span>
                    <Badge variant="secondary" className="ml-2">
                      {(formData.labor_entries || []).length} entries
                    </Badge>
                    <span className="ml-auto mr-4 font-semibold text-primary">
                      {formatCurrency(formData.total_labor_cost)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {/* Labor Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted px-2">
                      <div className="col-span-4">Trade</div>
                      <div className="col-span-2">Hours</div>
                      <div className="col-span-2">Rate</div>
                      <div className="col-span-3">Cost</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Labor Rows */}
                    {(formData.labor_entries || []).map((labor, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <Input
                            type="text"
                            value={labor.trade}
                            onChange={(e) => handleUpdateLabor(index, { trade: e.target.value })}
                            placeholder="Trade"
                            className="h-8 text-sm"
                            list="trades"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={labor.hours || ''}
                            onChange={(e) => handleUpdateLabor(index, { hours: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={labor.rate || ''}
                              onChange={(e) => handleUpdateLabor(index, { rate: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm pl-5"
                            />
                          </div>
                        </div>
                        <div className="col-span-3 text-sm font-medium text-right pr-2">
                          {formatCurrency(labor.cost)}
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveLabor(index)}
                            className="p-1 text-disabled hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={handleAddLabor}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Labor
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Materials Section */}
              <AccordionItem value="materials" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:bg-orange-50">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    <span>Materials</span>
                    <Badge variant="secondary" className="ml-2">
                      {(formData.materials_used || []).length} items
                    </Badge>
                    <span className="ml-auto mr-4 font-semibold text-orange-600">
                      {formatCurrency(formData.total_materials_cost)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {/* Materials Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted px-2">
                      <div className="col-span-4">Item</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-1">Unit</div>
                      <div className="col-span-2">Unit Cost</div>
                      <div className="col-span-2">Total</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Materials Rows */}
                    {(formData.materials_used || []).map((material, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <Input
                            type="text"
                            value={material.item}
                            onChange={(e) => handleUpdateMaterial(index, { item: e.target.value })}
                            placeholder="Material"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={material.quantity || ''}
                            onChange={(e) => handleUpdateMaterial(index, { quantity: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="text"
                            value={material.unit}
                            onChange={(e) => handleUpdateMaterial(index, { unit: e.target.value })}
                            placeholder="ea"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={material.unit_cost || ''}
                              onChange={(e) => handleUpdateMaterial(index, { unit_cost: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm pl-5"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 text-sm font-medium text-right pr-2">
                          {formatCurrency(material.total)}
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(index)}
                            className="p-1 text-disabled hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Material
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Equipment Section */}
              <AccordionItem value="equipment" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:bg-purple-50">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-600" />
                    <span>Equipment</span>
                    <Badge variant="secondary" className="ml-2">
                      {(formData.equipment_used || []).length} items
                    </Badge>
                    <span className="ml-auto mr-4 font-semibold text-purple-600">
                      {formatCurrency(formData.total_equipment_cost)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {/* Equipment Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted px-2">
                      <div className="col-span-4">Type</div>
                      <div className="col-span-2">Hours</div>
                      <div className="col-span-2">Rate</div>
                      <div className="col-span-3">Cost</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Equipment Rows */}
                    {(formData.equipment_used || []).map((equip, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <Input
                            type="text"
                            value={equip.type}
                            onChange={(e) => handleUpdateEquipment(index, { type: e.target.value })}
                            placeholder="Equipment type"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={equip.hours || ''}
                            onChange={(e) => handleUpdateEquipment(index, { hours: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={equip.rate || ''}
                              onChange={(e) => handleUpdateEquipment(index, { rate: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm pl-5"
                            />
                          </div>
                        </div>
                        <div className="col-span-3 text-sm font-medium text-right pr-2">
                          {formatCurrency(equip.cost)}
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveEquipment(index)}
                            className="p-1 text-disabled hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={handleAddEquipment}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Equipment
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Trade datalist for autocomplete */}
            <datalist id="trades">
              {COMMON_TRADES.map((trade) => (
                <option key={trade} value={trade} />
              ))}
            </datalist>

            {/* Grand Total Display */}
            <div className="p-4 bg-success-light rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-success" />
                  <span className="font-medium">Grand Total</span>
                </div>
                <span className="text-2xl font-bold text-success">
                  {formatCurrency(formData.total_cost)}
                </span>
              </div>
            </div>

            {/* Authorization */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Authorized By</Label>
                <Input
                  type="text"
                  value={formData.authorized_by || ''}
                  onChange={(e) => handleFormChange({ authorized_by: e.target.value })}
                  placeholder="Name of authorizing person"
                />
              </div>
              <div className="space-y-2">
                <Label>Authorization Date</Label>
                <Input
                  type="date"
                  value={formData.authorization_date || ''}
                  onChange={(e) => handleFormChange({ authorization_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!formData.description?.trim()}
            >
              {editingEntry ? 'Save Changes' : 'Add T&M Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TMWorkSection;
