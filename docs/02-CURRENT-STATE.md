# CarScout — Current Build State
# FILE LOCATION: C:\Users\Simon\carscout\docs\02-CURRENT-STATE.md
# UPDATE THIS FILE whenever a spec is completed

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, Tailwind CSS, shadcn/ui, Recharts |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage (car-images bucket, public) |
| Scrapers | Bilbasen (custom), Autoscout24 via Scrapfly |
| Automation | n8n (corporate instance, published workflow) |
| Hosting | Vercel Pro (carscout-six.vercel.app) |
| Repo | github.com/jonasion/carscout (private) |

## Project Root

`C:\Users\Simon\carscout`

## What Is Complete

| Spec | What Was Built | Status |
|---|---|---|
| SPEC-001 | Database schema — 6 tables, tco_config seeded, car-images bucket | ✅ Done |
| SPEC-002 | TCO engine — 2026 SKAT rules, all scenarios, lib/tco/calculate.ts | ✅ Done |
| SPEC-003 | Scrapers — Bilbasen + Autoscout24, 7 search profiles seeded | ✅ Done |
| SPEC-004 | n8n automation — scrape-trigger endpoint, workflow published | ✅ Done |
| SPEC-005 | Frontend v1 — car grid, detail view, filters, deployed to Vercel | ✅ Done |
| SPEC-006 | Price history — price_history table, upsertCar updated, /api/cars/[id]/route.ts created | ✅ Done |

## Current Data Volume

- ~130 cars in cars_raw
- 1000+ TCO scenarios in tco_scenarios
- price_history collecting from next scrape cycle onward

## Key File Locations

| File | Purpose |
|---|---|
| lib/tco/calculate.ts | TCO computation engine |
| lib/db/cars.ts | upsertCar, getCarById, listCars, getPriceHistory |
| lib/db/tco.ts | TCO scenario CRUD |
| lib/scrapers/bilbasen.ts | Bilbasen scraper |
| lib/scrapers/autoscout24.ts | Autoscout24 scraper |
| app/api/cars/route.ts | List cars with filters |
| app/api/cars/[id]/route.ts | Single car + price history |
| app/api/cars/[id]/tco/route.ts | TCO scenarios + compute |
| app/api/scrape/route.ts | Scrape dispatcher |
| app/api/scrape-trigger/route.ts | Non-blocking trigger for n8n |
| app/page.tsx | Main page — car grid + detail routing |
| components/car-card.tsx | Listing card |
| components/car-detail.tsx | Detail view |
| components/filter-bar.tsx | Filter controls |
| vercel.json | maxDuration: 300 for scrape route |

## Known Issues

See docs/03-BUGS.md
