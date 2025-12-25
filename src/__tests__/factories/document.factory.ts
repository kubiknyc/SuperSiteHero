/**
 * Document Factory
 * Creates mock document data for testing
 */

import { faker } from '@faker-js/faker';

// Document status types
export type DocumentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'superseded' | 'archived';

// Document type
export type DocumentType =
  | 'drawing'
  | 'specification'
  | 'submittal'
  | 'rfi'
  | 'change_order'
  | 'contract'
  | 'permit'
  | 'inspection_report'
  | 'safety_plan'
  | 'schedule'
  | 'photo'
  | 'correspondence'
  | 'meeting_minutes'
  | 'daily_report'
  | 'other';

// Document category
export type DocumentCategory =
  | 'architectural'
  | 'structural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'civil'
  | 'landscape'
  | 'general'
  | 'specifications'
  | 'administrative';

// Document interface
export interface MockDocument {
  id: string;
  project_id: string;
  company_id: string;

  // File information
  name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  thumbnail_url?: string;

  // Document metadata
  document_type: DocumentType;
  category?: DocumentCategory;
  description?: string;
  tags?: string[];

  // Version control
  version: number;
  version_label?: string;
  parent_document_id?: string;
  is_latest_version: boolean;

  // Status and workflow
  status: DocumentStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;

  // Relationships
  folder_id?: string;
  linked_to_type?: string;
  linked_to_id?: string;

  // Access control
  is_public: boolean;
  shared_with_users?: string[];
  shared_with_companies?: string[];

  // Metadata
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Document folder interface
export interface MockDocumentFolder {
  id: string;
  project_id: string;
  company_id: string;
  name: string;
  description?: string;
  parent_folder_id?: string;
  path: string;
  document_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Document version interface
export interface MockDocumentVersion {
  id: string;
  document_id: string;
  version: number;
  version_label?: string;
  file_url: string;
  file_size: number;
  changes_description?: string;
  uploaded_by: string;
  created_at: string;
}

// Drawing interface (specialized document)
export interface MockDrawing {
  id: string;
  project_id: string;
  company_id: string;

  // Drawing identification
  drawing_number: string;
  title: string;
  discipline: DocumentCategory;
  sheet_name?: string;

  // File information
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  file_type: string;

  // Version control
  revision: string;
  revision_date: string;
  is_current: boolean;
  previous_revision_id?: string;

  // Status
  status: DocumentStatus;

  // Drawing set
  drawing_set_id?: string;
  sheet_number?: number;
  total_sheets?: number;

  // Metadata
  scale?: string;
  paper_size?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Drawing set interface
export interface MockDrawingSet {
  id: string;
  project_id: string;
  company_id: string;
  name: string;
  description?: string;
  issue_date: string;
  revision: string;
  is_current: boolean;
  sheet_count: number;
  disciplines: DocumentCategory[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Factory options
export interface DocumentFactoryOptions {
  id?: string;
  project_id?: string;
  company_id?: string;
  name?: string;
  document_type?: DocumentType;
  category?: DocumentCategory;
  status?: DocumentStatus;
  version?: number;
  uploaded_by?: string;
  folder_id?: string;
}

export interface DrawingFactoryOptions {
  id?: string;
  project_id?: string;
  company_id?: string;
  drawing_number?: string;
  title?: string;
  discipline?: DocumentCategory;
  revision?: string;
  status?: DocumentStatus;
  drawing_set_id?: string;
  created_by?: string;
}

export interface FolderFactoryOptions {
  id?: string;
  project_id?: string;
  company_id?: string;
  name?: string;
  parent_folder_id?: string;
  created_by?: string;
}

// File types and their MIME types
const FILE_TYPES: Record<string, { extension: string; mimeType: string }> = {
  pdf: { extension: 'pdf', mimeType: 'application/pdf' },
  dwg: { extension: 'dwg', mimeType: 'application/acad' },
  dxf: { extension: 'dxf', mimeType: 'application/dxf' },
  doc: { extension: 'doc', mimeType: 'application/msword' },
  docx: { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xls: { extension: 'xls', mimeType: 'application/vnd.ms-excel' },
  xlsx: { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  jpg: { extension: 'jpg', mimeType: 'image/jpeg' },
  png: { extension: 'png', mimeType: 'image/png' },
  tiff: { extension: 'tiff', mimeType: 'image/tiff' },
};

// Drawing disciplines with prefixes
const DISCIPLINE_PREFIXES: Record<DocumentCategory, string> = {
  architectural: 'A',
  structural: 'S',
  mechanical: 'M',
  electrical: 'E',
  plumbing: 'P',
  civil: 'C',
  landscape: 'L',
  general: 'G',
  specifications: 'SPEC',
  administrative: 'ADM',
};

/**
 * Create a mock document
 */
export function createMockDocument(options: DocumentFactoryOptions = {}): MockDocument {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const fileType = faker.helpers.arrayElement(Object.keys(FILE_TYPES));
  const fileInfo = FILE_TYPES[fileType];
  const documentType = options.document_type ?? faker.helpers.arrayElement([
    'drawing', 'specification', 'submittal', 'rfi', 'change_order',
    'contract', 'permit', 'inspection_report', 'safety_plan', 'schedule',
    'photo', 'correspondence', 'meeting_minutes', 'daily_report', 'other'
  ] as DocumentType[]);

  const fileName = `${faker.lorem.words(3).replace(/\s+/g, '_')}.${fileInfo.extension}`;

  return {
    id,
    project_id: options.project_id ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),

    // File information
    name: options.name ?? faker.lorem.words(4),
    file_name: fileName,
    file_url: `https://storage.example.com/documents/${id}/${fileName}`,
    file_size: faker.number.int({ min: 10000, max: 50000000 }),
    file_type: fileInfo.extension,
    mime_type: fileInfo.mimeType,
    thumbnail_url: fileType === 'pdf' || fileType === 'jpg' || fileType === 'png'
      ? `https://storage.example.com/thumbnails/${id}.jpg`
      : undefined,

    // Document metadata
    document_type: documentType,
    category: options.category ?? faker.helpers.arrayElement([
      'architectural', 'structural', 'mechanical', 'electrical',
      'plumbing', 'civil', 'general', 'administrative'
    ] as DocumentCategory[]),
    description: faker.lorem.paragraph(),
    tags: faker.helpers.arrayElements([
      'structural', 'floor_plan', 'elevation', 'detail', 'specification',
      'submittal', 'approved', 'revised', 'for_review', 'as_built'
    ], { min: 1, max: 4 }),

    // Version control
    version: options.version ?? 1,
    version_label: `v${options.version ?? 1}.0`,
    parent_document_id: undefined,
    is_latest_version: true,

    // Status and workflow
    status: options.status ?? faker.helpers.arrayElement([
      'draft', 'pending_review', 'approved', 'rejected', 'superseded', 'archived'
    ] as DocumentStatus[]),
    reviewed_by: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    reviewed_at: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
    approved_by: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    approved_at: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
    rejection_reason: undefined,

    // Relationships
    folder_id: options.folder_id ?? faker.string.uuid(),
    linked_to_type: undefined,
    linked_to_id: undefined,

    // Access control
    is_public: faker.datatype.boolean({ probability: 0.1 }),
    shared_with_users: [],
    shared_with_companies: [],

    // Metadata
    uploaded_by: options.uploaded_by ?? faker.string.uuid(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create a mock document folder
 */
export function createMockDocumentFolder(options: FolderFactoryOptions = {}): MockDocumentFolder {
  const id = options.id ?? faker.string.uuid();
  const name = options.name ?? faker.helpers.arrayElement([
    'Drawings', 'Specifications', 'Submittals', 'RFIs', 'Change Orders',
    'Contracts', 'Permits', 'Reports', 'Photos', 'Correspondence',
    'Meeting Minutes', 'Safety Plans', 'Schedules', 'As-Builts'
  ]);
  const createdAt = faker.date.past().toISOString();

  return {
    id,
    project_id: options.project_id ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),
    name,
    description: faker.lorem.sentence(),
    parent_folder_id: options.parent_folder_id,
    path: options.parent_folder_id ? `/${options.parent_folder_id}/${id}` : `/${id}`,
    document_count: faker.number.int({ min: 0, max: 100 }),
    created_by: options.created_by ?? faker.string.uuid(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create a mock document version
 */
export function createMockDocumentVersion(options: {
  id?: string;
  document_id?: string;
  version?: number;
  uploaded_by?: string;
} = {}): MockDocumentVersion {
  const version = options.version ?? faker.number.int({ min: 1, max: 10 });

  return {
    id: options.id ?? faker.string.uuid(),
    document_id: options.document_id ?? faker.string.uuid(),
    version,
    version_label: `v${version}.0`,
    file_url: `https://storage.example.com/documents/${faker.string.uuid()}/file.pdf`,
    file_size: faker.number.int({ min: 10000, max: 50000000 }),
    changes_description: version > 1 ? faker.lorem.sentence() : 'Initial version',
    uploaded_by: options.uploaded_by ?? faker.string.uuid(),
    created_at: faker.date.past().toISOString(),
  };
}

/**
 * Create a mock drawing
 */
export function createMockDrawing(options: DrawingFactoryOptions = {}): MockDrawing {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();
  const discipline = options.discipline ?? faker.helpers.arrayElement([
    'architectural', 'structural', 'mechanical', 'electrical', 'plumbing', 'civil'
  ] as DocumentCategory[]);

  const prefix = DISCIPLINE_PREFIXES[discipline] || 'G';
  const sheetNumber = faker.number.int({ min: 1, max: 99 });
  const drawingNumber = options.drawing_number ?? `${prefix}${sheetNumber.toString().padStart(2, '0')}`;

  return {
    id,
    project_id: options.project_id ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),

    // Drawing identification
    drawing_number: drawingNumber,
    title: options.title ?? faker.helpers.arrayElement([
      'Floor Plan', 'Reflected Ceiling Plan', 'Elevations', 'Sections',
      'Details', 'Site Plan', 'Foundation Plan', 'Framing Plan',
      'Mechanical Plan', 'Electrical Plan', 'Plumbing Plan'
    ]),
    discipline,
    sheet_name: `Sheet ${drawingNumber}`,

    // File information
    file_url: `https://storage.example.com/drawings/${id}/drawing.pdf`,
    thumbnail_url: `https://storage.example.com/drawings/${id}/thumbnail.jpg`,
    file_size: faker.number.int({ min: 500000, max: 20000000 }),
    file_type: 'pdf',

    // Version control
    revision: options.revision ?? faker.helpers.arrayElement(['A', 'B', 'C', 'D', '0', '1', '2']),
    revision_date: faker.date.recent().toISOString().split('T')[0],
    is_current: true,
    previous_revision_id: undefined,

    // Status
    status: options.status ?? faker.helpers.arrayElement([
      'draft', 'pending_review', 'approved', 'superseded'
    ] as DocumentStatus[]),

    // Drawing set
    drawing_set_id: options.drawing_set_id,
    sheet_number: sheetNumber,
    total_sheets: faker.number.int({ min: sheetNumber, max: 100 }),

    // Metadata
    scale: faker.helpers.arrayElement(['1/8" = 1\'-0"', '1/4" = 1\'-0"', '1" = 20\'-0"', 'NTS']),
    paper_size: faker.helpers.arrayElement(['ARCH D', 'ARCH E', 'ANSI D', 'ANSI E']),
    created_by: options.created_by ?? faker.string.uuid(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create a mock drawing set
 */
export function createMockDrawingSet(options: {
  id?: string;
  project_id?: string;
  company_id?: string;
  name?: string;
  revision?: string;
  created_by?: string;
} = {}): MockDrawingSet {
  const id = options.id ?? faker.string.uuid();
  const createdAt = faker.date.past().toISOString();

  return {
    id,
    project_id: options.project_id ?? faker.string.uuid(),
    company_id: options.company_id ?? faker.string.uuid(),
    name: options.name ?? faker.helpers.arrayElement([
      'Construction Documents', 'Bid Set', 'Permit Set', 'As-Built Set',
      'Addendum 1', 'Bulletin 1', 'Design Development'
    ]),
    description: faker.lorem.sentence(),
    issue_date: faker.date.recent().toISOString().split('T')[0],
    revision: options.revision ?? faker.helpers.arrayElement(['A', 'B', 'C', '0', '1']),
    is_current: true,
    sheet_count: faker.number.int({ min: 10, max: 200 }),
    disciplines: faker.helpers.arrayElements([
      'architectural', 'structural', 'mechanical', 'electrical', 'plumbing', 'civil'
    ] as DocumentCategory[], { min: 2, max: 6 }),
    created_by: options.created_by ?? faker.string.uuid(),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
  };
}

/**
 * Create an approved document
 */
export function createMockApprovedDocument(options: Omit<DocumentFactoryOptions, 'status'> = {}): MockDocument {
  const doc = createMockDocument({ ...options, status: 'approved' });
  return {
    ...doc,
    approved_by: faker.string.uuid(),
    approved_at: faker.date.recent().toISOString(),
  };
}

/**
 * Create a rejected document
 */
export function createMockRejectedDocument(options: Omit<DocumentFactoryOptions, 'status'> = {}): MockDocument {
  const doc = createMockDocument({ ...options, status: 'rejected' });
  return {
    ...doc,
    reviewed_by: faker.string.uuid(),
    reviewed_at: faker.date.recent().toISOString(),
    rejection_reason: faker.lorem.sentence(),
  };
}

/**
 * Create multiple mock documents
 */
export function createMockDocuments(count: number, options: DocumentFactoryOptions = {}): MockDocument[] {
  return Array.from({ length: count }, () => createMockDocument(options));
}

/**
 * Create multiple mock drawings
 */
export function createMockDrawings(count: number, options: DrawingFactoryOptions = {}): MockDrawing[] {
  return Array.from({ length: count }, (_, index) =>
    createMockDrawing({
      ...options,
      drawing_number: options.drawing_number ?? `${DISCIPLINE_PREFIXES[options.discipline ?? 'architectural']}${(index + 1).toString().padStart(2, '0')}`,
    })
  );
}

/**
 * Create a folder structure with documents
 */
export function createMockFolderWithDocuments(
  folderOptions: FolderFactoryOptions = {},
  documentCount: number = 5
): {
  folder: MockDocumentFolder;
  documents: MockDocument[];
} {
  const folder = createMockDocumentFolder(folderOptions);
  const documents = createMockDocuments(documentCount, {
    project_id: folder.project_id,
    company_id: folder.company_id,
    folder_id: folder.id,
  });

  return { folder, documents };
}

/**
 * Create a drawing set with drawings
 */
export function createMockDrawingSetWithDrawings(
  setOptions: Parameters<typeof createMockDrawingSet>[0] = {},
  drawingCount: number = 10
): {
  set: MockDrawingSet;
  drawings: MockDrawing[];
} {
  const set = createMockDrawingSet(setOptions);
  const drawings = createMockDrawings(drawingCount, {
    project_id: set.project_id,
    company_id: set.company_id,
    drawing_set_id: set.id,
  });

  return { set, drawings };
}

// Default test documents for consistent testing
export const TEST_DOCUMENTS = {
  drawing: createMockDocument({
    id: 'test-doc-drawing',
    project_id: 'test-project-active',
    company_id: 'test-company-id',
    name: 'Test Floor Plan',
    document_type: 'drawing',
    status: 'approved',
  }),
  submittal: createMockDocument({
    id: 'test-doc-submittal',
    project_id: 'test-project-active',
    company_id: 'test-company-id',
    name: 'Test Submittal',
    document_type: 'submittal',
    status: 'pending_review',
  }),
  specification: createMockDocument({
    id: 'test-doc-spec',
    project_id: 'test-project-active',
    company_id: 'test-company-id',
    name: 'Test Specification',
    document_type: 'specification',
    status: 'approved',
  }),
};

export const TEST_DRAWINGS = {
  architectural: createMockDrawing({
    id: 'test-drawing-arch',
    project_id: 'test-project-active',
    company_id: 'test-company-id',
    drawing_number: 'A01',
    title: 'Floor Plan - Level 1',
    discipline: 'architectural',
    status: 'approved',
  }),
  structural: createMockDrawing({
    id: 'test-drawing-struct',
    project_id: 'test-project-active',
    company_id: 'test-company-id',
    drawing_number: 'S01',
    title: 'Foundation Plan',
    discipline: 'structural',
    status: 'approved',
  }),
};
