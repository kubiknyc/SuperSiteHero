/**
 * Photo Evidence Hub Component
 * Central hub for viewing and managing photos across all project features
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image,
  Search,
  Filter,
  Link2,
  X,
  Calendar,
  MapPin,
  Tag,
  Eye,
  Download,
  RefreshCw,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePhotoHubPhotos, usePhotoHubStats } from '../hooks/useUnifiedPhotos';
import { PhotoLinker } from './PhotoLinker';
import type {
  PhotoEntityType,
  PhotoHubFilters,
  PhotoWithEntities,
} from '@/types/unified-photos';
import { ENTITY_TYPE_LABELS } from '@/types/unified-photos';

interface PhotoEvidenceHubProps {
  projectId: string;
  defaultEntityType?: PhotoEntityType;
  defaultEntityId?: string;
  onPhotoSelect?: (photo: PhotoWithEntities) => void;
  mode?: 'view' | 'select' | 'link';
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
  'equipment',
];

export function PhotoEvidenceHub({
  projectId,
  defaultEntityType,
  defaultEntityId,
  onPhotoSelect,
  mode = 'view',
}: PhotoEvidenceHubProps) {
  const [filters, setFilters] = useState<PhotoHubFilters>({
    projectId,
    limit: 50,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showLinker, setShowLinker] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PhotoWithEntities | null>(null);

  const { data: photosData, isLoading, refetch } = usePhotoHubPhotos(filters);
  const { data: stats } = usePhotoHubStats(projectId);

  const photos = photosData?.photos || [];
  const totalPhotos = photosData?.total || 0;

  // Apply search filter client-side for responsiveness
  const filteredPhotos = useMemo(() => {
    if (!searchTerm) {return photos;}
    const term = searchTerm.toLowerCase();
    return photos.filter(
      (photo) =>
        photo.fileName.toLowerCase().includes(term) ||
        photo.caption?.toLowerCase().includes(term) ||
        photo.description?.toLowerCase().includes(term)
    );
  }, [photos, searchTerm]);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm,
      offset: 0,
    }));
  }, [searchTerm]);

  const handleFilterChange = useCallback(
    (key: keyof PhotoHubFilters, value: unknown) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        offset: 0,
      }));
    },
    []
  );

  const handlePhotoSelect = useCallback((photo: PhotoWithEntities) => {
    if (mode === 'select') {
      onPhotoSelect?.(photo);
    } else if (mode === 'link') {
      setSelectedPhotos((prev) => {
        const next = new Set(prev);
        if (next.has(photo.id)) {
          next.delete(photo.id);
        } else {
          next.add(photo.id);
        }
        return next;
      });
    } else {
      setActivePhoto(photo);
    }
  }, [mode, onPhotoSelect]);

  const handleSelectAll = useCallback(() => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  }, [filteredPhotos, selectedPhotos.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  const handleLoadMore = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50),
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Photo Evidence Hub
              </CardTitle>
              <CardDescription>
                Browse and manage photos across all project features
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Stats Summary */}
        {stats && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-hover">{stats.totalPhotos}</p>
                <p className="text-xs text-primary">Total Photos</p>
              </div>
              <div className="bg-success-light rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-success-dark">{stats.linkedPhotos}</p>
                <p className="text-xs text-success">Linked</p>
              </div>
              <div className="bg-warning-light rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{stats.orphanPhotos}</p>
                <p className="text-xs text-warning">Unlinked</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{stats.recentUploads}</p>
                <p className="text-xs text-purple-600">Last 7 Days</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                <Input
                  placeholder="Search photos..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                {searchTerm && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => {
                      setSearchTerm('');
                      handleFilterChange('search', undefined);
                    }}
                  >
                    <X className="h-4 w-4 text-disabled" />
                  </button>
                )}
              </div>
              <Button variant="outline" onClick={handleSearch}>
                Search
              </Button>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-secondary mb-1 block">
                  Entity Type
                </label>
                <Select
                  value={filters.entityTypes?.[0] || ''}
                  onValueChange={(value) =>
                    handleFilterChange('entityTypes', value ? [value as PhotoEntityType] : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ENTITY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary mb-1 block">
                  Building
                </label>
                <Input
                  placeholder="Filter by building"
                  value={filters.building || ''}
                  onChange={(e) => handleFilterChange('building', e.target.value || undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-secondary mb-1 block">
                  Date From
                </label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-secondary mb-1 block">
                  Date To
                </label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Bar (Link Mode) */}
      {mode === 'link' && selectedPhotos.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedPhotos.size === filteredPhotos.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-blue-800">
                  {selectedPhotos.size} photo(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowLinker(true)}
                  className="gap-1"
                >
                  <Link2 className="h-4 w-4" />
                  Link to Entity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid/List */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-disabled" />
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted">No photos found</p>
              <p className="text-sm text-disabled mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPhotos.map((photo) => (
                <PhotoGridItem
                  key={photo.id}
                  photo={photo}
                  isSelected={selectedPhotos.has(photo.id)}
                  onSelect={() => handlePhotoSelect(photo)}
                  showCheckbox={mode === 'link'}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map((photo) => (
                <PhotoListItem
                  key={photo.id}
                  photo={photo}
                  isSelected={selectedPhotos.has(photo.id)}
                  onSelect={() => handlePhotoSelect(photo)}
                  showCheckbox={mode === 'link'}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {photos.length < totalPhotos && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={handleLoadMore}>
                Load More ({totalPhotos - photos.length} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Linker Modal */}
      {showLinker && (
        <PhotoLinker
          photoIds={Array.from(selectedPhotos)}
          onClose={() => {
            setShowLinker(false);
            setSelectedPhotos(new Set());
          }}
          defaultEntityType={defaultEntityType}
          defaultEntityId={defaultEntityId}
        />
      )}

      {/* Photo Detail Modal */}
      {activePhoto && (
        <PhotoDetailModal
          photo={activePhoto}
          onClose={() => setActivePhoto(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PhotoGridItemProps {
  photo: PhotoWithEntities;
  isSelected: boolean;
  onSelect: () => void;
  showCheckbox: boolean;
}

function PhotoGridItem({
  photo,
  isSelected,
  onSelect,
  showCheckbox,
}: PhotoGridItemProps) {
  return (
    <div
      className={`relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      onClick={onSelect}
    >
      {photo.thumbnailUrl || photo.fileUrl ? (
        <img
          src={photo.thumbnailUrl || photo.fileUrl}
          alt={photo.caption || photo.fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Image className="h-8 w-8 text-disabled" />
        </div>
      )}

      {/* Checkbox */}
      {showCheckbox && (
        <div className="absolute top-2 left-2">
          <Checkbox
            checked={isSelected}
            className="bg-card"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Link count badge */}
      {photo.linkCount > 0 && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-card/90">
            <Link2 className="h-3 w-3 mr-1" />
            {photo.linkCount}
          </Badge>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
        <div className="text-white text-xs truncate">
          {photo.caption || photo.fileName}
        </div>
      </div>
    </div>
  );
}

interface PhotoListItemProps {
  photo: PhotoWithEntities;
  isSelected: boolean;
  onSelect: () => void;
  showCheckbox: boolean;
}

function PhotoListItem({
  photo,
  isSelected,
  onSelect,
  showCheckbox,
}: PhotoListItemProps) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-surface transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-200' : 'border-border'
      }`}
      onClick={onSelect}
    >
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
        {photo.thumbnailUrl || photo.fileUrl ? (
          <img
            src={photo.thumbnailUrl || photo.fileUrl}
            alt={photo.caption || photo.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-6 w-6 text-disabled" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {photo.caption || photo.fileName}
        </p>
        {photo.building && (
          <p className="text-xs text-muted flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {[photo.building, photo.floor, photo.area].filter(Boolean).join(' > ')}
          </p>
        )}
        {photo.capturedAt && (
          <p className="text-xs text-muted flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(photo.capturedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {photo.linkedEntities.slice(0, 3).map((entity) => (
          <Badge
            key={`${entity.type}-${entity.id}`}
            variant="outline"
            className="text-xs"
          >
            {ENTITY_TYPE_LABELS[entity.type]}
          </Badge>
        ))}
        {photo.linkedEntities.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{photo.linkedEntities.length - 3}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface PhotoDetailModalProps {
  photo: PhotoWithEntities;
  onClose: () => void;
}

function PhotoDetailModal({ photo, onClose }: PhotoDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative max-w-4xl max-h-[90vh] bg-card rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 p-2 bg-card/80 rounded-full hover:bg-card z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-2/3 bg-background flex items-center justify-center">
            <img
              src={photo.fileUrl}
              alt={photo.caption || photo.fileName}
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>

          {/* Details */}
          <div className="md:w-1/3 p-4 overflow-y-auto max-h-[60vh]">
            <h3 className="font-semibold text-lg mb-2 heading-subsection">
              {photo.caption || 'Untitled Photo'}
            </h3>

            <p className="text-sm text-muted mb-4">{photo.fileName}</p>

            {photo.description && (
              <p className="text-sm text-secondary mb-4">{photo.description}</p>
            )}

            <div className="space-y-3">
              {photo.capturedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-disabled" />
                  <span>{new Date(photo.capturedAt).toLocaleString()}</span>
                </div>
              )}

              {photo.building && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-disabled" />
                  <span>
                    {[photo.building, photo.floor, photo.area]
                      .filter(Boolean)
                      .join(' > ')}
                  </span>
                </div>
              )}

              {photo.tags && photo.tags.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Tag className="h-4 w-4 text-disabled mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Linked Entities */}
            {photo.linkedEntities.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2 heading-card">Linked To</h4>
                <div className="space-y-2">
                  {photo.linkedEntities.map((entity) => (
                    <div
                      key={`${entity.type}-${entity.id}`}
                      className="flex items-center gap-2 p-2 bg-surface rounded text-sm"
                    >
                      <Link2 className="h-4 w-4 text-disabled" />
                      <Badge variant="outline">{ENTITY_TYPE_LABELS[entity.type]}</Badge>
                      <span className="text-secondary truncate">
                        {entity.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-1" />
                  View Full
                </a>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={photo.fileUrl} download={photo.fileName}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoEvidenceHub;
