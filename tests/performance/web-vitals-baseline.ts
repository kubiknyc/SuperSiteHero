/**
 * Web Vitals Baseline and Monitoring
 *
 * Define acceptable thresholds for Core Web Vitals and create monitoring utilities
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): Time to render largest content
 * - FID (First Input Delay): Time to respond to first user interaction
 * - CLS (Cumulative Layout Shift): Visual stability
 *
 * Additional Metrics:
 * - FCP (First Contentful Paint): Time to first content render
 * - TTFB (Time to First Byte): Server response time
 * - INP (Interaction to Next Paint): Responsiveness during page lifecycle
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Web Vitals Thresholds
 *
 * Based on Google's Core Web Vitals thresholds
 * - Good: Best user experience
 * - Needs Improvement: Acceptable but could be better
 * - Poor: Needs optimization
 */
export const WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint (ms)
  lcp: {
    good: 2500,
    needsImprovement: 4000,
    poor: Infinity,
  },
  // First Input Delay (ms)
  fid: {
    good: 100,
    needsImprovement: 300,
    poor: Infinity,
  },
  // Cumulative Layout Shift (score)
  cls: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: Infinity,
  },
  // First Contentful Paint (ms)
  fcp: {
    good: 1800,
    needsImprovement: 3000,
    poor: Infinity,
  },
  // Time to First Byte (ms)
  ttfb: {
    good: 800,
    needsImprovement: 1800,
    poor: Infinity,
  },
} as const;

/**
 * Performance targets for SuperSiteHero
 *
 * These are our application-specific targets
 */
export const PERFORMANCE_TARGETS = {
  // Core Web Vitals
  lcp: 2000, // Target: 2s
  fid: 50,   // Target: 50ms
  cls: 0.05, // Target: 0.05

  // Additional metrics
  fcp: 1500, // Target: 1.5s
  ttfb: 600, // Target: 600ms

  // Application-specific
  timeToInteractive: 3000, // Target: 3s
  totalBlockingTime: 200,  // Target: 200ms

  // Bundle sizes (bytes)
  mainBundle: 300 * 1024,      // 300KB
  vendorBundle: 500 * 1024,    // 500KB
  totalBundleSize: 1024 * 1024, // 1MB

  // API response times (ms)
  apiResponseTime: 500,
  databaseQueryTime: 200,

  // Rendering
  initialRenderTime: 100,
  componentRenderTime: 16, // 60fps = 16.67ms per frame
} as const;

/**
 * Rating for a metric value
 */
type Rating = 'good' | 'needs-improvement' | 'poor';

/**
 * Metric result with rating
 */
interface MetricResult {
  name: string;
  value: number;
  rating: Rating;
  target: number;
  threshold: {
    good: number;
    needsImprovement: number;
  };
  delta?: number;
}

/**
 * Get rating for a metric value
 */
export function getMetricRating(
  metricName: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): Rating {
  const thresholds = WEB_VITALS_THRESHOLDS[metricName];

  if (value <= thresholds.good) {
    return 'good';
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * Evaluate a metric against thresholds
 */
export function evaluateMetric(
  metricName: keyof typeof WEB_VITALS_THRESHOLDS & keyof typeof PERFORMANCE_TARGETS,
  value: number
): MetricResult {
  const rating = getMetricRating(metricName, value);
  const target = PERFORMANCE_TARGETS[metricName];
  const threshold = WEB_VITALS_THRESHOLDS[metricName];
  const delta = value - target;

  return {
    name: metricName.toUpperCase(),
    value,
    rating,
    target,
    threshold: {
      good: threshold.good,
      needsImprovement: threshold.needsImprovement,
    },
    delta,
  };
}

/**
 * Web Vitals metrics storage
 */
interface WebVitalsMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  timestamp: number;
  url: string;
}

/**
 * Store metrics in localStorage for analysis
 */
export function storeMetrics(metrics: WebVitalsMetrics): void {
  try {
    const key = `web-vitals-${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(metrics));

    // Keep only last 100 entries
    const keys = Object.keys(localStorage).filter(k => k.startsWith('web-vitals-'));
    if (keys.length > 100) {
      keys
        .sort()
        .slice(0, keys.length - 100)
        .forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.error('Failed to store web vitals:', e);
  }
}

/**
 * Get all stored metrics
 */
export function getStoredMetrics(): WebVitalsMetrics[] {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('web-vitals-'));
  return keys
    .map(key => {
      try {
        return JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Calculate average metrics
 */
export function calculateAverageMetrics(metrics: WebVitalsMetrics[]): Partial<WebVitalsMetrics> {
  if (metrics.length === 0) {return {};}

  const sum = metrics.reduce(
    (acc, m) => ({
      lcp: (acc.lcp || 0) + (m.lcp || 0),
      fid: (acc.fid || 0) + (m.fid || 0),
      cls: (acc.cls || 0) + (m.cls || 0),
      fcp: (acc.fcp || 0) + (m.fcp || 0),
      ttfb: (acc.ttfb || 0) + (m.ttfb || 0),
    }),
    {} as Partial<WebVitalsMetrics>
  );

  const count = metrics.length;
  return {
    lcp: sum.lcp ? sum.lcp / count : undefined,
    fid: sum.fid ? sum.fid / count : undefined,
    cls: sum.cls ? sum.cls / count : undefined,
    fcp: sum.fcp ? sum.fcp / count : undefined,
    ttfb: sum.ttfb ? sum.ttfb / count : undefined,
  };
}

/**
 * Send metrics to analytics
 */
export function sendToAnalytics(metric: {
  name: string;
  value: number;
  rating: string;
  delta?: number;
  id?: string;
}): void {
  // Send to Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: metric.delta ? Math.round(metric.delta) : undefined,
      metric_id: metric.id,
    });
  }

  // Send to custom analytics
  // Example: Your own analytics endpoint
  /*
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metric),
  }).catch(console.error);
  */

  // Log in development
  if (import.meta.env.DEV) {
    console.log('[Web Vitals]', metric.name, {
      value: `${metric.value.toFixed(2)}ms`,
      rating: metric.rating,
      target: PERFORMANCE_TARGETS[metric.name.toLowerCase() as keyof typeof PERFORMANCE_TARGETS],
    });
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitalsMonitoring(): void {
  const metrics: Partial<WebVitalsMetrics> = {
    timestamp: Date.now(),
    url: window.location.pathname,
  };

  // Largest Contentful Paint
  onLCP((metric) => {
    metrics.lcp = metric.value;
    const result = evaluateMetric('lcp', metric.value);
    sendToAnalytics({ ...metric, rating: result.rating, delta: result.delta });
  });

  // Interaction to Next Paint (replaces FID in web-vitals v5)
  onINP((metric) => {
    metrics.fid = metric.value; // Store as fid for backward compatibility
    const result = evaluateMetric('fid', metric.value);
    sendToAnalytics({ ...metric, rating: result.rating, delta: result.delta });
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    metrics.cls = metric.value;
    const result = evaluateMetric('cls', metric.value);
    sendToAnalytics({ ...metric, rating: result.rating, delta: result.delta });
  });

  // First Contentful Paint
  onFCP((metric) => {
    metrics.fcp = metric.value;
    const result = evaluateMetric('fcp', metric.value);
    sendToAnalytics({ ...metric, rating: result.rating, delta: result.delta });
  });

  // Time to First Byte
  onTTFB((metric) => {
    metrics.ttfb = metric.value;
    const result = evaluateMetric('ttfb', metric.value);
    sendToAnalytics({ ...metric, rating: result.rating, delta: result.delta });
  });

  // Store metrics when page is hidden/unloaded
  const storeMetricsOnUnload = () => {
    if (Object.keys(metrics).length > 2) { // More than timestamp and url
      storeMetrics(metrics as WebVitalsMetrics);
    }
  };

  // Listen for visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      storeMetricsOnUnload();
    }
  });

  // Fallback for page unload
  window.addEventListener('beforeunload', storeMetricsOnUnload);
}

/**
 * Get Web Vitals report
 *
 * In web-vitals v5, the getCLS/getFCP/getFID/getLCP/getTTFB functions were removed.
 * This function now uses the on* observer pattern to collect metrics.
 */
export async function getWebVitalsReport(): Promise<{
  current: Partial<WebVitalsMetrics>;
  average: Partial<WebVitalsMetrics>;
  evaluation: MetricResult[];
}> {
  const stored = getStoredMetrics();
  const average = calculateAverageMetrics(stored);
  const current: Partial<WebVitalsMetrics> = {};

  // Get current metrics using the observer pattern
  return new Promise((resolve) => {
    let completed = 0;
    const total = 5;

    const checkComplete = () => {
      completed++;
      if (completed === total) {
        const evaluation: MetricResult[] = [];

        if (current.lcp) {evaluation.push(evaluateMetric('lcp', current.lcp));}
        if (current.fid) {evaluation.push(evaluateMetric('fid', current.fid));}
        if (current.cls) {evaluation.push(evaluateMetric('cls', current.cls));}
        if (current.fcp) {evaluation.push(evaluateMetric('fcp', current.fcp));}
        if (current.ttfb) {evaluation.push(evaluateMetric('ttfb', current.ttfb));}

        resolve({ current, average, evaluation });
      }
    };

    // Use on* observers with reportAllChanges to get metrics
    onCLS((metric) => {
      current.cls = metric.value;
      checkComplete();
    }, { reportAllChanges: true });

    onFCP((metric) => {
      current.fcp = metric.value;
      checkComplete();
    });

    // INP replaces FID in web-vitals v5
    onINP((metric) => {
      current.fid = metric.value;
      checkComplete();
    }, { reportAllChanges: true });

    onLCP((metric) => {
      current.lcp = metric.value;
      checkComplete();
    }, { reportAllChanges: true });

    onTTFB((metric) => {
      current.ttfb = metric.value;
      checkComplete();
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (completed < total) {
        console.warn('Web Vitals timeout - some metrics not collected');
        // Resolve with whatever we have
        const evaluation: MetricResult[] = [];
        if (current.lcp) {evaluation.push(evaluateMetric('lcp', current.lcp));}
        if (current.fid) {evaluation.push(evaluateMetric('fid', current.fid));}
        if (current.cls) {evaluation.push(evaluateMetric('cls', current.cls));}
        if (current.fcp) {evaluation.push(evaluateMetric('fcp', current.fcp));}
        if (current.ttfb) {evaluation.push(evaluateMetric('ttfb', current.ttfb));}
        resolve({ current, average, evaluation });
      }
    }, 5000);
  });
}

/**
 * Format metric value for display
 */
export function formatMetricValue(metric: string, value: number): string {
  if (metric === 'cls') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

/**
 * Get metric color based on rating
 */
export function getMetricColor(rating: Rating): string {
  switch (rating) {
    case 'good':
      return '#0cce6b';
    case 'needs-improvement':
      return '#ffa400';
    case 'poor':
      return '#ff4e42';
  }
}

export default {
  WEB_VITALS_THRESHOLDS,
  PERFORMANCE_TARGETS,
  initWebVitalsMonitoring,
  getWebVitalsReport,
  evaluateMetric,
  formatMetricValue,
  getMetricColor,
};
