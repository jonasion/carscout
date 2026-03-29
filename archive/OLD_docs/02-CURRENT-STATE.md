# CarScout — Current Build State

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, Tailwind CSS, shadcn/ui, Recharts |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage (`car-images` bucket, public) |
| Scrapers | Bilbasen (custom), Autoscout24 via Scrapfly |
| Automation | n8n (corporate instance, published workflow) |
| Hosting | Vercel Pro (carscout-six.vercel.app) |
| Repo | github.com/jonasion/carscout (private) |

## Project Root

`C:\Users\Simon\carscout`

## Environment Variables (.env.local)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)
- `SCRAPFLY_API_KEY` — Scrapfly key for Autoscout24

## What Is Built and Working

### Phase 1 — Schema ✅
Six tables in Supabase: `cars_raw`, `tco_scenarios`, `depreciation_curves`, `search_profiles`, `contact_log`, `tco_config`
- `tco_config` seeded with 19 rows of default values
- `car-images` Supabase Storage bucket (public)
- `price_history` table added (schema only, logic wired)

### Phase 2 — TCO Engine ✅
- `lib/tco/calculate.ts` — Full 2026 Danish registration tax (ICE + EV), CO2 surcharge, EU import VAT exemption, annuity loan, flexlease IRR, restvaerdi risk, Tier 1/2 depreciation, running costs
- `lib/db/cars.ts` — `upsertCar` now detects price changes and logs to `price_history`
- `lib/db/tco.ts` — `getTcoScenariosForCar`, `getBestScenarioPerCar`, `getScenariosForComparison`, `deleteScenariosForCar`
- `app/api/cars/[id]/tco/route.ts` — GET returns scenarios, POST triggers `computeAllScenarios`
- `app/api/cars/route.ts` — List and upsert cars

### Phase 3 — Scrapers ✅
**Bilbasen** (`lib/scrapers/bilbasen.ts`):
- Two-step: POST to search API → detail page `_props` extraction
- Extracts: km, CO2, fuel consumption, fuel type, transmission, power
- Auto-uploads primary image to `car-images` bucket
- Auto-triggers `computeAllScenarios` after upsert
- Live result: ~28 cars saved per run

**Autoscout24** (`lib/scrapers/autoscout24.ts`):
- Uses Scrapfly: `render_js=false`, extracts `__NEXT_DATA__` JSON
- Field mapping from `vehicle`, `tracking`, `vehicleDetails`, `wltpValues`
- Live result: ~100 cars per run, 1000+ TCO scenarios across 83 cars

**mobile.de** — SKIPPED. Akamai Bot Manager blocks all attempts including residential German IPs.

**Search profiles seeded** (7 active):
- `EV under 300k` — Bilbasen
- `EV 300k-500k` — Bilbasen
- `Mercedes EQ series` — Bilbasen
- `VW ID family` — Bilbasen
- `ICE under 200k` — Bilbasen
- `AS24 EV Germany` — Autoscout24
- `AS24 EV under 30k EUR` — Autoscout24

### Phase 4 — Automation ✅
- n8n workflow: Schedule Trigger → GET active profiles from Supabase → Loop → POST `/api/scrape-trigger`
- `/api/scrape-trigger/route.ts` — Non-blocking, returns `{accepted: true}` instantly, fires scrape in background
- `/api/scrape/route.ts` — Routes by source to bilbasen or autoscout24 scraper, updates `last_run_at`
- Workflow published and active on corporate n8n instance

### Phase 5 — Frontend ✅ (partial)
- Car grid with photo, specs, fuel badge, country, TCO monthly
- Filter bar: fuel type, source, country, min/max price
- Car detail: hero image, specs, TCO table (private/company × 2/3/5yr), financing sensitivity graph, dealer info
- Loading skeletons, empty state
- **BUG: Detail page crashes on click** — `/api/cars/[id]/route.ts` was missing (now added in latest commit)

## Current Data Volume
- ~130 cars in `cars_raw`
- 1000+ TCO scenarios in `tco_scenarios`
- `price_history` table created, logic wired — will populate from next scrape cycle

## Known Issues
See `03-BUGS.md`
