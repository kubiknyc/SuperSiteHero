/**
 * VRTourEditor Component
 *
 * Editor for creating and managing VR tours from 360 photos.
 * Features:
 * - Drag and drop photo ordering
 * - Connection creation between nodes
 * - Annotation placement
 * - Preview functionality
 * - Tour settings configuration
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  Link,
  MessageSquare,
  Eye,
  Save,
  Settings,
  GripVertical,
  ChevronRight,
  Camera,
  ArrowRight,
  Edit2,
  X,
  Check,
  MapPin,
  Info,
  Image,
  Video,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { VRWalkthrough } from './VRWalkthrough';
import type {
  VRTour,
  VRTourNode,
  VRTourConnection,
  VRAnnotation,
  Photo360Data,
} from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

interface VRTourEditorProps {
  /** Initial tour data (for editing) */
  tour?: VRTour;
  /** Available 360 photos */
  photos: Photo360Data[];
  /** Callback when tour is saved */
  onSave: (tour: VRTour) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Is saving in progress */
  isSaving?: boolean;
  /** Container className */
  className?: string;
}

interface EditingConnection {
  sourceNodeId: string;
  targetNodeId: string | null;
  yaw: number;
  pitch: number;
  label: string;
}

interface EditingAnnotation {
  nodeId: string;
  type: VRAnnotation['type'];
  yaw: number;
  pitch: number;
  title: string;
  content: string;
}

// ============================================================================
// Sortable Node Item
// ============================================================================

interface SortableNodeItemProps {
  node: VRTourNode;
  isSelected: boolean;
  isStartNode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSetStart: () => void;
  connectionsCount: number;
  annotationsCount: number;
}

function SortableNodeItem({
  node,
  isSelected,
  isStartNode,
  onSelect,
  onDelete,
  onSetStart,
  connectionsCount,
  annotationsCount,
}: SortableNodeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-primary"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div
        className="w-16 h-12 bg-gray-100 rounded shrink-0 cursor-pointer overflow-hidden"
        onClick={onSelect}
      >
        {node.photo.thumbnailUrl ? (
          <img
            src={node.photo.thumbnailUrl}
            alt={node.photo.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{node.photo.name}</span>
          {isStartNode && (
            <Badge variant="default" className="text-xs">
              Start
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            {connectionsCount} links
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {annotationsCount} notes
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isStartNode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onSetStart}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Set as start point</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove from tour</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================================================
// Photo Picker Dialog
// ============================================================================

interface PhotoPickerProps {
  photos: Photo360Data[];
  selectedIds: string[];
  onSelect: (photos: Photo360Data[]) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function PhotoPicker({
  photos,
  selectedIds,
  onSelect,
  isOpen,
  onOpenChange,
}: PhotoPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const availablePhotos = photos.filter((p) => !selectedIds.includes(p.id));

  const handleToggle = (photoId: string) => {
    setSelected((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleConfirm = () => {
    const selectedPhotos = photos.filter((p) => selected.includes(p.id));
    onSelect(selectedPhotos);
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Photos to Tour</DialogTitle>
          <DialogDescription>
            Select 360 photos to add to your VR tour
          </DialogDescription>
        </DialogHeader>

        {availablePhotos.length === 0 ? (
          <div className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              All available photos are already in the tour
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-3 gap-3">
              {availablePhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    'relative border rounded-lg overflow-hidden cursor-pointer transition-all',
                    selected.includes(photo.id)
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:border-primary/50'
                  )}
                  onClick={() => handleToggle(photo.id)}
                >
                  <div className="aspect-video bg-gray-100">
                    {photo.thumbnailUrl ? (
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{photo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(photo.capturedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selected.includes(photo.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0}>
            Add {selected.length} Photo{selected.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Connection Editor
// ============================================================================

interface ConnectionEditorProps {
  connection: EditingConnection | null;
  nodes: VRTourNode[];
  onSave: (connection: VRTourConnection) => void;
  onCancel: () => void;
}

function ConnectionEditor({
  connection,
  nodes,
  onSave,
  onCancel,
}: ConnectionEditorProps) {
  const [targetNodeId, setTargetNodeId] = useState(connection?.targetNodeId || '');
  const [label, setLabel] = useState(connection?.label || '');
  const [yaw, setYaw] = useState(connection?.yaw || 0);
  const [pitch, setPitch] = useState(connection?.pitch || 0);

  const availableTargets = nodes.filter((n) => n.id !== connection?.sourceNodeId);

  const handleSave = () => {
    if (!connection || !targetNodeId) return;

    onSave({
      targetNodeId,
      yaw,
      pitch,
      label,
    });
  };

  if (!connection) return null;

  return (
    <Dialog open={!!connection} onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Connection</DialogTitle>
          <DialogDescription>
            Link this location to another point in the tour
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Location</Label>
            <Select value={targetNodeId} onValueChange={setTargetNodeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.photo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., To Kitchen"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yaw (degrees)</Label>
              <Input
                type="number"
                value={yaw}
                onChange={(e) => setYaw(Number(e.target.value))}
                min={-180}
                max={180}
              />
            </div>
            <div className="space-y-2">
              <Label>Pitch (degrees)</Label>
              <Input
                type="number"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                min={-90}
                max={90}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Yaw is the horizontal angle (0 = forward, 90 = right).
            Pitch is the vertical angle (0 = level, -90 = down).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!targetNodeId}>
            Create Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Annotation Editor
// ============================================================================

interface AnnotationEditorProps {
  annotation: EditingAnnotation | null;
  onSave: (annotation: VRAnnotation) => void;
  onCancel: () => void;
}

function AnnotationEditor({
  annotation,
  onSave,
  onCancel,
}: AnnotationEditorProps) {
  const [type, setType] = useState<VRAnnotation['type']>(annotation?.type || 'text');
  const [title, setTitle] = useState(annotation?.title || '');
  const [content, setContent] = useState(annotation?.content || '');
  const [yaw, setYaw] = useState(annotation?.yaw || 0);
  const [pitch, setPitch] = useState(annotation?.pitch || 0);

  const handleSave = () => {
    if (!annotation) return;

    onSave({
      id: `annotation-${Date.now()}`,
      type,
      position: { yaw, pitch },
      title,
      content,
    });
  };

  if (!annotation) return null;

  const typeIcons = {
    text: Info,
    image: Image,
    video: Video,
    link: ExternalLink,
    model: FileText,
  };

  return (
    <Dialog open={!!annotation} onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Annotation</DialogTitle>
          <DialogDescription>
            Add information or media to this location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              {(['text', 'image', 'video', 'link'] as const).map((t) => {
                const Icon = typeIcons[t];
                return (
                  <Button
                    key={t}
                    variant={type === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType(t)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Annotation title"
            />
          </div>

          <div className="space-y-2">
            <Label>
              {type === 'text' ? 'Content' : type === 'link' ? 'URL' : 'Media URL'}
            </Label>
            {type === 'text' ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your text here..."
                rows={4}
              />
            ) : (
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'link' ? 'https://...' : 'Enter URL...'}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yaw (degrees)</Label>
              <Input
                type="number"
                value={yaw}
                onChange={(e) => setYaw(Number(e.target.value))}
                min={-180}
                max={180}
              />
            </div>
            <div className="space-y-2">
              <Label>Pitch (degrees)</Label>
              <Input
                type="number"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                min={-90}
                max={90}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title || !content}>
            Add Annotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main VR Tour Editor
// ============================================================================

export function VRTourEditor({
  tour,
  photos,
  onSave,
  onCancel,
  isSaving = false,
  className,
}: VRTourEditorProps) {
  // Tour state
  const [tourName, setTourName] = useState(tour?.name || 'New VR Tour');
  const [tourDescription, setTourDescription] = useState(tour?.description || '');
  const [nodes, setNodes] = useState<VRTourNode[]>(tour?.nodes || []);
  const [startNodeId, setStartNodeId] = useState(tour?.startNodeId || '');
  const [connections, setConnections] = useState<Map<string, VRTourConnection[]>>(new Map());

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<EditingConnection | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<EditingAnnotation | null>(null);

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get selected node
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Add photos to tour
  const handleAddPhotos = useCallback((selectedPhotos: Photo360Data[]) => {
    const newNodes: VRTourNode[] = selectedPhotos.map((photo) => ({
      id: photo.id,
      photo,
      connections: [],
      annotations: [],
      position: photo.location,
    }));

    setNodes((prev) => {
      const updated = [...prev, ...newNodes];
      // Set start node if not set
      if (!startNodeId && updated.length > 0) {
        setStartNodeId(updated[0].id);
      }
      return updated;
    });
  }, [startNodeId]);

  // Remove node
  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => {
      const updated = new Map(prev);
      updated.delete(nodeId);
      // Remove connections pointing to this node
      updated.forEach((conns, key) => {
        updated.set(
          key,
          conns.filter((c) => c.targetNodeId !== nodeId)
        );
      });
      return updated;
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    if (startNodeId === nodeId) {
      setStartNodeId(nodes.find((n) => n.id !== nodeId)?.id || '');
    }
  }, [selectedNodeId, startNodeId, nodes]);

  // Add connection
  const handleAddConnection = useCallback((connection: VRTourConnection) => {
    if (!editingConnection) return;

    setConnections((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(editingConnection.sourceNodeId) || [];
      updated.set(editingConnection.sourceNodeId, [...existing, connection]);
      return updated;
    });

    setEditingConnection(null);
  }, [editingConnection]);

  // Add annotation
  const handleAddAnnotation = useCallback((annotation: VRAnnotation) => {
    if (!editingAnnotation) return;

    setNodes((prev) =>
      prev.map((node) =>
        node.id === editingAnnotation.nodeId
          ? { ...node, annotations: [...node.annotations, annotation] }
          : node
      )
    );

    setEditingAnnotation(null);
  }, [editingAnnotation]);

  // Save tour
  const handleSave = useCallback(() => {
    const updatedNodes = nodes.map((node) => ({
      ...node,
      connections: connections.get(node.id) || [],
    }));

    const updatedTour: VRTour = {
      id: tour?.id || `tour-${Date.now()}`,
      name: tourName,
      description: tourDescription,
      projectId: tour?.projectId || '',
      nodes: updatedNodes,
      startNodeId,
      createdAt: tour?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: tour?.createdBy || '',
    };

    onSave(updatedTour);
  }, [tour, tourName, tourDescription, nodes, connections, startNodeId, onSave]);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Left Panel - Node List */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <Input
            value={tourName}
            onChange={(e) => setTourName(e.target.value)}
            className="font-semibold text-lg"
            placeholder="Tour Name"
          />
          <Textarea
            value={tourDescription}
            onChange={(e) => setTourDescription(e.target.value)}
            className="mt-2 resize-none"
            placeholder="Tour description..."
            rows={2}
          />
        </div>

        {/* Nodes List */}
        <ScrollArea className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Locations ({nodes.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPhotoPickerOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {nodes.length === 0 ? (
            <div className="py-8 text-center">
              <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Add 360 photos to create your tour
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsPhotoPickerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Photos
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={nodes.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {nodes.map((node) => (
                    <SortableNodeItem
                      key={node.id}
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      isStartNode={startNodeId === node.id}
                      onSelect={() => setSelectedNodeId(node.id)}
                      onDelete={() => handleRemoveNode(node.id)}
                      onSetStart={() => setStartNodeId(node.id)}
                      connectionsCount={connections.get(node.id)?.length || 0}
                      annotationsCount={node.annotations.length}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={nodes.length === 0 || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Tour'}
          </Button>
        </div>
      </div>

      {/* Right Panel - Node Details / Preview */}
      <div className="flex-1 flex flex-col">
        {selectedNode ? (
          <>
            {/* Node Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{selectedNode.photo.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedNode.photo.tags?.join(', ') || 'No tags'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingConnection({
                      sourceNodeId: selectedNode.id,
                      targetNodeId: null,
                      yaw: 0,
                      pitch: 0,
                      label: '',
                    })
                  }
                  disabled={nodes.length < 2}
                >
                  <Link className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingAnnotation({
                      nodeId: selectedNode.id,
                      type: 'text',
                      yaw: 0,
                      pitch: 0,
                      title: '',
                      content: '',
                    })
                  }
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            </div>

            {/* Node Preview */}
            <div className="flex-1 relative bg-gray-100">
              <img
                src={selectedNode.photo.url}
                alt={selectedNode.photo.name}
                className="w-full h-full object-contain"
              />

              {/* Connections overlay */}
              {(connections.get(selectedNode.id) || []).map((conn, index) => {
                const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
                return (
                  <div
                    key={index}
                    className="absolute bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                    style={{
                      left: `${50 + conn.yaw / 3.6}%`,
                      top: `${50 - conn.pitch / 1.8}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <ArrowRight className="h-3 w-3" />
                    {conn.label || targetNode?.photo.name}
                  </div>
                );
              })}

              {/* Annotations overlay */}
              {selectedNode.annotations.map((ann, index) => (
                <div
                  key={index}
                  className="absolute bg-yellow-500 text-white p-1 rounded-full"
                  style={{
                    left: `${50 + ann.position.yaw / 3.6}%`,
                    top: `${50 - ann.position.pitch / 1.8}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Info className="h-4 w-4" />
                </div>
              ))}
            </div>

            {/* Node Details */}
            <div className="p-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Connections ({connections.get(selectedNode.id)?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {(connections.get(selectedNode.id) || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No connections</p>
                    ) : (
                      <div className="space-y-1">
                        {(connections.get(selectedNode.id) || []).map((conn, index) => {
                          const target = nodes.find((n) => n.id === conn.targetNodeId);
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="truncate">
                                {conn.label || target?.photo.name}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setConnections((prev) => {
                                    const updated = new Map(prev);
                                    const existing = updated.get(selectedNode.id) || [];
                                    updated.set(
                                      selectedNode.id,
                                      existing.filter((_, i) => i !== index)
                                    );
                                    return updated;
                                  });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Annotations ({selectedNode.annotations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {selectedNode.annotations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No annotations</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedNode.annotations.map((ann, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate">{ann.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {ann.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Select a Location</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Select a location from the list to view and edit its connections
                and annotations
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PhotoPicker
        photos={photos}
        selectedIds={nodes.map((n) => n.id)}
        onSelect={handleAddPhotos}
        isOpen={isPhotoPickerOpen}
        onOpenChange={setIsPhotoPickerOpen}
      />

      <ConnectionEditor
        connection={editingConnection}
        nodes={nodes}
        onSave={handleAddConnection}
        onCancel={() => setEditingConnection(null)}
      />

      <AnnotationEditor
        annotation={editingAnnotation}
        onSave={handleAddAnnotation}
        onCancel={() => setEditingAnnotation(null)}
      />

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Tour</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {selectedNode && (
              <VRWalkthrough
                photo360Url={selectedNode.photo.url}
                showControls
                className="h-full rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VRTourEditor;
