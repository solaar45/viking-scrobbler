/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // NEUE FARB-PALETTE (Dark Mode + Akzente)
      colors: {
        // CSS Variables (bleiben für shadcn/ui Kompatibilität)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },

        // NEUE MUSIK-APP FARBEN (direkte Hex-Werte für einfache Nutzung)
        viking: {
          // Backgrounds (Dunkel → Hell)
          bg: {
            primary: '#0A0E12',      // Haupthintergrund
            secondary: '#141922',    // Cards/Panels
            tertiary: '#1E2530',     // Hover States
            elevated: '#252D3C',     // Erhöhte Elemente
          },
          
          // Text
          text: {
            primary: '#E8EAED',      // Haupttext (fast weiß)
            secondary: '#9AA0B0',    // Subtext (grau-blau)
            tertiary: '#6B7280',     // Disabled/Meta
          },
          
          // Akzentfarben (Musik-Vibe)
          purple: {
            DEFAULT: '#8B5CF6',      // Primary Lila
            light: '#A78BFA',        // Heller
            dark: '#7C3AED',         // Dunkler
          },
          pink: {
            DEFAULT: '#EC4899',      // Highlight Pink
            light: '#F472B6',
            dark: '#DB2777',
          },
          emerald: {
            DEFAULT: '#10B981',      // Live/Active Grün
            light: '#34D399',
            dark: '#059669',
          },
          
          // Borders
          border: {
            subtle: '#252D3C',       // Kaum sichtbar
            default: '#344155',      // Standard
            emphasis: '#475569',     // Hervorgehoben
          }
        }
      },
      
      // Font-Größen (harmonische Skala)
      fontSize: {
        'xs': '11px',      // Meta-Info
        'sm': '13px',      // Body/Labels
        'base': '15px',    // Standard
        'lg': '17px',      // Größere Body
        'xl': '20px',      // H3
        '2xl': '24px',     // H2
        '3xl': '30px',     // H1
        '4xl': '36px',     // Kleine Stats
        '5xl': '48px',     // Große Stats
        '6xl': '60px',     // Hero Stats
      },
      
      // Font-Weights (konsistent)
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        // extrabold/black NICHT verwenden!
      },
      
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
