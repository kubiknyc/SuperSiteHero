/**
 * HazardEditor Component
 * Dynamic list editor for JSA hazards with control hierarchy
 */

import { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type {
  CreateJSAHazardDTO,
  RiskLevel,
  HazardType,
  Probability,
  Severity,
} from '@/types/jsa';
import {
  RISK_LEVELS,
  HAZARD_TYPES,
  COMMON_PPE,
  getRiskLevelColor,
} from '@/types/jsa';

interface HazardEditorProps {
  hazards: CreateJSAHazardDTO[];
  onChange: (hazards: CreateJSAHazardDTO[]) => void;
  disabled?: boolean;
}

const PROBABILITIES: { value: Probability; label: string }[] = [
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'likely', label: 'Likely' },
  { value: 'certain', label: 'Almost Certain' },
];

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'serious', label: 'Serious' },
  { value: 'catastrophic', label: 'Catastrophic' },
];

function createEmptyHazard(stepNumber: number): CreateJSAHazardDTO {
  return {
    step_number: stepNumber,
    step_description: '',
    hazard_description: '',
    hazard_type: undefined,
    risk_level: 'medium',
    probability: undefined,
    severity: undefined,
    elimination_controls: '',
    substitution_controls: '',
    engineering_controls: '',
    administrative_controls: '',
    ppe_required: [],
    responsible_party: '',
    notes: '',
  };
}

export function HazardEditor({ hazards, onChange, disabled }: HazardEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    hazards.length > 0 ? 0 : null
  );

  const addHazard = () => {
    const newHazard = createEmptyHazard(hazards.length + 1);
    onChange([...hazards, newHazard]);
    setExpandedIndex(hazards.length);
  };

  const removeHazard = (index: number) => {
    const updated = hazards.filter((_, i) => i !== index);
    // Re-number steps
    const renumbered = updated.map((h, i) => ({ ...h, step_number: i + 1 }));
    onChange(renumbered);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateHazard = (index: number, updates: Partial<CreateJSAHazardDTO>) => {
    const updated = [...hazards];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const togglePPE = (index: number, ppe: string) => {
    const current = hazards[index].ppe_required || [];
    const updated = current.includes(ppe)
      ? current.filter((p) => p !== ppe)
      : [...current, ppe];
    updateHazard(index, { ppe_required: updated });
  };

  const moveHazard = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === hazards.length - 1)
    ) {
      return;
    }

    const updated = [...hazards];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];

    // Re-number steps
    const renumbered = updated.map((h, i) => ({ ...h, step_number: i + 1 }));
    onChange(renumbered);
    setExpandedIndex(targetIndex);
  };

  const getRiskBadgeClass = (level: RiskLevel) => {
    const color = getRiskLevelColor(level);
    switch (color) {
      case 'green':
        return 'bg-success-light text-green-800 border-green-200';
      case 'yellow':
        return 'bg-warning-light text-yellow-800 border-yellow-200';
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'red':
        return 'bg-error-light text-red-800 border-red-200';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="text-lg font-medium" className="heading-subsection">Hazards & Controls</h3>
          <Badge variant="outline">{hazards.length} hazards</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHazard}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Hazard
        </Button>
      </div>

      {hazards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No hazards identified yet. Add hazards to complete the JSA.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={addHazard}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Hazard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hazards.map((hazard, index) => (
            <HazardCard
              key={index}
              hazard={hazard}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              onChange={(updates) => updateHazard(index, updates)}
              onRemove={() => removeHazard(index)}
              onMove={(dir) => moveHazard(index, dir)}
              onTogglePPE={(ppe) => togglePPE(index, ppe)}
              disabled={disabled}
              isFirst={index === 0}
              isLast={index === hazards.length - 1}
              getRiskBadgeClass={getRiskBadgeClass}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface HazardCardProps {
  hazard: CreateJSAHazardDTO;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<CreateJSAHazardDTO>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onTogglePPE: (ppe: string) => void;
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  getRiskBadgeClass: (level: RiskLevel) => string;
}

function HazardCard({
  hazard,
  index,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
  onMove,
  onTogglePPE,
  disabled,
  isFirst,
  isLast,
  getRiskBadgeClass,
}: HazardCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={isExpanded ? 'border-primary' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove('up');
                    }}
                    disabled={disabled || isFirst}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove('down');
                    }}
                    disabled={disabled || isLast}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Step {hazard.step_number || index + 1}:
                    </span>
                    <span className="truncate max-w-[300px]">
                      {hazard.step_description || 'Untitled step'}
                    </span>
                    <Badge
                      variant="outline"
                      className={getRiskBadgeClass(hazard.risk_level || 'medium')}
                    >
                      {hazard.risk_level || 'medium'}
                    </Badge>
                  </CardTitle>
                  {hazard.hazard_description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[400px]">
                      Hazard: {hazard.hazard_description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(hazard.ppe_required?.length || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {hazard.ppe_required?.length} PPE
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Step & Hazard Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`step-${index}`}>Step Description *</Label>
                <Input
                  id={`step-${index}`}
                  placeholder="What is the work step?"
                  value={hazard.step_description}
                  onChange={(e) => onChange({ step_description: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hazard-${index}`}>Hazard Description *</Label>
                <Input
                  id={`hazard-${index}`}
                  placeholder="What is the potential hazard?"
                  value={hazard.hazard_description}
                  onChange={(e) => onChange({ hazard_description: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Hazard Type</Label>
                <Select
                  value={hazard.hazard_type || ''}
                  onValueChange={(v) =>
                    onChange({ hazard_type: v as HazardType })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HAZARD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Level *</Label>
                <Select
                  value={hazard.risk_level || 'medium'}
                  onValueChange={(v) => onChange({ risk_level: v as RiskLevel })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              level.color === 'green'
                                ? 'bg-green-500'
                                : level.color === 'yellow'
                                ? 'bg-warning'
                                : level.color === 'orange'
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {level.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probability</Label>
                <Select
                  value={hazard.probability || ''}
                  onValueChange={(v) =>
                    onChange({ probability: v as Probability })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBABILITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={hazard.severity || ''}
                  onValueChange={(v) => onChange({ severity: v as Severity })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Control Hierarchy */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Control Hierarchy (list controls in order of preference)
              </Label>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    1. Elimination
                  </Label>
                  <Textarea
                    placeholder="Can the hazard be eliminated entirely?"
                    value={hazard.elimination_controls || ''}
                    onChange={(e) =>
                      onChange({ elimination_controls: e.target.value })
                    }
                    rows={2}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    2. Substitution
                  </Label>
                  <Textarea
                    placeholder="Can it be replaced with something safer?"
                    value={hazard.substitution_controls || ''}
                    onChange={(e) =>
                      onChange({ substitution_controls: e.target.value })
                    }
                    rows={2}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    3. Engineering Controls
                  </Label>
                  <Textarea
                    placeholder="Guards, barriers, ventilation, etc."
                    value={hazard.engineering_controls || ''}
                    onChange={(e) =>
                      onChange({ engineering_controls: e.target.value })
                    }
                    rows={2}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    4. Administrative Controls
                  </Label>
                  <Textarea
                    placeholder="Procedures, training, signage, etc."
                    value={hazard.administrative_controls || ''}
                    onChange={(e) =>
                      onChange({ administrative_controls: e.target.value })
                    }
                    rows={2}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            {/* PPE Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                5. PPE Required (last line of defense)
              </Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_PPE.map((ppe) => {
                  const isSelected = hazard.ppe_required?.includes(ppe);
                  return (
                    <Badge
                      key={ppe}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary hover:bg-primary/90'
                          : 'hover:bg-muted'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !disabled && onTogglePPE(ppe)}
                    >
                      {isSelected && <X className="h-3 w-3 mr-1" />}
                      {ppe}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Responsible Party & Notes */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`responsible-${index}`}>Responsible Party</Label>
                <Input
                  id={`responsible-${index}`}
                  placeholder="Who is responsible for controls?"
                  value={hazard.responsible_party || ''}
                  onChange={(e) =>
                    onChange({ responsible_party: e.target.value })
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`notes-${index}`}>Notes</Label>
                <Input
                  id={`notes-${index}`}
                  placeholder="Additional notes"
                  value={hazard.notes || ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default HazardEditor;
