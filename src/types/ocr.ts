// File: /src/types/ocr.ts
// TypeScript types for OCR (Optical Character Recognition) functionality

/**
 * OCR extraction status
 */
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Result of OCR text extraction
 */
export interface OcrResult {
  text: string
  confidence: number // 0-100
  words: OcrWord[]
  lines: OcrLine[]
  blocks: OcrBlock[]
  language: string
  extractedAt: number // timestamp
  processingTime: number // milliseconds
}

/**
 * Individual word detected by OCR
 */
export interface OcrWord {
  text: string
  confidence: number
  bbox: BoundingBox
}

/**
 * Line of text detected by OCR
 */
export interface OcrLine {
  text: string
  confidence: number
  words: OcrWord[]
  bbox: BoundingBox
}

/**
 * Block of text detected by OCR
 */
export interface OcrBlock {
  text: string
  confidence: number
  lines: OcrLine[]
  bbox: BoundingBox
}

/**
 * Bounding box coordinates for detected text
 */
export interface BoundingBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Progress update during OCR processing
 */
export interface OcrProgress {
  status: 'recognizing text' | 'loading language' | 'processing image'
  progress: number // 0-1
}

/**
 * Message sent to OCR worker
 */
export interface OcrWorkerMessage {
  type: 'extract'
  imageData: string // Base64 or blob URL
  language?: string
  id: string // Unique ID for tracking this request
}

/**
 * Response from OCR worker
 */
export type OcrWorkerResponse =
  | {
      type: 'progress'
      id: string
      progress: OcrProgress
    }
  | {
      type: 'success'
      id: string
      result: OcrResult
    }
  | {
      type: 'error'
      id: string
      error: string
    }

/**
 * OCR data stored with photo
 */
export interface PhotoOcrData {
  status: OcrStatus
  result?: OcrResult
  error?: string
  lastProcessedAt?: number
}

/**
 * Options for OCR extraction
 */
export interface OcrOptions {
  language?: string // Default: 'eng'
  preprocessImage?: boolean // Apply image preprocessing
  preserveWhitespace?: boolean
  rectangles?: boolean // Include bounding boxes
}
