/**
 * BIMProperties Component
 *
 * Dedicated properties panel for BIM elements with advanced features:
 * - Grouped property sets
 * - Search and filter
 * - Property editing (for supported properties)
 * - Export to CSV/JSON
 * - Property comparison
 * - Unit conversion
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Download,
  Copy,
  Check,
  Edit2,
  X,
  Ruler,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  formatIFCPropertyValue,
  getIFCTypeColor,
  getIFCCategory,
} from '../services/ifcLoader';
import type {
  IFCElement,
  IFCProperty,
  IFCPropertySet,
} from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

interface BIMPropertiesProps {
  /** Selected IFC element */
  element: IFCElement | null;
  /** Property sets for the element */
  propertySets: IFCPropertySet[];
  /** Enable property editing */
  editable?: boolean;
  /** Callback when property is edited */
  onPropertyEdit?: (propertySetName: string, propertyName: string, value: any) => void;
  /** Container className */
  className?: string;
}

type UnitSystem = 'metric' | 'imperial';

// Unit conversion factors
const UNIT_CONVERSIONS: Record<string, { imperial: number; imperialUnit: string }> = {
  m: { imperial: 3.28084, imperialUnit: 'ft' },
  m2: { imperial: 10.7639, imperialUnit: 'ft2' },
  m3: { imperial: 35.3147, imperialUnit: 'ft3' },
  mm: { imperial: 0.0393701, imperialUnit: 'in' },
  kg: { imperial: 2.20462, imperialUnit: 'lb' },
  'kg/m3': { imperial: 0.062428, imperialUnit: 'lb/ft3' },
};

// ============================================================================
// Property Row Component
// ============================================================================

interface PropertyRowProps {
  property: IFCProperty;
  unitSystem: UnitSystem;
  editable?: boolean;
  onEdit?: (value: any) => void;
}

function PropertyRow({ property, unitSystem, editable, onEdit }: PropertyRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(property.value ?? ''));
  const [copied, setCopied] = useState(false);

  // Convert value based on unit system
  const displayValue = useMemo(() => {
    if (property.type !== 'number' || !property.unit) {
      return formatIFCPropertyValue(property);
    }

    const value = property.value as number;
    if (unitSystem === 'imperial' && UNIT_CONVERSIONS[property.unit]) {
      const conversion = UNIT_CONVERSIONS[property.unit];
      const converted = value * conversion.imperial;
      return `${converted.toFixed(3)} ${conversion.imperialUnit}`;
    }

    return formatIFCPropertyValue(property);
  }, [property, unitSystem]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(String(property.value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [property.value]);

  const handleSave = useCallback(() => {
    let newValue: any = editValue;
    if (property.type === 'number') {
      newValue = parseFloat(editValue);
    } else if (property.type === 'boolean') {
      newValue = editValue.toLowerCase() === 'true' || editValue === '1';
    }
    onEdit?.(newValue);
    setIsEditing(false);
  }, [editValue, property.type, onEdit]);

  const handleCancel = useCallback(() => {
    setEditValue(String(property.value ?? ''));
    setIsEditing(false);
  }, [property.value]);

  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-accent/50 rounded group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm text-muted-foreground truncate">{property.name}</span>
        {property.unit && (
          <Badge variant="outline" className="text-xs shrink-0">
            {property.unit}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 w-32 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {handleSave();}
                if (e.key === 'Escape') {handleCancel();}
              }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">{displayValue}</span>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy value</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {editable && onEdit && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit value</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Property Set Section Component
// ============================================================================

interface PropertySetSectionProps {
  propertySet: IFCPropertySet;
  unitSystem: UnitSystem;
  searchQuery: string;
  editable?: boolean;
  onPropertyEdit?: (propertyName: string, value: any) => void;
  defaultOpen?: boolean;
}

function PropertySetSection({
  propertySet,
  unitSystem,
  searchQuery,
  editable,
  onPropertyEdit,
  defaultOpen = false,
}: PropertySetSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Filter properties based on search
  const filteredProperties = useMemo(() => {
    if (!searchQuery) {return propertySet.properties;}
    const query = searchQuery.toLowerCase();
    return propertySet.properties.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        String(p.value).toLowerCase().includes(query)
    );
  }, [propertySet.properties, searchQuery]);

  // Don't render if no matching properties
  if (filteredProperties.length === 0) {return null;}

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium text-sm">{propertySet.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredProperties.length}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-2 border-l pl-2">
          {filteredProperties.map((property, index) => (
            <PropertyRow
              key={index}
              property={property}
              unitSystem={unitSystem}
              editable={editable}
              onEdit={
                onPropertyEdit
                  ? (value) => onPropertyEdit(property.name, value)
                  : undefined
              }
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Main BIMProperties Component
// ============================================================================

export function BIMProperties({
  element,
  propertySets,
  editable = false,
  onPropertyEdit,
  className,
}: BIMPropertiesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [expandAll, setExpandAll] = useState(false);

  // Get element info
  const elementInfo = useMemo(() => {
    if (!element) {return null;}

    const category = getIFCCategory(element.type);
    const color = getIFCTypeColor(element.type);

    return {
      type: element.type,
      name: element.name,
      guid: element.guid,
      category,
      color: `#${color.toString(16).padStart(6, '0')}`,
    };
  }, [element]);

  // Export properties to JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      element: elementInfo,
      propertySets: propertySets.map((ps) => ({
        name: ps.name,
        properties: ps.properties.map((p) => ({
          name: p.name,
          value: p.value,
          type: p.type,
          unit: p.unit,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bim-properties-${element?.expressID || 'unknown'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [elementInfo, propertySets, element]);

  // Export properties to CSV
  const handleExportCSV = useCallback(() => {
    const rows: string[] = ['Property Set,Property Name,Value,Type,Unit'];

    propertySets.forEach((ps) => {
      ps.properties.forEach((p) => {
        const value = String(p.value ?? '').replace(/"/g, '""');
        rows.push(`"${ps.name}","${p.name}","${value}","${p.type}","${p.unit || ''}"`);
      });
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bim-properties-${element?.expressID || 'unknown'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [propertySets, element]);

  // No element selected state
  if (!element) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <Info className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No Element Selected</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click on an element in the 3D view to see its properties
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: elementInfo?.color }}
            />
            <Badge variant="outline">{element.type.replace('IFC', '')}</Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Properties</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportJSON}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-lg truncate heading-subsection">{element.name}</h3>

        {elementInfo?.category && (
          <p className="text-sm text-muted-foreground">
            Category: {elementInfo.category}
          </p>
        )}

        <p className="text-xs text-muted-foreground font-mono mt-1">
          GUID: {element.guid}
        </p>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
          <SelectTrigger className="w-24 h-8">
            <Ruler className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="metric">Metric</SelectItem>
            <SelectItem value="imperial">Imperial</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandAll(!expandAll)}
          className="h-8"
        >
          {expandAll ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {/* Property Sets */}
      <ScrollArea className="flex-1 p-2">
        {propertySets.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No properties available for this element
          </div>
        ) : (
          <div className="space-y-1">
            {propertySets.map((propertySet, index) => (
              <PropertySetSection
                key={index}
                propertySet={propertySet}
                unitSystem={unitSystem}
                searchQuery={searchQuery}
                editable={editable}
                onPropertyEdit={
                  onPropertyEdit
                    ? (propName, value) => onPropertyEdit(propertySet.name, propName, value)
                    : undefined
                }
                defaultOpen={expandAll || index === 0}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground flex justify-between">
        <span>Express ID: {element.expressID}</span>
        <span>
          {propertySets.reduce((acc, ps) => acc + ps.properties.length, 0)} properties
        </span>
      </div>
    </div>
  );
}

export default BIMProperties;
