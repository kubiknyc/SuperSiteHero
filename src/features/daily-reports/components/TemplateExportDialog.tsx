/**
 * TemplateExportDialog - Dialog for exporting a daily report as a reusable template
 *
 * Features:
 * - Save current report configuration as template
 * - Choose scope (personal, project, company)
 * - Select what to include (workforce, equipment, weather, notes)
 * - Add name, description, category, and tags
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Users,
  Truck,
  Cloud,
  FileEdit,
  Building2,
  Folder,
  User,
  Tag,
  X,
  Loader2,
  Save,
  CheckCircle,
} from 'lucide-react';
import { useCreateTemplateFromReport } from '../hooks/useDailyReportTemplates';
import type { TemplateScope, TemplateCategory } from '@/types/daily-reports-v2';

interface TemplateExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  projectId: string;
  projectName?: string;
  // Preview data
  workforceCount?: number;
  equipmentCount?: number;
}

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'custom', label: 'Custom' },
];

const SCOPE_OPTIONS: { value: TemplateScope; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'personal',
    label: 'Personal',
    icon: User,
    description: 'Only you can see and use this template',
  },
  {
    value: 'project',
    label: 'Project',
    icon: Folder,
    description: 'All project team members can use this template',
  },
  {
    value: 'company',
    label: 'Company',
    icon: Building2,
    description: 'Available to everyone in your company',
  },
];

export function TemplateExportDialog({
  open,
  onOpenChange,
  reportId,
  projectId: _projectId,
  projectName,
  workforceCount = 0,
  equipmentCount = 0,
}: TemplateExportDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TemplateScope>('personal');
  const [category, setCategory] = useState<TemplateCategory>('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Include options
  const [includeWorkforce, setIncludeWorkforce] = useState(true);
  const [includeEquipment, setIncludeEquipment] = useState(true);
  const [includeWeather, setIncludeWeather] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  // Mutation
  const createTemplate = useCreateTemplateFromReport();

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setScope('personal');
      setCategory('general');
      setTags([]);
      setTagInput('');
      setIncludeWorkforce(true);
      setIncludeEquipment(true);
      setIncludeWeather(false);
      setIncludeNotes(false);
    }
  }, [open]);

  // Handle tag addition
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags((prev) => [...prev, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  // Handle tag removal
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  // Handle tag input key press
  const handleTagKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        return;
      }

      await createTemplate.mutateAsync({
        reportId,
        templateInfo: {
          name: name.trim(),
          description: description.trim() || undefined,
          scope,
          category,
          tags,
          includeWorkforce,
          includeEquipment,
          includeWeather,
          includeNotes,
        },
      });

      onOpenChange(false);
    },
    [
      name,
      description,
      scope,
      category,
      tags,
      includeWorkforce,
      includeEquipment,
      includeWeather,
      includeNotes,
      reportId,
      createTemplate,
      onOpenChange,
    ]
  );

  // Check if form is valid
  const isValid = name.trim().length > 0 && (includeWorkforce || includeEquipment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary dark:text-primary-400" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Create a reusable template from this daily report's configuration.
            {projectName && (
              <span className="block mt-1 text-xs text-muted">
                Source: {projectName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g., Standard Day Crew Setup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Describe what this template is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <Label>Sharing Scope</Label>
            <div className="grid gap-2">
              {SCOPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = scope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setScope(option.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-50 dark:border-primary-600 dark:bg-primary-950/20'
                        : 'border-border hover:border-input hover:bg-surface dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-surface'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected ? 'bg-primary-100 text-primary dark:bg-primary-950 dark:text-primary-400' : 'bg-muted text-secondary dark:bg-surface dark:text-disabled'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted">{option.description}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary dark:text-primary-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* What to Include */}
          <div className="space-y-3">
            <Label>Include in Template</Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  includeWorkforce
                    ? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/20'
                    : 'border-border hover:bg-surface'
                }`}
              >
                <Checkbox
                  checked={includeWorkforce}
                  onCheckedChange={(checked) => setIncludeWorkforce(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary" />
                  <span className="text-sm">Workforce</span>
                  <Badge variant="secondary" className="text-xs">
                    {workforceCount}
                  </Badge>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  includeEquipment
                    ? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/20'
                    : 'border-border hover:bg-surface'
                }`}
              >
                <Checkbox
                  checked={includeEquipment}
                  onCheckedChange={(checked) => setIncludeEquipment(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-secondary" />
                  <span className="text-sm">Equipment</span>
                  <Badge variant="secondary" className="text-xs">
                    {equipmentCount}
                  </Badge>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  includeWeather
                    ? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/20'
                    : 'border-border hover:bg-surface'
                }`}
              >
                <Checkbox
                  checked={includeWeather}
                  onCheckedChange={(checked) => setIncludeWeather(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-secondary" />
                  <span className="text-sm">Weather</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  includeNotes
                    ? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/20'
                    : 'border-border hover:bg-surface'
                }`}
              >
                <Checkbox
                  checked={includeNotes}
                  onCheckedChange={(checked) => setIncludeNotes(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-secondary" />
                  <span className="text-sm">Notes</span>
                </div>
              </label>
            </div>
            {!includeWorkforce && !includeEquipment && (
              <p className="text-xs text-error">
                Please select at least workforce or equipment to include
              </p>
            )}
          </div>

          {/* Category and Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTemplate.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createTemplate.isPending}>
              {createTemplate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateExportDialog;
