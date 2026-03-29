# CarScout — Feature Roadmap

Priority order based on: (1) fixing broken core value, (2) data that compounds daily, (3) features that reframe the product.

---

## TIER 1 — Fix Core (Do First)

### BUG-01 — Detail page crash
See bugs.md. Deployed fix needs verification.

### BUG-02 — TCO on cards
Cards show "--" for TCO monthly. Fix the `/api/cars/[id]/tco` response handling in `car-card.tsx`. If no scenarios exist, show "Beregnes..." and trigger computation.

### BUG-03 — Page title
5-minute fix in `app/layout.tsx`.

---

## TIER 2 — Data Layer (Highest Long-Term Value)

### DATA-01 — Price history tracking ✅ (schema + logic done)
Every day without this is data lost forever.
- `price_history` table created ✅
- `upsertCar` now detects price changes and logs them ✅
- **Still needed:** Surface in UI (see DETAIL-02, CARD-03, CARD-04)

### DATA-02 — Days on market
Derived from `price_history.recorded_at` vs `cars_raw.scraped_at`.
- Show on card: "87 dage" in red for 90+ days, amber for 30+, green for fresh
- Show on detail: "Annonceret første gang: 12. feb 2026 (42 dage siden)"
- A car listed 90+ days in Denmark is almost always negotiable

---

## TIER 3 — Search & Filters (Purpose-Aware)

### F-01 — Filter by TCO (killer feature)
Replace/supplement price filter with TCO filter: "Vis biler under 8.000 kr/md — 3 år, privat køb."
- Requires global scenario selector (F-02) to know which scenario to filter on
- Query: `tco_scenarios.monthly_equivalent_dkk < X WHERE scenario_type='purchase' AND usage_type='private' AND holding_period_years=3`

### F-02 — Global scenario selector (persistent session setting)
Set once at top of listing page: private/company, 2/3/5 years, down payment amount.
All TCO figures on all cards update to reflect that scenario.
This makes the tool coherent — right now each card fetches all scenarios and shows "lowest" which may be a different scenario for each car.

### F-03 — Source filter as pill toggle
`Bilbasen | Autoscout24 | Begge` — replace icon dropdown. Source matters enormously for risk profile.

### F-04 — Registration scenario filter
`DK indregistreret | DK uindregistreret | EU import` — first-class filter, not buried in detail.

### F-05 — Make / Model / Year / Mileage / Power filters
- Brand dropdown (populated from distinct values in `cars_raw`)
- Model dropdown (cascades from brand)
- Year range (dual slider, e.g. 2020–2024)
- Max mileage slider
- Power range (kW)

### F-06 — Filter chips + URL persistence
Active filters shown as dismissible chips. Filter state in URL query params for bookmarking/sharing.

### F-07 — Sort controls
Sort by: TCO low→high | Listepris | Km | Alder | Dage på markedet | Prisfald
Primary use case: sort by TCO ascending = "cheapest car to own for 3 years"

### F-08 — Pagination / load more
Currently hard-limited to 50 results with no pagination.

---

## TIER 4 — Listing Cards (Information Architecture)

### CARD-01 — TCO-first layout
Current: leads with EUR sticker price
Target hierarchy:
```
[Car name]
[Year · km · Source flag]
[TCO: ~4.200 kr/md  ·  3 år privat]   ← PRIMARY
[Listepris: 19.810 EUR]                 ← SECONDARY, smaller
```

### CARD-02 — Source-country risk signal
DE-sourced listings carry import complexity. Subtle warning badge or color border on DE cards.

### CARD-03 — Price drop badge
Once price_history has data: show "↓ 25.000 kr" badge in amber. Highest-engagement card element.

### CARD-04 — Days on market badge
"87 dage" in red/orange for long-listed cars. Pairs with CARD-03 as negotiation signal cluster.

### CARD-05 — Favorite / save icon
Heart icon on hover. Persisted in localStorage initially, Supabase `favorites` table later.
Required for comparison workflow (NAV-02).

---

## TIER 5 — Navigation & Pages

### NAV-01 — Navigation bar
Currently: logo only.
Required pages: `Søg | Sammenlign | Gemte biler | Hvad er TCO?`

### NAV-02 — Comparison view
The tagline says "TCO Car Comparison" but comparison doesn't exist.
- Checkbox on cards (max 3 selected)
- Sticky bottom bar: "Sammenlign 2 biler →"
- Comparison view: side-by-side table of all TCO scenarios
- Makes the winner immediately obvious

### NAV-03 — Pagination
See F-08.

---

## TIER 6 — Car Detail Page

### DETAIL-01 — EU import scenario surfaced explicitly
Currently detail shows purchase private/company. Missing: EU import tab/column showing:
- VAT saving (~5% of purchase price for used >6mo, >6000km)
- Import costs (15,000 DKK generic)
- Net TCO vs. DK registered equivalent

### DETAIL-02 — Price history sparkline
Small line chart: price over time since first seen. Even 2 weeks of data is meaningful.
Data source: `price_history` table.

### DETAIL-03 — Days on market + listing timeline
"First seen: 12. februar 2026 (42 dage siden)" — motivates negotiation framing.

### DETAIL-04 — Link to original listing
Prominent CTA: "Se annonce på Bilbasen →" / "Se annonce på AutoScout24 →"
Currently missing entirely.

### DETAIL-05 — Financing sensitivity graph visibility
Already built but may be buried. Ensure it's visible without scrolling and has an explanatory label.

---

## TIER 7 — Onboarding & Trust

### ONBOARD-01 — About / TCO explainer page
Content needed:
1. Why sticker price is meaningless in Denmark (registration tax)
2. The three scenarios (DK reg, DK unreg, EU import)
3. What the monthly figure includes (depreciation at exit, financing, running costs, tax)
4. What the financing sensitivity graph shows
5. Data freshness (scraped daily, SKAT 2026 rules)
6. Limitations (Tier 2 depreciation until market data builds)

### ONBOARD-02 — First-visit scenario modal
On first visit: "Er du privat eller erhverv? Hvor lang tid regner du med at eje bilen?"
Sets global scenario (F-02). Transformative for comprehension.

### ONBOARD-03 — Data freshness indicator
"Opdateret i dag" or timestamp somewhere visible. Trust signal.

---

## TIER 8 — Visual Design

### VD-01 — Dark mode
Tailwind CSS change ~30 minutes. High priority as evening research tool.

### VD-02 — Card hover states
Subtle elevation + border highlight on hover.

### VD-03 — Filter bar labels
Current icon dropdowns are cryptic. Label them explicitly.

### VD-04 — Currency consistency
Cards mix EUR and DKK. Either normalize to DKK or make currency explicit per listing.

### VD-05 — Image quality
Some images are dealer watermark collages. Enforce consistent aspect ratio and fallback placeholder.

---

## Future / Backlog

- **Email negotiation agent** — `contact_log` table already exists. Agent drafts initial offer email based on TCO analysis and days on market
- **Depreciation curve builder** — Build model-specific curves from scraped historical data (replaces Tier 2 heuristics)
- **mobile.de scraper** — Blocked by Akamai currently. Revisit with Apify actor
- **Price alerts** — Notify when a saved car drops in price
- **User accounts** — Replace localStorage favorites with Supabase auth
