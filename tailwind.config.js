// File: /tailwind.config.js
// Tailwind CSS configuration

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	// Custom screens with tablet breakpoints
  	screens: {
  		'sm': '640px',
  		'tablet': '768px',      // Tablet portrait (iPad mini, iPad)
  		'md': '768px',
  		'tablet-lg': '1024px',  // Tablet landscape (iPad landscape, iPad Pro portrait)
  		'lg': '1024px',
  		'xl': '1280px',
  		'2xl': '1536px',
  		// Orientation-aware tablet breakpoints
  		'tablet-landscape': {'min': '768px', 'max': '1366px', 'raw': '(orientation: landscape)'},
  		'tablet-portrait': {'min': '768px', 'max': '1024px', 'raw': '(orientation: portrait)'},
  		// iPad Pro specific
  		'tablet-pro': {'min': '1024px', 'max': '1366px'},
  		'tablet-pro-landscape': {'min': '1024px', 'max': '1366px', 'raw': '(orientation: landscape)'},
  		'tablet-pro-portrait': {'min': '834px', 'max': '1194px', 'raw': '(orientation: portrait)'},
  		// Touch device query (coarse pointer)
  		'touch': {'raw': '(pointer: coarse)'},
  	},
  	// Typography System - Google Fonts
  	fontFamily: {
  		display: ['DM Sans', 'system-ui', 'sans-serif'],
  		mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
  		body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  	},
  	extend: {
  		// Tablet-specific spacing utilities
  		spacing: {
  			'tablet-gutter': '1.5rem',   // 24px - Standard tablet gutter
  			'tablet-section': '2rem',     // 32px - Section spacing on tablets
  			'touch-target': '44px',       // Minimum touch target size (Apple HIG)
  			'touch-target-lg': '48px',    // Larger touch target
  		},
  		// Tablet-optimized min/max widths
  		minWidth: {
  			'touch': '44px',
  			'touch-lg': '48px',
  			'sidebar-collapsed': '64px',
  			'sidebar-tablet': '280px',
  			'detail-panel': '360px',
  		},
  		maxWidth: {
  			'tablet-content': '720px',
  			'tablet-form': '560px',
  		},
  		// Grid template columns for tablet layouts
  		gridTemplateColumns: {
  			'tablet-list': 'minmax(280px, 360px) 1fr',  // Master-detail on tablets
  			'tablet-form': 'repeat(2, 1fr)',              // 2-column forms
  			'tablet-dashboard': 'repeat(2, 1fr)',         // Dashboard grid portrait
  			'tablet-dashboard-lg': 'repeat(3, 1fr)',      // Dashboard grid landscape
  		},
  		colors: {
  			// Dark mode surface colors (zinc scale for consistency)
  			surface: {
  				'50': '#fafafa',
  				'100': '#f4f4f5',
  				'200': '#e4e4e7',
  				'300': '#d4d4d8',
  				'400': '#a1a1aa',
  				'500': '#71717a',
  				'600': '#52525b',
  				'700': '#3f3f46',
  				'800': '#27272a',
  				'900': '#18181b',
  				'950': '#09090b',
  			},
  			// Industrial Construction Palette
  			'safety-orange': 'hsl(var(--safety-orange))',
  			'steel-gray': 'hsl(var(--steel-gray))',
  			'concrete': 'hsl(var(--concrete))',
  			'concrete-dark': 'hsl(var(--concrete-dark))',
  			'caution-yellow': 'hsl(var(--caution-yellow))',
  			'rebar-rust': 'hsl(var(--rebar-rust))',
  			primary: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2563eb',
  				'700': '#1d4ed8',
  				'800': '#1e40af',
  				'900': '#1e3a8a',
  				DEFAULT: '#1e40af', // Professional Blueprint blue
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))',
  				light: 'hsl(var(--success) / 0.1)',
  				dark: 'hsl(var(--success) / 0.9)'
  			},
  			error: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))',
  				light: 'hsl(var(--destructive) / 0.1)',
  				dark: 'hsl(var(--destructive) / 0.9)'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))',
  				light: 'hsl(var(--info) / 0.1)',
  				dark: 'hsl(var(--info) / 0.9)'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))',
  				light: 'hsl(var(--warning) / 0.1)',
  				dark: 'hsl(var(--warning) / 0.9)'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Tablet-specific min/max heights
  		minHeight: {
  			'touch': '44px',
  			'touch-lg': '48px',
  			'tablet-row': '56px',
  			'tablet-header': '64px',
  		},
  		// Tablet-specific font sizes
  		fontSize: {
  			'tablet-xs': ['0.8125rem', { lineHeight: '1.25rem' }],  // 13px
  			'tablet-sm': ['0.9375rem', { lineHeight: '1.375rem' }], // 15px
  			'tablet-base': ['1.0625rem', { lineHeight: '1.625rem' }], // 17px
  			'tablet-lg': ['1.1875rem', { lineHeight: '1.75rem' }],  // 19px
  		},
  		// Grid template rows for tablet layouts
  		gridTemplateRows: {
  			'tablet-header-content': '64px 1fr',
  			'tablet-content-footer': '1fr auto',
  		},
  		// Additional grid templates for tablet
  		gridTemplateColumns: {
  			...{
  				'tablet-list': 'minmax(280px, 360px) 1fr',
  				'tablet-form': 'repeat(2, 1fr)',
  				'tablet-dashboard': 'repeat(2, 1fr)',
  				'tablet-dashboard-lg': 'repeat(3, 1fr)',
  			},
  			'tablet-sidebar-content': '260px 1fr',
  			'tablet-master-detail': 'minmax(300px, 380px) 1fr',
  			'tablet-split': '1fr 1fr',
  		},
  		// Height utilities for tablet layouts
  		height: {
  			'tablet-screen-minus-header': 'calc(100vh - 64px)',
  			'tablet-screen-minus-nav': 'calc(100vh - 80px)',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
