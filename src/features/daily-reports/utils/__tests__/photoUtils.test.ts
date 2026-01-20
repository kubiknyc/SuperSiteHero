import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateImageFile,
    validateFileSize,
    formatFileSize,
    formatGPSCoordinates,
    processPhoto,
    compressImage,
} from '../photoUtils';

// Mock dependencies
vi.mock('browser-image-compression', () => ({
    default: vi.fn((file) => Promise.resolve(file)),
}));

vi.mock('exifr', () => ({
    default: {
        gps: vi.fn(),
        parse: vi.fn(),
    },
}));

vi.mock('@/lib/utils/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe('photoUtils', () => {
    describe('validateImageFile', () => {
        it('should return true for valid image types', () => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
            validTypes.forEach((type) => {
                const file = new File([''], 'test.jpg', { type });
                expect(validateImageFile(file)).toBe(true);
            });
        });

        it('should return false for invalid file types', () => {
            const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4'];
            invalidTypes.forEach((type) => {
                const file = new File([''], 'test.pdf', { type });
                expect(validateImageFile(file)).toBe(false);
            });
        });
    });

    describe('validateFileSize', () => {
        it('should return true if file size is within limit', () => {
            const file = { size: 1024 * 1024 } as File; // 1MB
            expect(validateFileSize(file, 2)).toBe(true);
        });

        it('should return false if file size exceeds limit', () => {
            const file = { size: 3 * 1024 * 1024 } as File; // 3MB
            expect(validateFileSize(file, 2)).toBe(false);
        });
    });

    describe('formatFileSize', () => {
        it('should format bytes to human readable string', () => {
            expect(formatFileSize(0)).toBe('0 Bytes');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1024 * 1024)).toBe('1 MB');
            expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        });
    });

    describe('formatGPSCoordinates', () => {
        it('should format GPS coordinates correctly', () => {
            const gps = { latitude: 40.7128, longitude: -74.0060, altitude: 0 };
            expect(formatGPSCoordinates(gps)).toBe('40.7128° N, 74.006° W');
        });

        it('should handle negative latitude (South)', () => {
            const gps = { latitude: -33.8688, longitude: 151.2093, altitude: 0 };
            expect(formatGPSCoordinates(gps)).toBe('33.8688° S, 151.2093° E');
        });
    });

    describe('compressImage', () => {
        it('should call imageCompression with correct options', async () => {
            const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
            const result = await compressImage(file);

            expect(result).toBeInstanceOf(File);
            expect(result.name).toBe('test.jpg');
        });
    });
});
