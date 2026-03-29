# CarScout — Technical Architecture

## File Structure

```
C:\Users\Simon\carscout\
├── app/
│   ├── api/
│   │   ├── cars/
│   │   │   ├── route.ts                    # GET list, handles filters
│   │   │   └── [id]/
│   │   │       ├── route.ts                # GET single car + price_history
│   │   │       └── tco/
│   │   │           └── route.ts            # GET scenarios, POST compute
│   │   ├── scrape/
│   │   │   └── route.ts                    # Routes to bilbasen or autoscout24 scraper
│   │   └── scrape-trigger/
│   │       └── route.ts                    # Non-blocking trigger (returns immediately)
│   ├── layout.tsx
│   └── page.tsx                            # Main car grid + detail view
├── components/
│   ├── ui/                                 # shadcn/ui components
│   ├── car-card.tsx                        # Listing card with TCO fetch
│   ├── car-detail.tsx                      # Full detail view
│   ├── empty-state.tsx
│   └── filter-bar.tsx
├── hooks/
│   └── use-mobile.ts
├── lib/
│   ├── db/
│   │   ├── cars.ts                         # upsertCar, getCarById, listCars, getPriceHistory
│   │   └── tco.ts                          # TCO scenario CRUD
│   ├── scrapers/
│   │   ├── bilbasen.ts
│   │   └── autoscout24.ts
│   ├── supabase/
│   ├── tco/
│   │   └── calculate.ts                    # Full TCO engine
│   ├── types.ts
│   └── utils.ts
└── vercel.json                             # maxDuration: 300 for scrape route
```

## Key Technical Decisions

### Scraper approaches
- **Bilbasen:** Detail page `_props` extraction (not search API) — promoted listings don't expose specs via API
- **Autoscout24:** `__NEXT_DATA__` JSON extraction via Scrapfly (`render_js=false`)

### upsertCar returns `string | null`
Returns the car ID directly. Scrapers use null-check helpers `n()` and `s()` to convert null to undefined for optional fields.

### Next.js 15 async params
Route params are async: `const { id } = await params`

### n8n calls scrape-trigger not scrape
Corporate WebSocket proxy kills connections after ~30s. `/api/scrape-trigger` returns instantly, fires actual scrape in background on Vercel (up to 300s via Pro plan).

### Vercel deployment protection
Must be DISABLED for n8n to call the API without authentication.

## Supabase Project
- URL: `https://xneczmmqdurhohtfpjvv.supabase.co`
- Storage bucket: `car-images` (public)
- Image path pattern: `{source}/{source_listing_id}.webp`

## n8n Workflow
- Corporate n8n instance
- Workflow: Schedule Trigger → HTTP GET Supabase search_profiles → Loop Over Items (loop output) → HTTP POST /api/scrape-trigger
- Published and active
- Manual test runs fail due to corporate WebSocket timeout — scheduled runs work independently

## TCO Computation Flow
1. Scraper calls `upsertCar()` → gets car ID
2. Scraper calls POST `/api/cars/[id]/tco`
3. `computeAllScenarios()` runs all combinations: purchase/lease × private/company × 2yr/3yr/5yr × dk_registered/dk_unregistered/eu_import (where applicable)
4. Results stored in `tco_scenarios` table
5. Frontend fetches scenarios per car for display

## Price History Flow
1. `upsertCar()` checks if car already exists in `cars_raw`
2. If new car OR price changed: inserts row into `price_history`
3. Logs price change to console: `Price change detected: {id} {old} → {new}`
4. `getPriceHistory(carId)` returns all price points ordered by `recorded_at`
