import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePhotoUploadManager } from '../usePhotoUploadManager';
import * as photoUtils from '../../utils/photoUtils';

// Mock dependencies
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@/lib/supabase', () => ({
    supabase: {
        storage: {
            from: () => ({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
            }),
        },
    },
}));

vi.mock('../../utils/photoUtils', () => ({
    validateImageFile: vi.fn(),
    validateFileSize: vi.fn(),
    compressImage: vi.fn(),
    extractGPSData: vi.fn(),
    extractEXIFData: vi.fn(),
    generateThumbnail: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe('usePhotoUploadManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementations
        vi.mocked(photoUtils.validateImageFile).mockReturnValue(true);
        vi.mocked(photoUtils.validateFileSize).mockReturnValue(true);
        vi.mocked(photoUtils.compressImage).mockResolvedValue(new File([''], 'compressed.jpg', { type: 'image/jpeg' }));
        vi.mocked(photoUtils.extractGPSData).mockResolvedValue(null);
        vi.mocked(photoUtils.extractEXIFData).mockResolvedValue(null);
        vi.mocked(photoUtils.generateThumbnail).mockResolvedValue('data:image/jpeg;base64,thumbnail');

        mockUpload.mockResolvedValue({ data: { path: 'path/to/file' }, error: null });
        mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } });
    });

    it('should initialize with empty state', () => {
        const { result } = renderHook(() => usePhotoUploadManager());

        expect(result.current.uploadProgress).toEqual({});
        expect(result.current.isUploading).toBe(false);
    });

    describe('processPhoto', () => {
        it('should process a valid photo successfully', async () => {
            const { result } = renderHook(() => usePhotoUploadManager());
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const photoId = 'photo-1';

            const processed = await result.current.processPhoto(file, photoId);

            expect(processed.id).toBe(photoId);
            expect(processed.file).toBe(file);
            expect(processed.thumbnailDataUrl).toBeDefined();
            expect(result.current.uploadProgress[photoId].status).toBe('pending');
            expect(result.current.uploadProgress[photoId].progress).toBe(100);
        });

        it('should throw error for invalid file type', async () => {
            vi.mocked(photoUtils.validateImageFile).mockReturnValue(false);

            const { result } = renderHook(() => usePhotoUploadManager());
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            await expect(result.current.processPhoto(file, 'id')).rejects.toThrow('Invalid file type');
        });

        it('should handle processing errors', async () => {
            vi.mocked(photoUtils.compressImage).mockRejectedValue(new Error('Compression failed'));

            const { result } = renderHook(() => usePhotoUploadManager());
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const photoId = 'bad-photo';

            await expect(result.current.processPhoto(file, photoId)).rejects.toThrow('Compression failed');

            expect(result.current.uploadProgress[photoId].status).toBe('failed');
            expect(result.current.uploadProgress[photoId].error).toBe('Compression failed');
        });
    });

    describe('uploadPhoto', () => {
        it('should upload a photo successfully', async () => {
            const { result } = renderHook(() => usePhotoUploadManager());
            const processedPhoto = {
                id: 'p1',
                file: new File([''], 'orig.jpg'),
                originalFileName: 'orig.jpg',
            };

            let url;
            await act(async () => {
                url = await result.current.uploadPhoto(processedPhoto, 'proj1', '2023-01-01', 'rpt1');
            });

            expect(url).toBe('https://example.com/photo.jpg');
            expect(mockUpload).toHaveBeenCalled();
            expect(result.current.uploadProgress['p1'].status).toBe('uploaded');
        });

        it('should handle upload errors', async () => {
            mockUpload.mockResolvedValue({ data: null, error: { message: 'Network error' } });

            const { result } = renderHook(() => usePhotoUploadManager());
            const processedPhoto = {
                id: 'p2',
                file: new File([''], 'test.jpg'),
                originalFileName: 'test.jpg',
            };

            await expect(result.current.uploadPhoto(processedPhoto, 'proj1', 'date', 'rpt1')).rejects.toThrow('Upload failed: Network error');

            expect(result.current.uploadProgress['p2'].status).toBe('failed');
        });
    });
});
