/**
 * TemplateManagementPage - Full page for managing daily report templates
 *
 * Features:
 * - View all templates (personal, project, company)
 * - Create, edit, delete templates
 * - Import/export templates
 * - Copy templates between scopes
 * - Filter and search templates
 */

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Truck,
  Search,
  Star,
  Clock,
  FileText,
  Building2,
  Folder,
  User,
  TrendingUp,
  Loader2,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Filter,
  X,
  Tag,
  RefreshCw,
} from 'lucide-react';
import {
  useTemplates,
  useTemplateTags,
  useDeleteTemplate,
  useCopyTemplate,
  useExportTemplate,
  useImportTemplate,
  useUpdateTemplate,
  templateKeys,
} from '../hooks/useDailyReportTemplates';
import type {
  DailyReportTemplate,
  TemplateScope,
  TemplateCategory,
  TemplateFilters,
  UpdateTemplateRequest,
} from '@/types/daily-reports-v2';
import { useQueryClient } from '@tanstack/react-query';

// =============================================
// Constants
// =============================================

const SCOPE_OPTIONS: { value: TemplateScope | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Scopes', icon: FileText },
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'project', label: 'Project', icon: Folder },
  { value: 'company', label: 'Company', icon: Building2 },
];

const CATEGORY_OPTIONS: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'custom', label: 'Custom' },
];

// =============================================
// Template Card Component
// =============================================

interface TemplateCardProps {
  template: DailyReportTemplate;
  onEdit: (template: DailyReportTemplate) => void;
  onDelete: (template: DailyReportTemplate) => void;
  onCopy: (template: DailyReportTemplate) => void;
  onExport: (template: DailyReportTemplate) => void;
}

function TemplateCard({ template, onEdit, onDelete, onCopy, onExport }: TemplateCardProps) {
  const ScopeIcon = SCOPE_OPTIONS.find((s) => s.value === template.scope)?.icon || FileText;
  const workforceCount = template.workforce_template?.length || 0;
  const equipmentCount = template.equipment_template?.length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base truncate">{template.name}</CardTitle>
              {template.is_default && (
                <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-3 w-3" />
                  Default
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <ScopeIcon className="h-3 w-3" />
                {template.scope}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {template.category}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy(template)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy to...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(template)}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(template)}
                className="text-error focus:text-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {template.description && (
          <CardDescription className="line-clamp-2 mb-3">{template.description}</CardDescription>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-secondary">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{workforceCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            <span>{equipmentCount}</span>
          </div>
          {template.usage_count > 0 && (
            <div className="flex items-center gap-1 text-disabled">
              <TrendingUp className="h-4 w-4" />
              <span>{template.usage_count}x</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {template.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Last used */}
        {template.last_used_at && (
          <div className="flex items-center gap-1 mt-3 text-xs text-disabled">
            <Clock className="h-3 w-3" />
            <span>Last used {new Date(template.last_used_at).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// Edit Template Dialog
// =============================================

interface EditTemplateDialogProps {
  template: DailyReportTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditTemplateDialog({ template, open, onOpenChange }: EditTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const updateTemplate = useUpdateTemplate();

  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category);
      setTags(template.tags || []);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) {return;}

    await updateTemplate.mutateAsync({
      templateId: template.id,
      updates: {
        name,
        description: description || undefined,
        category,
        tags,
      },
    });

    onOpenChange(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>Update template details and metadata.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TemplateCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((opt) => (
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
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="ml-1 hover:text-error"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// Copy Template Dialog
// =============================================

interface CopyTemplateDialogProps {
  template: DailyReportTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyTemplateDialog({ template, open, onOpenChange }: CopyTemplateDialogProps) {
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState<TemplateScope>('personal');

  const copyTemplate = useCopyTemplate();

  React.useEffect(() => {
    if (template) {
      setNewName(`${template.name} (Copy)`);
      setNewScope(template.scope);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) {return;}

    await copyTemplate.mutateAsync({
      source_template_id: template.id,
      new_name: newName,
      new_scope: newScope,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Template</DialogTitle>
          <DialogDescription>
            Create a copy of this template with a new name and scope.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="copy-name">New Name</Label>
            <Input
              id="copy-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={newScope} onValueChange={(v) => setNewScope(v as TemplateScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.filter((s) => s.value !== 'all').map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={copyTemplate.isPending}>
              {copyTemplate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Create Copy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// Import Template Dialog
// =============================================

interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ImportTemplateDialog({ open, onOpenChange }: ImportTemplateDialogProps) {
  const [jsonData, setJsonData] = useState('');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<TemplateScope>('personal');
  const [error, setError] = useState('');

  const importTemplate = useImportTemplate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setJsonData(event.target?.result as string);
        setError('');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await importTemplate.mutateAsync({
        jsonData,
        options: {
          name: name || undefined,
          scope,
        },
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to import template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
          <DialogDescription>Import a template from a JSON file.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>JSON File</Label>
            <Input type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-name">Name (optional)</Label>
            <Input
              id="import-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leave empty to use name from file"
            />
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as TemplateScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.filter((s) => s.value !== 'all').map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!jsonData || importTemplate.isPending}>
              {importTemplate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// Main Component
// =============================================

export function TemplateManagementPage() {
  // URL search params for filters
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<TemplateScope | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');

  // Dialog state
  const [editTemplate, setEditTemplate] = useState<DailyReportTemplate | null>(null);
  const [copyTemplate, setCopyTemplate] = useState<DailyReportTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<DailyReportTemplate | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Build filters object
  const filters: TemplateFilters = useMemo(() => {
    const f: TemplateFilters = {};
    if (scopeFilter !== 'all') {f.scope = scopeFilter;}
    if (categoryFilter !== 'all') {f.category = categoryFilter;}
    if (searchQuery) {f.search = searchQuery;}
    return f;
  }, [scopeFilter, categoryFilter, searchQuery]);

  // Query hooks
  const { data: templates, isLoading, refetch } = useTemplates(filters);
  const { data: allTags } = useTemplateTags();
  const deleteTemplateMutation = useDeleteTemplate();
  const exportTemplateMutation = useExportTemplate();
  const queryClient = useQueryClient();

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates || [];
  }, [templates]);

  // Group templates by scope
  const groupedTemplates = useMemo(() => {
    const groups: Record<TemplateScope, DailyReportTemplate[]> = {
      personal: [],
      project: [],
      company: [],
    };
    filteredTemplates.forEach((t) => {
      if (groups[t.scope]) {
        groups[t.scope].push(t);
      }
    });
    return groups;
  }, [filteredTemplates]);

  // Handlers
  const handleEdit = useCallback((template: DailyReportTemplate) => {
    setEditTemplate(template);
  }, []);

  const handleCopy = useCallback((template: DailyReportTemplate) => {
    setCopyTemplate(template);
  }, []);

  const handleDelete = useCallback((template: DailyReportTemplate) => {
    setDeleteTemplate(template);
  }, []);

  const handleExport = useCallback(
    (template: DailyReportTemplate) => {
      exportTemplateMutation.mutate(template.id);
    },
    [exportTemplateMutation]
  );

  const confirmDelete = useCallback(async () => {
    if (deleteTemplate) {
      await deleteTemplateMutation.mutateAsync(deleteTemplate.id);
      setDeleteTemplate(null);
    }
  }, [deleteTemplate, deleteTemplateMutation]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: templateKeys.all });
    refetch();
  }, [queryClient, refetch]);

  // Clear filters
  const hasFilters = scopeFilter !== 'all' || categoryFilter !== 'all' || searchQuery !== '';
  const clearFilters = useCallback(() => {
    setScopeFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold heading-page">Template Library</h1>
          <p className="text-muted-foreground">
            Manage and share daily report templates across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Scope Filter */}
            <Select
              value={scopeFilter}
              onValueChange={(v) => setScopeFilter(v as TemplateScope | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as TemplateCategory | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-disabled" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-secondary heading-subsection">No templates found</h3>
            <p className="text-sm text-disabled mt-1">
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Create templates from your daily reports to see them here'}
            </p>
          </CardContent>
        </Card>
      ) : scopeFilter === 'all' ? (
        // Grouped view
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              All ({filteredTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Personal ({groupedTemplates.personal.length})
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2">
              <Folder className="h-4 w-4" />
              Project ({groupedTemplates.project.length})
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company ({groupedTemplates.company.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  onExport={handleExport}
                />
              ))}
            </div>
          </TabsContent>

          {(['personal', 'project', 'company'] as TemplateScope[]).map((scope) => (
            <TabsContent key={scope} value={scope}>
              {groupedTemplates[scope].length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-secondary heading-subsection">No {scope} templates</h3>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedTemplates[scope].map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                      onExport={handleExport}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        // Flat grid view when scope is filtered
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onExport={handleExport}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditTemplateDialog
        template={editTemplate}
        open={!!editTemplate}
        onOpenChange={(open) => !open && setEditTemplate(null)}
      />

      {/* Copy Dialog */}
      <CopyTemplateDialog
        template={copyTemplate}
        open={!!copyTemplate}
        onOpenChange={(open) => !open && setCopyTemplate(null)}
      />

      {/* Import Dialog */}
      <ImportTemplateDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-error hover:bg-red-700"
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TemplateManagementPage;
