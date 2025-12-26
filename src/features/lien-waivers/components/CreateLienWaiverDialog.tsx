// File: /src/features/lien-waivers/components/CreateLienWaiverDialog.tsx
// Dialog for creating a new lien waiver

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCreateLienWaiver, useLienWaiverTemplates } from '../hooks/useLienWaivers';
import { Plus, FileCheck, Loader2 } from 'lucide-react';
import type { LienWaiverType, CreateLienWaiverDTO } from '@/types/lien-waiver';
import { LIEN_WAIVER_TYPES, US_STATES } from '@/types/lien-waiver';
import { logger } from '../../../lib/utils/logger';


interface CreateLienWaiverDialogProps {
  projectId: string;
  paymentApplicationId?: string;
  subcontractorId?: string;
  defaultAmount?: number;
  onSuccess?: (id: string) => void;
  trigger?: React.ReactNode;
}

export function CreateLienWaiverDialog({
  projectId,
  paymentApplicationId,
  subcontractorId,
  defaultAmount,
  onSuccess,
  trigger,
}: CreateLienWaiverDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Form state
  const [waiverType, setWaiverType] = useState<LienWaiverType>('conditional_progress');
  const [stateCode, setStateCode] = useState<string>('CA');
  const [vendorName, setVendorName] = useState('');
  const [throughDate, setThroughDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState(defaultAmount?.toString() || '');
  const [checkNumber, setCheckNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Get templates for the selected state and type
  const { data: templates } = useLienWaiverTemplates({
    stateCode,
    waiverType,
    isActive: true,
  });

  const createWaiver = useCreateLienWaiver();

  const resetForm = () => {
    setWaiverType('conditional_progress');
    setStateCode('CA');
    setVendorName('');
    setThroughDate(new Date().toISOString().split('T')[0]);
    setPaymentAmount(defaultAmount?.toString() || '');
    setCheckNumber('');
    setDueDate('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto: CreateLienWaiverDTO = {
      project_id: projectId,
      waiver_type: waiverType,
      subcontractor_id: subcontractorId,
      payment_application_id: paymentApplicationId,
      vendor_name: vendorName.trim() || undefined,
      template_id: templates?.[0]?.id,
      through_date: throughDate,
      payment_amount: parseFloat(paymentAmount) || 0,
      check_number: checkNumber.trim() || undefined,
      due_date: dueDate || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const result = await createWaiver.mutateAsync(dto);
      resetForm();
      setOpen(false);

      if (onSuccess) {
        onSuccess(result.id);
      } else {
        navigate(`/lien-waivers/${result.id}`);
      }
    } catch (error) {
      logger.error('Failed to create lien waiver:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Request Waiver
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Request Lien Waiver
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Waiver Type */}
          <div className="space-y-2">
            <Label htmlFor="waiver-type">Waiver Type *</Label>
            <Select
              id="waiver-type"
              value={waiverType}
              onChange={(e) => setWaiverType(e.target.value as LienWaiverType)}
            >
              {LIEN_WAIVER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted">
              {LIEN_WAIVER_TYPES.find((t) => t.value === waiverType)?.description}
            </p>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state-code">State *</Label>
            <Select
              id="state-code"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
            >
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} {state.hasStatutoryForm && '(Statutory Form Required)'}
                </option>
              ))}
            </Select>
          </div>

          {/* Vendor/Subcontractor Name */}
          {!subcontractorId && (
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor/Subcontractor Name *</Label>
              <Input
                id="vendor-name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Enter vendor or subcontractor name"
                required={!subcontractorId}
              />
            </div>
          )}

          {/* Through Date */}
          <div className="space-y-2">
            <Label htmlFor="through-date">Work Through Date *</Label>
            <Input
              id="through-date"
              type="date"
              value={throughDate}
              onChange={(e) => setThroughDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted">
              Date through which work/materials are covered
            </p>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount ($) *</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Check Number (for unconditional) */}
          {!waiverType.startsWith('conditional') && (
            <div className="space-y-2">
              <Label htmlFor="check-number">Check Number</Label>
              <Input
                id="check-number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="Payment reference/check number"
              />
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-xs text-muted">
              When waiver should be returned
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Template Info */}
          {templates && templates.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="font-medium text-blue-800">Template Available</p>
              <p className="text-primary">
                Using: {templates[0].name}
                {templates[0].statute_reference && ` (${templates[0].statute_reference})`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWaiver.isPending}>
              {createWaiver.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Waiver Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateLienWaiverDialog;
