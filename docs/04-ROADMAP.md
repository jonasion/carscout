# CarScout — Feature Roadmap
# FILE LOCATION: C:\Users\Simon\carscout\docs\04-ROADMAP.md

Priority order: (1) fix broken core, (2) data compounding daily,
(3) features that reframe the product, (4) polish.

---

## TIER 1 — Fix Core (Do First)

### BUG-02 — TCO "--" on cards — SPEC-007 (active)
Math.min(...[]) returns Infinity when tco_scenarios is empty.
Fix fetch logic in car-card.tsx. Trigger computation if missing.

### BUG-03 — Page title — SPEC-009 (backlog)
5-minute fix in app/layout.tsx.

### BUG-04 — Country "dk DK" on cards
10-minute fix in car-card.tsx countryFlags mapping.

### BUG-05 — Images null for many listings
Image upload retry in scrapers, or fallback to first image_urls entry.

---

## TIER 2 — TCO Accuracy (High Business Value)

### SPEC-019 — Flexlease TCO engine refinement (backlog)
Three critical fixes to the flexlease calculation:
1. Depreciation base = base_value only (not on_road_cost)
2. Age-dependent forholdsmæssig registreringsafgift (2%/1%/0.5%)
3. Moms on monthly payments for private consumers
Plus: monthly payment decomposition stored, Danish tooltip dictionary.
Requires SQL migrations before execution.

---

## TIER 3 — Search & Filters

### SPEC-011 — Global scenario selector (backlog)
Set private/company, 2/3/5yr, down payment once at top of page.
All cards show TCO for that scenario consistently.
This + SPEC-010 is the single most transformative pair of changes.

### SPEC-015 — Make/Model/Year/Mileage filters (backlog)
Brand dropdown, cascading model, year range, max km, power.

### F-01 — Filter by TCO range (not yet specced)
"Show me cars under 8,000 kr/md — 3yr private."
Depends on SPEC-011 (scenario must be set first).

### F-06 — URL persistence of filters (not yet specced)
Bookmarkable searches. Filter state in URL query params.

### F-07 — Sort by TCO ascending (not yet specced)
The primary use case: "cheapest car to own for 3 years."

### F-08 — Pagination (not yet specced)
Currently hard-limited to 50 results.

---

## TIER 4 — Listing Cards

### SPEC-010 — TCO-first card layout (backlog)
Lead with monthly_equivalent_dkk, not EUR sticker price.
Add price drop badge, days-on-market badge, favorite heart.

### SPEC-016 — Price drop + days-on-market badges (backlog)
Compute signals server-side in list API.
Green/amber/red days badge. Amber price drop badge.

---

## TIER 5 — Navigation & Pages

### SPEC-008 — Dark mode (backlog)
~30 minutes. Tailwind darkMode: 'class'. Theme toggle in header.

### SPEC-014 — Navigation bar (backlog)
Søg | Gemte biler | Sammenlign | Hvad er TCO? + theme toggle.

### SPEC-012 — Favorites (backlog)
FavoriteStore class, localStorage, /favorites page. Max 10.

### SPEC-013 — Comparison view (backlog — AWAITING UI EXAMPLES)
Side-by-side TCO table for up to 3 cars.
**Do not spec until Simon provides two UI layout examples.**

---

## TIER 6 — Car Detail Page

### SPEC-018 — EU import scenario in detail view (backlog)
Third column/tab for DE-sourced listings showing VAT saving,
import costs, and net TCO vs DK registered equivalent.

### DETAIL-02 — Price history sparkline (not yet specced)
Line chart of price over time since first seen.
Depends on price_history accumulating data.

### DETAIL-03 — Days on market + listing timeline (not yet specced)
"First seen: 12. feb 2026 (42 dage siden)"

### DETAIL-04 — Link to original listing (not yet specced)
"Se annonce på Bilbasen →" — currently completely missing.

---

## TIER 7 — Onboarding & Trust

### SPEC-017 — About page / TCO explainer (backlog)
Danish language. Six sections. Concrete example with real numbers.

### ONBOARD-02 — First-visit scenario modal (not yet specced)
"Er du privat eller erhverv? Hvor lang tid regner du med at eje bilen?"
Sets global scenario on first visit. Transformative for comprehension.

### ONBOARD-03 — Data freshness indicator (not yet specced)
"Opdateret i dag" — trust signal.

---

## TIER 8 — Visual Design

### VD-04 — Filter bar labels (not yet specced)
Current icon dropdowns are unlabelled. 5-minute fix.

### VD-05 — Currency consistency (not yet specced)
Cards mix EUR and DKK. Normalise or make explicit per listing.

---

## Future / Backlog (ambitious, not yet specced)

- **Email negotiation agent** — contact_log table ready, agent drafts offer
  based on TCO, days-on-market, price drop history
- **Depreciation curve builder** — auto-build Tier 1 curves from
  accumulated price_history data. Currently all Tier 2.
- **mobile.de scraper** — blocked by Akamai. Revisit with Apify actor.
- **Price drop alerts** — notify when a favorited car drops in price
- **CO2 / ejerafgift in running costs** — annual road tax currently excluded.
  15,000–25,000 DKK/year for high-emission ICE cars.
- **Real insurance quotes** — replace flat % estimate with Tryg/Topdanmark API
- **Comparison share link** — /compare?ids=abc,def,ghi bookmarkable
- **Export to PDF** — "Download TCO analysis" for this car and scenario
- **Bilbasen flexlease listings** — separate search URL, not yet scraped
- **User accounts** — Supabase Auth to replace localStorage session_id
- **WLTP correction factor** — real-world consumption 15–25% above WLTP for EVs
- **Dealer trust score** — aggregate negotiability signals per dealer
