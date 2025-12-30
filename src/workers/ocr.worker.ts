// File: /src/workers/ocr.worker.ts
// Web Worker for OCR text extraction using tesseract.js
// Runs OCR processing in background thread to avoid blocking UI

import { createWorker } from 'tesseract.js'
import type { OcrWorkerMessage, OcrWorkerResponse, OcrResult } from '@/types/ocr'

let worker: Awaited<ReturnType<typeof createWorker>> | null = null

/**
 * Initialize tesseract worker
 */
async function initializeWorker() {
  if (worker) {
    return worker
  }

  worker = await createWorker('eng', 1, {
    logger: (m) => {
      // Send progress updates to main thread
      if (m.status && m.progress !== undefined) {
        const response: OcrWorkerResponse = {
          type: 'progress',
          id: '', // Will be set by message handler
          progress: {
            status: m.status as 'recognizing text' | 'loading language' | 'processing image',
            progress: m.progress,
          },
        }
        self.postMessage(response)
      }
    },
  })

  return worker
}

/**
 * Preprocess image for better OCR results
 */
function preprocessImage(imageData: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        resolve(imageData)
        return
      }

      // Draw original image
      ctx.drawImage(img, 0, 0)

      // Get image data
      const pixels = ctx.getImageData(0, 0, img.width, img.height)
      const data = pixels.data

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // Grayscale conversion
        const gray = 0.299 * r + 0.587 * g + 0.114 * b

        // Increase contrast (simple threshold)
        const threshold = 128
        const value = gray > threshold ? 255 : 0

        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
      }

      // Put processed data back
      ctx.putImageData(pixels, 0, 0)

      // Convert to blob URL
      canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
        const url = URL.createObjectURL(blob)
        resolve(url)
      })
    }

    img.src = imageData
  })
}

/**
 * Extract text from image using OCR
 */
async function extractText(
  imageData: string,
  language: string = 'eng',
  preprocess: boolean = false
): Promise<OcrResult> {
  const startTime = Date.now()

  // Initialize worker if needed
  const tesseractWorker = await initializeWorker()

  // Preprocess image if requested
  const processedImage = preprocess ? await preprocessImage(imageData) : imageData

  // Perform OCR
  const result = await tesseractWorker.recognize(processedImage)

  // Clean up preprocessed image URL if created
  if (preprocess && processedImage !== imageData) {
    URL.revokeObjectURL(processedImage)
  }

  // Extract data from tesseract result
  const { data } = result

  // Type assertion for tesseract.js data which may have additional properties
  // not fully typed in the library's TypeScript definitions
  const typedData = data as {
    text: string
    confidence: number
    words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }>
    lines?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number }; words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> }>
    blocks?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number }; lines?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number }; words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> }> }>
  }

  // Build OCR result
  const ocrResult: OcrResult = {
    text: typedData.text.trim(),
    confidence: typedData.confidence,
    words: (typedData.words || []).map((word) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
    })),
    lines: (typedData.lines || []).map((line) => ({
      text: line.text,
      confidence: line.confidence,
      words: (line.words || []).map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox,
      })),
      bbox: line.bbox,
    })),
    blocks: (typedData.blocks || []).map((block) => ({
      text: block.text,
      confidence: block.confidence,
      lines: (block.lines || []).map((line) => ({
        text: line.text,
        confidence: line.confidence,
        words: (line.words || []).map((word) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox,
        })),
        bbox: line.bbox,
      })),
      bbox: block.bbox,
    })),
    language,
    extractedAt: Date.now(),
    processingTime: Date.now() - startTime,
  }

  return ocrResult
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event: MessageEvent<OcrWorkerMessage>) => {
  const { type, imageData, language = 'eng', id } = event.data

  if (type === 'extract') {
    try {
      const result = await extractText(imageData, language, true)

      const response: OcrWorkerResponse = {
        type: 'success',
        id,
        result,
      }

      self.postMessage(response)
    } catch (_error) {
      const response: OcrWorkerResponse = {
        type: 'error',
        id,
        error: _error instanceof Error ? _error.message : 'OCR extraction failed',
      }

      self.postMessage(response)
    }
  }
})

/**
 * Cleanup on worker termination
 */
self.addEventListener('close', async () => {
  if (worker) {
    await worker.terminate()
    worker = null
  }
})
