// Document similarity calculation using TF-IDF and cosine similarity
// Compares documents within a project to find duplicates and related content

export type SimilarityType = 'duplicate' | 'revision' | 'related' | 'superseded'

export interface SimilarityResult {
  document_id: string
  similar_document_id: string
  text_similarity_score: number
  overall_similarity_score: number
  similarity_type: SimilarityType
  matching_keywords: string[]
}

export interface DocumentText {
  document_id: string
  text: string
  name: string
  drawing_number?: string
  revision?: string
}

// Stopwords to exclude from similarity calculation
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
  'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'we', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his', 'hers',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'any', 'into', 'over',
])

// Minimum similarity threshold to consider documents related
const SIMILARITY_THRESHOLD = 0.5

// Duplicate threshold (very high similarity)
const DUPLICATE_THRESHOLD = 0.9

// Revision threshold (same document number, different revision)
const REVISION_SIMILARITY_THRESHOLD = 0.7

/**
 * Calculate similarity between a document and all other documents in the project
 */
export function calculateDocumentSimilarity(
  sourceDoc: DocumentText,
  projectDocuments: DocumentText[]
): SimilarityResult[] {
  const results: SimilarityResult[] = []
  const sourceTokens = tokenize(sourceDoc.text)
  const sourceTfIdf = calculateTfIdf(sourceTokens)

  for (const targetDoc of projectDocuments) {
    // Skip self-comparison
    if (targetDoc.document_id === sourceDoc.document_id) {
      continue
    }

    const targetTokens = tokenize(targetDoc.text)
    const targetTfIdf = calculateTfIdf(targetTokens)

    // Calculate cosine similarity
    const textSimilarity = cosineSimilarity(sourceTfIdf, targetTfIdf)

    // Skip if below threshold
    if (textSimilarity < SIMILARITY_THRESHOLD) {
      continue
    }

    // Find matching keywords (top terms in common)
    const matchingKeywords = findMatchingKeywords(sourceTfIdf, targetTfIdf)

    // Determine similarity type
    const similarityType = determineSimilarityType(
      sourceDoc,
      targetDoc,
      textSimilarity
    )

    results.push({
      document_id: sourceDoc.document_id,
      similar_document_id: targetDoc.document_id,
      text_similarity_score: Math.round(textSimilarity * 10000) / 10000,
      overall_similarity_score: Math.round(textSimilarity * 10000) / 10000,
      similarity_type: similarityType,
      matching_keywords: matchingKeywords,
    })
  }

  // Sort by similarity score descending
  return results.sort((a, b) => b.overall_similarity_score - a.overall_similarity_score)
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  if (!text) return []

  return text
    .toLowerCase()
    // Remove special characters but keep alphanumeric
    .replace(/[^a-z0-9\s-]/g, ' ')
    // Split on whitespace
    .split(/\s+/)
    // Filter out stopwords and short words
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
}

/**
 * Calculate TF-IDF vector for a document
 */
function calculateTfIdf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  const totalTokens = tokens.length

  if (totalTokens === 0) {
    return tf
  }

  // Calculate term frequency
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }

  // Normalize by document length (TF)
  for (const [term, count] of tf) {
    tf.set(term, count / totalTokens)
  }

  // Note: In a full implementation, IDF would be calculated across the corpus
  // For simplicity, we're using TF only, which works well for document comparison

  return tf
}

/**
 * Calculate cosine similarity between two TF-IDF vectors
 */
function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  if (vec1.size === 0 || vec2.size === 0) {
    return 0
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  // Calculate dot product and norms
  for (const [term, weight1] of vec1) {
    norm1 += weight1 * weight1
    const weight2 = vec2.get(term)
    if (weight2 !== undefined) {
      dotProduct += weight1 * weight2
    }
  }

  for (const [_, weight2] of vec2) {
    norm2 += weight2 * weight2
  }

  // Avoid division by zero
  if (norm1 === 0 || norm2 === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

/**
 * Find matching keywords between two documents
 */
function findMatchingKeywords(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): string[] {
  const common: { term: string; score: number }[] = []

  for (const [term, weight1] of vec1) {
    const weight2 = vec2.get(term)
    if (weight2 !== undefined) {
      common.push({
        term,
        score: weight1 + weight2,
      })
    }
  }

  // Sort by combined score and take top 10
  return common
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.term)
}

/**
 * Determine the type of similarity between documents
 */
function determineSimilarityType(
  source: DocumentText,
  target: DocumentText,
  similarity: number
): SimilarityType {
  // Check for exact/near duplicate
  if (similarity >= DUPLICATE_THRESHOLD) {
    return 'duplicate'
  }

  // Check for revision (same drawing number, different revision)
  if (
    source.drawing_number &&
    target.drawing_number &&
    source.drawing_number === target.drawing_number
  ) {
    if (source.revision !== target.revision) {
      // Determine which is newer based on revision comparison
      if (isNewerRevision(source.revision, target.revision)) {
        return 'superseded' // target supersedes source
      }
      return 'revision'
    }
  }

  // Check for similar names (might be revisions)
  if (
    similarity >= REVISION_SIMILARITY_THRESHOLD &&
    areSimilarNames(source.name, target.name)
  ) {
    return 'revision'
  }

  // Default to related
  return 'related'
}

/**
 * Check if revision A is newer than revision B
 */
function isNewerRevision(revA?: string, revB?: string): boolean {
  if (!revA || !revB) return false

  // Try numeric comparison
  const numA = parseInt(revA, 10)
  const numB = parseInt(revB, 10)

  if (!isNaN(numA) && !isNaN(numB)) {
    return numB > numA
  }

  // Try alphabetic comparison (A, B, C, ...)
  return revB.localeCompare(revA) > 0
}

/**
 * Check if two document names are similar (possible revisions)
 */
function areSimilarNames(name1: string, name2: string): boolean {
  // Normalize names
  const normalize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[-_\s]+/g, '')
      .replace(/rev\.?\s*\w+/gi, '')
      .replace(/v\d+/gi, '')
      .replace(/\(\d+\)/g, '')

  const norm1 = normalize(name1)
  const norm2 = normalize(name2)

  // Check if normalized names are equal or one contains the other
  if (norm1 === norm2) return true
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true

  return false
}

/**
 * Batch calculate similarities for multiple documents
 * More efficient than calculating one at a time
 */
export function batchCalculateSimilarities(
  documents: DocumentText[]
): SimilarityResult[] {
  const allResults: SimilarityResult[] = []

  // Pre-calculate TF-IDF for all documents
  const documentVectors = new Map<string, Map<string, number>>()

  for (const doc of documents) {
    const tokens = tokenize(doc.text)
    documentVectors.set(doc.document_id, calculateTfIdf(tokens))
  }

  // Calculate pairwise similarities
  for (let i = 0; i < documents.length; i++) {
    const sourceDoc = documents[i]
    const sourceVector = documentVectors.get(sourceDoc.document_id)!

    for (let j = i + 1; j < documents.length; j++) {
      const targetDoc = documents[j]
      const targetVector = documentVectors.get(targetDoc.document_id)!

      const similarity = cosineSimilarity(sourceVector, targetVector)

      if (similarity >= SIMILARITY_THRESHOLD) {
        const matchingKeywords = findMatchingKeywords(sourceVector, targetVector)
        const similarityType = determineSimilarityType(
          sourceDoc,
          targetDoc,
          similarity
        )

        // Add both directions
        allResults.push({
          document_id: sourceDoc.document_id,
          similar_document_id: targetDoc.document_id,
          text_similarity_score: Math.round(similarity * 10000) / 10000,
          overall_similarity_score: Math.round(similarity * 10000) / 10000,
          similarity_type: similarityType,
          matching_keywords: matchingKeywords,
        })

        allResults.push({
          document_id: targetDoc.document_id,
          similar_document_id: sourceDoc.document_id,
          text_similarity_score: Math.round(similarity * 10000) / 10000,
          overall_similarity_score: Math.round(similarity * 10000) / 10000,
          similarity_type: similarityType,
          matching_keywords: matchingKeywords,
        })
      }
    }
  }

  return allResults
}
