/**
 * WorkforceGrid - Spreadsheet-style inline editing for workforce entries
 * Key component for Quick Mode - enables fast data entry without dialogs
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { WorkforceEntryV2 } from '@/types/daily-reports-v2';

// Common trades for quick selection
const COMMON_TRADES = [
  'General Labor',
  'Carpenter',
  'Electrician',
  'Plumber',
  'HVAC',
  'Iron Worker',
  'Concrete',
  'Mason',
  'Painter',
  'Roofer',
  'Drywall',
  'Equipment Operator',
  'Superintendent',
  'Foreman',
];

interface WorkforceGridProps {
  expanded: boolean;
  onToggle: () => void;
  onCopyFromYesterday?: () => void;
  onApplyTemplate?: () => void;
}

export function WorkforceGrid({
  expanded,
  onToggle,
  onCopyFromYesterday,
  onApplyTemplate,
}: WorkforceGridProps) {
  const workforce = useDailyReportStoreV2((state) => state.workforce);
  const addWorkforceEntry = useDailyReportStoreV2((state) => state.addWorkforceEntry);
  const updateWorkforceEntry = useDailyReportStoreV2((state) => state.updateWorkforceEntry);
  const removeWorkforceEntry = useDailyReportStoreV2((state) => state.removeWorkforceEntry);
  const getTotalWorkers = useDailyReportStoreV2((state) => state.getTotalWorkers);

  const [showTradeDropdown, setShowTradeDropdown] = useState<string | null>(null);

  const totalWorkers = useMemo(() => getTotalWorkers(), [workforce, getTotalWorkers]);
  const totalHours = useMemo(
    () => workforce.reduce((sum, w) => sum + (w.hours_worked || 0), 0),
    [workforce]
  );

  const handleAddRow = useCallback(() => {
    addWorkforceEntry({
      entry_type: 'company_crew',
      hours_worked: 8,
    });
  }, [addWorkforceEntry]);

  const handleFieldChange = useCallback(
    (id: string, field: keyof WorkforceEntryV2, value: unknown) => {
      updateWorkforceEntry(id, { [field]: value });
    },
    [updateWorkforceEntry]
  );

  const handleTradeSelect = useCallback(
    (id: string, trade: string) => {
      updateWorkforceEntry(id, { trade });
      setShowTradeDropdown(null);
    },
    [updateWorkforceEntry]
  );

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info-light rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base flex items-center gap-2">
              Workforce
              {workforce.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {workforce.length} {workforce.length === 1 ? 'entry' : 'entries'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {totalWorkers > 0
                ? `${totalWorkers} workers, ${totalHours.toFixed(1)} total hours`
                : 'Track crews and workers on site'}
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
                  <th className="text-left p-3 font-medium text-secondary min-w-[180px]">
                    Company / Team
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[140px]">
                    Trade
                  </th>
                  <th className="text-center p-3 font-medium text-secondary w-20">
                    Workers
                  </th>
                  <th className="text-center p-3 font-medium text-secondary w-20">
                    Hours
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[140px]">
                    Work Area
                  </th>
                  <th className="text-left p-3 font-medium text-secondary min-w-[100px]">
                    Cost Code
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {workforce.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b hover:bg-surface ${
                      index % 2 === 0 ? 'bg-card' : 'bg-gray-25'
                    }`}
                  >
                    {/* Company/Team */}
                    <td className="p-2">
                      <Input
                        type="text"
                        value={entry.company_name || entry.team_name || ''}
                        onChange={(e) =>
                          handleFieldChange(
                            entry.id,
                            entry.entry_type === 'company_crew'
                              ? 'company_name'
                              : 'team_name',
                            e.target.value
                          )
                        }
                        placeholder="Company name..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Trade - with dropdown */}
                    <td className="p-2 relative">
                      <Input
                        type="text"
                        value={entry.trade || ''}
                        onChange={(e) =>
                          handleFieldChange(entry.id, 'trade', e.target.value)
                        }
                        onFocus={() => setShowTradeDropdown(entry.id)}
                        onBlur={() =>
                          setTimeout(() => setShowTradeDropdown(null), 200)
                        }
                        placeholder="Trade..."
                        className="h-9 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                      {showTradeDropdown === entry.id && (
                        <div className="absolute z-10 left-2 right-2 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {COMMON_TRADES.filter(
                            (t) =>
                              !entry.trade ||
                              t.toLowerCase().includes(entry.trade.toLowerCase())
                          ).map((trade) => (
                            <button
                              key={trade}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onMouseDown={() => handleTradeSelect(entry.id, trade)}
                            >
                              {trade}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Workers */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min="1"
                        value={entry.worker_count || ''}
                        onChange={(e) =>
                          handleFieldChange(
                            entry.id,
                            'worker_count',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="h-9 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Hours */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hours_worked || ''}
                        onChange={(e) =>
                          handleFieldChange(
                            entry.id,
                            'hours_worked',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="8"
                        className="h-9 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-500"
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
                        onClick={() => removeWorkforceEntry(entry.id)}
                        className="p-2 text-disabled hover:text-error hover:bg-error-light rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Empty state */}
                {workforce.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      No workforce entries yet. Add a row to get started.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Totals row */}
              {workforce.length > 0 && (
                <tfoot className="bg-muted border-t-2">
                  <tr>
                    <td className="p-3 font-semibold text-secondary" colSpan={2}>
                      Totals
                    </td>
                    <td className="p-3 text-center font-semibold text-secondary">
                      {totalWorkers}
                    </td>
                    <td className="p-3 text-center font-semibold text-secondary">
                      {totalHours.toFixed(1)}
                    </td>
                    <td colSpan={3}></td>
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
              Add Workforce Entry
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default WorkforceGrid;
