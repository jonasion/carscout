# CarScout — Bug Tracker
# FILE LOCATION: C:\Users\Simon\carscout\docs\03-BUGS.md

## Resolved

## BUG-01 — Car detail page crashes on click
**Status:** ✅ Resolved — SPEC-006
**Fix:** Created app/api/cars/[id]/route.ts

## BUG-02 — TCO shows "--" on listing cards
**Status:** ✅ Resolved — SPEC-007
**Fix:** Four-state display, POST trigger for empty scenarios

## BUG-03 — Page title is "Create Next App"
**Status:** Open — SPEC-009 in backlog
**Fix:** Update metadata in app/layout.tsx (5 min fix)

## BUG-04 — Country shows "dk DK" on cards
**Status:** ✅ Resolved
**Fix:** Country names mapped (Danmark, Tyskland, Holland, Belgien)

## BUG-05 — FuelBadge crashes on unknown fuel types
**Status:** ✅ Resolved
**Fix:** Fallback for unmapped fuel_type values

## BUG-06 — Lease listings show monthly payment as purchase price
**Status:** ✅ Resolved
**Fix:** Cards detect listing_type=lease and show kr/md format

## BUG-07 — n8n scraper adding unwanted non-favorite cars
**Status:** ✅ Resolved
**Fix:** n8n disabled, API filters to is_favorited=true only

## Open Issues

## BUG-08 — Transmission inconsistency (Automatisk vs automatic)
**Status:** Open — cosmetic
**Cause:** Bilbasen stores Danish names, AutoScout24 stores English

## BUG-09 — Some AutoScout24 cars may have incomplete data
**Status:** Open — needs audit
**Cause:** Single listing page data structure varies

## BUG-10 — TCO running costs are zeroed out
**Status:** Open — by design, pending real data sources
**Note:** Insurance, maintenance, fuel excluded until findforsikring.dk / Consumer Reports / fuel price APIs integrated