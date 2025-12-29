/**
 * EquipmentGrid - Spreadsheet-style inline editing for equipment entries
 * Key component for Quick Mode - enables fast data entry without dialogs
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Truck,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { EquipmentEntryV2 } from '@/types/daily-reports-v2';

// Common equipment types for quick selection
const COMMON_EQUIPMENT = [
  'Excavator',
  'Backhoe',
  'Loader',
  'Bulldozer',
  'Crane',
  'Forklift',
  'Skid Steer',
  'Dump Truck',
  'Concrete Mixer',
  'Boom Lift',
  'Scissor Lift',
  'Generator',
  'Compressor',
  'Welder',
  'Pump',
  'Light Tower',
];

// Equipment owner type options
const OWNER_TYPE_OPTIONS = [
  { value: 'owned', label: 'Owned', color: 'bg-info-light text-primary-hover' },
  { value: 'rented', label: 'Rented', color: 'bg-warning-light text-yellow-700' },
  { value: 'subcontractor', label: 'Subcontractor', color: 'bg-purple-100 text-purple-700' },
];

interface EquipmentGridProps {
  expanded: boolean;
  onToggle: () => void;
  onCopyFromYesterday?: () => void;
  onApplyTemplate?: () => void;
}

export function EquipmentGrid({
  expanded,
  onToggle,
  onCopyFromYesterday,
  onApplyTemplate,
}: EquipmentGridProps) {
  const equipment = useDailyReportStoreV2((state) => state.equipment);
  const addEquipmentEntry = useDailyReportStoreV2((state) => state.addEquipmentEntry);
  const updateEquipmentEntry = useDailyReportStoreV2((state) => state.updateEquipmentEntry);
  const removeEquipmentEntry = useDailyReportStoreV2((state) => state.removeEquipmentEntry);

  const [showTypeDropdown, setShowTypeDropdown] = useState<string | null>(null);

  const totalHours = useMemo(
    () => equipment.reduce((sum, e) => sum + (e.hours_used || 0), 0),
    [equipment]
  );

  const activeCount = useMemo(
    () => equipment.filter((e) => (e.hours_used || 0) > 0).length,
    [equipment]
  );

  const handleAddRow = useCallback(() => {
    addEquipmentEntry({
      owner_type: 'owned',
      hours_used: 8,
    });
  }, [addEquipmentEntry]);

  const handleFieldChange = useCallback(
    (id: string, field: keyof EquipmentEntryV2, value: unknown) => {
      updateEquipmentEntry(id, { [field]: value });
    },
    [updateEquipmentEntry]
  );

  const handleTypeSelect = useCallback(
    (id: string, equipmentType: string) => {
      updateEquipmentEntry(id, { equipment_type: equipmentType });
      setShowTypeDropdown(null);
    },
    [updateEquipmentEntry]
  );

  const _getOwnerTypeBadge = (ownerType: string | undefined) => {
    const typeOption = OWNER_TYPE_OPTIONS.find((o) => o.value === ownerType);
    if (!typeOption) {return null;}
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeOption.color}`}>
        {typeOption.label}
      </span>
    );
  };

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Truck className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base flex items-center gap-2">
              Equipment
              {equipment.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {equipment.length} {equipment.length === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {equipment.length > 0
                ? `${activeCount} active, ${totalHours.toFixed(1)} total hours`
                : 'Track equipment on site'}
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
          {/* Quick Actions */}
          <div className="flex gap-2 p-4 bg-surface border-b">
            {onCopyFromYesterday && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCopyFromYesterday}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy from Yesterday
              </Button>
            )}
            {onApplyTemplate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onApplyTemplate}
              >
                <FileText className="h-4 w-4 mr-1" />
                Apply Template
              </Button>
            )}
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-secondary min-w-[160px]">
                    Type
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[120px]">
                    Equipment ID
                  </th>
                  <th className="text-center p-3 font-medium text-secondary w-24">
                    Owner
                  </th>
                  <th className="text-center p-3 font-medium text-secondary w-20">
                    Hours
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[140px]">
                    Operator
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[120px]">
                    Work Area
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[100px]">
                    Cost Code
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b hover:bg-surface ${
                      index % 2 === 0 ? 'bg-card' : 'bg-gray-25'
                    }`}
                  >
                    {/* Equipment Type - with dropdown */}
                    <td className="p-2 relative">
                      <Input
                        type="text"
                        value={entry.equipment_type || ''}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'equipment_type', e.target.value)
                        }
                        onFocus={() => setShowTypeDropdown(entry.id)}
                        onBlur={() =>
                          setTimeout(() => setShowTypeDropdown(null), 200)
                        }
                        placeholder="Equipment type..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                      {showTypeDropdown === entry.id && (
                        <div className="absolute z-10 left-2 right-2 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {COMMON_EQUIPMENT.filter(
                            (t) =>
                              !entry.equipment_type ||
                              t.toLowerCase().includes(entry.equipment_type.toLowerCase())
                          ).map((type) => (
                            <button
                              key={type}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onMouseDown={() => handleTypeSelect(entry.id, type)}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Equipment ID */}
                    <td className="p-2">
                      <Input
                        type="text"
                        value={entry.equipment_id || ''}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'equipment_id', e.target.value)
                        }
                        placeholder="ID / Tag..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Owner Type */}
                    <td className="p-2">
                      <select
                        value={entry.owner_type || 'owned'}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'owner_type', e.target.value)
                        }
                        className="h-9 w-full text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded"
                      >
                        {OWNER_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Hours */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hours_used || ''}
                        onChange={(e) =>
                          handleFieldChange(
                            entry.id,
                            'hours_used',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="8"
                        className="h-9 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Operator */}
                    <td className="p-2">
                      <Input
                        type="text"
                        value={entry.operator_name || ''}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'operator_name', e.target.value)
                        }
                        placeholder="Operator name..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Work Area */}
                    <td className="p-2">
                      <Input
                        type="text"
                        value={entry.work_area || ''}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'work_area', e.target.value)
                        }
                        placeholder="Area..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Cost Code */}
                    <td className="p-2">
                      <Input
                        type="text"
                        value={entry.cost_code || ''}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'cost_code', e.target.value)
                        }
                        placeholder="Code..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeEquipmentEntry(entry.id)}
                        className="p-2 text-disabled hover:text-error hover:bg-error-light rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Empty state */}
                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted">
                      No equipment entries yet. Add a row to get started.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Totals row */}
              {equipment.length > 0 && (
                <tfoot className="bg-muted border-t-2">
                  <tr>
                    <td className="p-3 font-semibold text-secondary" colSpan={2}>
                      Totals ({equipment.length} items)
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-secondary">{activeCount} active</span>
                    </td>
                    <td className="p-3 text-center font-semibold text-secondary">
                      {totalHours.toFixed(1)} hrs
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Add Row Button */}
          <div className="p-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRow}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment Entry
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default EquipmentGrid;
