// Cloud Vision API integration for OCR processing
// Uses Google Cloud Vision API for text extraction from documents

export interface CloudVisionOcrResult {
  text: string
  confidence: number
  words: CloudVisionWord[]
  blocks: CloudVisionBlock[]
  language: string
  pageCount: number
}

export interface CloudVisionWord {
  text: string
  confidence: number
  boundingBox: BoundingBox
}

export interface CloudVisionBlock {
  text: string
  blockType: string
  confidence: number
  boundingBox: BoundingBox
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CloudVisionError {
  code: string
  message: string
  details?: string
}

/**
 * Perform OCR on a document using Google Cloud Vision API
 */
export async function performOcr(
  fileUrl: string,
  apiKey: string
): Promise<CloudVisionOcrResult> {
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

  // Determine if URL is a GCS URI or HTTP URL
  const isGcsUri = fileUrl.startsWith('gs://')

  // Build the request body
  const requestBody = {
    requests: [
      {
        image: isGcsUri
          ? { source: { gcsImageUri: fileUrl } }
          : { source: { imageUri: fileUrl } },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
          { type: 'TEXT_DETECTION', maxResults: 50 },
        ],
        imageContext: {
          languageHints: ['en'],
        },
      },
    ],
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `Cloud Vision API error: ${errorData.error?.message || response.statusText}`
      )
    }

    const data = await response.json()
    return parseCloudVisionResponse(data)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error during OCR processing')
  }
}

/**
 * Perform OCR on a PDF document (requires base64 content)
 */
export async function performOcrOnPdf(
  pdfBase64: string,
  apiKey: string
): Promise<CloudVisionOcrResult> {
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

  const requestBody = {
    requests: [
      {
        image: {
          content: pdfBase64,
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
        imageContext: {
          languageHints: ['en'],
        },
      },
    ],
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `Cloud Vision API error: ${errorData.error?.message || response.statusText}`
      )
    }

    const data = await response.json()
    return parseCloudVisionResponse(data)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error during PDF OCR processing')
  }
}

/**
 * Parse Cloud Vision API response into structured format
 */
function parseCloudVisionResponse(data: any): CloudVisionOcrResult {
  const response = data.responses?.[0]

  if (!response) {
    return {
      text: '',
      confidence: 0,
      words: [],
      blocks: [],
      language: 'en',
      pageCount: 0,
    }
  }

  // Check for errors in response
  if (response.error) {
    throw new Error(`Cloud Vision error: ${response.error.message}`)
  }

  const fullTextAnnotation = response.fullTextAnnotation
  const textAnnotations = response.textAnnotations || []

  // Extract full text
  const text = fullTextAnnotation?.text || textAnnotations[0]?.description || ''

  // Calculate overall confidence from pages
  let totalConfidence = 0
  let pageCount = 0

  if (fullTextAnnotation?.pages) {
    pageCount = fullTextAnnotation.pages.length
    for (const page of fullTextAnnotation.pages) {
      if (page.confidence) {
        totalConfidence += page.confidence
      }
    }
  }

  const confidence = pageCount > 0 ? (totalConfidence / pageCount) * 100 : 85 // Default 85%

  // Detect language
  const language = textAnnotations[0]?.locale ||
    fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode ||
    'en'

  // Extract words with bounding boxes
  const words: CloudVisionWord[] = []
  const blocks: CloudVisionBlock[] = []

  if (fullTextAnnotation?.pages) {
    for (const page of fullTextAnnotation.pages) {
      for (const block of page.blocks || []) {
        const blockText: string[] = []

        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            const wordText = (word.symbols || [])
              .map((s: any) => s.text)
              .join('')

            blockText.push(wordText)

            if (word.boundingBox?.vertices) {
              words.push({
                text: wordText,
                confidence: (word.confidence || 0.85) * 100,
                boundingBox: extractBoundingBox(word.boundingBox.vertices),
              })
            }
          }
        }

        if (block.boundingBox?.vertices) {
          blocks.push({
            text: blockText.join(' '),
            blockType: block.blockType || 'TEXT',
            confidence: (block.confidence || 0.85) * 100,
            boundingBox: extractBoundingBox(block.boundingBox.vertices),
          })
        }
      }
    }
  }

  return {
    text,
    confidence,
    words,
    blocks,
    language,
    pageCount: pageCount || 1,
  }
}

/**
 * Extract bounding box from vertices
 */
function extractBoundingBox(vertices: any[]): BoundingBox {
  if (!vertices || vertices.length < 4) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const xs = vertices.map((v) => v.x || 0)
  const ys = vertices.map((v) => v.y || 0)

  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Fetch file content as base64 for API processing
 */
export async function fetchFileAsBase64(url: string): Promise<string> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
}
