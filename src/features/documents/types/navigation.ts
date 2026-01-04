// File: /src/features/documents/types/navigation.ts
// Type definitions for sheet navigation system

// ============================================================
// SHEET REFERENCES FOR NAVIGATION
// ============================================================

/**
 * Reference to a specific sheet/page within a document
 * Used for navigation history and cross-sheet linking
 */
export interface SheetReference {
  /** Document ID in the database */
  documentId: string
  /** Page number within the document (1-indexed) */
  pageNumber: number
  /** Sheet number as displayed on the drawing (e.g., "A-101") */
  sheetNumber?: string
  /** Human-readable sheet title */
  sheetTitle?: string
  /** Discipline code (A=Architectural, S=Structural, M=Mechanical, E=Electrical, P=Plumbing, etc.) */
  discipline?: string
}

/**
 * Navigation history state for tracking visited sheets
 */
export interface NavigationHistory {
  /** Array of visited sheet references */
  history: SheetReference[]
  /** Current position in the history (index into history array) */
  currentIndex: number
}

// ============================================================
// SHEET REFERENCE ANNOTATIONS
// ============================================================

/**
 * Annotation that creates a clickable reference to another sheet
 * Used for detail bubbles, section markers, and other cross-references
 */
export interface SheetReferenceAnnotation {
  /** Annotation type identifier */
  type: 'sheet-reference'
  /** Target sheet number (e.g., "A-201", "S-101") */
  targetSheet: string
  /** Optional detail/section identifier on the target sheet */
  targetDetail?: string
  /** Optional coordinates to navigate to on the target sheet */
  targetCoordinates?: { x: number; y: number }
  /** Display label for the annotation */
  label: string
  /** Bounding box of the annotation on the source sheet */
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

// ============================================================
// DRAWING BOOKMARKS
// ============================================================

/**
 * Saved bookmark to a specific location in a drawing
 * Allows users to quickly return to important views
 */
export interface DrawingBookmark {
  /** Unique bookmark ID */
  id: string
  /** Project ID for filtering */
  projectId: string
  /** User who created the bookmark */
  userId: string
  /** Document ID being bookmarked */
  documentId: string
  /** Page number within the document */
  pageNumber: number
  /** Saved viewport state (pan and zoom) */
  viewport: {
    x: number
    y: number
    zoom: number
  }
  /** User-defined name for the bookmark */
  name: string
  /** Optional folder for organizing bookmarks */
  folder?: string
  /** Whether this bookmark is shared with other project members */
  shared: boolean
  /** Timestamp when bookmark was created */
  createdAt: string
  /** Timestamp when bookmark was last updated */
  updatedAt?: string
}

/**
 * Input for creating a new bookmark
 */
export interface CreateBookmarkInput {
  projectId: string
  documentId: string
  pageNumber: number
  viewport: {
    x: number
    y: number
    zoom: number
  }
  name: string
  folder?: string
  shared?: boolean
}

/**
 * Input for updating an existing bookmark
 */
export interface UpdateBookmarkInput {
  id: string
  name?: string
  folder?: string
  shared?: boolean
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

/**
 * Filter options for querying bookmarks
 */
export interface BookmarkFilters {
  /** Filter by project ID */
  projectId?: string
  /** Filter by document ID */
  documentId?: string
  /** Only show shared bookmarks */
  sharedOnly?: boolean
  /** Filter by folder name */
  folder?: string
  /** Search by bookmark name */
  searchQuery?: string
}

// ============================================================
// NAVIGATION STATE
// ============================================================

/**
 * Full navigation state including history, bookmarks, and current location
 */
export interface NavigationState {
  /** Current sheet being viewed */
  currentSheet: SheetReference | null
  /** Navigation history */
  history: NavigationHistory
  /** Whether navigation is in progress */
  isNavigating: boolean
  /** Any navigation error */
  error: string | null
}

/**
 * Navigation action types
 */
export type NavigationAction =
  | { type: 'NAVIGATE_TO'; payload: SheetReference }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
