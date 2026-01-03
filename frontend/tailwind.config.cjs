/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // === VIKING SCROBBLER DARK COLOR PALETTE ===
      colors: {
        // Background Layers (Darkest → Lightest)
        'viking-bg-primary': '#0A0E12',      // Main Background
        'viking-bg-secondary': '#141922',    // Cards, Sidebar
        'viking-bg-tertiary': '#1E2530',     // Elevated Elements
        'viking-bg-elevated': '#252D3C',     // Hover States

        // Text Hierarchy
        'viking-text-primary': '#E8EAED',    // Headings, Important Text
        'viking-text-secondary': '#9AA0B0',  // Body Text
        'viking-text-tertiary': '#6B7280',   // Meta Info, Labels

        // Accent Colors
        'viking-purple': '#8B5CF6',          // Primary Action (Violet)
        'viking-purple-dark': '#7C3AED',     // Purple Dark Variant
        'viking-pink': '#EC4899',            // Secondary Accent (Pink)
        'viking-emerald': '#10B981',         // Success, Live Indicators
        'viking-emerald-dark': '#059669',    // Emerald Dark Variant

        // Borders
        'viking-border-default': '#252D3C',  // Subtle Borders
        'viking-border-subtle': '#1E2530',   // Very Subtle Dividers
        'viking-border-emphasis': '#344155', // Emphasized Borders

        // Shadcn/UI Compatibility (Dark Mode Only)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      // === TYPOGRAPHY SCALE (Optimized for 16px base) ===
      fontSize: {
        // Caption & Micro
        'xs': ['13px', { lineHeight: '1.5', letterSpacing: '0.01em' }],     // Labels, Meta
        
        // Body
        'sm': ['15px', { lineHeight: '1.6' }],                              // Dense Tables, Secondary
        'base': ['16px', { lineHeight: '1.6' }],                            // Default Body (UX Standard)
        'lg': ['17px', { lineHeight: '1.6' }],                              // Emphasized Body
        
        // Headings
        'xl': ['20px', { lineHeight: '1.5' }],                              // Card Titles, Subsections
        '2xl': ['24px', { lineHeight: '1.4' }],                             // Section Titles
        '3xl': ['30px', { lineHeight: '1.3' }],                             // Page Titles
        
        // Display (Stats/Hero Numbers)
        '4xl': ['36px', { lineHeight: '1.2' }],                             // Large Stats
        '5xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],   // Hero Numbers
        '6xl': ['60px', { lineHeight: '1', letterSpacing: '-0.03em' }],     // Extra Large Display
      },

      // === FONT WEIGHTS (Streamlined) ===
      fontWeight: {
        normal: '400',    // Body text, descriptions
        medium: '500',    // Secondary emphasis, labels
        semibold: '600',  // Headings, important text
        bold: '700',      // Page titles, display numbers
        // Removed: 800 (extrabold), 900 (black) - too heavy for data dashboards
      },

      // === ANIMATIONS ===
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
