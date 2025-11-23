// File: /src/lib/performance/web-vitals.ts
// Web Vitals monitoring for Core Web Vitals tracking
// Phase 2 Performance: Monitors LCP, INP, CLS, FCP, TTFB

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

// Performance thresholds based on Google's recommendations
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint (replaced FID)
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
}

type MetricRating = 'good' | 'needs-improvement' | 'poor'

interface PerformanceMetric extends Metric {
  rating: MetricRating
}

// Get rating based on threshold
function getRating(
  value: number,
  threshold: { good: number; needsImprovement: number }
): MetricRating {
  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

// Send metrics to analytics or monitoring service
function sendToAnalytics(metric: PerformanceMetric) {
  // In production, send to your analytics service
  // Examples: Google Analytics, Datadog, New Relic, etc.

  if (import.meta.env.DEV) {
    console.log('[Performance]', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    })
  }

  // Send to Google Analytics 4 (gtag)
  // Requires: Global Site Tag loaded from gtag and GA_ID env variable set
  if (import.meta.env.PROD && typeof window !== 'undefined' && (window as any).gtag) {
    try {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: Math.round(metric.delta),
        metric_rating: metric.rating,
        // Add custom event properties
        event_category: 'web_vitals',
        event_label: metric.name,
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[GA] Failed to send metric:', error)
      }
    }
  }

  // Store metrics in local storage for debugging
  if (import.meta.env.DEV) {
    const metrics = JSON.parse(localStorage.getItem('performance-metrics') || '[]')
    metrics.push({
      timestamp: new Date().toISOString(),
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
    })
    // Keep only last 50 metrics
    localStorage.setItem('performance-metrics', JSON.stringify(metrics.slice(-50)))
  }
}

// Initialize Web Vitals monitoring
export function initWebVitals() {
  // Largest Contentful Paint (LCP)
  onLCP((metric: Metric) => {
    const rating = getRating(metric.value, THRESHOLDS.LCP)
    sendToAnalytics({ ...metric, rating })
  })

  // Interaction to Next Paint (INP) - replaced FID in web-vitals v4
  onINP((metric: Metric) => {
    const rating = getRating(metric.value, THRESHOLDS.INP)
    sendToAnalytics({ ...metric, rating })
  })

  // Cumulative Layout Shift (CLS)
  onCLS((metric: Metric) => {
    const rating = getRating(metric.value, THRESHOLDS.CLS)
    sendToAnalytics({ ...metric, rating })
  })

  // First Contentful Paint (FCP)
  onFCP((metric: Metric) => {
    const rating = getRating(metric.value, THRESHOLDS.FCP)
    sendToAnalytics({ ...metric, rating })
  })

  // Time to First Byte (TTFB)
  onTTFB((metric: Metric) => {
    const rating = getRating(metric.value, THRESHOLDS.TTFB)
    sendToAnalytics({ ...metric, rating })
  })
}

// Get stored metrics for debugging
export function getStoredMetrics() {
  if (import.meta.env.DEV) {
    return JSON.parse(localStorage.getItem('performance-metrics') || '[]')
  }
  return []
}

// Clear stored metrics
export function clearStoredMetrics() {
  if (import.meta.env.DEV) {
    localStorage.removeItem('performance-metrics')
  }
}

// Performance budget checker
interface PerformanceBudget {
  lcp: number
  inp: number
  cls: number
  fcp: number
  ttfb: number
  bundleSize: number
}

const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500,    // 2.5s
  inp: 200,     // 200ms
  cls: 0.1,     // 0.1
  fcp: 1800,    // 1.8s
  ttfb: 800,    // 800ms
  bundleSize: 500, // 500KB
}

export function checkPerformanceBudget(
  metrics: Record<string, number>,
  budget: Partial<PerformanceBudget> = {}
): { passed: boolean; violations: string[] } {
  const finalBudget = { ...DEFAULT_BUDGET, ...budget }
  const violations: string[] = []

  if (metrics.lcp > finalBudget.lcp) {
    violations.push(`LCP: ${metrics.lcp}ms exceeds budget of ${finalBudget.lcp}ms`)
  }
  if (metrics.inp > finalBudget.inp) {
    violations.push(`INP: ${metrics.inp}ms exceeds budget of ${finalBudget.inp}ms`)
  }
  if (metrics.cls > finalBudget.cls) {
    violations.push(`CLS: ${metrics.cls} exceeds budget of ${finalBudget.cls}`)
  }
  if (metrics.fcp > finalBudget.fcp) {
    violations.push(`FCP: ${metrics.fcp}ms exceeds budget of ${finalBudget.fcp}ms`)
  }
  if (metrics.ttfb > finalBudget.ttfb) {
    violations.push(`TTFB: ${metrics.ttfb}ms exceeds budget of ${finalBudget.ttfb}ms`)
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}

// Utility to measure component render time
export function measureComponentRender(componentName: string) {
  const startTime = performance.now()

  return () => {
    const endTime = performance.now()
    const renderTime = endTime - startTime

    if (import.meta.env.DEV) {
      console.log(`[Render] ${componentName}: ${renderTime.toFixed(2)}ms`)

      // Warn if render takes too long
      if (renderTime > 16) { // 60fps = 16ms per frame
        console.warn(`[Performance Warning] ${componentName} render took ${renderTime.toFixed(2)}ms (> 16ms)`)
      }
    }

    return renderTime
  }
}
