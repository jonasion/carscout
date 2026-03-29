# SPEC-008: Dark Mode

## Status
backlog

## Domain Objects Touched
None (UI only)

## Problem
The site has no dark mode. It is used primarily in the evening for research. Every competitor car site in Denmark supports dark mode. This is a 30-minute fix with high quality-of-life impact.

## Approach
Tailwind's `darkMode: 'class'` strategy. Add a ThemeProvider that reads/writes `localStorage` key `carscout-theme`. Add sun/moon toggle to the header.

## Files to Create
- `components/theme-provider.tsx` — context provider, reads/writes localStorage
- `components/theme-toggle.tsx` — sun/moon button component

## Files to Modify
- `app/layout.tsx` — wrap with ThemeProvider, add `dark` class to html element
- `tailwind.config.ts` — ensure `darkMode: 'class'` is set
- `app/globals.css` — add dark mode CSS variables
- `components/car-card.tsx` — add dark: prefix classes where needed
- `components/car-detail.tsx` — add dark: prefix classes where needed
- `components/filter-bar.tsx` — add dark: prefix classes where needed

## Files NOT to Touch
- Any API routes
- Any lib/ files

## Done When
1. [ ] A sun/moon icon appears in the header (top right)
2. [ ] Clicking it switches the entire site to dark mode
3. [ ] All text is readable in dark mode (no white-on-white)
4. [ ] Card images still display correctly in dark mode
5. [ ] Refreshing preserves the selected theme

## Dependencies
None.

## Out of Scope
- System preference detection (follow OS setting) — future enhancement
- Per-page theme — site-wide only

---

# SPEC-009: Page Title and Meta Tags

## Status
backlog

## Domain Objects Touched
None

## Problem
Browser tab reads "Create Next App" — the Next.js default. Unprofessional and breaks bookmarking.

## Files to Modify
- `app/layout.tsx` — update metadata export

## Implementation Notes
```typescript
export const metadata: Metadata = {
  title: 'CarScout — Find dit næste køretøj på ærlig TCO',
  description: 'Sammenlign biler på ægte totalomkostning — ikke listepris. Scraper Bilbasen og Autoscout24 dagligt.',
}
```

## Done When
1. [ ] Browser tab shows "CarScout — Find dit næste køretøj på ærlig TCO"
2. [ ] No other changes to the site

## Dependencies
None.

## Out of Scope
Everything else.

---

# SPEC-010: Listing Card Redesign (TCO-First Layout)

## Status
backlog

## Domain Objects Touched
Listing, TcoScenario, PriceEvent

## Problem
Cards currently lead with EUR sticker price. For a Danish buyer this number is nearly meaningless without registration tax applied. The card hierarchy should lead with TCO monthly and treat sticker price as secondary context.

Additionally: no price drop signal, no days-on-market signal, no favorite button.

## Approach
Redesign card information hierarchy. Add PriceEvent-derived badges. Add favorite heart icon.

## New Card Layout
```
[Image with fuel badge top-right, country flag top-left]
[Price drop badge if applicable: "↓ 25.000 kr" amber]
[Brand Model]
[Variant]
[Year · Mileage · Days on market badge]
[TCO: ~4.200 kr/md · 3 år privat]    ← PRIMARY, large
[Listepris: 19.810 EUR]               ← SECONDARY, muted
[♡ favorite icon, bottom right]
```

## Files to Modify
- `components/car-card.tsx` — full layout redesign

## Files NOT to Touch
- API routes
- Database layer

## Implementation Notes
- Price drop: compare first and last PriceEvent from `car.price_history`
- Days on market: `Math.floor((now - first_seen_at) / 86400000)`
- Days badge color: green < 30 days, amber 30–90, red > 90
- Favorite: localStorage only for now (see SPEC-012)
- TCO label: "3 år privat" until global scenario selector exists (SPEC-011)

## Done When
1. [ ] TCO figure is visually larger/more prominent than sticker price
2. [ ] Sticker price is still visible but smaller/muted
3. [ ] Cards with price drops show amber "↓ X kr" badge
4. [ ] Cards show days on market with correct color coding
5. [ ] Heart icon appears on card hover
6. [ ] Clicking heart adds to localStorage favorites
7. [ ] Favorited cars show filled heart on return

## Dependencies
- SPEC-007 (BUG-02 — TCO must be working on cards first)
- SPEC-006 (BUG-01 — price_history returned in listing API)

## Out of Scope
- Comparison view (SPEC-013)
- Global scenario selector (SPEC-011)
- Supabase-persisted favorites (future, post-auth)

---

# SPEC-011: Global Scenario Selector

## Status
backlog

## Domain Objects Touched
TcoScenario, TcoConfig

## Problem
Every card shows the minimum TCO across all scenarios — which may be a different scenario for each car. A user who is a private buyer holding for 3 years cannot compare cars meaningfully because card A shows "2yr company" and card B shows "3yr private."

## Approach
Add a persistent scenario selector to the top of the listing page. Stores selection in localStorage. All TCO figures on all cards update to reflect the selected scenario.

## Selector Options
```
Bruger:     [ Privat ]  [ Erhverv ]
Periode:    [ 2 år ]  [ 3 år ]  [ 5 år ]
Udbetaling: [______ kr]  (slider or input, 100k–400k)
```

## Files to Create
- `components/scenario-selector.tsx` — the selector UI component
- `lib/scenario-store.ts` — read/write scenario to localStorage

## Files to Modify
- `app/page.tsx` — add ScenarioSelector above FilterBar, pass scenario down
- `components/car-card.tsx` — accept scenario prop, filter TcoScenarios to matching scenario instead of minimum

## Done When
1. [ ] Scenario selector appears above filter bar
2. [ ] Changing "Privat/Erhverv" updates all card TCO figures
3. [ ] Changing "2/3/5 år" updates all card TCO figures
4. [ ] Selection persists on page refresh
5. [ ] Default is: Privat, 3 år, 200.000 kr udbetaling

## Dependencies
- SPEC-007 (BUG-02 — TCO must work first)

## Out of Scope
- Per-car scenario override on detail page (existing behaviour stays)
- Server-side filtering by scenario (client-side filtering is sufficient)

---

# SPEC-012: Favorites

## Status
backlog

## Domain Objects Touched
Listing, Favorite

## Problem
No way to save interesting listings. The comparison workflow (SPEC-013) depends on this.

## Approach
`FavoriteStore` class wrapping localStorage. Heart icon on cards. Dedicated "Gemte biler" page showing saved listings.

## Files to Create
- `lib/favorites.ts` — FavoriteStore class
- `app/favorites/page.tsx` — saved listings page

## Files to Modify
- `components/car-card.tsx` — add heart icon (if not done in SPEC-010)
- `app/page.tsx` — add navigation link

## Implementation Notes
```typescript
class FavoriteStore {
  private key = 'carscout-favorites'
  
  add(listingId: string): void
  remove(listingId: string): void
  has(listingId: string): boolean
  getAll(): string[]  // returns array of listing IDs
  clear(): void
}
```

Max 10 favorites. If at limit, show toast: "Maks 10 gemte biler. Fjern en for at tilføje."

## Done When
1. [ ] Heart icon on cards, filled when favorited
2. [ ] Clicking heart adds/removes from localStorage
3. [ ] "/favorites" page shows all saved listings as cards
4. [ ] Favorites survive page refresh and navigation
5. [ ] Favoriting the 11th listing shows an error message

## Dependencies
- SPEC-010 (card redesign — heart icon may already be added there)

## Out of Scope
- Supabase-persisted favorites (requires auth — future)
- Sharing favorites with others

---

# SPEC-013: Comparison View

## Status
backlog

## Domain Objects Touched
Listing, TcoScenario, Favorite

## Problem
The site tagline says "TCO Car Comparison" but comparison doesn't exist. This is the feature that most directly demonstrates CarScout's value.

## Approach
Checkbox on cards (max 3 selected). Sticky bottom bar when 2+ selected. Comparison page with side-by-side TcoScenario table.

## Files to Create
- `app/compare/page.tsx` — comparison view
- `components/comparison-bar.tsx` — sticky bottom bar "Sammenlign X biler →"
- `lib/comparison-store.ts` — manages selected listing IDs (max 3), localStorage

## Files to Modify
- `components/car-card.tsx` — add checkbox on hover/select mode
- `app/page.tsx` — add ComparisonBar component

## Comparison Table Structure
```
                    [Car A]         [Car B]         [Car C]
Listepris           19.810 EUR      285.000 DKK     22.500 EUR
Registreringsafgift —               —               185.000 DKK
På vejen            —               285.000 DKK     —

2 år, privat        6.200 kr/md     8.100 kr/md     5.900 kr/md  ← winner highlighted
3 år, privat        4.800 kr/md     6.200 kr/md     4.500 kr/md
5 år, privat        3.900 kr/md     5.100 kr/md     3.700 kr/md
2 år, erhverv       7.100 kr/md     9.200 kr/md     6.800 kr/md
3 år, erhverv       5.500 kr/md     7.100 kr/md     5.200 kr/md
5 år, erhverv       4.500 kr/md     5.800 kr/md     4.200 kr/md
```

Highlight the lowest value in each row in green.

## Done When
1. [ ] Cards show a checkbox on hover
2. [ ] Selecting 2+ cards shows sticky bottom bar "Sammenlign 2 biler →"
3. [ ] Clicking bar navigates to /compare
4. [ ] Comparison page shows side-by-side table with all scenarios
5. [ ] Lowest value in each row is highlighted green
6. [ ] Max 3 cars can be selected simultaneously

## Dependencies
- SPEC-007 (BUG-02 — TCO must work)
- SPEC-011 (Global scenario selector helpful but not required)

## Out of Scope
- Saving comparisons
- Sharing comparison URLs (future)
- More than 3 cars at once

---

# SPEC-014: Navigation Bar

## Status
backlog

## Domain Objects Touched
None (UI only)

## Problem
Header has only a logo. No navigation. Users cannot find the favorites page or comparison view.

## Files to Modify
- `app/layout.tsx` OR `app/page.tsx` — add nav links to header

## Nav Items
```
CarScout [logo]     Søg | Gemte biler | Sammenlign | Hvad er TCO?
                                                    [theme toggle]
```

## Done When
1. [ ] Navigation links appear in header
2. [ ] "Søg" links to /
3. [ ] "Gemte biler" links to /favorites
4. [ ] "Sammenlign" links to /compare
5. [ ] "Hvad er TCO?" links to /about
6. [ ] Active page is highlighted in nav
7. [ ] Mobile: nav collapses to hamburger menu

## Dependencies
- SPEC-012 (Favorites page must exist)
- SPEC-013 (Compare page must exist)
- SPEC-018 (About page must exist)

## Out of Scope
- User accounts / login

---

# SPEC-015: Search Filters — Make/Model/Year/Mileage

## Status
backlog

## Domain Objects Touched
Listing

## Problem
Current filters: fuel type, source, country, price range. Missing: brand, model, year range, max mileage, power. Without these, the 50+ result set is not meaningfully searchable.

## Approach
Expand FilterBar with additional fields. Populate brand/model dropdowns from distinct values in database. Add year range and mileage slider.

## Files to Modify
- `components/filter-bar.tsx` — add new filter fields
- `app/api/cars/route.ts` — add brand, model, year_min, year_max, max_km, min_kw filters to listCars query
- `lib/db/cars.ts` — update listCars() to support new filter params

## New Filter Fields
- Brand dropdown (populated from `SELECT DISTINCT brand FROM cars_raw ORDER BY brand`)
- Model dropdown (cascades from brand selection)
- Year from/to (number inputs)
- Max km (number input)
- Min power kW (number input)

## Done When
1. [ ] Brand dropdown is populated with real brands from database
2. [ ] Selecting a brand populates model dropdown
3. [ ] Year range filter works (shows only cars from/to year)
4. [ ] Max km filter works
5. [ ] Filters clear when "Nulstil" button clicked
6. [ ] Active filters shown as dismissible chips below filter bar

## Dependencies
None.

## Out of Scope
- TCO filter (SPEC-016 — separate spec, depends on F-01)
- URL persistence of filters (future enhancement)
- Server-side pagination (SPEC-015b)

---

# SPEC-016: Price Drop and Days-on-Market Badges

## Status
backlog

## Domain Objects Touched
Listing, PriceEvent

## Problem
PriceEvent data is being collected but not surfaced in the UI. Price drops and days-on-market are the two highest-signal negotiation indicators available.

## Approach
Derive signals from `price_history` array already returned by `/api/cars/[id]/route.ts`. Display as badges on cards.

## Badge Logic
```typescript
// Price drop
const history = car.price_history  // sorted ascending by recorded_at
const first = history[0]?.price_amount
const latest = history[history.length - 1]?.price_amount
const drop = first && latest && latest < first ? first - latest : null

// Days on market
const firstSeen = new Date(car.scraped_at)
const days = Math.floor((Date.now() - firstSeen.getTime()) / 86400000)

// Color coding
const daysColor = days < 30 ? 'green' : days < 90 ? 'amber' : 'red'
```

## Files to Modify
- `components/car-card.tsx` — add badge components
- `app/api/cars/route.ts` — ensure price_history is included in list response

## Implementation Notes
The `/api/cars` list endpoint currently does not return `price_history`. Either:
- Option A: Include price_history in the list response (adds payload size)
- Option B: Compute drop/days server-side and add as computed fields to the response

Recommend Option B — add `price_drop_dkk`, `days_on_market`, `last_price_change` as computed fields in the list API response.

## Done When
1. [ ] Cards show "87 dage" badge in red for listings older than 90 days
2. [ ] Cards show "↓ 25.000 kr" amber badge when price dropped since first listing
3. [ ] Fresh listings (< 30 days) show no days badge or green badge
4. [ ] Cards with no price history show no badges (no errors)

## Dependencies
- Price history must be collecting data (SPEC-006 ✅)
- SPEC-010 (card redesign) — badges should be placed as part of that redesign

## Out of Scope
- Price history chart on detail page (SPEC-019)
- Push notifications for price drops (future)

---

# SPEC-017: About Page / TCO Explainer

## Status
backlog

## Domain Objects Touched
TcoScenario, TcoConfig (for displaying example numbers)

## Problem
First-time visitors see a list of cars with prices and TCO figures but have no context for what they mean. Without understanding why sticker price is misleading in Denmark, the tool's value is invisible.

## Approach
Static page at `/about` explaining the CarScout methodology. Written in Danish. Use real example numbers.

## Content Outline
1. **Hvorfor listepris er vildledende i Danmark** — registration tax example: 19.810 EUR Dacia Spring → actual on-road cost in DKK
2. **De tre scenarier** — DK indregistreret, DK uindregistreret, EU import — what each means and when it applies
3. **Hvad det månedlige beløb inkluderer** — breakdown of TCO components
4. **Finansieringsfølsomhed** — what the graph shows, why down payment matters
5. **Datakilde og opdatering** — scraped daily from Bilbasen + Autoscout24, SKAT 2026 regler
6. **Begrænsninger** — Tier 2 depreciation is estimated, Tier 1 builds over time

## Files to Create
- `app/about/page.tsx` — static explainer page

## Done When
1. [ ] Page accessible at /about
2. [ ] Contains all 6 sections above
3. [ ] Includes a concrete example with real numbers (e.g. Dacia Spring)
4. [ ] Mobile-readable
5. [ ] Link in navigation (see SPEC-014)

## Dependencies
- SPEC-014 (Navigation) — for the link, but page can be created first

## Out of Scope
- Interactive TCO calculator on about page (future)
- Translations to other languages

---

# SPEC-018: EU Import Scenario in Detail View

## Status
backlog

## Domain Objects Touched
Listing, TcoScenario

## Problem
The detail view shows purchase private/company scenarios. EU import scenario is computed but not separately surfaced. For DE-sourced listings (Autoscout24), the EU import scenario is the most relevant and should be prominently displayed.

## Approach
Add a third column or tab to the TCO table: "EU Import". Show separately: VAT saving, import costs, registration tax, and resulting on-road cost. Make it clear this scenario is the default for DE-sourced listings.

## Files to Modify
- `components/car-detail.tsx` — expand TCO table to include EU import column

## Done When
1. [ ] EU import column appears in TCO table for DE-sourced listings
2. [ ] Shows VAT saving, import costs, registration tax as line items
3. [ ] monthly_equivalent_dkk displayed for EU import scenarios
4. [ ] DK-registered listings show a note that EU import doesn't apply

## Dependencies
- SPEC-006 (BUG-01 — detail page must work first)

## Out of Scope
- Import cost calculator (user-adjustable import costs — future)
