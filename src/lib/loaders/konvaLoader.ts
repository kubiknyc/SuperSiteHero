/**
 * Konva.js Lazy Loader
 *
 * Dynamically imports Konva library only when needed for drawing/annotation features.
 * This reduces the main bundle size by ~750KB and improves initial page load performance.
 *
 * Usage:
 * ```typescript
 * import { loadKonva, loadReactKonva } from '@/lib/loaders/konvaLoader'
 *
 * const Konva = await loadKonva()
 * const { Stage, Layer } = await loadReactKonva()
 * ```
 */

type KonvaModule = typeof import('konva')
type ReactKonvaModule = typeof import('react-konva')

// Singleton caches for loaded modules
let konvaCache: KonvaModule | null = null
let reactKonvaCache: ReactKonvaModule | null = null

/**
 * Load the main Konva library
 * Cached after first load to avoid redundant imports
 */
export async function loadKonva(): Promise<KonvaModule> {
  if (!konvaCache) {
    konvaCache = await import('konva')
  }
  return konvaCache
}

/**
 * Load React-Konva bindings
 * Cached after first load to avoid redundant imports
 */
export async function loadReactKonva(): Promise<ReactKonvaModule> {
  if (!reactKonvaCache) {
    reactKonvaCache = await import('react-konva')
  }
  return reactKonvaCache
}

/**
 * Preload Konva modules (call when entering drawing sections)
 * Useful for preloading when user navigates to document viewing areas
 */
export async function preloadKonva(): Promise<void> {
  await Promise.all([loadKonva(), loadReactKonva()])
}

/**
 * Clear caches (useful for testing or memory management)
 */
export function clearKonvaCache(): void {
  konvaCache = null
  reactKonvaCache = null
}
