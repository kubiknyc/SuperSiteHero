/**
 * TemplateImportDialog - Dialog for importing templates when creating new daily reports
 *
 * Features:
 * - Browse personal, project, and company templates
 * - Search and filter templates
 * - Preview template contents before applying
 * - Apply template to populate report fields
 */

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Truck,
  Search,
  Star,
  Clock,
  CheckCircle,
  FileText,
  Building2,
  Folder,
  User,
  TrendingUp,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  useProjectTemplates,
  usePopularTemplates,
  useRecentTemplates,
  useApplyTemplate,
} from '../hooks/useDailyReportTemplates';
import type {
  DailyReportTemplate,
  TemplateScope,
  WorkforceEntryV2,
  EquipmentEntryV2,
} from '@/types/daily-reports-v2';

interface TemplateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onApplyTemplate: (data: {
    workforce: Partial<WorkforceEntryV2>[];
    equipment: Partial<EquipmentEntryV2>[];
    defaults: Record<string, unknown>;
  }) => void;
}

const SCOPE_ICONS: Record<TemplateScope, React.ElementType> = {
  personal: User,
  project: Folder,
  company: Building2,
};

const SCOPE_LABELS: Record<TemplateScope, string> = {
  personal: 'Personal',
  project: 'Project',
  company: 'Company',
};

// Template list item component - moved outside to fix React Compiler "Cannot create components during render"
interface TemplateListItemProps {
  template: DailyReportTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function TemplateListItem({ template, isSelected, onClick }: TemplateListItemProps) {
  const ScopeIcon = SCOPE_ICONS[template.scope];
  const workforceCount = template.workforce_template?.length || 0;
  const equipmentCount = template.equipment_template?.length || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-border hover:border-input hover:bg-surface'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate heading-card">{template.name}</h4>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <ScopeIcon className="h-3 w-3" />
              {SCOPE_LABELS[template.scope]}
            </Badge>
            {template.is_default && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{template.description}</p>
          )}

          {/* Template Stats */}
          <div className="flex items-center gap-4 mt-3">
            {workforceCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-secondary">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {workforceCount} crew{workforceCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {equipmentCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-secondary">
                <Truck className="h-3.5 w-3.5" />
                <span>{equipmentCount} equipment</span>
              </div>
            )}
            {template.usage_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-disabled">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Used {template.usage_count}x</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Selection indicator */}
        <div className={`flex-shrink-0 ml-4 ${isSelected ? 'text-primary' : 'text-gray-300'}`}>
          <CheckCircle className={`h-6 w-6 ${isSelected ? 'fill-blue-100' : ''}`} />
        </div>
      </div>
    </button>
  );
}

// Empty state component - moved outside to fix React Compiler "Cannot create components during render"
interface EmptyStateProps {
  message: string;
  icon: React.ElementType;
}

function EmptyState({ message, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted">
      <Icon className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function TemplateImportDialog({
  open,
  onOpenChange,
  projectId,
  onApplyTemplate,
}: TemplateImportDialogProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'popular'>('all');

  // Queries
  const { data: projectTemplates, isLoading: isLoadingProject } = useProjectTemplates(projectId);
  const { data: popularTemplates, isLoading: isLoadingPopular } = usePopularTemplates(10);
  const { data: recentTemplates, isLoading: isLoadingRecent } = useRecentTemplates(5);

  // Apply mutation
  const applyTemplate = useApplyTemplate();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedTemplateId(null);
      setActiveTab('all');
    }
  }, [open]);

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    const templates = projectTemplates || [];
    if (!searchQuery) {return templates;}

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [projectTemplates, searchQuery]);

  // Get selected template
  const selectedTemplate = useMemo(() => {
    return projectTemplates?.find((t) => t.id === selectedTemplateId);
  }, [projectTemplates, selectedTemplateId]);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: DailyReportTemplate) => {
    setSelectedTemplateId(template.id);
  }, []);

  // Handle apply template
  const handleApplyTemplate = useCallback(async () => {
    if (!selectedTemplateId) {return;}

    try {
      const result = await applyTemplate.mutateAsync(selectedTemplateId);
      onApplyTemplate(result);
      onOpenChange(false);
    } catch (_error) {
      // Error is handled by the mutation
    }
  }, [selectedTemplateId, applyTemplate, onApplyTemplate, onOpenChange]);

  // Loading state
  const isLoading = isLoadingProject || isLoadingPopular || isLoadingRecent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Apply Template
          </DialogTitle>
          <DialogDescription>
            Choose a template to quickly populate your daily report with saved configurations.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
          <Input
            placeholder="Search templates by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              All Templates
              {filteredTemplates.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filteredTemplates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent
              {recentTemplates && recentTemplates.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {recentTemplates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="popular" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Popular
              {popularTemplates && popularTemplates.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {popularTemplates.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Templates */}
          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-disabled" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery
                      ? 'No templates match your search'
                      : 'No templates available for this project'
                  }
                  icon={FileText}
                />
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <TemplateListItem
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplateId === template.id}
                      onClick={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Recent Templates */}
          <TabsContent value="recent" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {isLoadingRecent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-disabled" />
                </div>
              ) : !recentTemplates || recentTemplates.length === 0 ? (
                <EmptyState message="No recently used templates" icon={Clock} />
              ) : (
                <div className="space-y-2">
                  {recentTemplates.map((template) => (
                    <TemplateListItem
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplateId === template.id}
                      onClick={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Popular Templates */}
          <TabsContent value="popular" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {isLoadingPopular ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-disabled" />
                </div>
              ) : !popularTemplates || popularTemplates.length === 0 ? (
                <EmptyState message="No popular templates yet" icon={TrendingUp} />
              ) : (
                <div className="space-y-2">
                  {popularTemplates.map((template) => (
                    <TemplateListItem
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplateId === template.id}
                      onClick={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Preview Section */}
        {selectedTemplate && (
          <>
            <Separator />
            <div className="bg-surface rounded-lg p-4">
              <h4 className="text-sm font-medium text-secondary mb-3 flex items-center gap-2 heading-card">
                <ChevronRight className="h-4 w-4" />
                Template Preview: {selectedTemplate.name}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Workforce Preview */}
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                    <Users className="h-4 w-4" />
                    Workforce Entries
                  </div>
                  {(selectedTemplate.workforce_template?.length ?? 0) > 0 ? (
                    <ul className="space-y-1 text-secondary text-xs">
                      {selectedTemplate.workforce_template?.slice(0, 4).map((entry, idx) => (
                        <li key={idx} className="truncate flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-400" />
                          {entry.company_name || entry.trade || 'Crew entry'}
                          {entry.worker_count && (
                            <span className="text-disabled">({entry.worker_count} workers)</span>
                          )}
                        </li>
                      ))}
                      {(selectedTemplate.workforce_template?.length ?? 0) > 4 && (
                        <li className="text-disabled italic">
                          +{(selectedTemplate.workforce_template?.length ?? 0) - 4} more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-disabled italic text-xs">No workforce entries</p>
                  )}
                </div>

                {/* Equipment Preview */}
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                    <Truck className="h-4 w-4" />
                    Equipment Entries
                  </div>
                  {(selectedTemplate.equipment_template?.length ?? 0) > 0 ? (
                    <ul className="space-y-1 text-secondary text-xs">
                      {selectedTemplate.equipment_template?.slice(0, 4).map((entry, idx) => (
                        <li key={idx} className="truncate flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-400" />
                          {entry.equipment_type || 'Equipment'}
                          {entry.quantity && entry.quantity > 1 && (
                            <span className="text-disabled">(x{entry.quantity})</span>
                          )}
                        </li>
                      ))}
                      {(selectedTemplate.equipment_template?.length ?? 0) > 4 && (
                        <li className="text-disabled italic">
                          +{(selectedTemplate.equipment_template?.length ?? 0) - 4} more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-disabled italic text-xs">No equipment entries</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applyTemplate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId || applyTemplate.isPending}
          >
            {applyTemplate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateImportDialog;
