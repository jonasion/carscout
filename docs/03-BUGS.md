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
**Status:** ✅ Resolved — SPEC-007
**Fix:** Four-state display (loading/computing/ready/failed), POST trigger for empty scenarios

## BUG-03 — Page title is "Create Next App"
**Status:** Open — SPEC-009 in backlog/  
**Fix:** Update metadata in app/layout.tsx  
**Time to fix:** 5 minutes  

## BUG-04 — Country shows "dk DK" on cards (cosmetic)
**Status:** ✅ Resolved
**Fix:** Country names mapped (Danmark, Tyskland, Holland, Belgien, etc.)
