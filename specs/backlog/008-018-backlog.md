# Backlog Specs
# FILE LOCATION: C:\Users\Simon\carscout\specs\backlog\008-018-backlog.md
# Move individual specs to specs/active/ when ready to work on them

---

# SPEC-008: Dark Mode
## Status: backlog
## Problem
No dark mode. Evening research tool. High quality-of-life impact. ~30 minute fix.
## Files to Create
- components/theme-provider.tsx
- components/theme-toggle.tsx
## Files to Modify
- app/layout.tsx — wrap with ThemeProvider
- tailwind.config.ts — ensure darkMode: 'class'
- app/globals.css — dark mode CSS variables
- components/car-card.tsx, car-detail.tsx, filter-bar.tsx — dark: prefix classes
## Done When
1. [ ] Sun/moon toggle in header
2. [ ] Clicking switches to dark mode
3. [ ] All text readable in dark mode
4. [ ] Theme persists on refresh
## Docs to Update
- docs/02-CURRENT-STATE.md — SPEC-008 done
## Dependencies: None
## Out of Scope: System preference detection

---

# SPEC-009: Page Title Fix
## Status: backlog
## Problem
Browser tab reads "Create Next App". 5 minute fix.
## Files to Modify
- app/layout.tsx — update metadata export
## Implementation
```typescript
export const metadata: Metadata = {
  title: 'CarScout — Find dit næste køretøj på ærlig TCO',
  description: 'Sammenlign biler på ægte totalomkostning — ikke listepris.',
}
```
## Done When
1. [ ] Browser tab shows "CarScout — Find dit næste køretøj på ærlig TCO"
## Docs to Update
- docs/03-BUGS.md — BUG-03 resolved
## Dependencies: None

---

# SPEC-010: Listing Card Redesign (TCO-First)
## Status: backlog
## Problem
Cards lead with EUR sticker price. Should lead with TCO monthly. Also missing: price drop badge, days-on-market badge, favorite heart.
## New Card Layout
```
[Image — fuel badge top-right, country flag top-left]
[↓ 25.000 kr badge if price dropped — amber]
[Brand Model]
[Variant]
[Year · Mileage · Days badge]
[~4.200 kr/md · 3 år privat]   ← PRIMARY large
[Listepris: 19.810 EUR]         ← secondary muted
[♡ bottom right]
```
## Files to Modify
- components/car-card.tsx
## Done When
1. [ ] TCO is visually larger than sticker price
2. [ ] Price drop badge shows on relevant cards
3. [ ] Days-on-market badge with color coding (green/amber/red)
4. [ ] Heart icon on hover, persists in localStorage
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: SPEC-007 (TCO must work first)

---

# SPEC-011: Global Scenario Selector
## Status: backlog
## Problem
Each card shows minimum TCO across all scenarios — different scenario per card. A private 3yr buyer cannot compare meaningfully.
## Approach
Persistent selector above filter bar. All cards update to show TCO for selected scenario.
## Files to Create
- components/scenario-selector.tsx
- lib/scenario-store.ts
## Files to Modify
- app/page.tsx — add ScenarioSelector, pass scenario to cards
- components/car-card.tsx — filter TcoScenarios to matching scenario
## Done When
1. [ ] Selector shows Privat/Erhverv, 2/3/5 år, udbetaling amount
2. [ ] Changing selection updates all card TCO figures
3. [ ] Default: Privat, 3 år, 200.000 kr
4. [ ] Persists on refresh
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: SPEC-007

---

# SPEC-012: Favorites
## Status: backlog
## Problem
No way to save interesting listings. Required for comparison view.
## Files to Create
- lib/favorites.ts — FavoriteStore class (add, remove, has, getAll)
- app/favorites/page.tsx
## Files to Modify
- components/car-card.tsx — heart icon (if not in SPEC-010)
## Implementation
```typescript
class FavoriteStore {
  add(listingId: string): void
  remove(listingId: string): void
  has(listingId: string): boolean
  getAll(): string[]
}
// Max 10 favorites. Error if at limit.
```
## Done When
1. [ ] Heart icon on cards, filled when favorited
2. [ ] /favorites page shows saved listings
3. [ ] Persists on refresh
4. [ ] Error shown at 11th favorite
## Docs to Update
- docs/02-CURRENT-STATE.md
- docs/06-SCHEMA.md — note favorites table needed for future auth
## Dependencies: SPEC-010 (card redesign)

---

# SPEC-013: Comparison View
## Status: backlog
## Problem
Tagline says "TCO Car Comparison" but comparison doesn't exist.
## Files to Create
- app/compare/page.tsx
- components/comparison-bar.tsx — sticky "Sammenlign X biler →"
- lib/comparison-store.ts — max 3 listings
## Files to Modify
- components/car-card.tsx — add checkbox
- app/page.tsx — add ComparisonBar
## Done When
1. [ ] Checkbox on cards, sticky bar appears at 2+ selected
2. [ ] /compare shows side-by-side TCO table
3. [ ] Lowest value per row highlighted green
4. [ ] Max 3 cars
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: SPEC-007, SPEC-012

---

# SPEC-014: Navigation Bar
## Status: backlog
## Problem: Header has logo only, no navigation.
## Nav items: Søg | Gemte biler | Sammenlign | Hvad er TCO? + theme toggle
## Files to Modify
- app/layout.tsx or app/page.tsx
## Done When
1. [ ] Nav links in header
2. [ ] Active page highlighted
3. [ ] Mobile: hamburger menu
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: SPEC-012, SPEC-013, SPEC-017

---

# SPEC-015: Search Filters — Make/Model/Year/Mileage
## Status: backlog
## Problem: Can only filter by fuel, source, country, price. Missing brand/model/year/km/power.
## Files to Modify
- components/filter-bar.tsx — add fields
- app/api/cars/route.ts — add new filter params
- lib/db/cars.ts — update listCars()
## Done When
1. [ ] Brand dropdown populated from database
2. [ ] Model cascades from brand
3. [ ] Year range works
4. [ ] Max km works
5. [ ] Active filters shown as dismissible chips
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: None

---

# SPEC-016: Price Drop and Days-on-Market Badges
## Status: backlog
## Problem: price_history collecting but not shown in UI.
## Approach: Compute signals server-side in list API, display as badges on cards.
## Add to list API response
- price_drop_dkk: number | null
- days_on_market: number
## Files to Modify
- app/api/cars/route.ts — add computed fields
- components/car-card.tsx — display badges
## Done When
1. [ ] "87 dage" red badge on 90+ day listings
2. [ ] "↓ 25.000 kr" amber badge on price-dropped listings
3. [ ] No errors on listings with no history
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: SPEC-006 (price_history must be collecting — done ✅)

---

# SPEC-017: About Page / TCO Explainer
## Status: backlog
## Problem: First-time visitors have no context for what TCO means or why sticker price is misleading.
## Files to Create
- app/about/page.tsx
## Content (in Danish)
1. Hvorfor listepris er vildledende (registration tax example)
2. De tre scenarier (DK reg, DK unreg, EU import)
3. Hvad det månedlige beløb inkluderer
4. Finansieringsfølsomhed forklaret
5. Datakilde og opdateringsfrekvens
6. Begrænsninger
## Done When
1. [ ] Page at /about with all 6 sections
2. [ ] Concrete example with real numbers
3. [ ] Mobile readable
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: None

---

# SPEC-018: EU Import Scenario in Detail View
## Status: backlog
## Problem: DE-sourced listings show purchase/company scenarios but not EU import separately.
## Files to Modify
- components/car-detail.tsx — add EU import column/tab to TCO table
## Done When
1. [ ] EU import column in TCO table for DE listings
2. [ ] Shows VAT saving, import costs, registration tax as line items
3. [ ] DK listings show note that EU import doesn't apply
## Docs to Update
- docs/02-CURRENT-STATE.md
## Dependencies: SPEC-006 (detail page working)
