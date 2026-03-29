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
| SPEC-001 | Database schema — 6 tables + tco_config + is_favorited column | ✅ Done |
| SPEC-002 | TCO engine v3 — 2026 SKAT rules, EUR→DKK, lease scenarios, no running costs | ✅ Done |
| SPEC-003 | Scrapers — Bilbasen (lease/afgift detection, EV data) + AutoScout24 (single listing) | ✅ Done |
| SPEC-004 | n8n automation — disabled, replaced by favorites import pipeline | ✅ Done |
| SPEC-005 | Frontend — grid + table view, filters, sort, detail page with TCO breakdown | ✅ Done |
| SPEC-006 | Price history — price_history table, upsertCar tracks changes | ✅ Done |
| SPEC-007 | TCO card display — 4-state (loading/computing/ready/failed) | ✅ Done |
| SPEC-010 | Filter bar rework — 11 filters, two-tier, dynamic dropdowns | ✅ Done |

## Current Data Volume

- 74 favorited cars (52 Bilbasen + 22 AutoScout24)
- TCO scenarios computed for all cars
- n8n scraper disabled — only favorites import is active

## Key API Endpoints

| Endpoint | Purpose |
|---|---|
| GET /api/cars | List cars (favorites only, with filters) |
| GET /api/cars/[id] | Single car + price history |
| GET /api/cars/[id]/tco | TCO scenarios |
| POST /api/cars/[id]/tco | Trigger TCO computation |
| GET /api/cars/filters | Distinct values for filter dropdowns |
| POST /api/import/favorites | Import from Bilbasen or AutoScout24 URLs |
| GET /api/settings | Read user TCO settings |
| POST /api/settings | Save user TCO settings |

## Key File Locations

| File | Purpose |
|---|---|
| lib/tco/calculate.ts | TCO engine v3 |
| lib/db/cars.ts | Car CRUD + listCars with TCO join + getFilterOptions |
| lib/scrapers/bilbasen.ts | Bilbasen scraper (lease/afgift/EV detection) |
| lib/scrapers/autoscout24.ts | AutoScout24 scraper (search + single listing) |
| app/api/import/favorites/route.ts | Multi-source favorites import |
| app/api/settings/route.ts | User TCO settings |
| app/page.tsx | Main page — grid/table toggle, filters, sort, settings modal |
| components/car-card.tsx | Listing card (lease-aware) |
| components/car-detail.tsx | Detail view — specs, TCO breakdown, comparison table |
| components/filter-bar.tsx | Two-tier filter controls |

## Known Issues

See docs/03-BUGS.md
