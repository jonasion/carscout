# CarScout — Bug Tracker
# FILE LOCATION: C:\Users\Simon\carscout\docs\03-BUGS.md
# UPDATE THIS FILE when bugs are fixed or new ones found

## BUG-01 — Car detail page crashes on click
**Status:** Fix deployed — needs verification  
**Spec:** SPEC-006  
**Cause:** app/api/cars/[id]/route.ts was missing  
**Fix:** Created the route, returns car + price_history  
**Verify:** Click any car card on https://carscout-six.vercel.app — detail view should load

## BUG-02 — TCO shows "--" on listing cards
**Status:** Open — SPEC-007 in active/  
**Cause:** Math.min(...[]) returns Infinity when tco_scenarios array is empty  
**Fix:** See specs/active/007-bug02-tco-cards.md  

## BUG-03 — Page title is "Create Next App"
**Status:** Open — SPEC-009 in backlog/  
**Fix:** Update metadata in app/layout.tsx  
**Time to fix:** 5 minutes  

## BUG-04 — Country shows "dk DK" on cards (cosmetic)
**Status:** Partially fixed  
**Cause:** Flag emoji duplicated with country code  
**Fix:** Verify countryFlags mapping in car-card.tsx  
