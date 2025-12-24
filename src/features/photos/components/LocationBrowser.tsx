import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Layers,
  Grid3X3,
  MapPin,
  ChevronRight,
  ChevronDown,
  Image,
  Search,
  X,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react'
import type { Photo } from '@/types/photo-management'

interface LocationBrowserProps {
  photos: Photo[]
  onSelectPhotos?: (photos: Photo[]) => void
  onPhotoClick?: (photo: Photo) => void
}

interface LocationNode {
  name: string
  path: string[]
  photoCount: number
  children: Map<string, LocationNode>
  photos: Photo[]
}

function buildLocationTree(photos: Photo[]): LocationNode {
  const root: LocationNode = {
    name: 'All Locations',
    path: [],
    photoCount: photos.length,
    children: new Map(),
    photos: [],
  }

  photos.forEach(photo => {
    const building = photo.building || 'Unassigned'
    const floor = photo.floor || 'Unassigned'
    const area = photo.area || 'Unassigned'
    const grid = photo.grid

    // Building level
    if (!root.children.has(building)) {
      root.children.set(building, {
        name: building,
        path: [building],
        photoCount: 0,
        children: new Map(),
        photos: [],
      })
    }
    const buildingNode = root.children.get(building)!
    buildingNode.photoCount++

    // Floor level
    if (!buildingNode.children.has(floor)) {
      buildingNode.children.set(floor, {
        name: floor,
        path: [building, floor],
        photoCount: 0,
        children: new Map(),
        photos: [],
      })
    }
    const floorNode = buildingNode.children.get(floor)!
    floorNode.photoCount++

    // Area level
    if (!floorNode.children.has(area)) {
      floorNode.children.set(area, {
        name: area,
        path: [building, floor, area],
        photoCount: 0,
        children: new Map(),
        photos: [],
      })
    }
    const areaNode = floorNode.children.get(area)!
    areaNode.photoCount++
    areaNode.photos.push(photo)

    // Grid level (if present)
    if (grid) {
      if (!areaNode.children.has(grid)) {
        areaNode.children.set(grid, {
          name: grid,
          path: [building, floor, area, grid],
          photoCount: 0,
          children: new Map(),
          photos: [],
        })
      }
      const gridNode = areaNode.children.get(grid)!
      gridNode.photoCount++
      gridNode.photos.push(photo)
    }
  })

  return root
}

function LocationTreeNode({
  node,
  level,
  expandedPaths,
  onToggle,
  onSelect,
  selectedPath,
}: {
  node: LocationNode
  level: number
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string[], photos: Photo[]) => void
  selectedPath: string | null
}) {
  const pathKey = node.path.join('/')
  const isExpanded = expandedPaths.has(pathKey)
  const isSelected = selectedPath === pathKey
  const hasChildren = node.children.size > 0

  const icons = [Building2, Layers, Grid3X3, MapPin]
  const Icon = icons[Math.min(level, icons.length - 1)]

  // Get all photos at this level and below
  const getAllPhotos = (n: LocationNode): Photo[] => {
    let photos = [...n.photos]
    n.children.forEach(child => {
      photos = photos.concat(getAllPhotos(child))
    })
    return photos
  }

  const handleClick = () => {
    if (hasChildren) {
      onToggle(pathKey)
    }
    const allPhotos = getAllPhotos(node)
    onSelect(node.path, allPhotos)
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-info-light text-blue-800' : 'hover:bg-muted'
        }`}
        style={{ paddingLeft: `${(level * 16) + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button className="p-0.5" onClick={(e) => { e.stopPropagation(); onToggle(pathKey) }}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Icon className="h-4 w-4 text-muted" />
        <span className="flex-1 truncate text-sm">{node.name}</span>
        <Badge variant="secondary" className="text-xs">
          {node.photoCount}
        </Badge>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(child => (
              <LocationTreeNode
                key={child.path.join('/')}
                node={child}
                level={level + 1}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function LocationBrowser({ photos, onSelectPhotos, onPhotoClick }: LocationBrowserProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>(photos)
  const [searchTerm, setSearchTerm] = useState('')
  const [breadcrumb, setBreadcrumb] = useState<string[]>([])

  const locationTree = useMemo(() => buildLocationTree(photos), [photos])

  // Summary stats
  const locationSummary = useMemo(() => {
    const buildings = new Set<string>()
    const floors = new Set<string>()
    const areas = new Set<string>()

    photos.forEach(photo => {
      if (photo.building) {buildings.add(photo.building)}
      if (photo.floor) {floors.add(photo.floor)}
      if (photo.area) {areas.add(photo.area)}
    })

    return {
      buildings: buildings.size,
      floors: floors.size,
      areas: areas.size,
      photosWithLocation: photos.filter(p => p.building || p.floor || p.area).length,
    }
  }, [photos])

  const handleToggle = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleSelect = (path: string[], selectedPhotos: Photo[]) => {
    setSelectedPath(path.join('/'))
    setSelectedPhotos(selectedPhotos)
    setBreadcrumb(path)
    onSelectPhotos?.(selectedPhotos)
  }

  const handleClearSelection = () => {
    setSelectedPath(null)
    setSelectedPhotos(photos)
    setBreadcrumb([])
    onSelectPhotos?.(photos)
  }

  // Filter photos by search
  const filteredPhotos = useMemo(() => {
    if (!searchTerm) {return selectedPhotos}

    const term = searchTerm.toLowerCase()
    return selectedPhotos.filter(photo =>
      photo.caption?.toLowerCase().includes(term) ||
      photo.description?.toLowerCase().includes(term) ||
      photo.building?.toLowerCase().includes(term) ||
      photo.floor?.toLowerCase().includes(term) ||
      photo.area?.toLowerCase().includes(term)
    )
  }, [selectedPhotos, searchTerm])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Location Tree */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Location Browser
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-surface rounded p-2">
              <p className="text-lg font-bold">{locationSummary.buildings}</p>
              <p className="text-xs text-muted">Buildings</p>
            </div>
            <div className="bg-surface rounded p-2">
              <p className="text-lg font-bold">{locationSummary.floors}</p>
              <p className="text-xs text-muted">Floors</p>
            </div>
            <div className="bg-surface rounded p-2">
              <p className="text-lg font-bold">{locationSummary.areas}</p>
              <p className="text-xs text-muted">Areas</p>
            </div>
          </div>

          {/* Tree */}
          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            <div
              className={`flex items-center gap-2 px-2 py-1.5 border-b cursor-pointer ${
                !selectedPath ? 'bg-info-light text-blue-800' : 'hover:bg-muted'
              }`}
              onClick={handleClearSelection}
            >
              <Image className="h-4 w-4 text-muted" />
              <span className="flex-1 text-sm font-medium">All Photos</span>
              <Badge variant="secondary" className="text-xs">
                {photos.length}
              </Badge>
            </div>

            {Array.from(locationTree.children.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(child => (
                <LocationTreeNode
                  key={child.path.join('/')}
                  node={child}
                  level={0}
                  expandedPaths={expandedPaths}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                  selectedPath={selectedPath}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" />
                Photos
                {breadcrumb.length > 0 && (
                  <span className="text-muted font-normal">
                    in {breadcrumb.join(' > ')}
                  </span>
                )}
              </CardTitle>
            </div>
            <Badge variant="outline">{filteredPhotos.length} photos</Badge>
          </div>

          {/* Search and breadcrumb */}
          <div className="flex items-center gap-2 mt-2">
            {breadcrumb.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to all
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                placeholder="Search photos..."
                className="pl-8 h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4 text-disabled" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Image className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted">No photos in this location</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto">
              {filteredPhotos.map(photo => (
                <div
                  key={photo.id}
                  className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => onPhotoClick?.(photo)}
                >
                  {photo.thumbnailUrl || photo.fileUrl ? (
                    <img
                      src={photo.thumbnailUrl || photo.fileUrl}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-disabled" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LocationBrowser
