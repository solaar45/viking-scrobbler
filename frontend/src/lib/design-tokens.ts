/**
 * Viking Scrobbler Design System
 * Centralized design tokens for consistent UI across all components
 */

export const VIKING_DESIGN = {
  // ═══════════════════════════════════════════════════════════
  // SPACING
  // ═══════════════════════════════════════════════════════════
  spacing: {
    // Card/Container padding
    cardPadding: 'p-6',
    cardPaddingX: 'px-6',
    cardPaddingY: 'py-6',
    
    // Section spacing (between major sections)
    sectionSpacing: 'space-y-6',
    
    // Element spacing (between related elements)
    elementSpacing: 'space-y-4',
    
    // Input group spacing (label + input + helper)
    inputSpacing: 'space-y-3',
    
    // Inline element gaps
    inlineGap: {
      small: 'gap-2',
      medium: 'gap-3',
      large: 'gap-4',
    },
  },

  // ═══════════════════════════════════════════════════════════
  // COLORS
  // ═══════════════════════════════════════════════════════════
  colors: {
    // Card/Container backgrounds
    card: {
      base: 'bg-viking-bg-secondary border border-viking-border-default',
      elevated: 'bg-viking-bg-elevated',
      tertiary: 'bg-viking-bg-tertiary',
    },
    
    // Borders
    border: {
      default: 'border-viking-border-default',
      emphasis: 'border-viking-border-emphasis',
      purple: 'border-viking-purple',
      purpleSubtle: 'border-viking-purple/30',
    },
    
    // Text colors
    text: {
      primary: 'text-viking-text-primary',
      secondary: 'text-viking-text-secondary',
      tertiary: 'text-viking-text-tertiary',
      muted: 'text-viking-text-muted',
    },
    
    // Status colors
    status: {
      success: {
        bg: 'bg-viking-emerald/10',
        border: 'border-viking-emerald/30',
        text: 'text-viking-emerald',
      },
      error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
      },
      warning: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
      },
      info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
      },
    },
  },

  // ═══════════════════════════════════════════════════════════
  // COMPONENTS
  // ═══════════════════════════════════════════════════════════
  components: {
    // Card wrapper
    card: 'card-dense',
    
    // Card content wrapper
    cardContent: 'p-6 space-y-6',
    
    // Input fields
    input: {
      base: 'w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary placeholder:text-viking-text-tertiary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    
    // Select/Dropdown
    select: {
      base: 'w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    
    // Textarea
    textarea: {
      base: 'w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary placeholder:text-viking-text-tertiary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all resize-y min-h-[100px]',
    },
    
    // Buttons
    button: {
      // Primary gradient button (main actions)
      primary: 'px-6 py-2.5 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-sm font-semibold uppercase tracking-wide shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
      
      // Secondary button (less emphasis)
      secondary: 'px-6 py-2.5 bg-viking-bg-tertiary hover:bg-viking-bg-elevated border border-viking-border-emphasis rounded-lg text-sm font-semibold text-viking-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed',
      
      // Destructive button (delete, remove)
      destructive: 'px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      
      // Ghost/Link button (minimal style)
      ghost: 'px-4 py-2 text-viking-text-secondary hover:text-viking-purple transition-colors font-medium',
      
      // Icon button
      icon: 'p-2 hover:bg-viking-bg-elevated rounded-lg transition-colors',
    },
    
    // Info/Alert boxes
    alert: {
      success: 'bg-viking-emerald/10 border border-viking-emerald/30 rounded-lg p-5',
      error: 'bg-red-500/10 border border-red-500/30 rounded-lg p-5',
      warning: 'bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-5',
      info: 'bg-viking-bg-elevated rounded-lg p-4 border border-viking-border-default',
    },
    
    // Status badges
    badge: {
      success: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30',
      error: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30',
      warning: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30',
      info: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30',
    },
    
    // Code/Token display
    code: 'bg-viking-bg-secondary px-4 py-3 rounded-lg font-mono text-sm break-all select-all text-viking-text-primary border border-viking-border-default',
  },

  // ═══════════════════════════════════════════════════════════
  // TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════
  typography: {
    // Page/Card titles
    title: {
      page: 'text-2xl font-bold text-viking-text-primary',
      card: 'card-title-dense',
      section: 'text-base font-semibold text-viking-text-primary',
    },
    
    // Labels
    label: {
      base: 'block text-sm font-medium text-viking-text-primary mb-2',
      inline: 'text-sm font-medium text-viking-text-primary',
    },
    
    // Helper/Description text
    helper: 'text-xs text-viking-text-tertiary',
    
    // Subtitle/Badge text
    subtitle: 'text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider',
    
    // Code/Mono
    code: 'font-mono text-sm',
  },

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════
  effects: {
    // Focus rings
    focus: 'focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple',
    
    // Transitions
    transition: {
      fast: 'transition-all duration-150',
      base: 'transition-all duration-200',
      slow: 'transition-all duration-300',
    },
    
    // Hover effects
    hover: {
      lift: 'hover:shadow-xl hover:shadow-viking-purple/30',
      scale: 'hover:scale-105',
      brightness: 'hover:brightness-110',
    },
    
    // Loading/Animation
    loading: {
      spin: 'animate-spin',
      pulse: 'animate-pulse',
      bounce: 'animate-bounce',
    },
  },

  // ═══════════════════════════════════════════════════════════
  // LAYOUTS
  // ═══════════════════════════════════════════════════════════
  layouts: {
    // Header structure (consistent across all settings)
    header: {
      wrapper: 'flex items-center justify-between',
      title: 'flex items-center gap-3',
      separator: 'text-viking-border-emphasis text-xl font-light',
      subtitle: 'text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider',
    },
    
    // Form layouts
    form: {
      field: 'space-y-3',
      group: 'space-y-6',
    },
    
    // Grid layouts
    grid: {
      cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
      cols3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
    },
  },
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Combines multiple class strings safely
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Get alert classes based on type
 */
export function getAlertClasses(type: 'success' | 'error' | 'warning' | 'info'): string {
  return VIKING_DESIGN.components.alert[type]
}

/**
 * Get badge classes based on type
 */
export function getBadgeClasses(type: 'success' | 'error' | 'warning' | 'info'): string {
  return VIKING_DESIGN.components.badge[type]
}

/**
 * Get button classes based on variant
 */
export function getButtonClasses(
  variant: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'icon' = 'primary',
  disabled = false
): string {
  const base = VIKING_DESIGN.components.button[variant]
  return disabled ? `${base} disabled:opacity-50 disabled:cursor-not-allowed` : base
}

/**
 * Get input classes with optional error state
 */
export function getInputClasses(hasError = false): string {
  const base = VIKING_DESIGN.components.input.base
  return hasError
    ? base.replace('border-viking-border-default', 'border-red-500/50')
    : base
}
