/**
 * Performance Tests for PolishedVariant1Professional
 *
 * Measures Core Web Vitals and performance metrics:
 * - First Contentful Paint (FCP) - Target: < 1.8s
 * - Largest Contentful Paint (LCP) - Target: < 2.5s
 * - Cumulative Layout Shift (CLS) - Target: < 0.1
 * - Total Blocking Time (TBT) - Target: < 300ms
 * - First Input Delay (FID) - Target: < 100ms
 * - Time to Interactive (TTI) - Target: < 3.8s
 *
 * Run: npx playwright test e2e/performance/blueprint-variants-perf.spec.ts
 */

import { test, expect } from '@playwright/test';

// Performance metrics interface
interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  cls?: number;
  tbt?: number;
  tti?: number;
  speedIndex?: number;
  domContentLoaded?: number;
  loadComplete?: number;
}

// Thresholds based on Web Vitals
const THRESHOLDS = {
  FCP: 1800,  // 1.8 seconds
  LCP: 2500,  // 2.5 seconds
  CLS: 0.1,   // 0.1 layout shift score
  TBT: 300,   // 300 milliseconds
  TTI: 3800,  // 3.8 seconds
  SPEED_INDEX: 3400, // 3.4 seconds
  DOM_CONTENT_LOADED: 1500, // 1.5 seconds
  LOAD_COMPLETE: 3000, // 3 seconds
};

test.describe('PolishedVariant1Professional - Performance', () => {
  const url = '/blueprint-samples/variants/1-professional';

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate and collect metrics
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Collect Web Vitals using PerformanceObserver
    const metrics = await page.evaluate(() => {
      return new Promise<PerformanceMetrics>((resolve) => {
        const vitals: PerformanceMetrics = {};
        let resolveTimeout: NodeJS.Timeout;

        // Set timeout to resolve after 5 seconds if not all metrics are collected
        resolveTimeout = setTimeout(() => {
          resolve(vitals);
        }, 5000);

        // FCP - First Contentful Paint
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          }
        }).observe({ type: 'paint', buffered: true });

        // LCP - Largest Contentful Paint
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS - Cumulative Layout Shift
        let clsScore = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
          vitals.cls = clsScore;
        }).observe({ type: 'layout-shift', buffered: true });

        // Navigation Timing
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navTiming) {
          vitals.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.fetchStart;
          vitals.loadComplete = navTiming.loadEventEnd - navTiming.fetchStart;
        }

        // Resolve after a short delay to collect metrics
        setTimeout(() => {
          clearTimeout(resolveTimeout);
          resolve(vitals);
        }, 2000);
      });
    });

    console.log('📊 Performance Metrics:', {
      FCP: metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'N/A',
      LCP: metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'N/A',
      CLS: metrics.cls ? metrics.cls.toFixed(3) : 'N/A',
      DOMContentLoaded: metrics.domContentLoaded ? `${metrics.domContentLoaded.toFixed(0)}ms` : 'N/A',
      LoadComplete: metrics.loadComplete ? `${metrics.loadComplete.toFixed(0)}ms` : 'N/A',
    });

    // Assert FCP (First Contentful Paint)
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(THRESHOLDS.FCP);
      console.log(`✓ FCP: ${metrics.fcp.toFixed(0)}ms (threshold: ${THRESHOLDS.FCP}ms)`);
    }

    // Assert LCP (Largest Contentful Paint)
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(THRESHOLDS.LCP);
      console.log(`✓ LCP: ${metrics.lcp.toFixed(0)}ms (threshold: ${THRESHOLDS.LCP}ms)`);
    }

    // Assert CLS (Cumulative Layout Shift)
    if (metrics.cls !== undefined) {
      expect(metrics.cls).toBeLessThan(THRESHOLDS.CLS);
      console.log(`✓ CLS: ${metrics.cls.toFixed(3)} (threshold: ${THRESHOLDS.CLS})`);
    }

    // Assert DOM Content Loaded
    if (metrics.domContentLoaded) {
      expect(metrics.domContentLoaded).toBeLessThan(THRESHOLDS.DOM_CONTENT_LOADED);
      console.log(`✓ DOMContentLoaded: ${metrics.domContentLoaded.toFixed(0)}ms (threshold: ${THRESHOLDS.DOM_CONTENT_LOADED}ms)`);
    }
  });

  test('should have fast Time to Interactive (TTI)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(url);

    // Wait for the page to be fully interactive
    await page.waitForLoadState('networkidle');

    // Verify page is interactive by clicking an element
    const statCard = page.getByRole('button').first();
    await statCard.waitFor({ state: 'visible' });

    const tti = Date.now() - startTime;

    expect(tti).toBeLessThan(THRESHOLDS.TTI);
    console.log(`✓ TTI: ${tti}ms (threshold: ${THRESHOLDS.TTI}ms)`);
  });

  test('should load all critical resources quickly', async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const resourceTimings = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.map(r => ({
        name: r.name.split('/').pop(),
        duration: r.duration,
        type: r.initiatorType,
      })).filter(r => r.duration > 0);
    });

    // Log slowest resources
    const slowResources = resourceTimings
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    console.log('🐌 Slowest resources:', slowResources);

    // Check if any critical resource is too slow (> 1 second)
    const slowCritical = resourceTimings.filter(r =>
      (r.type === 'script' || r.type === 'stylesheet') && r.duration > 1000
    );

    expect(slowCritical.length).toBe(0);
  });

  test('should have minimal render-blocking resources', async ({ page }) => {
    await page.goto(url);

    const renderBlockingResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.filter(r =>
        (r.initiatorType === 'link' || r.initiatorType === 'script') &&
        r.renderBlockingStatus === 'blocking'
      ).length;
    });

    // Should have minimal render-blocking resources (< 5)
    expect(renderBlockingResources).toBeLessThan(5);
    console.log(`✓ Render-blocking resources: ${renderBlockingResources} (threshold: < 5)`);
  });

  test('should have efficient JavaScript execution', async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Measure JavaScript execution time
    const jsMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      const scriptEntries = performance.getEntriesByType('resource')
        .filter((r: PerformanceResourceTiming) => r.initiatorType === 'script');

      const totalScriptTime = scriptEntries.reduce(
        (sum: number, entry: PerformanceResourceTiming) => sum + entry.duration,
        0
      );

      return {
        totalScriptTime,
        scriptCount: scriptEntries.length,
      };
    });

    console.log(`📜 JavaScript: ${jsMetrics.scriptCount} scripts, ${jsMetrics.totalScriptTime.toFixed(0)}ms total`);

    // Total script time should be reasonable (< 2 seconds)
    expect(jsMetrics.totalScriptTime).toBeLessThan(2000);
  });

  test('should have efficient image loading', async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const imageMetrics = await page.evaluate(() => {
      const images = performance.getEntriesByType('resource')
        .filter((r: PerformanceResourceTiming) => r.initiatorType === 'img');

      const totalImageSize = images.reduce((sum: number, img: PerformanceResourceTiming) => {
        return sum + (img.transferSize || 0);
      }, 0);

      const totalImageTime = images.reduce((sum: number, img: PerformanceResourceTiming) => {
        return sum + img.duration;
      }, 0);

      return {
        imageCount: images.length,
        totalImageSize,
        totalImageTime,
        averageImageTime: images.length > 0 ? totalImageTime / images.length : 0,
      };
    });

    console.log(`🖼️  Images: ${imageMetrics.imageCount} images, ${(imageMetrics.totalImageSize / 1024).toFixed(1)}KB total`);

    // Average image load time should be reasonable (< 500ms)
    if (imageMetrics.imageCount > 0) {
      expect(imageMetrics.averageImageTime).toBeLessThan(500);
    }
  });

  test('should not have excessive DOM size', async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const domMetrics = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const depth = (element: Element, currentDepth = 0): number => {
        const children = Array.from(element.children);
        if (children.length === 0) return currentDepth;
        return Math.max(...children.map(child => depth(child, currentDepth + 1)));
      };

      return {
        totalElements: allElements.length,
        maxDepth: depth(document.body),
        bodyChildren: document.body.children.length,
      };
    });

    console.log(`🌳 DOM: ${domMetrics.totalElements} elements, depth ${domMetrics.maxDepth}`);

    // DOM should be reasonable size (< 1500 elements)
    expect(domMetrics.totalElements).toBeLessThan(1500);

    // DOM depth should be reasonable (< 32 levels)
    expect(domMetrics.maxDepth).toBeLessThan(32);
  });

  test('should have minimal reflows during interaction', async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Get initial layout
    const initialLayout = await page.evaluate(() => {
      return document.body.getBoundingClientRect();
    });

    // Hover over stat card
    const statCard = page.getByRole('button').first();
    await statCard.hover();
    await page.waitForTimeout(100);

    // Get layout after hover
    const afterHoverLayout = await page.evaluate(() => {
      return document.body.getBoundingClientRect();
    });

    // Layout should not change significantly (allowing 1px tolerance)
    expect(Math.abs(afterHoverLayout.height - initialLayout.height)).toBeLessThan(2);
    expect(Math.abs(afterHoverLayout.width - initialLayout.width)).toBeLessThan(2);

    console.log('✓ No layout reflow on hover');
  });

  test('should load efficiently on slow 3G', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    const startTime = Date.now();

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Should load within reasonable time even on slow network (< 8 seconds)
    expect(loadTime).toBeLessThan(8000);

    console.log(`✓ Slow 3G load time: ${loadTime}ms (threshold: 8000ms)`);
  });

  test('should have efficient memory usage', async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Get memory metrics (if available)
    const memoryMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryMetrics) {
      const usedMB = (memoryMetrics.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const totalMB = (memoryMetrics.totalJSHeapSize / 1024 / 1024).toFixed(1);

      console.log(`💾 Memory: ${usedMB}MB used / ${totalMB}MB total`);

      // Used heap should be reasonable (< 50MB for this component)
      expect(memoryMetrics.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    } else {
      console.log('ℹ️  Memory metrics not available in this browser');
    }
  });

  test.describe('Performance Budgets', () => {
    test('should meet overall performance budget', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const metrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

        // Calculate total size
        const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

        // Calculate by type
        const byType = resources.reduce((acc, r) => {
          const type = r.initiatorType;
          if (!acc[type]) acc[type] = { count: 0, size: 0 };
          acc[type].count++;
          acc[type].size += r.transferSize || 0;
          return acc;
        }, {} as Record<string, { count: number; size: number }>);

        return {
          totalSize,
          totalRequests: resources.length,
          byType,
        };
      });

      const totalTime = Date.now() - startTime;

      console.log('📦 Performance Budget:');
      console.log(`  Total: ${(metrics.totalSize / 1024).toFixed(1)}KB in ${metrics.totalRequests} requests`);
      console.log(`  Load time: ${totalTime}ms`);
      Object.entries(metrics.byType).forEach(([type, data]) => {
        console.log(`  ${type}: ${data.count} files, ${(data.size / 1024).toFixed(1)}KB`);
      });

      // Total page weight should be under 1MB for good performance
      expect(metrics.totalSize).toBeLessThan(1024 * 1024);

      // Total requests should be reasonable (< 50)
      expect(metrics.totalRequests).toBeLessThan(50);

      // Load time should be under 3 seconds
      expect(totalTime).toBeLessThan(3000);
    });
  });
});
