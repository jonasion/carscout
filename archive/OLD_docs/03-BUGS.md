# CarScout — Bug Tracker

## BUG-01 — Car detail page crashes on click (CRITICAL)
**Status:** Fix deployed, needs verification  
**Cause:** `app/api/cars/[id]/route.ts` was missing. Only the TCO sub-route existed.  
**Fix:** Created `app/api/cars/[id]/route.ts` that calls `getCarById` + `getPriceHistory` and returns `{ ...car, price_history: [] }`  
**Verify:** Click any car card on the live site. Detail view should load.

## BUG-02 — TCO values show "--" on cards
**Status:** Open  
**Cause:** Card fetches `/api/cars/[id]/tco` for each car on load. Either the TCO scenarios haven't been computed for all cars, or the API returns a shape the card isn't handling correctly.  
**Fix needed:**
1. Check `/api/cars/[id]/tco` for a known car ID — confirm it returns `tco_scenarios` array
2. In `car-card.tsx`, the fetch maps `.tco_scenarios` and calls `Math.min(...)` — if the array is empty, `Math.min()` returns `Infinity`, which displays as `--`
3. Add a fallback: if no scenarios exist, trigger POST to `/api/cars/[id]/tco` to compute them, or display "TCO beregnes..."

## BUG-03 — Page title is "Create Next App"
**Status:** Open  
**Fix:** In `app/layout.tsx`, update the metadata export:
```typescript
export const metadata = {
  title: 'CarScout — Find dit næste køretøj på ærlig TCO',
  description: 'Sammenlign biler på ægte totalomkostning — ikke listepris.',
}
```

## BUG-04 — Country displays as "dk DK" on cards (cosmetic)
**Status:** Partially fixed — flag emoji may not render in all environments  
**Fix:** Ensure `countryFlags` mapping returns emoji + uppercase code without duplication

## BUG-05 — Images are placeholder initials for many cards
**Status:** Known/acceptable  
**Cause:** `stored_image_url` is null for some listings where image upload to Supabase Storage failed  
**Fix:** Image upload retry logic in scraper, or fallback to first URL in `image_urls` array directly
