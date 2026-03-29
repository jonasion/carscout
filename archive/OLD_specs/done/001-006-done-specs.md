# SPEC-001: Database Schema

## Status
done

## What was built
- 6 Supabase tables: cars_raw, tco_scenarios, depreciation_curves, search_profiles, contact_log, tco_config
- 19 rows seeded in tco_config
- car-images Storage bucket (public)

---

# SPEC-002: TCO Engine

## Status
done

## What was built
- lib/tco/calculate.ts — Full 2026 Danish registration tax (ICE + EV), CO2 surcharge, EU import, annuity loan, flexlease IRR, Tier 1/2 depreciation
- lib/db/tco.ts — TCO scenario CRUD
- app/api/cars/[id]/tco/route.ts — GET + POST

---

# SPEC-003: Scrapers

## Status
done

## What was built
- lib/scrapers/bilbasen.ts — two-step search + _props extraction
- lib/scrapers/autoscout24.ts — Scrapfly + __NEXT_DATA__ extraction
- app/api/scrape/route.ts — routes by source
- 7 search profiles seeded in Supabase

---

# SPEC-004: n8n Automation

## Status
done

## What was built
- app/api/scrape-trigger/route.ts — non-blocking trigger
- n8n workflow: Schedule → GET profiles → Loop → POST scrape-trigger
- Workflow published and active on corporate n8n

---

# SPEC-005: Frontend v1

## Status
done (with BUG-01, BUG-02 outstanding)

## What was built
- app/page.tsx — car grid + detail routing
- components/car-card.tsx — listing card with TCO fetch
- components/car-detail.tsx — full detail view
- components/filter-bar.tsx — fuel/source/country/price filters
- components/empty-state.tsx
- shadcn/ui components installed
- Recharts installed for financing sensitivity graph
- Deployed to Vercel Pro (carscout-six.vercel.app)

---

# SPEC-006: Price History Tracking

## Status
done

## What was built
- price_history table in Supabase
- upsertCar() updated to detect price changes and log PriceEvents
- getPriceHistory() added to lib/db/cars.ts
- app/api/cars/[id]/route.ts created (was missing — fixed BUG-01)
