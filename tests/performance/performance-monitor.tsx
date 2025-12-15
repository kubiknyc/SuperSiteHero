/**
 * Performance Monitoring Dashboard Component
 *
 * Visual dashboard for monitoring Web Vitals and performance metrics
 * Add to your app for development/testing or admin-only production view
 *
 * Usage:
 * import { PerformanceMonitor } from './tests/performance/performance-monitor';
 * <PerformanceMonitor />
 */

import React, { useEffect, useState } from 'react';
import {
  getWebVitalsReport,
  getStoredMetrics,
  calculateAverageMetrics,
  formatMetricValue,
  getMetricColor,
  PERFORMANCE_TARGETS,
  type WebVitalsMetrics,
} from './web-vitals-baseline';

interface MetricCardProps {
  name: string;
  value: number | undefined;
  target: number;
  unit?: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

function MetricCard({ name, value, target, unit = 'ms', rating }: MetricCardProps) {
  const displayValue = value !== undefined ? formatMetricValue(name.toLowerCase(), value) : 'N/A';
  const targetValue = unit === 'ms' ? `${target}ms` : target.toFixed(3);
  const color = rating ? getMetricColor(rating) : '#999';
  const isGood = value !== undefined && value <= target;

  return (
    <div style={{
      padding: '16px',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      background: '#fff',
      minWidth: '150px',
    }}>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
        {name}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>
        {displayValue}
      </div>
      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
        Target: {targetValue}
      </div>
      {rating && (
        <div style={{
          fontSize: '10px',
          marginTop: '4px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: color + '20',
          color,
          display: 'inline-block',
        }}>
          {rating.toUpperCase().replace('-', ' ')}
        </div>
      )}
    </div>
  );
}

interface ChartData {
  timestamp: number;
  lcp?: number;
  fid?: number;
  cls?: number;
}

function SimpleChart({ data, metric }: { data: ChartData[]; metric: 'lcp' | 'fid' | 'cls' }) {
  if (data.length === 0) {return null;}

  const values = data.map(d => d[metric]).filter(Boolean) as number[];
  if (values.length === 0) {return null;}

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div style={{ width: '100%', height: '60px', position: 'relative', marginTop: '8px' }}>
      <svg width="100%" height="60" style={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
        {data.map((d, i) => {
          const value = d[metric];
          if (!value) {return null;}

          const x = (i / (data.length - 1)) * 100;
          const y = ((value - min) / range) * 50;

          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${50 - y}px`}
              r="3"
              fill="#3b82f6"
            />
          );
        })}
        <polyline
          points={data
            .map((d, i) => {
              const value = d[metric];
              if (!value) {return null;}
              const x = (i / (data.length - 1)) * 100;
              const y = ((value - min) / range) * 50;
              return `${x},${50 - y}`;
            })
            .filter(Boolean)
            .join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export function PerformanceMonitor() {
  const [report, setReport] = useState<{
    current: Partial<WebVitalsMetrics>;
    average: Partial<WebVitalsMetrics>;
    evaluation: any[];
  } | null>(null);

  const [historicalData, setHistoricalData] = useState<ChartData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const webVitalsReport = await getWebVitalsReport();
      setReport(webVitalsReport);

      const stored = getStoredMetrics();
      const chartData = stored.slice(-20).map(m => ({
        timestamp: m.timestamp,
        lcp: m.lcp,
        fid: m.fid,
        cls: m.cls,
      }));
      setHistoricalData(chartData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMetrics = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('web-vitals-'));
    keys.forEach(k => localStorage.removeItem(k));
    setHistoricalData([]);
    loadMetrics();
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 9999,
        }}
      >
        Performance
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '600px',
      maxHeight: '80vh',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      zIndex: 9999,
      overflow: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          Performance Monitor
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadMetrics}
            style={{
              padding: '6px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Refresh
          </button>
          <button
            onClick={clearMetrics}
            style={{
              padding: '6px 12px',
              background: '#fef2f2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              padding: '6px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Loading metrics...
          </div>
        ) : report ? (
          <>
            {/* Core Web Vitals */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#666' }}>
                Core Web Vitals
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <MetricCard
                  name="LCP"
                  value={report.current.lcp}
                  target={PERFORMANCE_TARGETS.lcp}
                  rating={report.evaluation.find(e => e.name === 'LCP')?.rating}
                />
                <MetricCard
                  name="FID"
                  value={report.current.fid}
                  target={PERFORMANCE_TARGETS.fid}
                  rating={report.evaluation.find(e => e.name === 'FID')?.rating}
                />
                <MetricCard
                  name="CLS"
                  value={report.current.cls}
                  target={PERFORMANCE_TARGETS.cls}
                  unit=""
                  rating={report.evaluation.find(e => e.name === 'CLS')?.rating}
                />
              </div>
            </div>

            {/* Additional Metrics */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#666' }}>
                Additional Metrics
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <MetricCard
                  name="FCP"
                  value={report.current.fcp}
                  target={PERFORMANCE_TARGETS.fcp}
                  rating={report.evaluation.find(e => e.name === 'FCP')?.rating}
                />
                <MetricCard
                  name="TTFB"
                  value={report.current.ttfb}
                  target={PERFORMANCE_TARGETS.ttfb}
                  rating={report.evaluation.find(e => e.name === 'TTFB')?.rating}
                />
              </div>
            </div>

            {/* Averages */}
            {Object.keys(report.average).length > 2 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#666' }}>
                  Average (Last {historicalData.length} Sessions)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {report.average.lcp && (
                    <MetricCard
                      name="Avg LCP"
                      value={report.average.lcp}
                      target={PERFORMANCE_TARGETS.lcp}
                    />
                  )}
                  {report.average.fid && (
                    <MetricCard
                      name="Avg FID"
                      value={report.average.fid}
                      target={PERFORMANCE_TARGETS.fid}
                    />
                  )}
                  {report.average.cls && (
                    <MetricCard
                      name="Avg CLS"
                      value={report.average.cls}
                      target={PERFORMANCE_TARGETS.cls}
                      unit=""
                    />
                  )}
                </div>
              </div>
            )}

            {/* Historical Charts */}
            {historicalData.length > 1 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#666' }}>
                  Historical Trends
                </h4>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    LCP (Largest Contentful Paint)
                  </div>
                  <SimpleChart data={historicalData} metric="lcp" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    FID (First Input Delay)
                  </div>
                  <SimpleChart data={historicalData} metric="fid" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    CLS (Cumulative Layout Shift)
                  </div>
                  <SimpleChart data={historicalData} metric="cls" />
                </div>
              </div>
            )}

            {/* Tips */}
            <div style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#666',
            }}>
              <strong>Tips:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Green: Good performance, meeting targets</li>
                <li>Orange: Needs improvement</li>
                <li>Red: Poor performance, requires optimization</li>
              </ul>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            No metrics available yet. Navigate around the app to collect data.
          </div>
        )}
      </div>
    </div>
  );
}

export default PerformanceMonitor;
