/**
 * VisitorsSection - Track site visitors and access
 * Documents visitor information, safety orientation, and escort requirements
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
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
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { VisitorEntryV2 } from '@/types/daily-reports-v2';

const VISIT_PURPOSES = [
  'Inspection',
  'Meeting',
  'Tour',
  'Delivery',
  'Consultant',
  'Client Visit',
  'Safety Audit',
  'Training',
  'Other',
];

interface VisitorsSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function VisitorsSection({ expanded, onToggle }: VisitorsSectionProps) {
  const visitors = useDailyReportStoreV2((state) => state.visitors);
  const addVisitorEntry = useDailyReportStoreV2((state) => state.addVisitorEntry);
  const updateVisitorEntry = useDailyReportStoreV2((state) => state.updateVisitorEntry);
  const removeVisitorEntry = useDailyReportStoreV2((state) => state.removeVisitorEntry);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VisitorEntryV2 | null>(null);
  const [formData, setFormData] = useState<Partial<VisitorEntryV2>>({});

  const stats = useMemo(() => ({
    total: visitors.length,
    withOrientation: visitors.filter((v) => v.safety_orientation_completed).length,
    requiringEscort: visitors.filter((v) => v.escort_required).length,
  }), [visitors]);

  const handleAdd = useCallback(() => {
    setFormData({
      safety_orientation_completed: false,
      escort_required: false,
      photos_taken: false,
      nda_signed: false,
    });
    setEditingEntry(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((entry: VisitorEntryV2) => {
    setFormData({ ...entry });
    setEditingEntry(entry);
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<VisitorEntryV2>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.visitor_name?.trim()) {return;}

    if (editingEntry) {
      updateVisitorEntry(editingEntry.id, formData);
    } else {
      addVisitorEntry(formData);
    }
    setDialogOpen(false);
    setFormData({});
    setEditingEntry(null);
  }, [editingEntry, formData, addVisitorEntry, updateVisitorEntry]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setEditingEntry(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Remove this visitor?')) {
      removeVisitorEntry(id);
    }
  }, [removeVisitorEntry]);

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                Visitors
                {visitors.length > 0 && (
                  <Badge variant="secondary">{visitors.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {visitors.length > 0
                  ? `${stats.withOrientation} completed safety orientation`
                  : 'Log site visitors and access'}
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
            <div className="p-4 bg-surface border-b">
              <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Visitor
              </Button>
            </div>

            {/* Visitors Table */}
            {visitors.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Company</th>
                      <th className="text-left p-3">Purpose</th>
                      <th className="text-center p-3">In/Out</th>
                      <th className="text-center p-3">Safety</th>
                      <th className="text-center p-3">Escort</th>
                      <th className="w-20 p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visitors.map((visitor) => (
                      <tr key={visitor.id} className="hover:bg-surface">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-disabled" />
                            {visitor.visitor_name}
                          </div>
                        </td>
                        <td className="p-3">{visitor.company || '-'}</td>
                        <td className="p-3">{visitor.purpose || '-'}</td>
                        <td className="text-center p-3 text-xs">
                          {visitor.arrival_time && <div>In: {visitor.arrival_time}</div>}
                          {visitor.departure_time && <div>Out: {visitor.departure_time}</div>}
                        </td>
                        <td className="text-center p-3">
                          {visitor.safety_orientation_completed ? (
                            <ShieldCheck className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <span className="text-disabled">-</span>
                          )}
                        </td>
                        <td className="text-center p-3">
                          {visitor.escort_required ? (
                            <Badge variant="outline" className="text-xs">
                              {visitor.escort_name || 'Required'}
                            </Badge>
                          ) : (
                            <span className="text-disabled">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(visitor)}
                              className="p-1 text-disabled hover:text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(visitor.id)}
                              className="p-1 text-disabled hover:text-error"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {visitors.length === 0 && (
              <div className="p-8 text-center text-muted">
                <Users className="h-8 w-8 mx-auto mb-2 text-disabled" />
                <p>No visitors logged today.</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Visitor' : 'Add Visitor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visitor Name *</Label>
                <Input
                  value={formData.visitor_name || ''}
                  onChange={(e) => handleFormChange({ visitor_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={formData.company || ''}
                  onChange={(e) => handleFormChange({ company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select
                  value={formData.purpose || ''}
                  onValueChange={(value) => handleFormChange({ purpose: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_PURPOSES.map((purpose) => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Badge Number</Label>
                <Input
                  value={formData.badge_number || ''}
                  onChange={(e) => handleFormChange({ badge_number: e.target.value })}
                  placeholder="Visitor badge #"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Arrival Time</Label>
                <Input
                  type="time"
                  value={formData.arrival_time || ''}
                  onChange={(e) => handleFormChange({ arrival_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Departure Time</Label>
                <Input
                  type="time"
                  value={formData.departure_time || ''}
                  onChange={(e) => handleFormChange({ departure_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="safety_orientation"
                  checked={formData.safety_orientation_completed || false}
                  onCheckedChange={(checked) =>
                    handleFormChange({ safety_orientation_completed: checked as boolean })
                  }
                />
                <Label htmlFor="safety_orientation">Safety Orientation Completed</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="escort_required"
                  checked={formData.escort_required || false}
                  onCheckedChange={(checked) =>
                    handleFormChange({ escort_required: checked as boolean })
                  }
                />
                <Label htmlFor="escort_required">Escort Required</Label>
              </div>

              {formData.escort_required && (
                <div className="ml-6 space-y-2">
                  <Label>Escort Name</Label>
                  <Input
                    value={formData.escort_name || ''}
                    onChange={(e) => handleFormChange({ escort_name: e.target.value })}
                    placeholder="Name of escort"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="photos_taken"
                  checked={formData.photos_taken || false}
                  onCheckedChange={(checked) =>
                    handleFormChange({ photos_taken: checked as boolean })
                  }
                />
                <Label htmlFor="photos_taken">Photos Taken on Site</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="nda_signed"
                  checked={formData.nda_signed || false}
                  onCheckedChange={(checked) =>
                    handleFormChange({ nda_signed: checked as boolean })
                  }
                />
                <Label htmlFor="nda_signed">NDA Signed</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.visitor_name?.trim()}>
              {editingEntry ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VisitorsSection;
