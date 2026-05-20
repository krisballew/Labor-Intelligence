# Labor Intelligence - Design System & Component Guide

## Color Palette

### Primary Colors

| Color | Value | Usage |
|-------|-------|-------|
| Teal Dark | `#0D5463` | Backgrounds, primary headers, icons |
| Teal | `#1B7A8A` | Primary buttons, links, accents |
| Teal Light | `#2A9DAD` | Hover states, secondary accents |

### Risk Status Colors

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| On Track | Emerald | `#059669` | Success states, healthy metrics |
| Caution | Amber | `#F59E0B` | Warning states, moderate risk |
| At Risk | Red | `#DC2626` | Error states, high risk |

### Semantic Colors

| Color | Value | Usage |
|-------|-------|-------|
| Orange (Variance) | `#E85D1F` | Cost/variance indicators |
| Orange Light | `#F5A623` | Secondary orange, hover |
| Navy (Text) | `#1F2937` | Primary text, headings |
| Gray (Text) | `#6B7280` | Secondary text, labels |

### Neutral Colors

| Color | Value | Usage |
|-------|-------|-------|
| White | `#FFFFFF` | Card backgrounds, modals |
| Gray 50 | `#F9FAFB` | Page background |
| Gray 100 | `#F3F4F6` | Secondary background |
| Gray 200 | `#E5E7EB` | Borders, grid lines |
| Gray 300 | `#D1D5DB` | Dividers |

---

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, sans-serif;
```

### Heading Styles

| Level | Size | Weight | Usage | Example |
|-------|------|--------|-------|---------|
| H1 | 36px | 700 (Bold) | Page title | "Portfolio Overview" |
| H2 | 24px | 700 (Bold) | Section header | "Hotels Requiring Attention" |
| H3 | 20px | 600 (Semibold) | Subsection | Hotel name in table |
| Label | 12px | 600 (Semibold) | Metric label | "HOTELS ON TRACK" |
| Body | 14px | 400 (Regular) | Description text | "53% of Portfolio" |
| Small | 12px | 400 (Regular) | Helper text | Secondary metrics |
| Tiny | 11px | 400 (Regular) | Data labels | Chart axis labels |

### Letter Spacing

- Labels: `0.05em` (uppercase)
- Body: `normal`

---

## Component Library

### MetricCard

**Purpose**: Display key performance indicator

**Props**:
```typescript
interface MetricCardProps {
  label: string;           // Uppercase label
  value: string | number;  // Large, bold value
  subtext?: string;        // Secondary info below value
  icon?: React.ReactNode;  // Optional icon (top right)
  className?: string;      // Additional Tailwind classes
}
```

**Variants**:

1. **Basic** (No Icon)
```
╔─────────────────────╗
│ HOTELS ON TRACK     │
│ 68                  │
│ 53% of Portfolio    │
└─────────────────────┘
```

2. **With Icon** (Icon Top Right)
```
╔──────────────────────┐
│ HOTELS ON TRACK   🏢 │
│ 68                   │
│ 53% of Portfolio     │
└──────────────────────┘
```

3. **With Currency**
```
╔──────────────────────┐
│ TOTAL LABOR VARIANCE │
│ $31,200              │ (Orange)
│ vs Plan              │ (Gray)
└──────────────────────┘
```

**Styling**:
- Background: White
- Border: 1px Gray 100
- Padding: 1.5rem (24px)
- Border-radius: 8px
- Box-shadow: subtle (0 1px 2px rgba...)

**Usage in Code**:
```tsx
<MetricCard
  label="Hotels On Track"
  value={metrics.hotelsOnTrack}
  subtext={`${percent}% of Portfolio`}
  icon={<Building2 className="w-8 h-8" />}
/>
```

---

### RiskBadge

**Purpose**: Visual indicator of property/metric risk level

**Props**:
```typescript
interface RiskBadgeProps {
  level: RiskLevel;  // 'on-track' | 'caution' | 'at-risk'
  text: string;      // Display text
}
```

**Variants**:

| Level | Background | Text | Icon |
|-------|------------|------|------|
| On Track | Emerald 100 | Emerald 700 | ✓ |
| Caution | Amber 100 | Amber 700 | ⚠ |
| At Risk | Red 100 | Red 700 | ⛔ |

**Example Display**:
```
[✓ On Track]  [⚠ Caution]  [⛔ At Risk]
```

**Usage in Code**:
```tsx
<RiskBadge level="at-risk" text="At Risk" />
```

---

### SectionHeader

**Purpose**: Consistent header for major sections

**Props**:
```typescript
interface SectionHeaderProps {
  title: string;        // Main heading
  icon?: React.ReactNode;
  subtitle?: string;    // Optional secondary text
}
```

**Layout**:
```
[Icon] Title
       Subtitle (if provided)
```

**Example**:
```
[⚠] Hotels Requiring Attention
    Top properties by labor variance impact
```

**Styling**:
- Title: Navy 900, 20px, Bold
- Subtitle: Gray 500, 12px, Regular
- Margin-bottom: 1.5rem
- Icon color: Teal Dark

---

### FilterButton

**Purpose**: Period or category filter toggle

**Props**:
```typescript
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}
```

**States**:

1. **Inactive**
```
┌──────────────────┐
│ Previous Month   │  (White bg, gray text, border)
└──────────────────┘
```

2. **Active**
```
┌──────────────────┐
│ Previous Month   │  (Teal bg, white text)
└──────────────────┘
```

**Styling**:
- Inactive: White, border Gray 200, text Gray 700
- Active: Teal background, white text
- Padding: 0.5rem 1rem (8px 16px)
- Border-radius: 8px
- Transition: all 200ms

---

### Currency Component

**Purpose**: Format and display monetary values with color

**Props**:
```typescript
interface CurrencyProps {
  amount: number;      // Dollar amount
  showCents?: boolean; // Include cents (default false)
}
```

**Display Rules**:
- Positive amounts (expense): Orange text, bold
- Negative amounts (savings): Emerald text, bold
- Format: `$X,XXX` or `$X,XXX.XX`

**Examples**:
```
$31,200      (Orange) - Overage
-$4,500      (Emerald) - Savings
$0           (Orange) - On budget
```

---

### Percentage Component

**Purpose**: Format and display percentage changes

**Props**:
```typescript
interface PercentageProps {
  value: number;        // Percentage (e.g., 3.8)
  showSign?: boolean;   // Show +/- (default true)
  isGood?: boolean;     // Override good/bad coloring
}
```

**Display Rules**:
- Positive (unfavorable): Orange text
- Negative (favorable): Emerald text
- Shows +/- sign if showSign=true
- Can override with isGood prop

**Examples**:
```
+3.8%        (Orange) - Over budget
-2.1%        (Emerald) - Under budget/productivity gain
```

---

## Card-Based Layout System

### Metric Card
```
┌─────────────────────────┐
│ [Icon] Label            │
│        12,345           │
│        Subtext          │
└─────────────────────────┘
```

**Padding**: 1.5rem
**Grid**: Responsive (1→2→5 columns)
**Gap**: 1rem (16px)

### Data Table Card
```
┌─────────────────────────┐
│ Header Row              │
├─────────────────────────┤
│ Data Row 1              │
│ Data Row 2              │
│ Data Row 3              │
├─────────────────────────┤
│ Footer Action           │
└─────────────────────────┘
```

**Cell Padding**: 1rem (16px)
**Row Hover**: Subtle gray background
**Borders**: Gray 100

### Chart Card
```
┌─────────────────────────┐
│  [Chart SVG]            │
├─────────────────────────┤
│ Legend Item 1           │
│ Legend Item 2           │
└─────────────────────────┘
```

**Padding**: 1.5rem
**Chart Height**: 300-400px
**Legend**: Below chart, horizontal layout

---

## Spacing & Layout

### Base Spacing Unit: 8px

| Multiplier | Size | Usage |
|-----------|------|-------|
| 0.5x | 4px | Micro spacing |
| 1x | 8px | Minimal spacing |
| 1.5x | 12px | Label padding |
| 2x | 16px | Standard padding |
| 3x | 24px | Card padding |
| 4x | 32px | Section spacing |
| 6x | 48px | Large section |
| 8x | 64px | Page padding |

### Grid System

**Max Width**: 1280px (80rem)
**Container Padding**: 2rem (32px) on sides

**Responsive Breakpoints**:
- Mobile: 320-640px (1 column)
- Tablet: 641-1024px (2 columns)
- Desktop: 1025px+ (3+ columns)

**Gap**: 1.5rem (24px) between sections
**Card Gap**: 1rem (16px) between cards in grid

---

## Shadows & Depth

```css
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);  /* Subtle - Cards */
box-shadow: 0 4px 6px 0 rgba(0, 0, 0, 0.1);   /* Medium - Modals (future) */
box-shadow: 0 10px 15px 0 rgba(0, 0, 0, 0.1); /* Large - Dropdowns (future) */
```

**Current Usage**: Subtle shadow on metric cards for depth

---

## Borders & Corners

**Border Radius**:
- `8px`: Standard (cards, buttons)
- `4px`: Subtle (badges, small elements)
- `12px`: Rounded (large interactive elements)

**Border Color**:
- Default: Gray 200
- Focus: Teal
- Hover: Gray 300

**Border Width**: 1px (standard)

---

## Tables

### Structure
```
┌────┬──────────┬────────┬────────┐
│ #  │ Property │ Status │ Amount │
├────┼──────────┼────────┼────────┤
│ 1  │ Property │ Badge  │ Value  │
│ 2  │ Property │ Badge  │ Value  │
│ 3  │ Property │ Badge  │ Value  │
└────┴──────────┴────────┴────────┘
```

**Header Row**:
- Background: White
- Font: 12px, uppercase, semibold
- Text color: Gray 700
- Border-bottom: Gray 200

**Data Rows**:
- Padding: 1rem (16px)
- Border-bottom: Gray 100
- Hover: Gray 50 background
- Font: 14px, regular

**First Column** (often ranking):
- Numbered badge (dark circle with number)
- Width: 32px, centered

---

## Charts

### Risk Distribution (Scatter Plot)

**SVG Dimensions**: Responsive to container
**Plot Area**: Centered with padding

**Grid Lines**:
- Vertical/horizontal dashed lines
- Color: Gray 200
- Positions: Low (0), Medium (50), High (100)

**Data Points**:
- Circle radius: 7px
- Fill: Risk-level color
- Opacity: 0.8
- Hover: Opacity 1.0

**Axes**:
- Color: Navy 900
- Font: 12px

**Legend**:
- Horizontal layout below chart
- Color squares + label text
- Count and percentage

**Background Zones** (optional):
- Low-Low: Blue tint
- Low-High/High-Low: Amber tint
- High-High: Red tint
- Opacity: 0.3 (subtle)

### Variance Drivers (Horizontal Bars)

**Layout**: Stacked list

**Per Driver**:
- Category icon + name (left)
- Amount + percentage (right)
- Horizontal bar (full width)
- Description text (small, gray)

**Bar**:
- Height: 8px
- Background: Gray 100
- Fill: Gradient Orange to Orange-Light
- Border-radius: Full (16px)

**Spacing**: 1rem (16px) between items

---

## Interactions

### Hover States

**Buttons**:
```
Default: White, Gray border
Hover:   Gray 50, Teal border
Active:  Teal, White text
```

**Table Rows**:
```
Default: White
Hover:   Gray 50 background
```

**Links**:
```
Default: Teal, no underline
Hover:   Darker Teal, underline
Active:  Visited color (if needed)
```

### Focus States

**Keyboard Navigation**:
- Outline: 2px solid Teal
- Outline-offset: 2px
- Supports accessibility

---

## Responsive Design

### Mobile (< 641px)

- Single column layout
- Full-width cards
- Larger touch targets (48px min)
- Hamburger menu (future nav)
- Stacked tables (card-based instead of table)

### Tablet (641px - 1024px)

- Two-column layout
- Moderate card sizes
- Touch-friendly spacing
- Adjusted font sizes

### Desktop (> 1024px)

- Three+ column layout
- Optimized information density
- Full-featured tables
- Sidebar navigation (future)

### Tailwind Responsive Classes

```tsx
// Grid responsive example
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  {/* 1 col mobile, 2 col tablet, 5 col desktop */}
</div>
```

---

## Accessibility

### Color Contrast

- Text on white: Navy 900 (16:1 ratio)
- Text on color: White (12:1+ ratio)
- Risk badges: Pass WCAG AA

### Keyboard Navigation

- Tab order: logical (left→right, top→bottom)
- Focus visible: 2px outline
- Skip links (future): Jump to main content

### Screen Readers

- Semantic HTML
- ARIA labels where needed
- Icon buttons have text labels
- Tables have proper headers

### Motion

- Transitions: 200ms standard
- No auto-playing animations
- Respects prefers-reduced-motion (future)

---

## Using Tailwind CSS

### Utility Classes Used

```tailwind
/* Colors */
bg-white, bg-gray-50, bg-gray-100, bg-teal-dark, bg-teal
text-gray-900, text-gray-600, text-orange, text-emerald-600

/* Layout */
flex, grid, gap, padding (p-), margin (m-)

/* Typography */
text-sm, text-lg, font-bold, font-semibold, uppercase

/* Interactive */
hover:, transition-, opacity-, cursor-pointer

/* Responsive */
md:, lg: (medium, large breakpoints)
```

### Custom Component Classes

```css
/* src/index.css */
@layer components {
  .metric-card { /* ... */ }
  .risk-badge { /* ... */ }
  .risk-on-track, .risk-caution, .risk-at-risk { /* ... */ }
}
```

---

## Design File Structure

```
Design Assets/
├── Colors/
│   ├── Palette.json
│   └── RiskLevels.json
├── Components/
│   ├── MetricCard.fig
│   ├── RiskBadge.fig
│   ├── FilterButton.fig
│   └── ... (Figma or similar)
├── Layouts/
│   ├── Mobile.fig
│   ├── Tablet.fig
│   └── Desktop.fig
└── Charts/
    ├── RiskDistribution.fig
    ├── VarianceDrivers.fig
    └── ... (Chart templates)
```

---

## Implementation Checklist

- [x] Color palette defined and applied
- [x] Typography hierarchy established
- [x] Base components created (MetricCard, RiskBadge, etc.)
- [x] Responsive grid system implemented
- [x] Card-based layout patterns
- [x] Hover/focus states
- [x] Accessibility basics (contrast, semantic HTML)
- [ ] Mobile navigation (future)
- [ ] Dark mode support (future)
- [ ] Animation/transition polish (future)
- [ ] Storybook component documentation (future)
- [ ] Design tokens/theme system (future)

---

## Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Color Tool**: https://chir.mn/projects/tints
- **Typography**: https://fonts.google.com
- **Icons**: https://lucide.dev
- **Accessibility**: https://www.a11y-101.com

---

## Design Decisions Log

### Why Teal + Orange?

- Teal: Professional, trustworthy, associated with analysis
- Orange: Warm, alerts attention, differentiates from primary
- High contrast: WCAG AA compliant
- Colorblind-friendly: Distinct without relying on red/green alone

### Why Card-Based?

- Information chunking for executive readership
- Responsive design handles variety of screen sizes
- Consistent visual pattern across all pages
- Easy to add/remove sections

### Why SVG Charts?

- Scalable to any screen size
- Lightweight (text-based)
- No external dependencies
- Customizable styling with CSS/code

---

## Future Enhancements

1. **Storybook Integration**: Component playground
2. **Design System Docs**: Figma → Storybook sync
3. **Dark Mode**: Automatic + user preference
4. **Motion**: Subtle animations, loading states
5. **Print Styles**: PDF-friendly layouts
6. **Theme Customization**: Brand colors, logos
7. **Icons Library**: Expand beyond Lucide
