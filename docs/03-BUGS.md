# CarScout — Bug Tracker
# FILE LOCATION: C:\Users\Simon\carscout\docs\03-BUGS.md

## Resolved

### BUG-01 — Detail page crash (missing route)
**Resolved in:** SPEC-006
**Fix:** Created `app/api/cars/[id]/route.ts`

### BUG-02 — TCO shows "--" on all cards
**Resolved in:** SPEC-007
**Fix:** Four display states in car-card.tsx, trigger POST computation on empty

### BUG-03 — Page title "Create Next App"
**Resolved in:** Session 2026-03-29 (no spec file, roadmap item)
**Fix:** Updated metadata in app/layout.tsx to "CarScout"

## Open

### BUG-06 — Power displayed as kW but value is HP
**Severity:** Medium
**Where:** Car cards and detail view (Specifikationer → Effekt)
**Example:** BMW M4 shows "317 kW" but the car is 317 HP (233 kW actual)
**Root cause:** Scraper stores HP value in `power_kw` column without converting
**Fix needed:** Scraper conversion + HP/kW toggle in settings + backfill

### BUG-07 — EUR price shown without DKK conversion on cards
**Severity:** High
**Where:** Car cards and old detail view
**Example:** BMW M4 shows "39.990 EUR" without DKK equivalent
**Fix needed:** Show DKK primary, EUR in soft brackets on cards
**Note:** Comparison view already handles this correctly

### BUG-08 — Country flags not rendering in detail view
**Severity:** Low
**Where:** Detail view shows "BE Belgien" instead of flag emoji
**Fix needed:** Ensure countryFlags map is complete in detail view

### BUG-09 — Headline TCO pulls from hidden 5-year scenario
**Severity:** Medium
**Where:** Old detail view "Laveste månedlige TCO"
**Example:** Shows 5yr number but table only has 1/2/3yr columns
**Fix needed:** Moot when comparison view replaces detail TCO display

### BUG-10 — Zero values shown where N/A is appropriate
**Severity:** Low
**Where:** Comparison view
**Example:** "Moms 25%: 0 kr" for brugtmoms, "Importomkostninger: 0 kr" for DK cars
**Fix needed:** Show "Ikke relevant" / "N/A" instead of "0 kr" for inapplicable rows
