// File: /tailwind.config.js
// Tailwind CSS configuration

const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	// Safelist ensures critical utilities are always generated regardless of JIT scanning
	// This fixes production builds where build cache might miss dynamically used classes
	safelist: [
		// Layout utilities used in login/auth pages
		'hidden',
		'flex',
		'block',
		'w-full',
		'w-1/2',
		'w-2/5',
		'w-3/5',
		// Height utilities
		'h-10',
		'h-11',
		'h-12',
		'h-14',
		// Responsive variants - explicit list for reliable JIT generation
		'sm:flex', 'sm:hidden', 'sm:block', 'sm:w-1/2',
		'md:flex', 'md:hidden', 'md:block', 'md:w-1/2',
		'lg:flex', 'lg:hidden', 'lg:block', 'lg:w-1/2',
		'xl:flex', 'xl:hidden', 'xl:block', 'xl:w-2/5', 'xl:w-3/5',
		// Object fit
		'object-contain',

		// Grid utilities for LoginPageV2 and SignupPageV2
		'grid',
		'grid-cols-2',
		'grid-cols-3',
		'gap-3',
		'gap-4',
		'gap-5',
		'gap-6',

		// Border radius utilities
		'rounded-xl',
		'rounded-2xl',

		// Padding utilities
		'p-4',
		'p-5',
		'p-6',
		'px-4',
		'pr-12',

		// Background utilities with opacity
		'bg-white/[0.03]',
		'bg-white/[0.05]',
		'bg-white/[0.06]',

		// Border utilities with opacity
		'border',
		'border-white/10',
		'border-white/20',
		'border-white/[0.06]',
		'border-white/[0.1]',
		'border-emerald-500/50',
		'border-red-500/50',
		'border-primary/20',
		'border-primary-500/50',

		// Gradient text utilities
		'bg-gradient-to-r',
		'bg-gradient-to-br',
		'from-primary',
		'from-primary-400',
		'from-primary-500',
		'to-primary-600',
		'to-primary-700',
		'to-info-400',
		'text-transparent',
		'bg-clip-text',

		// Blur and backdrop utilities
		'backdrop-blur-sm',
		'blur-[100px]',
		'blur-[120px]',

		// Shadow utilities
		'shadow-lg',
		'shadow-primary/25',
		'shadow-primary/30',
		'shadow-blue-500/5',

		// Ring utilities
		'ring-2',
		'ring-primary-500/20',

		// Transition utilities
		'transition-all',
		'transition-colors',
		'transition-transform',
		'duration-200',
		'duration-300',
		'duration-500',
		'duration-700',
		'duration-1000',
		'ease-out',

		// Transform utilities
		'translate-x-0',
		'translate-x-1',
		'translate-y-0',
		'translate-y-4',
		'translate-y-8',
		'-translate-x-8',
		'-translate-y-1/2',
		'scale-110',

		// Opacity utilities
		'opacity-0',
		'opacity-5',
		'opacity-10',
		'opacity-20',
		'opacity-100',

		// Animation utilities
		'animate-pulse',
		'animate-spin',

		// Text colors
		'text-white',
		'text-slate-300',
		'text-slate-400',
		'text-slate-500',
		'text-slate-600',
		'text-primary-400',
		'text-primary-300',
		'text-emerald-400',
		'text-red-400',
		'text-yellow-400',

		// Background colors
		'bg-slate-800',
		'bg-slate-900',
		'bg-slate-950',
		'bg-red-500',
		'bg-yellow-500',
		'bg-emerald-500',
		'bg-yellow-500/10',
		'bg-yellow-500/20',

		// Spacing utilities
		'mt-auto',
		'mt-3',
		'mt-6',
		'mt-8',
		'mt-12',
		'mb-1',
		'mb-2',
		'mb-3',
		'mb-6',
		'mb-8',
		'space-y-1.5',
		'space-y-2',
		'space-y-4',
		'space-y-5',
		'-space-x-2',

		// Position utilities
		'relative',
		'absolute',
		'inset-0',
		'z-10',

		// Size utilities
		'w-3',
		'w-5',
		'w-6',
		'w-7',
		'w-8',
		'w-10',
		'w-12',
		'w-64',
		'w-80',
		'w-96',
		'h-1',
		'h-1.5',
		'h-3',
		'h-5',
		'h-6',
		'h-7',
		'h-8',
		'h-64',
		'h-80',
		'h-96',

		// Max width utilities
		'max-w-md',

		// Overflow utilities
		'overflow-hidden',
		'overflow-y-auto',

		// Font utilities
		'font-medium',
		'font-semibold',
		'font-bold',
		'font-mono',
		'text-xs',
		'text-sm',
		'text-base',
		'text-lg',
		'text-xl',
		'text-2xl',
		'text-3xl',
		'text-4xl',
		'text-5xl',
		'tracking-tight',
		'tracking-wider',
		'uppercase',
		'leading-tight',
		'leading-relaxed',

		// Flexbox utilities
		'items-center',
		'justify-center',
		'justify-between',
		'flex-col',

		// Hover states
		'hover:bg-white/[0.06]',
		'hover:border-white/[0.1]',
		'hover:border-white/20',
		'hover:shadow-lg',
		'hover:shadow-primary/30',
		'hover:text-slate-300',
		'hover:text-slate-400',
		'hover:text-primary-300',
		'hover:from-primary-500',
		'hover:to-primary-600',
		'hover:scale-110',
		'hover:translate-x-1',

		// Focus states
		'focus:bg-white/[0.05]',
		'focus:border-primary-500/50',
		'focus:ring-2',
		'focus:ring-primary-500/20',

		// Group utilities
		'group',
		'group-hover:scale-110',
		'group-hover:translate-x-1',
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
			'tablet-landscape': { 'min': '768px', 'max': '1366px', 'raw': '(orientation: landscape)' },
			'tablet-portrait': { 'min': '768px', 'max': '1024px', 'raw': '(orientation: portrait)' },
			// iPad Pro specific
			'tablet-pro': { 'min': '1024px', 'max': '1366px' },
			'tablet-pro-landscape': { 'min': '1024px', 'max': '1366px', 'raw': '(orientation: landscape)' },
			'tablet-pro-portrait': { 'min': '834px', 'max': '1194px', 'raw': '(orientation: portrait)' },
			// Touch device query (coarse pointer)
			'touch': { 'raw': '(pointer: coarse)' },
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
					'950': '#172554',
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
					...colors.green,
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					light: 'hsl(var(--success) / 0.1)',
					dark: 'hsl(var(--success) / 0.9)'
				},
				error: {
					...colors.red,
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					light: 'hsl(var(--destructive) / 0.1)',
					dark: 'hsl(var(--destructive) / 0.9)'
				},
				info: {
					...colors.cyan,
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))',
					light: 'hsl(var(--info) / 0.1)',
					dark: 'hsl(var(--info) / 0.9)'
				},
				warning: {
					...colors.amber,
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
				// Consistent radius scale matching CSS variables
				'2xl': 'var(--radius-2xl)', // 24px - Decorative
				'xl': 'var(--radius-xl)',   // 16px - Modals, hero sections
				'lg': 'var(--radius)',      // 12px - Dialogs, panels (default)
				'md': 'var(--radius-md)',   // 8px - Buttons, cards
				'sm': 'var(--radius-sm)',   // 6px - Inputs, small buttons
				'xs': 'var(--radius-xs)',   // 4px - Badges, tags
				'full': 'var(--radius-full)', // Pills, circles
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
