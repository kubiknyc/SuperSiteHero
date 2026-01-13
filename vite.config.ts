// File: /vite.config.ts
// Vite configuration for the Construction Management Platform

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Read version from package.json
import pkg from './package.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    // PWA plugin for offline functionality
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icon.svg', 'offline.html', 'icons/*.png', 'splash/*.png'],
      manifest: {
        name: 'JobSight',
        short_name: 'JobSight',
        description: 'Construction Field Management Platform',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        lang: 'en',
        categories: ['business', 'productivity'],
        dir: 'ltr',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Daily Reports',
            short_name: 'Reports',
            description: 'View and create daily reports',
            url: '/daily-reports',
            icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'Projects',
            short_name: 'Projects',
            description: 'View all projects',
            url: '/projects',
            icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }]
          }
        ],
        screenshots: [
          {
            src: 'screenshots/desktop-dashboard.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard overview on desktop'
          },
          {
            src: 'screenshots/mobile-dashboard.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Dashboard on mobile'
          }
        ]
      },
      workbox: {
        // Allow larger files to be precached (3MB limit)
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Offline fallback
        navigateFallback: '/offline.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        // Offline caching strategies
        runtimeCaching: [
          // Cache API responses with network-first strategy
          {
            // Match Supabase API URLs (regex works in service worker context)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache images with cache-first strategy
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          // Cache CSS and JS with stale-while-revalidate
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          // Cache Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Don't cache these patterns
        navigateFallbackDenylist: [/^\/api/],
        // Clean up old caches
        cleanupOutdatedCaches: true,
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  },
  build: {
    // Code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Core React - essential, load first
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }

          // TanStack Query - core data fetching
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }

          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }

          // Core UI utilities - frequently used
          if (id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/clsx/') ||
              id.includes('node_modules/tailwind-merge/') ||
              id.includes('node_modules/class-variance-authority/')) {
            return 'vendor-ui';
          }

          // Date handling
          if (id.includes('node_modules/date-fns/')) {
            return 'vendor-date';
          }

          // State management
          if (id.includes('node_modules/zustand/') ||
              id.includes('node_modules/react-hot-toast/') ||
              id.includes('node_modules/sonner/')) {
            return 'vendor-state';
          }

          // Forms and validation
          if (id.includes('node_modules/zod/') ||
              id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/')) {
            return 'vendor-forms';
          }

          // Charts - heavy, lazy loaded
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-charts';
          }

          // Image processing - lazy loaded
          if (id.includes('node_modules/browser-image-compression/')) {
            return 'vendor-image-compression';
          }

          // JSZip - lazy loaded for downloads
          if (id.includes('node_modules/jszip/')) {
            return 'vendor-zip';
          }

          // Canvas/Konva - lazy loaded for drawing
          if (id.includes('node_modules/konva/') ||
              id.includes('node_modules/react-konva/') ||
              id.includes('node_modules/use-image/')) {
            return 'vendor-canvas';
          }

          // Photo sphere viewer - lazy loaded
          if (id.includes('node_modules/@photo-sphere-viewer/')) {
            return 'vendor-photo-viewer';
          }

          // PDF libraries - lazy loaded, split into separate chunks
          if (id.includes('node_modules/jspdf/') ||
              id.includes('node_modules/jspdf-autotable/')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/pdfjs-dist/')) {
            return 'vendor-pdfjs';
          }
          if (id.includes('node_modules/react-pdf/')) {
            return 'vendor-react-pdf';
          }

          // Excel - lazy loaded
          if (id.includes('node_modules/exceljs/')) {
            return 'vendor-excel';
          }

          // Animation - frequently used but can be deferred
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-animation';
          }

          // Drag and drop
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'vendor-dnd';
          }

          // Radix UI primitives
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }

          // 3D visualization - very heavy, rarely used
          if (id.includes('node_modules/three/')) {
            return 'vendor-three-core';
          }
          if (id.includes('node_modules/@react-three/')) {
            return 'vendor-three-react';
          }

          // QR code scanning - lazy loaded
          if (id.includes('node_modules/html5-qrcode/')) {
            return 'vendor-qrcode-scanner';
          }
          if (id.includes('node_modules/qrcode.react/')) {
            return 'vendor-qrcode-render';
          }

          // Emoji picker - lazy loaded
          if (id.includes('node_modules/emoji-picker-react/')) {
            return 'vendor-emoji';
          }

          // HTML to canvas - lazy loaded for screenshots
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }

          // TensorFlow - very heavy, AI features
          if (id.includes('node_modules/@tensorflow/')) {
            return 'vendor-tensorflow';
          }

          // Tesseract OCR - very heavy, lazy loaded
          if (id.includes('node_modules/tesseract.js/')) {
            return 'vendor-tesseract';
          }

          // Video.js - heavy, lazy loaded for video features
          if (id.includes('node_modules/video.js/')) {
            return 'vendor-video';
          }

          // Math.js - lazy loaded for calculations
          if (id.includes('node_modules/mathjs/')) {
            return 'vendor-math';
          }

          // Capacitor - mobile native features
          if (id.includes('node_modules/@capacitor/')) {
            return 'vendor-capacitor';
          }

          // Sentry - error tracking
          if (id.includes('node_modules/@sentry/')) {
            return 'vendor-sentry';
          }

          // Day picker calendar
          if (id.includes('node_modules/react-day-picker/')) {
            return 'vendor-calendar';
          }

          // React dropzone for file uploads
          if (id.includes('node_modules/react-dropzone/')) {
            return 'vendor-dropzone';
          }

          // DOMPurify for security
          if (id.includes('node_modules/dompurify/')) {
            return 'vendor-security';
          }

          // Vercel analytics
          if (id.includes('node_modules/@vercel/')) {
            return 'vendor-analytics';
          }

          // 21st extension
          if (id.includes('node_modules/@21st-extension/')) {
            return 'vendor-21st';
          }

          // IDB (IndexedDB) - offline storage
          if (id.includes('node_modules/idb/')) {
            return 'vendor-idb';
          }

          // Workbox - PWA/service worker
          if (id.includes('node_modules/workbox-')) {
            return 'vendor-workbox';
          }

          // Web vitals - performance monitoring
          if (id.includes('node_modules/web-vitals/')) {
            return 'vendor-monitoring';
          }

          // UUID generation
          if (id.includes('node_modules/uuid/')) {
            return 'vendor-utils';
          }

          // Pako compression
          if (id.includes('node_modules/pako/')) {
            return 'vendor-compression';
          }

          // EXIF reader
          if (id.includes('node_modules/exifr/')) {
            return 'vendor-exif';
          }

          // Debug utility
          if (id.includes('node_modules/debug/')) {
            return 'vendor-debug';
          }

          // RecordRTC for audio/video recording
          if (id.includes('node_modules/recordrtc/')) {
            return 'vendor-recording';
          }

          // Pixelmatch for image comparison
          if (id.includes('node_modules/pixelmatch/')) {
            return 'vendor-image-compare';
          }

          // RBush for spatial indexing
          if (id.includes('node_modules/rbush/')) {
            return 'vendor-spatial';
          }

          // React virtual for virtualized lists
          if (id.includes('node_modules/@tanstack/react-virtual/')) {
            return 'vendor-virtual';
          }

          // pg (PostgreSQL) - should not be in frontend bundle normally
          if (id.includes('node_modules/pg/')) {
            return 'vendor-pg';
          }

          // Tailwind animate
          if (id.includes('node_modules/tailwindcss-animate/')) {
            return 'vendor-tw-animate';
          }

          // Group remaining small node_modules - let them be naturally code-split
          // by returning undefined instead of grouping into vendor-misc
          if (id.includes('node_modules/')) {
            // Only group truly small/common utilities together
            return 'vendor-misc';
          }

          return undefined;
        }
      }
    },
    // Lower chunk size warning limit to catch issues early
    chunkSizeWarningLimit: 300,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
    exclude: [
      'tesseract.js' // Exclude tesseract.js from pre-bundling (large library)
    ]
  },
  // Web Worker configuration
  worker: {
    format: 'es', // Use ES modules for workers
    plugins: () => []
  }
}
})
