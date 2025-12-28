// File: /src/features/checklists/utils/ocrUtils.ts
// Utilities for managing OCR text extraction from photos

import type {
  OcrResult,
  OcrProgress,
  OcrWorkerMessage,
  OcrWorkerResponse,
  OcrOptions,
} from '@/types/ocr'

// Import worker as module (Vite syntax)
import OcrWorker from '@/workers/ocr.worker?worker'
import { logger } from '@/lib/utils/logger'

/**
 * Singleton OCR worker instance
 */
let ocrWorker: Worker | null = null

/**
 * Pending OCR requests
 */
const pendingRequests = new Map<
  string,
  {
    resolve: (result: OcrResult) => void
    reject: (error: Error) => void
    onProgress?: (progress: OcrProgress) => void
  }
>()

/**
 * Get or create OCR worker instance
 */
function getWorker(): Worker {
  if (!ocrWorker) {
    ocrWorker = new OcrWorker()

    // Handle messages from worker
    ocrWorker.addEventListener('message', (event: MessageEvent<OcrWorkerResponse>) => {
      const response = event.data

      if (response.type === 'progress') {
        const request = pendingRequests.get(response.id)
        if (request && request.onProgress) {
          request.onProgress(response.progress)
        }
      } else if (response.type === 'success') {
        const request = pendingRequests.get(response.id)
        if (request) {
          request.resolve(response.result)
          pendingRequests.delete(response.id)
        }
      } else if (response.type === 'error') {
        const request = pendingRequests.get(response.id)
        if (request) {
          request.reject(new Error(response.error))
          pendingRequests.delete(response.id)
        }
      }
    })

    // Handle worker errors
    ocrWorker.addEventListener('error', (error) => {
      logger.error('OCR worker error:', error)
      // Reject all pending requests
      pendingRequests.forEach((request) => {
        request.reject(new Error('OCR worker crashed'))
      })
      pendingRequests.clear()
      ocrWorker = null
    })
  }

  return ocrWorker
}

/**
 * Convert File or Blob to base64 data URL
 */
async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Extract text from an image file using OCR
 */
export async function extractTextFromImage(
  file: File | Blob,
  options: OcrOptions = {},
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const worker = getWorker()
  const id = `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Convert file to data URL
  const imageData = await fileToDataUrl(file)

  // Create promise for this request
  const resultPromise = new Promise<OcrResult>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject, onProgress })
  })

  // Send message to worker
  const message: OcrWorkerMessage = {
    type: 'extract',
    imageData,
    language: options.language || 'eng',
    id,
  }

  worker.postMessage(message)

  return resultPromise
}

/**
 * Extract text from multiple images in batch
 */
export async function extractTextBatch(
  files: (File | Blob)[],
  options: OcrOptions = {},
  onBatchProgress?: (completed: number, total: number) => void
): Promise<OcrResult[]> {
  const results: OcrResult[] = []
  let completed = 0

  for (const file of files) {
    try {
      const result = await extractTextFromImage(file, options)
      results.push(result)
      completed++
      onBatchProgress?.(completed, files.length)
    } catch (_error) {
      logger.error('Failed to extract text from image:', _error)
      // Continue with other images
      completed++
      onBatchProgress?.(completed, files.length)
    }
  }

  return results
}

/**
 * Extract text from image URL
 */
export async function extractTextFromUrl(
  url: string,
  options: OcrOptions = {},
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  // Fetch image as blob
  const response = await fetch(url)
  const blob = await response.blob()

  return extractTextFromImage(blob, options, onProgress)
}

/**
 * Format OCR confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence)}%`
}

/**
 * Check if OCR result has low confidence
 */
export function hasLowConfidence(result: OcrResult, threshold: number = 70): boolean {
  return result.confidence < threshold
}

/**
 * Get words with low confidence from OCR result
 */
export function getLowConfidenceWords(result: OcrResult, threshold: number = 70) {
  return result.words.filter((word) => word.confidence < threshold)
}

/**
 * Export OCR result as plain text
 */
export function exportAsText(result: OcrResult): string {
  return result.text
}

/**
 * Export OCR result as JSON
 */
export function exportAsJson(result: OcrResult): string {
  return JSON.stringify(result, null, 2)
}

/**
 * Download OCR result as text file
 */
export function downloadAsTextFile(result: OcrResult, filename: string = 'ocr-result.txt'): void {
  const text = exportAsText(result)
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

/**
 * Download OCR result as JSON file
 */
export function downloadAsJsonFile(
  result: OcrResult,
  filename: string = 'ocr-result.json'
): void {
  const json = exportAsJson(result)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

/**
 * Copy OCR result text to clipboard
 */
export async function copyToClipboard(result: OcrResult): Promise<void> {
  const text = exportAsText(result)
  await navigator.clipboard.writeText(text)
}

/**
 * Terminate OCR worker
 */
export function terminateWorker(): void {
  if (ocrWorker) {
    ocrWorker.terminate()
    ocrWorker = null
    pendingRequests.clear()
  }
}

/**
 * Check if browser supports OCR (Web Workers + FileReader)
 */
export function supportsOcr(): boolean {
  return typeof Worker !== 'undefined' && typeof FileReader !== 'undefined'
}
