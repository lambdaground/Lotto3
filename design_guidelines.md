# South Korean Lotto 6/45 App - Design Guidelines

## Design Approach
**System**: Material Design principles adapted for data-dense lottery application with Korean aesthetics. The interface prioritizes clarity, statistical visualization, and quick number generation workflows.

## Core Design Principles
1. **Data-First Hierarchy**: Statistics and numbers are the hero content
2. **Immediate Action**: Number generation accessible within 1 click from any page
3. **Cultural Localization**: Korean typography prominence with seamless multi-language support
4. **Trust Through Transparency**: Historical data visibility builds credibility

---

## Typography System

**Korean Primary Font**: Noto Sans KR (via Google Fonts)
**Western/Numbers Font**: Inter or Roboto

**Hierarchy**:
- H1 (Page Titles): 3xl (mobile) / 5xl (desktop), font-bold
- H2 (Section Headers): 2xl (mobile) / 3xl (desktop), font-semibold  
- H3 (Card Titles): xl / 2xl, font-semibold
- Body Text: base / lg, font-normal
- Statistics/Numbers: 2xl-4xl, font-bold (tabular-nums for alignment)
- Captions: sm, font-medium

---

## Layout System

**Spacing Scale**: Tailwind units 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 (mobile) / p-6 (desktop)
- Section spacing: py-12 (mobile) / py-16 (desktop)
- Card gaps: gap-4 or gap-6
- Container max-width: max-w-7xl

**Grid System**:
- Dashboard: 1 column (mobile) / 2-3 columns (desktop) grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Statistics: 1 column (mobile) / 2 columns (desktop) for charts

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed position with slight elevation
- Logo (left), Main nav links (center), Language selector + Generate CTA (right)
- Mobile: Hamburger menu with slide-out drawer
- Height: h-16, padding px-4 md:px-8

### Lottery Ball Display
**Ball Specifications**:
- Size: w-12 h-12 (mobile) / w-16 h-16 (desktop)
- Shape: rounded-full
- Typography: text-xl md:text-2xl font-bold
- Spacing: gap-2 md:gap-3 in flex container
- User-specified colors by range (1-10: Yellow, 11-20: Blue, 21-30: Red, 31-40: Gray, 41-45: Green)

### Dashboard Cards
**Card Structure**:
- Border with rounded-xl
- Padding: p-6
- Shadow: shadow-sm with hover:shadow-md transition
- Header with icon (from Lucide-react) + title + action button

**Quick Generator Card**:
- Prominent placement: Top-left of dashboard grid
- Large "Generate" button: Full width, h-12, text-lg font-semibold
- Display generated numbers immediately below button
- "Regenerate" icon button (RotateCw from Lucide)

**Latest Winning Numbers Card**:
- Draw number + date display (text-sm)
- Ball display horizontally
- Bonus ball separator with subtle divider
- "View All History" link

**Statistics Preview Card**:
- Mini bar chart showing top 5 hot numbers
- "See Full Analysis" CTA

### Custom Selection Interface
**Number Picker**:
- 45 buttons arranged in grid-cols-5 md:grid-cols-9
- Button size: w-10 h-10 md:w-12 h-12
- States: Default, Selected (filled with ball color), Disabled
- Selected count indicator: "Selected: X/5"
- Clear selection + Auto-fill remaining buttons below grid

### Statistics Page
**Tab Navigation**:
- Horizontal tabs: "Hot Numbers", "Cold Numbers", "Pair Analysis", "Time Trends"
- Active tab: border-b-2 indicator
- Tab content: Consistent pt-6 spacing

**Filter Controls**:
- Year dropdown + Month dropdown side-by-side
- Apply filter button
- Results count display: "Showing X draws"

**Chart Containers**:
- Minimum height: min-h-[300px] md:min-h-[400px]
- Responsive: Full width with max-w-4xl for readability
- Chart.js integration with Tailwind-coordinated theme

**Hot/Cold Number Display**:
- Top 10 list with rank, number (as ball), frequency count, percentage bar
- Grid layout: grid-cols-1 md:grid-cols-2 for comparison

**Pair Analysis**:
- Card grid showing most frequent pairs
- Each pair: Two balls side-by-side + occurrence count
- Limit display to top 20 pairs for performance
- Pagination controls at bottom

### History Table
**Table Structure**:
- Sticky header row
- Columns: Draw #, Date, Numbers (balls), Bonus, Details link
- Responsive: Scroll horizontally on mobile, full table on desktop
- Rows: Alternating subtle background for readability
- Pagination: 20 draws per page

### CTA Buttons
**Primary Actions**:
- Generate buttons: h-12, px-8, text-base font-semibold, rounded-lg
- Icon + text combination where appropriate
- Loading state: Spinner icon (Loader2 from Lucide with animate-spin)

**Secondary Actions**:
- Height: h-10, px-6, text-sm font-medium
- Border style with transparent background

---

## Page Layouts

### Dashboard (Home)
- Hero section: Welcome message + current draw info + countdown (if applicable)
- 3-column grid (desktop): Quick Generator | Latest Results | Statistics Preview
- Additional row: Historical trends chart (full-width)
- Footer: Quick links to all features

### Generate Page
- Two-column layout (desktop): Custom selector (left) | Quick generator + history (right)
- Mobile: Stacked, custom selector first
- Generated numbers display prominently with "Save" and "Share" options

### Statistics & Analysis Page
- Full-width filter bar at top
- Tab navigation below filters
- Main content area with charts/tables based on active tab
- Sidebar (desktop): Quick stats summary cards

### History Page
- Filter/search bar at top
- Full-width table
- Pagination controls

---

## Interactions & Animations
**Minimal Motion**:
- Hover state: Subtle scale or shadow increase (scale-105, shadow-md)
- Number generation: Subtle fade-in of balls sequentially (delay-75, delay-150, etc.)
- Tab switching: Instant content swap, no slide animations
- Chart rendering: Default Chart.js animations (keep brief)

---

## Responsive Breakpoints
- Mobile: Base (320px+)
- Tablet: md (768px+)
- Desktop: lg (1024px+)
- Large Desktop: xl (1280px+)

Stack all multi-column layouts to single column below md breakpoint.

---

## Accessibility
- All interactive balls: role="button", aria-label with number
- Form inputs: Associated labels, aria-describedby for hints
- Language selector: aria-label indicating current language
- Skip to main content link
- Focus indicators: ring-2 ring-offset-2 on all interactive elements

---

## Iconography
**Lucide-react icons** (via CDN):
- Sparkles: Generate action
- TrendingUp: Statistics/Hot numbers
- TrendingDown: Cold numbers  
- History: Past results
- RotateCw: Regenerate
- Languages: Language selector
- Calendar: Date filters

Icon size: w-5 h-5 (inline) / w-6 h-6 (standalone)