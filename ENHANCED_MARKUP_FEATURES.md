# Enhanced Drawing Markup and Version Comparison Features

This document describes the new markup and version comparison features added to the document viewer.

## Overview

The enhanced markup system provides:
1. **Color Selection System** - Multiple colors with trade presets
2. **Layer System** - Organize markups by named layers
3. **Measurement Tools** - Distance and area measurements with scale calibration
4. **Stamp Tools** - Approval stamps (APPROVED, REJECTED, REVIEWED, etc.)
5. **Markup History** - Track who created markups and when
6. **Sharing & Permissions** - Share markups with team/subs
7. **Version Comparison** - Side-by-side and overlay comparison

## New Files Created

### Type Definitions
- `src/features/documents/types/markup.ts` - Comprehensive type definitions for all markup features

### Components

#### Markup Components (`src/features/documents/components/markup/`)
- `ColorPicker.tsx` - Color picker with trade presets and recent colors
- `LayerManager.tsx` - Layer management panel (create, edit, delete, reorder, visibility)
- `MeasurementTools.tsx` - Distance/area measurement with scale calibration
- `MarkupHistoryPanel.tsx` - View all markups by author, date, type
- `StampTools.tsx` - Approval stamp selection and placement
- `MarkupSharingDialog.tsx` - Share markups with team, subs, specific users
- `EnhancedMarkupToolbar.tsx` - Complete toolbar integrating all tools
- `index.ts` - Exports all markup components

#### Comparison Components (`src/features/documents/components/comparison/`)
- `EnhancedVersionComparison.tsx` - Side-by-side and overlay version comparison
- `index.ts` - Exports comparison components

### Hooks
- `src/features/documents/hooks/useLayers.ts` - CRUD operations for markup layers
- `src/features/documents/hooks/useDocumentComparison.ts` - Version comparison and markup transfer

### UI Components
- `src/components/ui/tooltip.tsx` - Tooltip component
- `src/components/ui/slider.tsx` - Slider component

### Database Migration
- `migrations/014_enhanced_markup_features.sql` - Creates new tables:
  - `document_markup_layers` - Named layers for organizing markups
  - `document_scale_calibrations` - Scale calibration for measurements
  - `document_markup_measurements` - Stored measurements
  - `document_markup_share_history` - Sharing audit trail
  - `document_version_comparisons` - Cached comparison results
  - Updates `document_markups` table with new columns

## Usage

### Using the Enhanced Toolbar

```tsx
import { EnhancedMarkupToolbar } from '@/features/documents/components/markup'

<EnhancedMarkupToolbar
  // Tool state
  selectedTool={tool}
  onToolChange={setTool}

  // Color state
  selectedColor={color}
  onColorChange={setColor}
  recentColors={recentColors}
  onRecentColorsChange={setRecentColors}

  // Line width
  lineWidth={lineWidth}
  onLineWidthChange={setLineWidth}

  // Layer state
  layers={layers}
  selectedLayerId={selectedLayerId}
  onSelectLayer={setSelectedLayerId}
  onCreateLayer={handleCreateLayer}
  onUpdateLayer={handleUpdateLayer}
  onDeleteLayer={handleDeleteLayer}
  onReorderLayer={handleReorderLayer}
  onToggleLayerVisibility={handleToggleVisibility}
  onToggleLayerLock={handleToggleLock}

  // Measurement state
  activeMeasurementType={measurementType}
  onMeasurementTypeChange={setMeasurementType}
  currentMeasurementUnit={unit}
  onMeasurementUnitChange={setUnit}
  scale={scale}
  onCalibrateScale={handleCalibrateScale}
  measurements={measurements}
  onDeleteMeasurement={handleDeleteMeasurement}
  onClearAllMeasurements={handleClearMeasurements}
  isCalibrating={isCalibrating}
  onStartCalibration={startCalibration}
  onCancelCalibration={cancelCalibration}
  calibrationPixelDistance={pixelDistance}

  // Stamp state
  selectedStamp={selectedStamp}
  onStampSelect={setSelectedStamp}
  customStampText={customStampText}
  onCustomStampTextChange={setCustomStampText}

  // History/sharing
  markups={markups}
  authors={authors}
  currentUserId={userId}
  onSelectMarkup={handleSelectMarkup}
  onDeleteMarkup={handleDeleteMarkup}
  onEditMarkup={handleEditMarkup}
  onViewMarkup={handleViewMarkup}
  selectedMarkupId={selectedId}
  onOpenShareDialog={openShareDialog}
  canShare={true}

  // Zoom
  onZoomIn={handleZoomIn}
  onZoomOut={handleZoomOut}
  onResetView={handleResetView}
  currentZoom={zoom}
/>
```

### Using Version Comparison

```tsx
import { EnhancedVersionComparison } from '@/features/documents/components/comparison'

<EnhancedVersionComparison
  version1={olderVersion}
  version2={newerVersion}
  open={isComparisonOpen}
  onClose={() => setIsComparisonOpen(false)}
  onTransferMarkups={handleTransferMarkups}
/>
```

### Using Layer Hooks

```tsx
import { useDocumentLayers, useCreateLayer } from '@/features/documents/hooks/useLayers'

const { data: layers } = useDocumentLayers(documentId)
const createLayer = useCreateLayer()

// Create a layer
createLayer.mutate({
  documentId,
  name: 'Electrical Notes',
  color: '#FFCC00',
  visible: true,
  locked: false,
  order: 0,
  createdBy: userId,
})
```

## Database Setup

Run the migration after updating your Supabase project:

1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `migrations/014_enhanced_markup_features.sql`
3. Execute the SQL

After running the migration, update `src/types/database.ts` with the new table types.

## Trade Color Presets

The color picker includes construction trade-specific color presets:
- **Red (#FF0000)** - General issues
- **Blue (#0066FF)** - Plumbing
- **Yellow (#FFCC00)** - Electrical
- **Green (#00CC66)** - HVAC/Mechanical
- **Orange (#FF6600)** - Fire Protection
- **Purple (#9933FF)** - Structural
- **Pink (#FF66CC)** - Architectural
- **Cyan (#00CCFF)** - Low Voltage
- **Brown (#996633)** - Civil/Site

## Stamp Types

Available approval stamps:
- APPROVED (green)
- REJECTED (red)
- REVIEWED (blue)
- REVISED (amber)
- FOR INFORMATION (purple)
- NOT FOR CONSTRUCTION (orange)
- VOID (gray)
- PRELIMINARY (cyan)
- FINAL (emerald)
- CUSTOM (user-defined text)

## Measurement Features

1. **Scale Calibration**: Draw a line on a known dimension and enter the real-world distance
2. **Distance Measurement**: Click two points to measure distance
3. **Area Measurement**: Click multiple points to measure area
4. **Unit Conversion**: Switch between feet, inches, meters, cm, mm

## Version Comparison Modes

1. **Side-by-Side**: View two versions next to each other with synchronized zoom/pan
2. **Overlay**: Stack versions with adjustable opacity and blend modes (difference, multiply, overlay)

## Keyboard Shortcuts

- `1-9`: Select tools
- `+/-`: Zoom in/out
- `0`: Reset view
- `Left/Right Arrow`: Navigate pages
- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z`: Redo
- `Delete`: Delete selected markup
- `Escape`: Deselect

## Future Enhancements

The following features are defined in types but need implementation:
- Photo pin attachments
- Callout annotations
- Highlight tool
- Dimension lines with arrows
- Real-time collaboration
- Offline sync for markups
- Automated change detection between versions
