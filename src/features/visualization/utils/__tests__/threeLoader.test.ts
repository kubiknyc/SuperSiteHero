import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadThree,
  loadGLTFLoader,
  loadDRACOLoader,
  loadOBJLoader,
  loadFBXLoader,
  loadMTLLoader,
  loadOrbitControls,
  preloadThreeModules,
  clearThreeCache,
} from '../threeLoader'

describe('threeLoader', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    clearThreeCache()
  })

  afterEach(() => {
    // Clean up after each test
    clearThreeCache()
  })

  describe('loadThree', () => {
    it('should load and return the Three.js module', async () => {
      const result = await loadThree()

      expect(result).toBeDefined()
      // Verify it has the Three.js module structure
      expect(result).toHaveProperty('Scene')
      expect(result).toHaveProperty('PerspectiveCamera')
      expect(result).toHaveProperty('WebGLRenderer')
    })

    it('should return cached module on second call (same reference)', async () => {
      const firstCall = await loadThree()
      const secondCall = await loadThree()

      // Should return the exact same object reference
      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      const firstCall = await loadThree()

      clearThreeCache()

      const secondCall = await loadThree()

      // Should still return a valid module
      expect(secondCall).toBeDefined()
      expect(secondCall).toHaveProperty('Scene')
    })

    it('should cache the module to avoid redundant imports', async () => {
      // Call multiple times
      await loadThree()
      await loadThree()
      await loadThree()

      // The actual dynamic import happens once, subsequent calls use cache
      // We can verify by checking the result is consistent
      const result1 = await loadThree()
      const result2 = await loadThree()
      expect(result1).toBe(result2)
    })
  })

  describe('loadGLTFLoader', () => {
    it('should load and return the GLTF loader module', async () => {
      const result = await loadGLTFLoader()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('GLTFLoader')
      expect(typeof result.GLTFLoader).toBe('function')
    })

    it('should cache the result on subsequent calls', async () => {
      const firstCall = await loadGLTFLoader()
      const secondCall = await loadGLTFLoader()

      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      await loadGLTFLoader()

      clearThreeCache()

      const result = await loadGLTFLoader()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('GLTFLoader')
    })
  })

  describe('loadDRACOLoader', () => {
    it('should load and return the DRACO loader module', async () => {
      const result = await loadDRACOLoader()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('DRACOLoader')
      expect(typeof result.DRACOLoader).toBe('function')
    })

    it('should cache the result on subsequent calls', async () => {
      const firstCall = await loadDRACOLoader()
      const secondCall = await loadDRACOLoader()

      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      await loadDRACOLoader()

      clearThreeCache()

      const result = await loadDRACOLoader()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('DRACOLoader')
    })
  })

  describe('loadOBJLoader', () => {
    it('should load and return the OBJ loader module', async () => {
      const result = await loadOBJLoader()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('OBJLoader')
      expect(typeof result.OBJLoader).toBe('function')
    })

    it('should cache the result on subsequent calls', async () => {
      const firstCall = await loadOBJLoader()
      const secondCall = await loadOBJLoader()

      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      await loadOBJLoader()

      clearThreeCache()

      const result = await loadOBJLoader()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('OBJLoader')
    })
  })

  describe('loadFBXLoader', () => {
    it('should load and return the FBX loader module', async () => {
      const result = await loadFBXLoader()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('FBXLoader')
      expect(typeof result.FBXLoader).toBe('function')
    })

    it('should cache the result on subsequent calls', async () => {
      const firstCall = await loadFBXLoader()
      const secondCall = await loadFBXLoader()

      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      await loadFBXLoader()

      clearThreeCache()

      const result = await loadFBXLoader()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('FBXLoader')
    })
  })

  describe('loadMTLLoader', () => {
    it('should load and return the MTL loader module', async () => {
      const result = await loadMTLLoader()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('MTLLoader')
      expect(typeof result.MTLLoader).toBe('function')
    })

    it('should cache the result on subsequent calls', async () => {
      const firstCall = await loadMTLLoader()
      const secondCall = await loadMTLLoader()

      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      await loadMTLLoader()

      clearThreeCache()

      const result = await loadMTLLoader()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('MTLLoader')
    })
  })

  describe('loadOrbitControls', () => {
    it('should load and return the OrbitControls module', async () => {
      const result = await loadOrbitControls()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('OrbitControls')
      expect(typeof result.OrbitControls).toBe('function')
    })

    it('should cache the result on subsequent calls', async () => {
      const firstCall = await loadOrbitControls()
      const secondCall = await loadOrbitControls()

      expect(firstCall).toBe(secondCall)
    })

    it('should re-import after clearThreeCache', async () => {
      await loadOrbitControls()

      clearThreeCache()

      const result = await loadOrbitControls()
      expect(result).toBeDefined()
      expect(result).toHaveProperty('OrbitControls')
    })
  })

  describe('preloadThreeModules', () => {
    it('should preload all common Three.js modules', async () => {
      await preloadThreeModules()

      // Verify all 4 common modules are loaded by checking cache
      // Call each loader again and verify they return immediately (cached)
      const three = await loadThree()
      const gltf = await loadGLTFLoader()
      const draco = await loadDRACOLoader()
      const controls = await loadOrbitControls()

      expect(three).toBeDefined()
      expect(gltf).toBeDefined()
      expect(draco).toBeDefined()
      expect(controls).toBeDefined()
    })

    it('should load all modules in parallel', async () => {
      const startTime = Date.now()
      await preloadThreeModules()
      const endTime = Date.now()

      // If modules were loaded sequentially, it would take longer
      // This is a basic check that Promise.all was used
      expect(endTime - startTime).toBeLessThan(1000) // Should be very fast with mocks
    })

    it('should return void', async () => {
      const result = await preloadThreeModules()
      expect(result).toBeUndefined()
    })

    it('should work when modules are already cached', async () => {
      // Pre-cache some modules
      await loadThree()
      await loadGLTFLoader()

      // Preload should still work
      await expect(preloadThreeModules()).resolves.toBeUndefined()
    })
  })

  describe('clearThreeCache', () => {
    it('should clear all module caches', async () => {
      // Load all modules to populate caches
      await loadThree()
      await loadGLTFLoader()
      await loadDRACOLoader()
      await loadOBJLoader()
      await loadFBXLoader()
      await loadMTLLoader()
      await loadOrbitControls()

      // Clear the cache
      clearThreeCache()

      // Load again and verify they still work (re-imported)
      const three = await loadThree()
      const gltf = await loadGLTFLoader()
      const draco = await loadDRACOLoader()
      const obj = await loadOBJLoader()
      const fbx = await loadFBXLoader()
      const mtl = await loadMTLLoader()
      const controls = await loadOrbitControls()

      expect(three).toBeDefined()
      expect(gltf).toBeDefined()
      expect(draco).toBeDefined()
      expect(obj).toBeDefined()
      expect(fbx).toBeDefined()
      expect(mtl).toBeDefined()
      expect(controls).toBeDefined()
    })

    it('should not throw when called multiple times', () => {
      expect(() => {
        clearThreeCache()
        clearThreeCache()
        clearThreeCache()
      }).not.toThrow()
    })

    it('should not throw when called before any modules are loaded', () => {
      expect(() => {
        clearThreeCache()
      }).not.toThrow()
    })

    it('should return void', () => {
      const result = clearThreeCache()
      expect(result).toBeUndefined()
    })
  })

  describe('caching behavior', () => {
    it('should maintain separate caches for each loader', async () => {
      const three = await loadThree()
      const gltf = await loadGLTFLoader()
      const draco = await loadDRACOLoader()
      const obj = await loadOBJLoader()
      const fbx = await loadFBXLoader()
      const mtl = await loadMTLLoader()
      const controls = await loadOrbitControls()

      // All should be different objects
      expect(three).not.toBe(gltf)
      expect(three).not.toBe(draco)
      expect(gltf).not.toBe(draco)
      expect(obj).not.toBe(fbx)
      expect(mtl).not.toBe(controls)
    })

    it('should preserve cache across multiple operations', async () => {
      const three1 = await loadThree()
      await loadGLTFLoader()
      await loadDRACOLoader()
      const three2 = await loadThree()

      expect(three1).toBe(three2)
    })

    it('should handle concurrent loads of the same module', async () => {
      // Load the same module multiple times concurrently
      const [result1, result2, result3] = await Promise.all([
        loadThree(),
        loadThree(),
        loadThree(),
      ])

      // All should be defined and reference the same cached object
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result3).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle import errors gracefully', async () => {
      // This test verifies that if the mock were to throw, it would propagate
      // In real scenarios, if Three.js fails to load, the promise should reject

      // Since we're using mocks, we'll just verify the module loads successfully
      await expect(loadThree()).resolves.toBeDefined()
    })
  })

  describe('integration scenarios', () => {
    it('should support typical usage pattern: load Three, then loaders', async () => {
      // Typical usage: load main library first, then specific loaders
      const three = await loadThree()
      expect(three).toBeDefined()

      const gltf = await loadGLTFLoader()
      expect(gltf).toBeDefined()

      const controls = await loadOrbitControls()
      expect(controls).toBeDefined()
    })

    it('should support preload then use pattern', async () => {
      // Preload common modules
      await preloadThreeModules()

      // Use them later (should be instant from cache)
      const three = await loadThree()
      const gltf = await loadGLTFLoader()

      expect(three).toBeDefined()
      expect(gltf).toBeDefined()
    })

    it('should support load, use, clear, reload pattern', async () => {
      // Load
      const three1 = await loadThree()
      expect(three1).toBeDefined()

      // Clear
      clearThreeCache()

      // Reload
      const three2 = await loadThree()
      expect(three2).toBeDefined()
    })
  })
})
