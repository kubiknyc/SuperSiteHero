/**
 * TemplateSelectorModal - Modal for selecting and applying workforce/equipment templates
 * Allows users to quickly apply pre-configured templates to daily reports
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Truck,
  Search,
  Star,
  Clock,
  CheckCircle,
  FileText,
} from 'lucide-react';
import type { DailyReportTemplate } from '@/types/daily-reports-v2';

interface TemplateSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: DailyReportTemplate[];
  filterType: 'workforce' | 'equipment' | 'both';
  onSelect: (template: DailyReportTemplate) => void;
}

export function TemplateSelectorModal({
  open,
  onOpenChange,
  templates,
  filterType,
  onSelect,
}: TemplateSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Filter templates based on type and search query
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Check if template has data for the selected type
      const hasWorkforce = (template.workforce_template?.length ?? 0) > 0;
      const hasEquipment = (template.equipment_template?.length ?? 0) > 0;

      if (filterType === 'workforce' && !hasWorkforce) {return false;}
      if (filterType === 'equipment' && !hasEquipment) {return false;}
      if (filterType === 'both' && !hasWorkforce && !hasEquipment) {return false;}

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [templates, filterType, searchQuery]);

  // Get selected template
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // Handle template selection confirmation
  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      setSelectedTemplateId(null);
      setSearchQuery('');
    }
  };

  // Handle modal close
  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedTemplateId(null);
      setSearchQuery('');
    }
    onOpenChange(open);
  };

  // Get title based on filter type
  const getTitle = () => {
    switch (filterType) {
      case 'workforce':
        return 'Select Workforce Template';
      case 'equipment':
        return 'Select Equipment Template';
      default:
        return 'Select Template';
    }
  };

  // Get description based on filter type
  const getDescription = () => {
    switch (filterType) {
      case 'workforce':
        return 'Choose a template to apply workforce entries to your report';
      case 'equipment':
        return 'Choose a template to apply equipment entries to your report';
      default:
        return 'Choose a template to apply to your report';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Templates List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[400px] pr-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">No templates found</p>
              <p className="text-xs mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Create templates from your reports to reuse them'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => {
                const workforceCount = template.workforce_template?.length ?? 0;
                const equipmentCount = template.equipment_template?.length ?? 0;
                const isSelected = selectedTemplateId === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-border hover:border-input hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate heading-card">
                            {template.name}
                          </h4>
                          {template.is_default && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Default
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}

                        {/* Template Stats */}
                        <div className="flex items-center gap-4 mt-3">
                          {(filterType === 'workforce' || filterType === 'both') &&
                            workforceCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-secondary">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                  {workforceCount} crew
                                  {workforceCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          {(filterType === 'equipment' || filterType === 'both') &&
                            equipmentCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-secondary">
                                <Truck className="h-3.5 w-3.5" />
                                <span>
                                  {equipmentCount} equipment
                                </span>
                              </div>
                            )}
                          {template.updated_at && (
                            <div className="flex items-center gap-1 text-xs text-disabled">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                Updated{' '}
                                {new Date(template.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <div
                        className={`flex-shrink-0 ml-4 ${
                          isSelected ? 'text-primary' : 'text-gray-300'
                        }`}
                      >
                        <CheckCircle
                          className={`h-6 w-6 ${isSelected ? 'fill-blue-100' : ''}`}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Preview Section (when template is selected) */}
        {selectedTemplate && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-secondary mb-2 heading-card">
              Template Preview: {selectedTemplate.name}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(filterType === 'workforce' || filterType === 'both') && (
                <div className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                    <Users className="h-4 w-4" />
                    Workforce Entries
                  </div>
                  {(selectedTemplate.workforce_template?.length ?? 0) > 0 ? (
                    <ul className="space-y-1 text-secondary">
                      {selectedTemplate.workforce_template?.slice(0, 5).map((entry, idx) => (
                        <li key={idx} className="truncate">
                          {entry.company_name || entry.trade || 'Crew entry'}{' '}
                          {entry.worker_count && `(${entry.worker_count} workers)`}
                        </li>
                      ))}
                      {(selectedTemplate.workforce_template?.length ?? 0) > 5 && (
                        <li className="text-disabled italic">
                          +{(selectedTemplate.workforce_template?.length ?? 0) - 5} more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-disabled italic">No workforce entries</p>
                  )}
                </div>
              )}
              {(filterType === 'equipment' || filterType === 'both') && (
                <div className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 text-secondary font-medium mb-2">
                    <Truck className="h-4 w-4" />
                    Equipment Entries
                  </div>
                  {(selectedTemplate.equipment_template?.length ?? 0) > 0 ? (
                    <ul className="space-y-1 text-secondary">
                      {selectedTemplate.equipment_template?.slice(0, 5).map((entry, idx) => (
                        <li key={idx} className="truncate">
                          {entry.equipment_type || 'Equipment'}{' '}
                          {entry.quantity && entry.quantity > 1 && `(x${entry.quantity})`}
                        </li>
                      ))}
                      {(selectedTemplate.equipment_template?.length ?? 0) > 5 && (
                        <li className="text-disabled italic">
                          +{(selectedTemplate.equipment_template?.length ?? 0) - 5} more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-disabled italic">No equipment entries</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedTemplateId}>
            Apply Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateSelectorModal;
