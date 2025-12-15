/**
 * Photo Linker Component
 * UI for linking photos to multiple entities across features
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link2,
  Image,
  X,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useBulkLinkPhotos, useLinkPhotoToEntity } from '../hooks/useUnifiedPhotos';
import type { PhotoEntityType } from '@/types/unified-photos';
import { ENTITY_TYPE_LABELS } from '@/types/unified-photos';

interface PhotoLinkerProps {
  photoIds: string[];
  onClose: () => void;
  defaultEntityType?: PhotoEntityType;
  defaultEntityId?: string;
}

interface EntityLink {
  id: string;
  entityType: PhotoEntityType;
  entityId: string;
  isPrimary: boolean;
  contextNote: string;
}

const ENTITY_TYPES: PhotoEntityType[] = [
  'daily_report',
  'punch_item',
  'rfi',
  'submittal',
  'inspection',
  'checklist',
  'change_order',
  'safety_incident',
  'safety_observation',
  'equipment',
  'equipment_inspection',
  'task',
  'meeting',
  'workflow_item',
];

export function PhotoLinker({
  photoIds,
  onClose,
  defaultEntityType,
  defaultEntityId,
}: PhotoLinkerProps) {
  const [links, setLinks] = useState<EntityLink[]>(
    defaultEntityType && defaultEntityId
      ? [
          {
            id: crypto.randomUUID(),
            entityType: defaultEntityType,
            entityId: defaultEntityId,
            isPrimary: true,
            contextNote: '',
          },
        ]
      : []
  );

  const bulkLinkMutation = useBulkLinkPhotos();
  const singleLinkMutation = useLinkPhotoToEntity();

  const isLoading = bulkLinkMutation.isPending || singleLinkMutation.isPending;

  const handleAddLink = () => {
    setLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        entityType: 'daily_report',
        entityId: '',
        isPrimary: false,
        contextNote: '',
      },
    ]);
  };

  const handleRemoveLink = (id: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== id));
  };

  const handleUpdateLink = (id: string, updates: Partial<EntityLink>) => {
    setLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, ...updates } : link))
    );
  };

  const handleSetPrimary = (id: string) => {
    setLinks((prev) =>
      prev.map((link) => ({
        ...link,
        isPrimary: link.id === id,
      }))
    );
  };

  const handleSubmit = async () => {
    // Validate links
    const validLinks = links.filter((link) => link.entityId.trim() !== '');
    if (validLinks.length === 0) {
      return;
    }

    try {
      // For each valid link, link all photos
      for (const link of validLinks) {
        if (photoIds.length === 1) {
          // Single photo - use single link API
          await singleLinkMutation.mutateAsync({
            photo_id: photoIds[0],
            entity_type: link.entityType,
            entity_id: link.entityId,
            is_primary: link.isPrimary,
            context_note: link.contextNote || undefined,
          });
        } else {
          // Multiple photos - use bulk API
          await bulkLinkMutation.mutateAsync({
            photo_ids: photoIds,
            entity_type: link.entityType,
            entity_id: link.entityId,
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to link photos:', error);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Photos to Entities
          </DialogTitle>
          <DialogDescription>
            Link {photoIds.length} selected photo(s) to one or more project entities.
            Photos can be linked to multiple items across different features.
          </DialogDescription>
        </DialogHeader>

        {/* Selected Photos Preview */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Image className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-700">
            {photoIds.length} photo{photoIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Entity Links */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {links.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No links added yet</p>
              <p className="text-sm mt-1">
                Click the button below to add an entity link
              </p>
            </div>
          ) : (
            links.map((link, index) => (
              <EntityLinkRow
                key={link.id}
                link={link}
                index={index}
                onUpdate={(updates) => handleUpdateLink(link.id, updates)}
                onRemove={() => handleRemoveLink(link.id)}
                onSetPrimary={() => handleSetPrimary(link.id)}
              />
            ))
          )}
        </div>

        {/* Add Link Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddLink}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Entity Link
        </Button>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              links.length === 0 ||
              links.every((l) => !l.entityId.trim())
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Link Photos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface EntityLinkRowProps {
  link: EntityLink;
  index: number;
  onUpdate: (updates: Partial<EntityLink>) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
}

function EntityLinkRow({
  link,
  index,
  onUpdate,
  onRemove,
  onSetPrimary,
}: EntityLinkRowProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Link {index + 1}</Badge>
          {link.isPrimary && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Primary
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`entity-type-${link.id}`} className="text-sm">
            Entity Type
          </Label>
          <Select
            value={link.entityType}
            onValueChange={(value) => onUpdate({ entityType: value as PhotoEntityType })}
          >
            <SelectTrigger id={`entity-type-${link.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {ENTITY_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`entity-id-${link.id}`} className="text-sm">
            Entity ID
          </Label>
          <Input
            id={`entity-id-${link.id}`}
            placeholder="Enter entity ID or search..."
            value={link.entityId}
            onChange={(e) => onUpdate({ entityId: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`context-note-${link.id}`} className="text-sm">
          Context Note (optional)
        </Label>
        <Textarea
          id={`context-note-${link.id}`}
          placeholder="Add a note about why this photo is linked..."
          value={link.contextNote}
          onChange={(e) => onUpdate({ contextNote: e.target.value })}
          rows={2}
        />
      </div>

      {!link.isPrimary && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSetPrimary}
        >
          Set as Primary
        </Button>
      )}
    </div>
  );
}

export default PhotoLinker;
