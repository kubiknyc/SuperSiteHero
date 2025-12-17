/**
 * VisualizationPage
 *
 * Main page for AR/VR site visualization, 3D model viewing, and BIM integration.
 * Provides access to:
 * - 3D Model Viewer
 * - BIM/IFC Viewer
 * - AR Model Placement
 * - VR Site Walkthroughs
 * - 360 Photo Tours
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Building2,
  Camera,
  Eye,
  Upload,
  Play,
  Grid3X3,
  Glasses,
  Smartphone,
  Image,
  FileBox,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Download,
  Share2,
  Settings,
  ChevronRight,
  Loader2,
  AlertCircle,
  FolderOpen,
  LayoutGrid,
  List,
  Clock,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ModelViewer3D, BIMViewer, ARViewer, VRWalkthrough } from '@/features/visualization';
import { cn } from '@/lib/utils';
import type { Model3DMetadata, VRTour, Photo360Data } from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'gallery' | 'list';
type ContentType = '3d-models' | 'bim' | 'vr-tours' | '360-photos';

interface ModelCardProps {
  model: Model3DMetadata;
  viewMode: ViewMode;
  onView: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

// ============================================================================
// Model Card Component
// ============================================================================

function ModelCard({ model, viewMode, onView, onDelete, onShare }: ModelCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'gltf':
      case 'glb':
        return 'bg-green-100 text-green-800';
      case 'ifc':
        return 'bg-blue-100 text-blue-800';
      case 'obj':
        return 'bg-yellow-100 text-yellow-800';
      case 'fbx':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent cursor-pointer group"
        onClick={onView}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
          {model.thumbnailUrl ? (
            <img
              src={model.thumbnailUrl}
              alt={model.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Box className="h-8 w-8 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{model.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {model.description || 'No description'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={cn('text-xs', getFormatBadgeColor(model.format))}>
              {model.format.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(model.fileSize)}
            </span>
            {model.triangleCount && (
              <span className="text-xs text-muted-foreground">
                {model.triangleCount.toLocaleString()} triangles
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(model.uploadedAt)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Model
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              {onShare && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Gallery view
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={onView}>
      <div className="aspect-video bg-gray-100 relative">
        {model.thumbnailUrl ? (
          <img
            src={model.thumbnailUrl}
            alt={model.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Box className="h-12 w-12 text-gray-400" />
          </div>
        )}

        <Badge
          variant="secondary"
          className={cn(
            'absolute top-2 left-2 text-xs',
            getFormatBadgeColor(model.format)
          )}
        >
          {model.format.toUpperCase()}
        </Badge>

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Model
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium truncate">{model.name}</h3>
        <p className="text-sm text-muted-foreground truncate mt-1">
          {model.description || 'No description'}
        </p>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{formatFileSize(model.fileSize)}</span>
          <span>{formatDate(model.uploadedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  type: ContentType;
  onUpload: () => void;
}

function EmptyState({ type, onUpload }: EmptyStateProps) {
  const content = {
    '3d-models': {
      icon: Box,
      title: 'No 3D Models',
      description: 'Upload your first 3D model to visualize your construction project.',
      action: 'Upload Model',
    },
    bim: {
      icon: Building2,
      title: 'No BIM Models',
      description: 'Upload IFC files to explore building information models.',
      action: 'Upload IFC',
    },
    'vr-tours': {
      icon: Glasses,
      title: 'No VR Tours',
      description: 'Create immersive VR tours from your 360 photos.',
      action: 'Create Tour',
    },
    '360-photos': {
      icon: Image,
      title: 'No 360 Photos',
      description: 'Upload 360 photos to create virtual site walkthroughs.',
      action: 'Upload Photos',
    },
  };

  const { icon: Icon, title, description, action } = content[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      <Button onClick={onUpload}>
        <Plus className="h-4 w-4 mr-2" />
        {action}
      </Button>
    </div>
  );
}

// ============================================================================
// Main Visualization Page
// ============================================================================

export function VisualizationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ContentType>(
    (searchParams.get('tab') as ContentType) || '3d-models'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [viewerModel, setViewerModel] = useState<Model3DMetadata | null>(null);
  const [viewerType, setViewerType] = useState<'3d' | 'bim' | 'ar' | 'vr' | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Mock data - in production, fetch from API
  const [models] = useState<Model3DMetadata[]>([
    {
      id: '1',
      name: 'Main Building Structure',
      fileName: 'building-main.glb',
      fileSize: 15728640,
      format: 'glb',
      uploadedAt: '2024-12-10T10:00:00Z',
      uploadedBy: 'user-1',
      projectId: projectId || '',
      description: 'Main structural model of the building',
      triangleCount: 125000,
      materialCount: 15,
      tags: ['structural', 'main-building'],
    },
    {
      id: '2',
      name: 'Site Layout Model',
      fileName: 'site-layout.ifc',
      fileSize: 52428800,
      format: 'ifc',
      uploadedAt: '2024-12-08T14:30:00Z',
      uploadedBy: 'user-1',
      projectId: projectId || '',
      description: 'Complete BIM model with all disciplines',
      triangleCount: 450000,
      materialCount: 85,
      tags: ['bim', 'full-model'],
    },
  ]);

  const [vrTours] = useState<VRTour[]>([
    {
      id: 'tour-1',
      name: 'Foundation Progress Tour',
      description: 'Week 4 foundation walkthrough',
      projectId: projectId || '',
      nodes: [],
      startNodeId: 'node-1',
      createdAt: '2024-12-09T09:00:00Z',
      updatedAt: '2024-12-09T09:00:00Z',
      createdBy: 'user-1',
    },
  ]);

  const [photos360] = useState<Photo360Data[]>([
    {
      id: 'photo-1',
      url: '/sample-360.jpg',
      name: 'Ground Floor - Area A',
      capturedAt: '2024-12-10T08:00:00Z',
      projectId: projectId || '',
      tags: ['ground-floor', 'area-a'],
    },
  ]);

  // Filter models based on search and format
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesSearch =
        !searchQuery ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFormat =
        selectedFormat === 'all' || model.format === selectedFormat;

      return matchesSearch && matchesFormat;
    });
  }, [models, searchQuery, selectedFormat]);

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab as ContentType);
      setSearchParams({ tab });
    },
    [setSearchParams]
  );

  // Handle model view
  const handleViewModel = useCallback((model: Model3DMetadata, type: '3d' | 'bim' | 'ar' | 'vr') => {
    setViewerModel(model);
    setViewerType(type);
  }, []);

  // Close viewer
  const closeViewer = useCallback(() => {
    setViewerModel(null);
    setViewerType(null);
  }, []);

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Site Visualization</h1>
          <p className="text-muted-foreground">
            3D models, BIM data, and immersive VR/AR experiences
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange('3d-models')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Box className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">3D Models</p>
              <p className="text-sm text-muted-foreground">{models.length} models</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange('bim')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">BIM Models</p>
              <p className="text-sm text-muted-foreground">
                {models.filter((m) => m.format === 'ifc').length} IFC files
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange('vr-tours')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Glasses className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">VR Tours</p>
              <p className="text-sm text-muted-foreground">{vrTours.length} tours</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTabChange('360-photos')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Camera className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">360 Photos</p>
              <p className="text-sm text-muted-foreground">{photos360.length} photos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="3d-models" className="gap-2">
              <Box className="h-4 w-4" />
              3D Models
            </TabsTrigger>
            <TabsTrigger value="bim" className="gap-2">
              <Building2 className="h-4 w-4" />
              BIM
            </TabsTrigger>
            <TabsTrigger value="vr-tours" className="gap-2">
              <Glasses className="h-4 w-4" />
              VR Tours
            </TabsTrigger>
            <TabsTrigger value="360-photos" className="gap-2">
              <Camera className="h-4 w-4" />
              360 Photos
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="glb">GLB</SelectItem>
                <SelectItem value="gltf">GLTF</SelectItem>
                <SelectItem value="ifc">IFC</SelectItem>
                <SelectItem value="obj">OBJ</SelectItem>
                <SelectItem value="fbx">FBX</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('gallery')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 3D Models Tab */}
        <TabsContent value="3d-models">
          {filteredModels.length === 0 ? (
            <EmptyState type="3d-models" onUpload={() => setIsUploadDialogOpen(true)} />
          ) : (
            <div
              className={cn(
                viewMode === 'gallery'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-2'
              )}
            >
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  viewMode={viewMode}
                  onView={() => handleViewModel(model, '3d')}
                  onDelete={() => console.log('Delete', model.id)}
                  onShare={() => console.log('Share', model.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* BIM Tab */}
        <TabsContent value="bim">
          {models.filter((m) => m.format === 'ifc').length === 0 ? (
            <EmptyState type="bim" onUpload={() => setIsUploadDialogOpen(true)} />
          ) : (
            <div
              className={cn(
                viewMode === 'gallery'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-2'
              )}
            >
              {models
                .filter((m) => m.format === 'ifc')
                .map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    viewMode={viewMode}
                    onView={() => handleViewModel(model, 'bim')}
                    onDelete={() => console.log('Delete', model.id)}
                    onShare={() => console.log('Share', model.id)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        {/* VR Tours Tab */}
        <TabsContent value="vr-tours">
          {vrTours.length === 0 ? (
            <EmptyState type="vr-tours" onUpload={() => setIsUploadDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vrTours.map((tour) => (
                <Card
                  key={tour.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setViewerType('vr');
                    // setSelectedTour(tour);
                  }}
                >
                  <div className="aspect-video bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Glasses className="h-16 w-16 text-white/80" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium">{tour.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tour.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary">
                        {tour.nodes.length} locations
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tour.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 360 Photos Tab */}
        <TabsContent value="360-photos">
          {photos360.length === 0 ? (
            <EmptyState type="360-photos" onUpload={() => setIsUploadDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {photos360.map((photo) => (
                <Card
                  key={photo.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setViewerType('vr');
                    // setSelectedPhoto(photo);
                  }}
                >
                  <div className="aspect-video bg-gray-100 relative">
                    {photo.thumbnailUrl ? (
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 text-xs bg-orange-500">
                      360
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate">{photo.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      {photo.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(photo.capturedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Model Viewer Dialog */}
      <Dialog open={viewerModel !== null && viewerType === '3d'} onOpenChange={closeViewer}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewerModel?.name}</DialogTitle>
            <DialogDescription>{viewerModel?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewerModel && (
              <ModelViewer3D
                modelUrl={viewerModel.fileName}
                showControls
                className="h-full rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* BIM Viewer Dialog */}
      <Dialog open={viewerModel !== null && viewerType === 'bim'} onOpenChange={closeViewer}>
        <DialogContent className="max-w-7xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>{viewerModel?.name}</DialogTitle>
            <DialogDescription>BIM Model Viewer</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewerModel && (
              <BIMViewer
                ifcUrl={viewerModel.fileName}
                showSidebar
                className="h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AR Viewer Dialog */}
      <Dialog open={viewerType === 'ar'} onOpenChange={closeViewer}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>AR Model Placement</DialogTitle>
            <DialogDescription>Place the model in your environment</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewerModel && (
              <ARViewer
                modelUrl={viewerModel.fileName}
                showControls
                className="h-full rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* VR Walkthrough Dialog */}
      <Dialog open={viewerType === 'vr'} onOpenChange={closeViewer}>
        <DialogContent className="max-w-6xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>VR Walkthrough</DialogTitle>
            <DialogDescription>Immersive site experience</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <VRWalkthrough
              photo360Url="/sample-360.jpg"
              showControls
              className="h-full rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Content</DialogTitle>
            <DialogDescription>
              Upload 3D models, IFC files, or 360 photos
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Box className="h-10 w-10 text-green-600 mb-3" />
                <h3 className="font-medium">3D Model</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  GLB, GLTF, OBJ, FBX
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Building2 className="h-10 w-10 text-blue-600 mb-3" />
                <h3 className="font-medium">BIM/IFC File</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  IFC, IFC4
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Camera className="h-10 w-10 text-orange-600 mb-3" />
                <h3 className="font-medium">360 Photo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Equirectangular JPG, PNG
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <FolderOpen className="h-10 w-10 text-purple-600 mb-3" />
                <h3 className="font-medium">Batch Upload</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Multiple files at once
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VisualizationPage;
