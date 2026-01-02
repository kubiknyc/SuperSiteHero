// File: /src/features/documents/components/DocumentUpload.test.tsx
// Comprehensive tests for DocumentUpload component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DocumentUpload } from './DocumentUpload'
import * as fileUtils from '../utils/fileUtils'
import { documentsApi } from '@/lib/api/services/documents'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('../utils/fileUtils', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/api/services/documents', () => ({
  documentsApi: {
    findDocumentByName: vi.fn(),
    createDocumentVersion: vi.fn(),
  },
}))

vi.mock('../hooks/useDocumentsMutations', () => ({
  useCreateDocumentWithNotification: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('DocumentUpload', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const defaultProps = {
    projectId: 'project-123',
    folderId: null,
    onUploadSuccess: vi.fn(),
  }

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DocumentUpload {...defaultProps} {...props} />
      </QueryClientProvider>
    )
  }

  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File(['test content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  describe('Rendering', () => {
    it('should render the drop zone', () => {
      renderComponent()

      expect(screen.getByText('Drag and drop a file here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument()
    })

    it('should render hidden file input', () => {
      renderComponent()

      const fileInput = screen.getByLabelText('File input')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveClass('hidden')
    })

    it('should have accessible drop zone', () => {
      renderComponent()

      const dropZone = screen.getByRole('button', { name: /drop zone/i })
      expect(dropZone).toBeInTheDocument()
      expect(dropZone).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('File Selection', () => {
    it('should select file when using file input', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test-document.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      })
    })

    it('should display file size when file is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf') // 1 MB
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('1 MB')).toBeInTheDocument()
      })
    })

    it('should show document type selector when file is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Document Type')).toBeInTheDocument()
      })
    })

    it('should show upload and cancel buttons when file is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })
  })

  describe('Drag and Drop', () => {
    it('should highlight drop zone on drag over', () => {
      renderComponent()

      const dropZone = screen.getByRole('button', { name: /drop zone/i })

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      })

      expect(dropZone).toHaveClass('border-blue-500')
      expect(dropZone).toHaveClass('bg-blue-50')
    })

    it('should remove highlight on drag leave', () => {
      renderComponent()

      const dropZone = screen.getByRole('button', { name: /drop zone/i })

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      })

      fireEvent.dragLeave(dropZone, {
        dataTransfer: { files: [] },
      })

      expect(dropZone).not.toHaveClass('border-blue-500')
    })

    it('should accept dropped file', async () => {
      renderComponent()

      const file = createMockFile('dropped-file.pdf', 2048, 'application/pdf')
      const dropZone = screen.getByRole('button', { name: /drop zone/i })

      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'application/pdf', getAsFile: () => file }],
        types: ['Files'],
      }

      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(screen.getByText('dropped-file.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('Document Type Selection', () => {
    it('should allow changing document type', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Document Type')).toBeInTheDocument()
      })

      const select = screen.getByLabelText('Document Type')
      await user.selectOptions(select, 'drawing')

      expect(select).toHaveValue('drawing')
    })

    it('should have all document type options', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText('Document Type')).toBeInTheDocument()
      })

      const expectedOptions = [
        'General Document',
        'Drawing',
        'Specification',
        'Submittal',
        'Shop Drawing',
        'Scope of Work',
        'Photo',
        'Other',
      ]

      expectedOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument()
      })
    })
  })

  describe('Version Notes', () => {
    it('should render version notes textarea when file is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText(/version notes/i)).toBeInTheDocument()
      })
    })

    it('should allow entering version notes', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByLabelText(/version notes/i)).toBeInTheDocument()
      })

      const textarea = screen.getByLabelText(/version notes/i)
      await user.type(textarea, 'Updated drawings with client feedback')

      expect(textarea).toHaveValue('Updated drawings with client feedback')
    })
  })

  describe('Cancel Functionality', () => {
    it('should clear selected file when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
        expect(screen.getByText('Drag and drop a file here')).toBeInTheDocument()
      })
    })

    it('should clear file when remove button is clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      const removeButton = screen.getByLabelText('Remove selected file')
      await user.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
      })
    })
  })

  describe('Upload Flow - New Document', () => {
    it('should upload new document when no existing document found', async () => {
      const user = userEvent.setup()
      const onUploadSuccess = vi.fn()

      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(null)
      vi.mocked(fileUtils.uploadFile).mockResolvedValue({
        publicUrl: 'https://storage.example.com/uploaded-file.pdf',
        path: 'documents/uploaded-file.pdf',
      })

      // Mock the mutation hook
      const mockMutate = vi.fn((data, options) => {
        const mockDocument = {
          id: 'doc-new',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        options?.onSuccess?.(mockDocument)
      })

      vi.mock('../hooks/useDocumentsMutations', () => ({
        useCreateDocumentWithNotification: () => ({
          mutate: mockMutate,
          isPending: false,
        }),
      }))

      renderComponent({ onUploadSuccess })

      const file = createMockFile('new-document.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(documentsApi.findDocumentByName).toHaveBeenCalledWith(
          'project-123',
          'new-document',
          null
        )
        expect(fileUtils.uploadFile).toHaveBeenCalled()
      })
    })

    it('should show progress bar during upload', async () => {
      const user = userEvent.setup()

      // Make upload take time to show progress
      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(null)
      vi.mocked(fileUtils.uploadFile).mockImplementation(
        async (file, projectId, bucket, onProgress) => {
          // Simulate progress updates
          onProgress?.(25)
          onProgress?.(50)
          onProgress?.(75)
          onProgress?.(100)
          return {
            publicUrl: 'https://storage.example.com/file.pdf',
            path: 'documents/file.pdf',
          }
        }
      )

      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      // Progress bar should appear during upload
      await waitFor(() => {
        expect(screen.getByText(/uploading document/i)).toBeInTheDocument()
      })
    })
  })

  describe('Upload Flow - Version Creation', () => {
    it('should create new version when document with same name exists', async () => {
      const user = userEvent.setup()
      const onUploadSuccess = vi.fn()

      const existingDoc = {
        id: 'existing-doc',
        project_id: 'project-123',
        name: 'existing-document',
        version: '1.0',
      }

      const newVersion = {
        id: 'new-version',
        project_id: 'project-123',
        name: 'existing-document',
        version: '1.1',
      }

      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(existingDoc as any)
      vi.mocked(documentsApi.createDocumentVersion).mockResolvedValue(newVersion as any)
      vi.mocked(fileUtils.uploadFile).mockResolvedValue({
        publicUrl: 'https://storage.example.com/new-version.pdf',
        path: 'documents/new-version.pdf',
      })

      renderComponent({ onUploadSuccess })

      const file = createMockFile('existing-document.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(documentsApi.createDocumentVersion).toHaveBeenCalledWith(
          'existing-doc',
          'https://storage.example.com/new-version.pdf',
          expect.any(String)
        )
        expect(onUploadSuccess).toHaveBeenCalledWith(newVersion)
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('New version created')
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when upload fails', async () => {
      const user = userEvent.setup()

      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(null)
      vi.mocked(fileUtils.uploadFile).mockRejectedValue(new Error('Network error'))

      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('should disable buttons during upload', async () => {
      const user = userEvent.setup()

      // Make upload hang
      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(null)
      vi.mocked(fileUtils.uploadFile).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderComponent()

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      })
    })
  })

  describe('File Size Formatting', () => {
    it('should format bytes correctly', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 500, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('500 Bytes')).toBeInTheDocument()
      })
    })

    it('should format kilobytes correctly', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 2048, 'application/pdf') // 2 KB
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('2 KB')).toBeInTheDocument()
      })
    })

    it('should format megabytes correctly', async () => {
      const user = userEvent.setup()
      renderComponent()

      const file = createMockFile('test.pdf', 5 * 1024 * 1024, 'application/pdf') // 5 MB
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('5 MB')).toBeInTheDocument()
      })
    })
  })

  describe('Props Handling', () => {
    it('should use provided projectId', async () => {
      const user = userEvent.setup()

      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(null)
      vi.mocked(fileUtils.uploadFile).mockResolvedValue({
        publicUrl: 'https://storage.example.com/file.pdf',
        path: 'documents/file.pdf',
      })

      renderComponent({ projectId: 'custom-project-id' })

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(documentsApi.findDocumentByName).toHaveBeenCalledWith(
          'custom-project-id',
          'test',
          null
        )
      })
    })

    it('should use provided folderId', async () => {
      const user = userEvent.setup()

      vi.mocked(documentsApi.findDocumentByName).mockResolvedValue(null)
      vi.mocked(fileUtils.uploadFile).mockResolvedValue({
        publicUrl: 'https://storage.example.com/file.pdf',
        path: 'documents/file.pdf',
      })

      renderComponent({ folderId: 'folder-456' })

      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const fileInput = screen.getByLabelText('File input')

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(documentsApi.findDocumentByName).toHaveBeenCalledWith(
          'project-123',
          'test',
          'folder-456'
        )
      })
    })
  })
})
