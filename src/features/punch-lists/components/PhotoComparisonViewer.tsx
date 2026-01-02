/**
 * PhotoComparisonViewer Component
 * Enhanced before/after photo comparison with slider, zoom, and fullscreen support
 * Designed for punch list verification workflows
 * Features Framer Motion animations for smooth transitions
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
  Share2,
  Check,
  X,
  Camera,
  Calendar,
  MapPin,
  User,
  SplitSquareHorizontal,
  Layers,
  GripVertical,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { PunchPhoto } from './BeforeAfterPhotos'

// Extended photo type with metadata
export interface ComparisonPhoto extends PunchPhoto {
  takenBy?: {
    id: string
    name: string
    avatar?: string
  }
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  metadata?: {
    camera?: string
    resolution?: string
    fileSize?: number
  }
}

type ComparisonMode = 'side-by-side' | 'slider' | 'overlay' | 'toggle'

interface PhotoComparisonViewerProps {
  beforePhotos: ComparisonPhoto[]
  afterPhotos: ComparisonPhoto[]
  initialMode?: ComparisonMode
  onApprove?: () => void
  onReject?: (reason: string) => void
  showApprovalActions?: boolean
  punchItemTitle?: string
  className?: string
}

export function PhotoComparisonViewer({
  beforePhotos,
  afterPhotos,
  initialMode = 'side-by-side',
  onApprove,
  onReject,
  showApprovalActions = false,
  punchItemTitle,
  className,
}: PhotoComparisonViewerProps) {
  // State
  const [mode, setMode] = useState<ComparisonMode>(initialMode)
  const [beforeIndex, setBeforeIndex] = useState(0)
  const [afterIndex, setAfterIndex] = useState(0)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [showAfterInToggle, setShowAfterInToggle] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMetadata, setShowMetadata] = useState(true)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Current photos
  const currentBefore = beforePhotos[beforeIndex]
  const currentAfter = afterPhotos[afterIndex]

  // Handle slider drag
  const handleSliderDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const position = ((clientX - rect.left) / rect.width) * 100
    setSliderPosition(Math.min(100, Math.max(0, position)))
  }, [])

  const handleSliderMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true
    handleSliderDrag(e)
  }, [handleSliderDrag])

  const handleSliderMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging.current) {
      handleSliderDrag(e)
    }
  }, [handleSliderDrag])

  const handleSliderMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5))
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Photo navigation
  const navigateBefore = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setBeforeIndex(i => (i > 0 ? i - 1 : beforePhotos.length - 1))
    } else {
      setBeforeIndex(i => (i < beforePhotos.length - 1 ? i + 1 : 0))
    }
  }

  const navigateAfter = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setAfterIndex(i => (i > 0 ? i - 1 : afterPhotos.length - 1))
    } else {
      setAfterIndex(i => (i < afterPhotos.length - 1 ? i + 1 : 0))
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return

      switch (e.key) {
        case 'Escape':
          setIsFullscreen(false)
          break
        case 'ArrowLeft':
          if (mode === 'slider') {
            setSliderPosition(p => Math.max(p - 5, 0))
          } else {
            navigateBefore('prev')
          }
          break
        case 'ArrowRight':
          if (mode === 'slider') {
            setSliderPosition(p => Math.min(p + 5, 100))
          } else {
            navigateAfter('next')
          }
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleResetZoom()
          break
        case ' ':
          if (mode === 'toggle') {
            setShowAfterInToggle(v => !v)
            e.preventDefault()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, mode])

  // Render photo metadata
  const renderPhotoMetadata = (photo: ComparisonPhoto | undefined, label: string) => {
    if (!photo || !showMetadata) return null

    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-xs">
        <Badge variant="outline" className="bg-black/30 border-white/30 text-white mb-2">
          {label}
        </Badge>
        <div className="flex flex-wrap gap-3 mt-1">
          {photo.uploadedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(photo.uploadedAt), 'MMM d, yyyy h:mm a')}
            </span>
          )}
          {photo.takenBy && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {photo.takenBy.name}
            </span>
          )}
          {photo.location?.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {photo.location.address}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Animation variants for smooth transitions
  const photoVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  }

  const metadataVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.1 } },
    exit: { opacity: 0, y: 20 }
  }

  // Render comparison content based on mode
  const renderComparisonContent = () => {
    switch (mode) {
      case 'side-by-side':
        return (
          <motion.div
            className="grid grid-cols-2 gap-4 h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Before */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {beforePhotos.length > 1 && (
                <motion.div
                  className="absolute top-2 left-2 z-10 flex gap-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-black/50 hover:bg-black/70"
                    onClick={() => navigateBefore('prev')}
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-black/50 hover:bg-black/70"
                    onClick={() => navigateBefore('next')}
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </Button>
                  <Badge className="bg-black/50 text-white">
                    {beforeIndex + 1}/{beforePhotos.length}
                  </Badge>
                </motion.div>
              )}
              <AnimatePresence mode="wait">
                {currentBefore ? (
                  <motion.div
                    key={currentBefore.id}
                    variants={photoVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full h-full"
                  >
                    <motion.img
                      src={currentBefore.url}
                      alt="Before"
                      className="w-full h-full object-contain"
                      style={{ scale: zoom, x: pan.x, y: pan.y }}
                      drag={zoom > 1}
                      dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info: PanInfo) => {
                        setPan({ x: info.offset.x, y: info.offset.y })
                      }}
                      whileHover={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
                      whileDrag={{ cursor: 'grabbing' }}
                    />
                    <motion.div
                      variants={metadataVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {renderPhotoMetadata(currentBefore, 'BEFORE')}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    <Camera className="h-12 w-12" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* After */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {afterPhotos.length > 1 && (
                <motion.div
                  className="absolute top-2 left-2 z-10 flex gap-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-black/50 hover:bg-black/70"
                    onClick={() => navigateAfter('prev')}
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-black/50 hover:bg-black/70"
                    onClick={() => navigateAfter('next')}
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </Button>
                  <Badge className="bg-black/50 text-white">
                    {afterIndex + 1}/{afterPhotos.length}
                  </Badge>
                </motion.div>
              )}
              <AnimatePresence mode="wait">
                {currentAfter ? (
                  <motion.div
                    key={currentAfter.id}
                    variants={photoVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full h-full"
                  >
                    <motion.img
                      src={currentAfter.url}
                      alt="After"
                      className="w-full h-full object-contain"
                      style={{ scale: zoom, x: pan.x, y: pan.y }}
                      drag={zoom > 1}
                      dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info: PanInfo) => {
                        setPan({ x: info.offset.x, y: info.offset.y })
                      }}
                      whileHover={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
                      whileDrag={{ cursor: 'grabbing' }}
                    />
                    <motion.div
                      variants={metadataVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {renderPhotoMetadata(currentAfter, 'AFTER')}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    <Camera className="h-12 w-12" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )

      case 'slider':
        return (
          <motion.div
            ref={sliderRef}
            className="relative w-full h-full bg-black rounded-lg overflow-hidden cursor-ew-resize select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onMouseDown={handleSliderMouseDown}
            onMouseMove={handleSliderMouseMove}
            onMouseUp={handleSliderMouseUp}
            onMouseLeave={handleSliderMouseUp}
            onTouchStart={handleSliderMouseDown}
            onTouchMove={handleSliderMouseMove}
            onTouchEnd={handleSliderMouseUp}
          >
            {/* Before image (full width, clipped) */}
            <motion.div
              className="absolute inset-0 overflow-hidden"
              animate={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              transition={{ type: 'tween', duration: 0.05 }}
            >
              {currentBefore ? (
                <motion.img
                  src={currentBefore.url}
                  alt="Before"
                  className="w-full h-full object-contain"
                  style={{ scale: zoom, x: pan.x, y: pan.y }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No before photo
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="absolute top-4 left-4 bg-amber-500 text-white">
                  BEFORE
                </Badge>
              </motion.div>
            </motion.div>

            {/* After image (full width, clipped from other side) */}
            <motion.div
              className="absolute inset-0 overflow-hidden"
              animate={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
              transition={{ type: 'tween', duration: 0.05 }}
            >
              {currentAfter ? (
                <motion.img
                  src={currentAfter.url}
                  alt="After"
                  className="w-full h-full object-contain"
                  style={{ scale: zoom, x: pan.x, y: pan.y }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No after photo
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="absolute top-4 right-4 bg-green-500 text-white">
                  AFTER
                </Badge>
              </motion.div>
            </motion.div>

            {/* Slider handle with spring animation */}
            <motion.div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
              animate={{ left: `${sliderPosition}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ transform: 'translateX(-50%)' }}
            >
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex gap-0.5">
                  <GripVertical className="h-5 w-5 text-gray-600" />
                </div>
              </motion.div>
            </motion.div>

            {/* Swipe hint overlay */}
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 2, duration: 0.5 }}
            >
              Drag to compare
            </motion.div>
          </motion.div>
        )

      case 'overlay':
        return (
          <motion.div
            className="relative w-full h-full bg-black rounded-lg overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Before image (base layer) */}
            {currentBefore && (
              <motion.img
                src={currentBefore.url}
                alt="Before"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ scale: zoom, x: pan.x, y: pan.y }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            {/* After image (overlay with animated opacity) */}
            {currentAfter && (
              <motion.img
                src={currentAfter.url}
                alt="After"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ scale: zoom, x: pan.x, y: pan.y }}
                initial={{ opacity: 0 }}
                animate={{ opacity: overlayOpacity / 100 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              />
            )}

            {/* Opacity slider with animated entrance */}
            <motion.div
              className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-3 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge className="bg-amber-500 text-white shrink-0">BEFORE</Badge>
                </motion.div>
                <Slider
                  value={[overlayOpacity]}
                  onValueChange={([v]) => setOverlayOpacity(v)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge className="bg-green-500 text-white shrink-0">AFTER</Badge>
                </motion.div>
              </div>
              <div className="text-center text-white/60 text-xs mt-2">
                {overlayOpacity}% after photo
              </div>
            </motion.div>
          </motion.div>
        )

      case 'toggle':
        return (
          <motion.div
            className="relative w-full h-full bg-black rounded-lg overflow-hidden cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => setShowAfterInToggle(v => !v)}
            whileTap={{ scale: 0.98 }}
          >
            <AnimatePresence mode="wait">
              {showAfterInToggle ? (
                currentAfter ? (
                  <motion.div
                    key="after"
                    initial={{ opacity: 0, rotateY: -90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: 90 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="w-full h-full"
                  >
                    <motion.img
                      src={currentAfter.url}
                      alt="After"
                      className="w-full h-full object-contain"
                      style={{ scale: zoom, x: pan.x, y: pan.y }}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Badge className="absolute top-4 left-4 bg-green-500 text-white">
                        AFTER
                      </Badge>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-after"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    No after photo
                  </motion.div>
                )
              ) : (
                currentBefore ? (
                  <motion.div
                    key="before"
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: -90 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="w-full h-full"
                  >
                    <motion.img
                      src={currentBefore.url}
                      alt="Before"
                      className="w-full h-full object-contain"
                      style={{ scale: zoom, x: pan.x, y: pan.y }}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Badge className="absolute top-4 left-4 bg-amber-500 text-white">
                        BEFORE
                      </Badge>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-before"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    No before photo
                  </motion.div>
                )
              )}
            </AnimatePresence>

            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              Click or press Space to toggle
            </motion.div>
          </motion.div>
        )
    }
  }

  // Mode buttons
  const modeButtons: { value: ComparisonMode; label: string; icon: React.ElementType }[] = [
    { value: 'side-by-side', label: 'Side by Side', icon: SplitSquareHorizontal },
    { value: 'slider', label: 'Slider', icon: ChevronLeft },
    { value: 'overlay', label: 'Overlay', icon: Layers },
    { value: 'toggle', label: 'Toggle', icon: RotateCcw },
  ]

  const content = (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-t-lg border-b">
        {/* Mode selector */}
        <div className="flex items-center gap-1">
          {modeButtons.map((btn) => {
            const Icon = btn.icon
            return (
              <TooltipProvider key={btn.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === btn.value ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8"
                      onClick={() => setMode(btn.value)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{btn.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (-)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs font-medium w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (+)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8" onClick={handleResetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset (0)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-6 bg-border mx-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main comparison area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[300px] p-2"
      >
        {renderComparisonContent()}
      </div>

      {/* Approval actions */}
      {showApprovalActions && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-b-lg border-t">
          <div className="text-sm text-muted-foreground">
            {punchItemTitle && (
              <span className="font-medium text-foreground">{punchItemTitle}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onReject?.('Work not satisfactory')}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={onApprove}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  // Fullscreen dialog
  if (isFullscreen) {
    return (
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo Comparison</DialogTitle>
          </DialogHeader>
          <div className="w-full h-full">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return content
}

// Compact version for use in lists/cards
interface CompactPhotoComparisonProps {
  beforePhoto?: ComparisonPhoto
  afterPhoto?: ComparisonPhoto
  onClick?: () => void
  className?: string
}

export function CompactPhotoComparison({
  beforePhoto,
  afterPhoto,
  onClick,
  className,
}: CompactPhotoComparisonProps) {
  const hasComparison = beforePhoto && afterPhoto

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all',
        className
      )}
    >
      {hasComparison ? (
        <div className="relative aspect-video">
          {/* Split view preview */}
          <div className="absolute inset-0 w-1/2 overflow-hidden">
            <img
              src={beforePhoto.url}
              alt="Before"
              className="h-full w-[200%] object-cover object-left"
            />
          </div>
          <div className="absolute inset-0 left-1/2 w-1/2 overflow-hidden">
            <img
              src={afterPhoto.url}
              alt="After"
              className="h-full w-[200%] object-cover object-right"
            />
          </div>

          {/* Divider line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white shadow" />

          {/* Labels */}
          <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0 bg-amber-500 text-white">
            Before
          </Badge>
          <Badge className="absolute top-1 right-1 text-[10px] px-1.5 py-0 bg-green-500 text-white">
            After
          </Badge>
        </div>
      ) : beforePhoto ? (
        <div className="relative aspect-video">
          <img
            src={beforePhoto.url}
            alt="Before"
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0 bg-amber-500 text-white">
            Before only
          </Badge>
        </div>
      ) : afterPhoto ? (
        <div className="relative aspect-video">
          <img
            src={afterPhoto.url}
            alt="After"
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0 bg-green-500 text-white">
            After only
          </Badge>
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center text-muted-foreground">
          <Camera className="h-8 w-8" />
        </div>
      )}
    </button>
  )
}

// Thumbnail strip for multiple photos
interface PhotoThumbnailStripProps {
  photos: ComparisonPhoto[]
  selectedIndex: number
  onSelect: (index: number) => void
  type: 'before' | 'after'
  className?: string
}

export function PhotoThumbnailStrip({
  photos,
  selectedIndex,
  onSelect,
  type,
  className,
}: PhotoThumbnailStripProps) {
  if (photos.length <= 1) return null

  const colorClass = type === 'before' ? 'ring-amber-500' : 'ring-green-500'

  return (
    <div className={cn('flex gap-1 overflow-x-auto py-1', className)}>
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'shrink-0 w-12 h-12 rounded overflow-hidden ring-2 transition-all',
            index === selectedIndex ? colorClass : 'ring-transparent hover:ring-gray-300'
          )}
        >
          <img
            src={photo.url}
            alt={`${type} ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}

export default PhotoComparisonViewer
