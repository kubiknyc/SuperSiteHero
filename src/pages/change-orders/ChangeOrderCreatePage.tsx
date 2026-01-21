/**
 * ChangeOrderCreatePage - Create new change order (PCO)
 * Full-page form for creating Potential Change Orders
 */

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { useCreateChangeOrderV2 } from '@/features/change-orders/hooks/useChangeOrdersV2';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-states';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect as Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  FileEdit,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CreateChangeOrderDTO, ChangeType, PricingMethod } from '@/types/change-order';

// Change type options
const CHANGE_TYPES: Array<{ value: ChangeType | string; label: string; description: string }> = [
  { value: 'scope_change', label: 'Scope Change', description: 'Addition or modification to contract scope' },
  { value: 'design_clarification', label: 'Design Clarification', description: 'Clarification of unclear design intent' },
  { value: 'unforeseen_condition', label: 'Unforeseen Condition', description: 'Discovery of site conditions not in contract' },
  { value: 'owner_request', label: 'Owner Request', description: 'Change requested by the owner' },
  { value: 'value_engineering', label: 'Value Engineering', description: 'Cost-saving alternative approach' },
  { value: 'error_omission', label: 'Error/Omission', description: 'Correction of design error or omission' },
];

// Pricing method options
const PRICING_METHODS: Array<{ value: PricingMethod | string; label: string }> = [
  { value: 'lump_sum', label: 'Lump Sum' },
  { value: 'time_materials', label: 'Time & Materials' },
  { value: 'unit_price', label: 'Unit Price' },
];

export function ChangeOrderCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProjectId, setSelectedProjectId, projects, isLoading: projectsLoading } = useSelectedProject();

  // Sync from URL on mount if URL has projectId
  useState(() => {
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId);
    }
  });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<ChangeType | string>('scope_change');
  const [pricingMethod, setPricingMethod] = useState<PricingMethod | string>('lump_sum');
  const [proposedAmount, setProposedAmount] = useState('');
  const [proposedDays, setProposedDays] = useState('');
  const [justification, setJustification] = useState('');

  // Validation state
  const [errors, setErrors] = useState({
    project: '',
    title: '',
  });

  // Mutation
  const createChangeOrder = useCreateChangeOrderV2();

  // Get change type description
  const getChangeTypeDescription = (type: string) => {
    return CHANGE_TYPES.find((t) => t.value === type)?.description || '';
  };

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors = { project: '', title: '' };

    if (!selectedProjectId) {
      newErrors.project = 'Please select a project';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);

    if (newErrors.project || newErrors.title) {
      toast.error('Please fix validation errors before continuing');
      return;
    }

    const dto: CreateChangeOrderDTO = {
      project_id: selectedProjectId!,
      title: title.trim(),
      description: description.trim() || undefined,
      change_type: changeType,
      pricing_method: pricingMethod,
      proposed_amount: proposedAmount ? parseFloat(proposedAmount) : 0,
      proposed_days: proposedDays ? parseInt(proposedDays) : 0,
      justification: justification.trim() || undefined,
    };

    try {
      const result = await createChangeOrder.mutateAsync(dto);
      toast.success('Change order created successfully');
      navigate(`/change-orders/${result.id}`);
    } catch (error) {
      toast.error('Failed to create change order');
    }
  }, [selectedProjectId, title, description, changeType, pricingMethod, proposedAmount, proposedDays, justification, createChangeOrder, navigate]);

  return (
    <SmartLayout title="New Change Order" subtitle="Create a potential change order">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/change-orders')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page flex items-center gap-2">
              <FileEdit className="h-6 w-6 text-primary" />
              New Change Order
            </h1>
            <p className="text-secondary">Create a Potential Change Order (PCO)</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Change Order Details</CardTitle>
              <CardDescription>
                Fill in the details for the new potential change order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Selection */}
              <FormField
                label="Project"
                htmlFor="project_select"
                required
                error={errors.project}
              >
                <select
                  id="project_select"
                  value={selectedProjectId || ''}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setErrors((prev) => ({ ...prev, project: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.project ? 'border-red-500' : 'border-input'
                  }`}
                  disabled={projectsLoading}
                >
                  <option value="">-- Select a project --</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* No Projects Warning */}
              {!projectsLoading && projects && projects.length === 0 && (
                <div className="flex gap-3 p-4 bg-warning-light border border-warning rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                  <div>
                    <p className="font-medium text-warning-dark">No projects available</p>
                    <p className="text-sm text-warning-dark/80">
                      Create a project first before creating change orders.
                    </p>
                  </div>
                </div>
              )}

              {/* Title */}
              <FormField
                label="Title"
                htmlFor="title"
                required
                error={errors.title}
              >
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="Brief description of the proposed change"
                  className={errors.title ? 'border-red-500' : ''}
                />
              </FormField>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the change..."
                  rows={3}
                />
              </div>

              {/* Change Type */}
              <div className="space-y-2">
                <Label htmlFor="change-type">Change Type *</Label>
                <Select
                  id="change-type"
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value)}
                >
                  {CHANGE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted">{getChangeTypeDescription(changeType)}</p>
              </div>

              {/* Pricing Method */}
              <div className="space-y-2">
                <Label htmlFor="pricing-method">Pricing Method</Label>
                <Select
                  id="pricing-method"
                  value={pricingMethod}
                  onChange={(e) => setPricingMethod(e.target.value)}
                >
                  {PRICING_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Cost and Time Impact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proposed-amount">Proposed Amount ($)</Label>
                  <Input
                    id="proposed-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={proposedAmount}
                    onChange={(e) => setProposedAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted">Initial estimate (can be updated later)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposed-days">Time Impact (days)</Label>
                  <Input
                    id="proposed-days"
                    type="number"
                    min="0"
                    value={proposedDays}
                    onChange={(e) => setProposedDays(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted">Schedule impact in calendar days</p>
                </div>
              </div>

              {/* Justification */}
              <div className="space-y-2">
                <Label htmlFor="justification">Justification / Reason</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Why is this change necessary? Reference contract clauses, RFIs, etc."
                  rows={3}
                />
              </div>

              {/* Info banner */}
              <div className="p-4 bg-warning-light border border-warning rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-dark">Creating a PCO</p>
                    <p className="text-sm text-warning-dark/80 mt-1">
                      This will create a Potential Change Order (PCO) in draft status. You can add
                      line items, attachments, and submit for approval from the detail page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/change-orders')}>
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={createChangeOrder.isPending}
                  loadingText="Creating..."
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create PCO
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </SmartLayout>
  );
}

export default ChangeOrderCreatePage;
