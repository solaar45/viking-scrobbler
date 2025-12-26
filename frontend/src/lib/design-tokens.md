# Viking Scrobbler Design System

## Overview

Centralized design tokens for consistent UI/UX across all components.

## Usage

```tsx
import { VIKING_DESIGN, cn, getButtonClasses } from '@/lib/design-tokens'

// Use predefined classes
<input className={VIKING_DESIGN.components.input.base} />

// Combine with utility function
<button className={cn(
  getButtonClasses('primary'),
  'w-full'
)}>
  Click Me
</button>
```

## Design Principles

### Spacing Hierarchy
- **p-6**: Card/Container padding
- **space-y-6**: Between major sections
- **space-y-4**: Between related elements
- **space-y-3**: Within input groups (label → input → helper)

### Color Palette
- **viking-purple**: Primary brand color
- **viking-emerald**: Success states
- **red-400/500**: Error/destructive actions
- **yellow-400/500**: Warnings
- **blue-400/500**: Info messages

### Typography
- **card-title-dense**: Main card titles
- **text-sm font-medium**: Labels
- **text-xs text-viking-text-tertiary**: Helper text
- **font-mono text-sm**: Code/tokens

## Component Patterns

### Standard Settings Card

```tsx
<>
  {/* HEADER */}
  <div className={VIKING_DESIGN.layouts.header.wrapper}>
    <div className={VIKING_DESIGN.layouts.header.title}>
      <h3 className={VIKING_DESIGN.typography.title.card}>Title</h3>
      <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
      <span className={VIKING_DESIGN.layouts.header.subtitle}>
        Description
      </span>
    </div>
  </div>

  {/* CARD */}
  <div className={VIKING_DESIGN.components.card}>
    <div className={VIKING_DESIGN.components.cardContent}>
      {/* Content */}
    </div>
  </div>
</>
```

### Input Field

```tsx
<div className={VIKING_DESIGN.layouts.form.field}>
  <label className={VIKING_DESIGN.typography.label.base}>
    Label
  </label>
  <input className={VIKING_DESIGN.components.input.base} />
  <p className={VIKING_DESIGN.typography.helper}>
    Helper text
  </p>
</div>
```

### Buttons

```tsx
// Primary
<button className={getButtonClasses('primary')}>
  Save
</button>

// Secondary
<button className={getButtonClasses('secondary')}>
  Cancel
</button>

// Destructive
<button className={getButtonClasses('destructive')}>
  Delete
</button>
```

### Alerts

```tsx
// Success
<div className={getAlertClasses('success')}>
  <p className={VIKING_DESIGN.colors.status.success.text}>
    Success!
  </p>
</div>

// Error
<div className={getAlertClasses('error')}>
  <p className={VIKING_DESIGN.colors.status.error.text}>
    Error!
  </p>
</div>
```

## Button Variants

### Primary Button
Used for main actions (Save, Submit, Generate, etc.)
```tsx
<button className={getButtonClasses('primary')}>
  Primary Action
</button>
```
**Style**: Gradient purple, white text, shadow effects

### Secondary Button
Used for cancel, back, or less important actions
```tsx
<button className={getButtonClasses('secondary')}>
  Secondary Action
</button>
```
**Style**: Subtle background, border, no gradient

### Destructive Button
Used for delete, remove, disconnect actions
```tsx
<button className={getButtonClasses('destructive')}>
  Delete
</button>
```
**Style**: Red background, red text, no gradient

### Ghost Button
Used for inline links or minimal actions
```tsx
<button className={getButtonClasses('ghost')}>
  Edit
</button>
```
**Style**: No background, text only

## Alert Types

### Success Alert
```tsx
<div className={getAlertClasses('success')}>
  <CheckCircle2 className="w-5 h-5 text-viking-emerald" />
  <p className={VIKING_DESIGN.colors.status.success.text}>
    Operation successful!
  </p>
</div>
```

### Error Alert
```tsx
<div className={getAlertClasses('error')}>
  <AlertCircle className="w-5 h-5 text-red-400" />
  <p className={VIKING_DESIGN.colors.status.error.text}>
    Something went wrong!
  </p>
</div>
```

### Warning Alert
```tsx
<div className={getAlertClasses('warning')}>
  <AlertTriangle className="w-5 h-5 text-yellow-400" />
  <p className={VIKING_DESIGN.colors.status.warning.text}>
    Please be careful!
  </p>
</div>
```

### Info Alert
```tsx
<div className={getAlertClasses('info')}>
  <Info className="w-5 h-5 text-viking-text-secondary" />
  <p className="text-sm text-viking-text-secondary">
    Additional information here
  </p>
</div>
```

## Status Badges

### Connected Badge
```tsx
<div className={getBadgeClasses('success')}>
  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
  <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
    Connected
  </span>
</div>
```

### Disconnected Badge
```tsx
<div className={getBadgeClasses('error')}>
  <span className="h-2 w-2 rounded-full bg-red-400"></span>
  <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
    Not Connected
  </span>
</div>
```

## Form Validation

### Input with Error State
```tsx
<input 
  className={getInputClasses(hasError)} 
  aria-invalid={hasError}
/>
{hasError && (
  <p className={cn(VIKING_DESIGN.typography.helper, VIKING_DESIGN.colors.status.error.text)}>
    {errorMessage}
  </p>
)}
```

## Loading States

### Button Loading
```tsx
<button 
  className={getButtonClasses('primary')} 
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <RefreshCw className="w-4 h-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</button>
```

### Progress Indicator
```tsx
{isLoading && (
  <div className="space-y-2">
    <div className="h-2 bg-viking-bg-tertiary rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-viking-purple to-viking-purple-dark animate-pulse w-1/2 rounded-full"></div>
    </div>
    <p className={VIKING_DESIGN.typography.helper}>
      Processing...
    </p>
  </div>
)}
```

## Responsive Design

All components use Tailwind's responsive prefixes:
- **Mobile First**: Base styles apply to all screens
- **md:**: Tablet and up (768px+)
- **lg:**: Desktop and up (1024px+)

Example:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

## Dark Mode

The design system is built for dark mode by default using the Viking color palette. All colors have been optimized for dark backgrounds.

## Accessibility

- All interactive elements have focus states via `VIKING_DESIGN.effects.focus`
- Color contrast meets WCAG AA standards
- Semantic HTML elements are used
- ARIA labels are applied where needed

## Maintenance

When adding new components:
1. Check if existing tokens can be reused
2. Add new tokens to appropriate sections in `design-tokens.ts`
3. Document usage examples in this file
4. Follow existing naming conventions
5. Test in both light and dark modes (if applicable)

## Token Categories

### Spacing
- `cardPadding`, `sectionSpacing`, `elementSpacing`, `inputSpacing`, `inlineGap`

### Colors
- `card`, `border`, `text`, `status`

### Components
- `card`, `input`, `select`, `textarea`, `button`, `alert`, `badge`, `code`

### Typography
- `title`, `label`, `helper`, `subtitle`, `code`

### Effects
- `focus`, `transition`, `hover`, `loading`

### Layouts
- `header`, `form`, `grid`

## Migration Guide

To migrate existing components to use design tokens:

1. **Replace hardcoded classes**:
   ```tsx
   // Before
   <input className="w-full px-4 py-2.5 bg-viking-bg-tertiary..." />

   // After
   <input className={VIKING_DESIGN.components.input.base} />
   ```

2. **Use utility functions**:
   ```tsx
   // Before
   <button className="px-6 py-2.5 bg-gradient-to-r...">

   // After
   <button className={getButtonClasses('primary')}>
   ```

3. **Combine classes with cn()**:
   ```tsx
   <button className={cn(
     getButtonClasses('primary'),
     'w-full',
     isLoading && 'opacity-50'
   )}>
   ```

## Version History

- **v1.0.0** (2024-12-26): Initial design system creation
  - Defined spacing, color, and typography tokens
  - Created utility functions
  - Documented component patterns
