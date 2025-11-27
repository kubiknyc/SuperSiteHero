# Daily Reports - Implementation Guide

**Status:** 85% Complete
**Last Updated:** 2025-01-27
**Estimated Remaining Work:** 31-40 hours

---

## Table of Contents

1. [Current Status](#current-status)
2. [Architecture Overview](#architecture-overview)
3. [Photo Upload Implementation](#photo-upload-implementation)
4. [Offline Sync Implementation](#offline-sync-implementation)
5. [PDF Export Implementation](#pdf-export-implementation)
6. [Testing Implementation](#testing-implementation)
7. [UI Polish](#ui-polish)

---

## Current Status

### ✅ What's Complete (85%)

**Infrastructure:**
- ✅ Complete database schema (daily_reports + 5 related tables)
- ✅ Full CRUD API service with validation
- ✅ Comprehensive Zod validation schemas
- ✅ React Query hooks (fetch, create, update, delete)
- ✅ Offline store infrastructure

**UI Components:**
- ✅ DailyReportForm with 7 sections
- ✅ WeatherSection, WorkSection, IssuesSection
- ✅ WorkforceSection, EquipmentSection
- ✅ DeliveriesSection, VisitorsSection
- ✅ Create/Edit/Delete dialogs

**Pages:**
- ✅ DailyReportsPage (list view with filtering)
- ✅ NewDailyReportPage (create new report)
- ✅ DailyReportDetailPage (view report)
- ✅ DailyReportEditPage (edit report)

**Validation & Testing:**
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 errors, 912 warnings
- ✅ Build: Successful
- ✅ Tests: 96% pass rate (431/449)

### ❌ What's Missing (15%)

1. **Photo Upload Integration** (8-10 hours)
2. **Offline Sync Completion** (10-12 hours)
3. **PDF Export** (4-6 hours)
4. **Comprehensive Testing** (6-8 hours)
5. **UI Polish** (3-4 hours)

---

## Architecture Overview

### Database Schema

```typescript
// Main table
daily_reports {
  id, project_id, report_date, report_number
  reporter_id, reviewer_id, created_by, approved_by
  status, submitted_at, approved_at

  // Weather
  weather_condition, temperature_high, temperature_low
  precipitation, wind_speed, weather_source
  weather_delays, weather_delay_notes

  // Work
  work_completed, issues, observations
  total_workers

  // Documents
  pdf_url, pdf_generated_at

  // Data
  production_data: Json  // ← Can store photo URLs here

  // Metadata
  created_at, updated_at, deleted_at
}

// Related tables
daily_report_workforce   // Teams, workers, hours
daily_report_equipment   // Equipment usage
daily_report_deliveries  // Material deliveries
daily_report_visitors    // Site visitor log
daily_report_safety_incidents // Safety tracking
```

### File Structure

```
src/
├── features/daily-reports/
│   ├── components/
│   │   ├── DailyReportForm.tsx          ✅ Main form
│   │   ├── WeatherSection.tsx           ✅ Weather inputs
│   │   ├── WorkSection.tsx              ✅ Work completed
│   │   ├── IssuesSection.tsx            ✅ Issues tracking
│   │   ├── WorkforceSection.tsx         ✅ Teams/workers
│   │   ├── EquipmentSection.tsx         ✅ Equipment used
│   │   ├── DeliveriesSection.tsx        ✅ Material deliveries
│   │   ├── VisitorsSection.tsx          ✅ Visitor log
│   │   ├── CreateDailyReportDialog.tsx  ✅ Create modal
│   │   ├── EditDailyReportDialog.tsx    ✅ Edit modal
│   │   ├── DeleteDailyReportConfirmation.tsx ✅ Delete confirm
│   │   └── PhotoUploadSection.tsx       ❌ TO IMPLEMENT
│   ├── hooks/
│   │   ├── useDailyReports.ts           ✅ Fetch reports
│   │   ├── useDailyReportsMutations.ts  ✅ CRUD operations
│   │   └── useOfflineSync.ts            ⚠️ PARTIALLY COMPLETE
│   ├── store/
│   │   └── offlineReportStore.ts        ⚠️ PARTIALLY COMPLETE
│   └── utils/
│       └── photoUpload.ts               ❌ TO IMPLEMENT
├── lib/api/services/
│   └── daily-reports.ts                 ✅ Complete API service
├── lib/validation/
│   └── schemas.ts                       ✅ Zod schemas
└── pages/daily-reports/
    ├── DailyReportsPage.tsx             ✅ List view
    ├── NewDailyReportPage.tsx           ✅ Create page
    ├── DailyReportDetailPage.tsx        ✅ Detail view
    └── DailyReportEditPage.tsx          ✅ Edit page
```

---

## Photo Upload Implementation

**Estimated Time:** 8-10 hours

### Architecture Decision

Use **Option 2: production_data JSON field** for storing photo metadata:

```typescript
// In daily_reports table
production_data: {
  photos: [
    {
      id: string
      url: string
      fileName: string
      fileSize: number
      uploadedAt: string
      uploadedBy: string
      section: 'weather' | 'work' | 'equipment' | 'deliveries' | 'issues'
      description?: string
      thumbnail?: string
    }
  ]
}
```

**Why this approach:**
- ✅ Simple, no schema changes needed
- ✅ Flexible structure
- ✅ Fast to implement
- ✅ Works well with offline sync
- ❌ Not as queryable as separate table

### Step 1: Create Photo Upload Utility (2 hours)

**File:** `src/features/daily-reports/utils/photoUpload.ts`

```typescript
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface PhotoMetadata {
  id: string
  url: string
  fileName: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  section: string
  description?: string
  thumbnail?: string
}

export interface UploadPhotoOptions {
  file: File
  projectId: string
  reportId: string
  section: string
  userId: string
  description?: string
}

export async function uploadPhoto(
  options: UploadPhotoOptions
): Promise<PhotoMetadata> {
  const { file, projectId, reportId, section, userId, description } = options

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB')
  }

  // Generate unique file name
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const fileName = `${reportId}_${section}_${timestamp}.${fileExt}`
  const filePath = `daily-reports/${projectId}/${reportId}/${fileName}`

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('daily-reports')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error('Failed to upload photo')
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('daily-reports').getPublicUrl(filePath)

  // Generate thumbnail (optional, can be done server-side)
  // For now, just use the same URL
  const thumbnailUrl = publicUrl

  // Return metadata
  return {
    id: `photo_${timestamp}`,
    url: publicUrl,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
    section,
    description,
    thumbnail: thumbnailUrl,
  }
}

export async function deletePhoto(
  projectId: string,
  reportId: string,
  photoUrl: string
): Promise<void> {
  // Extract file path from URL
  const urlParts = photoUrl.split('/daily-reports/')
  if (urlParts.length < 2) {
    throw new Error('Invalid photo URL')
  }

  const filePath = `daily-reports/${urlParts[1]}`

  const { error } = await supabase.storage.from('daily-reports').remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    throw new Error('Failed to delete photo')
  }
}

export function validateImageFile(file: File): string | null {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return 'Only image files are allowed'
  }

  // Check file size (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return 'File size must be less than 10MB'
  }

  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !allowedExtensions.includes(ext)) {
    return 'Allowed formats: JPG, PNG, GIF, WebP'
  }

  return null
}
```

### Step 2: Create Photo Upload Component (3 hours)

**File:** `src/features/daily-reports/components/PhotoUploadSection.tsx`

```typescript
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadPhoto, deletePhoto, validateImageFile, type PhotoMetadata } from '../utils/photoUpload'
import { useAuth } from '@/contexts/AuthContext'

interface PhotoUploadSectionProps {
  reportId: string
  projectId: string
  section: string
  photos: PhotoMetadata[]
  onPhotosUpdate: (photos: PhotoMetadata[]) => void
  expanded?: boolean
  onToggle?: () => void
}

export function PhotoUploadSection({
  reportId,
  projectId,
  section,
  photos,
  onPhotosUpdate,
  expanded = true,
  onToggle,
}: PhotoUploadSectionProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate
    const error = validateImageFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setUploading(true)

    try {
      const photoMetadata = await uploadPhoto({
        file,
        projectId,
        reportId,
        section,
        userId: user?.id || '',
        description: description || undefined,
      })

      // Add to photos array
      onPhotosUpdate([...photos, photoMetadata])

      toast.success('Photo uploaded successfully')
      setDescription('')

      // Reset file input
      e.target.value = ''
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      await deletePhoto(projectId, reportId, photoUrl)

      // Remove from photos array
      onPhotosUpdate(photos.filter((p) => p.id !== photoId))

      toast.success('Photo deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete photo')
    }
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-gray-500" />
            <CardTitle>Photos ({photos.length})</CardTitle>
          </div>
          <Button variant="ghost" size="sm" type="button">
            {expanded ? '▼' : '▶'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Upload Section */}
          <div className="space-y-2">
            <Label htmlFor={`photo-upload-${section}`}>
              Add Photo
            </Label>
            <div className="flex gap-2">
              <Input
                id={`photo-upload-${section}`}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              />
            </div>
            <Input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading photo...</span>
            </div>
          )}

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-lg overflow-hidden border border-gray-200"
                >
                  <img
                    src={photo.thumbnail || photo.url}
                    alt={photo.description || photo.fileName}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id, photo.url)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {photo.description && (
                    <div className="p-2 bg-white">
                      <p className="text-xs text-gray-600 truncate">
                        {photo.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {photos.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Camera className="h-12 w-12 mx-auto mb-2" />
              <p>No photos uploaded yet</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
```

### Step 3: Integrate with DailyReportForm (2 hours)

**Update:** `src/features/daily-reports/components/DailyReportForm.tsx`

```typescript
// Add to imports
import { PhotoUploadSection } from './PhotoUploadSection'
import type { PhotoMetadata } from '../utils/photoUpload'

// Add to state
const [photos, setPhotos] = useState<PhotoMetadata[]>(
  initialData?.production_data?.photos || []
)

// Add to form
<PhotoUploadSection
  reportId={store.draftReport?.id || 'temp'}
  projectId={projectId}
  section="work"
  photos={photos}
  onPhotosUpdate={(newPhotos) => {
    setPhotos(newPhotos)
    store.updateDraft({
      production_data: {
        ...store.draftReport?.production_data,
        photos: newPhotos,
      },
    })
  }}
  expanded={expanded.photos}
  onToggle={() => setExpanded({ ...expanded, photos: !expanded.photos })}
/>
```

### Step 4: Update API Service (1 hour)

**Update:** `src/lib/api/services/daily-reports.ts`

Ensure the production_data field is properly handled in create/update operations. It should already work since it's a JSON field, but verify:

```typescript
// The API service should already handle JSON fields correctly
// Just ensure validation allows production_data
```

### Step 5: Storage Bucket Setup (30 min)

**Supabase Dashboard:**

1. Go to Storage section
2. Create new bucket: `daily-reports`
3. Set bucket to **public** (or configure RLS if you want private)
4. Configure CORS if needed

**Policies (if private bucket):**

```sql
-- Allow authenticated users to upload to their project folders
CREATE POLICY "Users can upload to daily-reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daily-reports' AND
  auth.uid() IN (
    SELECT user_id FROM user_projects WHERE project_id = (storage.foldername(name))[1]
  )
);

-- Allow authenticated users to view photos in their projects
CREATE POLICY "Users can view daily-reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'daily-reports' AND
  auth.uid() IN (
    SELECT user_id FROM user_projects WHERE project_id = (storage.foldername(name))[1]
  )
);

-- Allow users to delete their uploaded photos
CREATE POLICY "Users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-reports' AND
  auth.uid()::text = owner
);
```

### Testing Checklist

- [ ] Upload single photo
- [ ] Upload multiple photos to different sections
- [ ] Delete photo
- [ ] View photos in gallery
- [ ] Photos persist after save
- [ ] Photos work offline (store locally first)
- [ ] File size validation
- [ ] File type validation
- [ ] Error handling (network failure, etc.)

---

## Offline Sync Implementation

**Estimated Time:** 10-12 hours

### Current State

**What exists:**
- ✅ `offlineReportStore.ts` - Store structure
- ✅ `useOfflineSync.ts` - Hook infrastructure
- ✅ `IndexedDB` integration
- ✅ Sync queue data structure

**What's missing:**
- ❌ Actual sync processing logic
- ❌ Conflict resolution
- ❌ Retry mechanism
- ❌ Background sync

### Architecture

```typescript
// Sync Queue Item
interface SyncQueueItem {
  id: string
  reportId: string
  action: 'create' | 'update' | 'delete'
  data?: any
  timestamp: number
  retryCount: number
  error?: string
}

// Sync Status
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
```

### Step 1: Implement Sync Processor (4 hours)

**File:** `src/features/daily-reports/hooks/useOfflineSync.ts`

```typescript
import { useEffect, useCallback } from 'react'
import { useOfflineReportStore } from '../store/offlineReportStore'
import { dailyReportsApi } from '@/lib/api/services/daily-reports'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import toast from 'react-hot-toast'

export function useOfflineSync() {
  const store = useOfflineReportStore()
  const { isOnline } = useNetworkStatus()

  // Process sync queue
  const processQueue = useCallback(async () => {
    if (!isOnline || store.syncStatus === 'syncing') return
    if (store.syncQueue.length === 0) return

    store.setSyncStatus('syncing')

    try {
      const queue = [...store.syncQueue]
      const results = []

      for (const item of queue) {
        try {
          switch (item.action) {
            case 'create':
              await dailyReportsApi.createReport(item.data)
              break
            case 'update':
              await dailyReportsApi.updateReport(item.reportId, item.data)
              break
            case 'delete':
              await dailyReportsApi.deleteReport(item.reportId)
              break
          }

          // Remove from queue on success
          store.removeFromSyncQueue(item.id)
          results.push({ id: item.id, success: true })
        } catch (error) {
          console.error(`Sync error for ${item.id}:`, error)

          // Increment retry count
          store.updateSyncQueueItem(item.id, {
            retryCount: item.retryCount + 1,
            error: error.message,
          })

          // Remove if max retries reached
          if (item.retryCount >= 3) {
            store.removeFromSyncQueue(item.id)
            toast.error(`Failed to sync report ${item.reportId} after 3 attempts`)
          }

          results.push({ id: item.id, success: false, error })
        }
      }

      const successCount = results.filter((r) => r.success).length
      if (successCount > 0) {
        toast.success(`Synced ${successCount} report(s)`)
        store.setSyncStatus('success')
      } else if (results.length > 0) {
        store.setSyncStatus('error')
      }

      // Reset status after delay
      setTimeout(() => {
        store.setSyncStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Queue processing error:', error)
      store.setSyncStatus('error')
      setTimeout(() => store.setSyncStatus('idle'), 3000)
    }
  }, [isOnline, store])

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && store.syncQueue.length > 0) {
      const timer = setTimeout(() => {
        processQueue()
      }, 1000) // Debounce

      return () => clearTimeout(timer)
    }
  }, [isOnline, store.syncQueue.length, processQueue])

  // Background sync registration
  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in registration) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('daily-reports-sync')
      })
    }
  }, [])

  return {
    syncStatus: store.syncStatus,
    syncQueue: store.syncQueue,
    isOnline,
    hasPendingSync: store.syncQueue.length > 0,
    processQueue,
  }
}
```

### Step 2: Add Conflict Resolution (3 hours)

**Strategy:** Last-write-wins with user notification

```typescript
async function syncWithConflictResolution(item: SyncQueueItem) {
  try {
    // Fetch current server version
    const serverReport = await dailyReportsApi.getReport(item.reportId)

    // Compare timestamps
    const localTimestamp = new Date(item.data.updated_at)
    const serverTimestamp = new Date(serverReport.updated_at)

    if (serverTimestamp > localTimestamp) {
      // Server version is newer - ask user
      const useLocal = confirm(
        'This report has been modified by another user. ' +
        'Do you want to overwrite with your local changes?'
      )

      if (!useLocal) {
        // Use server version
        store.removeDraft(item.reportId)
        return
      }
    }

    // Proceed with sync
    await dailyReportsApi.updateReport(item.reportId, item.data)
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      // Report was deleted on server
      store.removeDraft(item.reportId)
      toast.error('Report was deleted on server')
    } else {
      throw error
    }
  }
}
```

### Step 3: Add Retry Mechanism (2 hours)

Exponential backoff with jitter:

```typescript
function calculateRetryDelay(retryCount: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 60000 // 60 seconds
  const jitter = Math.random() * 1000

  const delay = Math.min(
    baseDelay * Math.pow(2, retryCount) + jitter,
    maxDelay
  )

  return delay
}
```

### Step 4: Background Sync (2 hours)

**Service Worker:** `public/sw.js`

```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'daily-reports-sync') {
    event.waitUntil(syncDailyReports())
  }
})

async function syncDailyReports() {
  // Get pending items from IndexedDB
  const db = await openDB('supersitehero', 1)
  const tx = db.transaction('sync_queue', 'readonly')
  const queue = await tx.store.getAll()

  // Process each item
  for (const item of queue) {
    try {
      await fetch(`/api/daily-reports/${item.reportId}`, {
        method: item.action === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      })

      // Remove from queue
      const delTx = db.transaction('sync_queue', 'readwrite')
      await delTx.store.delete(item.id)
    } catch (error) {
      console.error('Background sync error:', error)
    }
  }
}
```

### Testing Checklist

- [ ] Create report offline
- [ ] Edit report offline
- [ ] Delete report offline
- [ ] Multiple changes offline
- [ ] Sync when online
- [ ] Conflict resolution
- [ ] Retry failed syncs
- [ ] Background sync
- [ ] Network interruption during sync
- [ ] Multiple devices editing same report

---

## PDF Export Implementation

**Estimated Time:** 4-6 hours

### Approach: Client-Side PDF Generation

Use `@react-pdf/renderer` for React-friendly PDF generation.

### Step 1: Install Dependencies (5 min)

```bash
npm install @react-pdf/renderer
```

### Step 2: Create PDF Template (3 hours)

**File:** `src/features/daily-reports/components/DailyReportPDF.tsx`

```typescript
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { DailyReport } from '@/types/database'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#999',
    borderTop: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
})

interface DailyReportPDFProps {
  report: DailyReport
  projectName: string
}

export function DailyReportPDF({ report, projectName }: DailyReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Daily Report</Text>
          <Text style={styles.subtitle}>
            {projectName} - {format(new Date(report.report_date), 'MMMM d, yyyy')}
          </Text>
          {report.report_number && (
            <Text style={styles.subtitle}>Report #{report.report_number}</Text>
          )}
        </View>

        {/* Weather Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather Conditions</Text>
          {report.weather_condition && (
            <View style={styles.row}>
              <Text style={styles.label}>Condition:</Text>
              <Text style={styles.value}>{report.weather_condition}</Text>
            </View>
          )}
          {report.temperature_high && report.temperature_low && (
            <View style={styles.row}>
              <Text style={styles.label}>Temperature:</Text>
              <Text style={styles.value}>
                High: {report.temperature_high}°F / Low: {report.temperature_low}°F
              </Text>
            </View>
          )}
          {report.precipitation && (
            <View style={styles.row}>
              <Text style={styles.label}>Precipitation:</Text>
              <Text style={styles.value}>{report.precipitation}"</Text>
            </View>
          )}
          {report.weather_delays && (
            <View style={styles.row}>
              <Text style={styles.label}>Weather Delays:</Text>
              <Text style={styles.value}>
                Yes {report.weather_delay_notes && `- ${report.weather_delay_notes}`}
              </Text>
            </View>
          )}
        </View>

        {/* Work Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Completed</Text>
          <Text>{report.work_completed || 'No work details provided'}</Text>
        </View>

        {/* Workforce Section */}
        {report.total_workers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workforce</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Total Workers:</Text>
              <Text style={styles.value}>{report.total_workers}</Text>
            </View>
          </View>
        )}

        {/* Issues Section */}
        {report.issues && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issues</Text>
            <Text>{report.issues}</Text>
          </View>
        )}

        {/* Observations Section */}
        {report.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations</Text>
            <Text>{report.observations}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')} |
            Status: {report.status?.toUpperCase()}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
```

### Step 3: Add Export Functionality (2 hours)

**File:** `src/features/daily-reports/hooks/usePDFExport.ts`

```typescript
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { DailyReportPDF } from '../components/DailyReportPDF'
import type { DailyReport } from '@/types/database'

export function usePDFExport() {
  const generatePDF = async (
    report: DailyReport,
    projectName: string
  ): Promise<Blob> => {
    const doc = <DailyReportPDF report={report} projectName={projectName} />
    const blob = await pdf(doc).toBlob()
    return blob
  }

  const downloadPDF = async (
    report: DailyReport,
    projectName: string
  ): Promise<void> => {
    const blob = await generatePDF(report, projectName)
    const fileName = `Daily_Report_${report.report_date}_${report.report_number || 'draft'}.pdf`
    saveAs(blob, fileName)
  }

  const uploadPDF = async (
    report: DailyReport,
    projectName: string
  ): Promise<string> => {
    const blob = await generatePDF(report, projectName)

    // Upload to Supabase Storage
    const fileName = `${report.id}_${Date.now()}.pdf`
    const filePath = `daily-reports/${report.project_id}/${fileName}`

    const { data, error } = await supabase.storage
      .from('daily-reports')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('daily-reports')
      .getPublicUrl(filePath)

    // Update report with PDF URL
    await dailyReportsApi.updateReport(report.id, {
      pdf_url: publicUrl,
      pdf_generated_at: new Date().toISOString(),
    })

    return publicUrl
  }

  return {
    generatePDF,
    downloadPDF,
    uploadPDF,
  }
}
```

### Step 4: Add UI Buttons (1 hour)

Add to detail page and list actions:

```typescript
const { downloadPDF, uploadPDF } = usePDFExport()

<Button onClick={() => downloadPDF(report, project.name)}>
  <Download className="mr-2 h-4 w-4" />
  Download PDF
</Button>

<Button onClick={() => uploadPDF(report, project.name)}>
  <Upload className="mr-2 h-4 w-4" />
  Save PDF to Project
</Button>
```

### Testing Checklist

- [ ] Generate PDF for complete report
- [ ] Generate PDF for partial report
- [ ] PDF includes all sections
- [ ] PDF formatting is correct
- [ ] Download functionality works
- [ ] Upload to storage works
- [ ] PDF URL saved to database

---

## Testing Implementation

**Estimated Time:** 6-8 hours

### Test Coverage Goals

- Unit tests: 80% coverage
- Integration tests: Critical paths
- E2E tests: Main workflows

### Step 1: Unit Tests (4 hours)

**File:** `src/lib/validation/__tests__/schemas.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { dailyReportCreateSchema } from '../schemas'

describe('dailyReportCreateSchema', () => {
  it('should validate valid daily report data', () => {
    const validData = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      reporter_id: '123e4567-e89b-12d3-a456-426614174001',
      report_date: '2025-01-27',
      weather_condition: 'Sunny',
      temperature_high: 75,
      temperature_low: 55,
      total_workers: 25,
      status: 'draft',
    }

    const result = dailyReportCreateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject future dates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    const invalidData = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      reporter_id: '123e4567-e89b-12d3-a456-426614174001',
      report_date: futureDate.toISOString().split('T')[0],
    }

    const result = dailyReportCreateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject invalid temperature ranges', () => {
    const invalidData = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      reporter_id: '123e4567-e89b-12d3-a456-426614174001',
      report_date: '2025-01-27',
      temperature_high: 200, // Invalid
    }

    const result = dailyReportCreateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
```

**File:** `src/lib/api/services/__tests__/daily-reports.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dailyReportsApi } from '../daily-reports'
import { apiClient } from '../../client'

vi.mock('../../client')

describe('dailyReportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProjectReports', () => {
    it('should fetch reports for a project', async () => {
      const mockReports = [
        { id: '1', project_id: 'proj-1', report_date: '2025-01-27' },
      ]

      vi.mocked(apiClient.select).mockResolvedValue(mockReports)

      const result = await dailyReportsApi.getProjectReports('proj-1')

      expect(apiClient.select).toHaveBeenCalledWith('daily_reports', {
        filters: [{ column: 'project_id', operator: 'eq', value: 'proj-1' }],
        orderBy: { column: 'report_date', ascending: false },
      })
      expect(result).toEqual(mockReports)
    })

    it('should throw error if project ID is missing', async () => {
      await expect(
        dailyReportsApi.getProjectReports('')
      ).rejects.toThrow('Project ID is required')
    })
  })

  describe('createReport', () => {
    it('should create a new report', async () => {
      const reportData = {
        project_id: 'proj-1',
        reporter_id: 'user-1',
        report_date: '2025-01-27',
      }

      const mockCreatedReport = { id: '1', ...reportData }

      vi.mocked(apiClient.insert).mockResolvedValue(mockCreatedReport)

      const result = await dailyReportsApi.createReport(reportData)

      expect(apiClient.insert).toHaveBeenCalledWith(
        'daily_reports',
        expect.any(Object)
      )
      expect(result).toEqual(mockCreatedReport)
    })

    it('should validate report data before creating', async () => {
      const invalidData = {
        project_id: 'invalid-uuid',
        reporter_id: 'user-1',
        report_date: '2025-01-27',
      }

      await expect(
        dailyReportsApi.createReport(invalidData as any)
      ).rejects.toThrow('Invalid daily report data')
    })
  })
})
```

### Step 2: Integration Tests (3 hours)

**File:** `src/__tests__/integration/daily-reports-workflow.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, userEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NewDailyReportPage } from '@/pages/daily-reports/NewDailyReportPage'
import { server } from '../mocks/server'
import { rest } from 'msw'

describe('Daily Reports Workflow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('should create a new daily report', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <NewDailyReportPage />
      </QueryClientProvider>
    )

    // Select project
    const projectSelect = screen.getByLabelText(/select project/i)
    await user.selectOptions(projectSelect, 'proj-1')

    // Fill weather section
    const weatherInput = screen.getByLabelText(/weather condition/i)
    await user.type(weatherInput, 'Sunny')

    // Fill work section
    const workInput = screen.getByLabelText(/work completed/i)
    await user.type(workInput, 'Framed walls on second floor')

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/report created successfully/i)).toBeInTheDocument()
    })
  })
})
```

### Step 3: E2E Tests (1 hour)

**File:** `tests/e2e/daily-reports.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Daily Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // Login
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should create a daily report', async ({ page }) => {
    await page.goto('/daily-reports/new')

    // Select project
    await page.selectOption('select', { label: 'Test Project' })

    // Fill form
    await page.fill('[name="weather_condition"]', 'Partly Cloudy')
    await page.fill('[name="temperature_high"]', '68')
    await page.fill('[name="work_completed"]', 'Concrete pour completed')

    // Submit
    await page.click('button[type="submit"]')

    // Verify redirect
    await expect(page).toHaveURL('/daily-reports')

    // Verify report appears in list
    await expect(page.locator('text=Partly Cloudy')).toBeVisible()
  })
})
```

---

## UI Polish

**Estimated Time:** 3-4 hours

### Loading States

Add to all data fetching:

```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <p className="ml-2 text-gray-500">Loading reports...</p>
    </div>
  )
}
```

### Empty States

Add to list views:

```typescript
if (!reports || reports.length === 0) {
  return (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No reports yet
      </h3>
      <p className="text-gray-500 mb-4">
        Get started by creating your first daily report
      </p>
      <Button onClick={() => navigate('/daily-reports/new')}>
        <Plus className="mr-2 h-4 w-4" />
        Create Report
      </Button>
    </div>
  )
}
```

### Error States

Add comprehensive error handling:

```typescript
if (error) {
  return (
    <div className="flex items-center justify-center py-12">
      <AlertCircle className="h-8 w-8 text-red-500 mr-2" />
      <div>
        <p className="text-red-900 font-medium">Failed to load reports</p>
        <p className="text-red-600 text-sm">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-2">
          Try Again
        </Button>
      </div>
    </div>
  )
}
```

### Pagination

Add to list page:

```typescript
const [page, setPage] = useState(1)
const [limit, setLimit] = useState(20)

const { data, isLoading } = useDailyReports(projectId, {
  page,
  limit,
})

// Pagination controls
<div className="flex items-center justify-between mt-4">
  <Button
    onClick={() => setPage(p => Math.max(1, p - 1))}
    disabled={page === 1}
  >
    Previous
  </Button>
  <span>Page {page} of {data?.totalPages}</span>
  <Button
    onClick={() => setPage(p => p + 1)}
    disabled={page >= data?.totalPages}
  >
    Next
  </Button>
</div>
```

---

## Summary

### Priority Order

1. **Photo Upload** (8-10 hours) - High user value
2. **Offline Sync** (10-12 hours) - Critical for field use
3. **PDF Export** (4-6 hours) - Professional reporting
4. **Testing** (6-8 hours) - Quality assurance
5. **UI Polish** (3-4 hours) - User experience

### Total Estimated Time: 31-40 hours

### Quick Wins (1-2 hours each)

If short on time, these provide immediate value:

1. **Simple photo URLs field** (1 hour)
2. **Basic pagination** (1 hour)
3. **Loading/empty states** (2 hours)
4. **PDF download button** (1 hour using simpler library)

### Dependencies

- Supabase Storage buckets configured
- Service worker registered for background sync
- IndexedDB working
- Authentication context available

### Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [@react-pdf/renderer Docs](https://react-pdf.org/)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-27
**Status:** Ready for Implementation
