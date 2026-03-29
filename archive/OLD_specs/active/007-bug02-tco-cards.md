# SPEC-007: Fix TCO display on Listing cards (BUG-02)

## Status
active

## Domain Objects Touched
Listing, TcoScenario

## Problem
Listing cards display "From --" instead of a monthly TCO figure. The card component (`components/car-card.tsx`) fetches `/api/cars/[id]/tco` for each card and attempts to find the minimum `monthly_equivalent_dkk` across all TcoScenarios. If the array is empty, `Math.min(...[])` returns `Infinity`, which renders as "--".

This is the most damaging visible bug — the primary value proposition of CarScout (TCO not sticker price) is invisible on every card.

## Approach
Two-part fix:

**Part 1 — Handle empty TcoScenario array gracefully**
In `car-card.tsx`, if the fetched `tco_scenarios` array is empty, show "Beregnes..." instead of "--". Do not show Infinity or a dash.

**Part 2 — Trigger TCO computation if missing**
If `/api/cars/[id]/tco` (GET) returns an empty array, the card should fire a POST to `/api/cars/[id]/tco` to trigger computation, then re-fetch. This should happen silently in the background — show "Beregnes..." while waiting.

Add a loading state that distinguishes between:
- `loading` — initial fetch in progress
- `computing` — TCO being computed (POST fired, waiting)
- `ready` — scenarios available, show minimum
- `empty` — no scenarios and computation failed

## Files to Modify
- `components/car-card.tsx` — update TCO fetch logic and display states

## Files NOT to Touch
- `app/api/cars/[id]/tco/route.ts` — do not change the API
- `lib/tco/calculate.ts` — do not change the engine
- `lib/db/tco.ts` — do not change the DB layer

## Implementation Notes

The fetch sequence in `car-card.tsx` should be:

```typescript
// 1. GET scenarios
const res = await fetch(`/api/cars/${car.id}/tco`)
const data = await res.json()

// 2. If empty, trigger computation
if (!data.tco_scenarios || data.tco_scenarios.length === 0) {
  setStatus('computing')
  await fetch(`/api/cars/${car.id}/tco`, { method: 'POST' })
  // Re-fetch after computation
  const res2 = await fetch(`/api/cars/${car.id}/tco`)
  const data2 = await res2.json()
  // use data2.tco_scenarios
}

// 3. Find minimum monthly_equivalent_dkk
const scenarios = data.tco_scenarios ?? []
const values = scenarios
  .map(s => s.monthly_equivalent_dkk)
  .filter(v => v != null && isFinite(v))

const lowest = values.length > 0 ? Math.min(...values) : null
```

Display:
- `null` → "Beregnes..."
- valid number → format as "4.200 kr/md"

Use Danish number formatting: `new Intl.NumberFormat('da-DK').format(value)`

## Done When
1. [ ] All cards on the live site show a TCO figure OR "Beregnes..." — never "--" or "Infinity"
2. [ ] Clicking a card that showed "Beregnes..." and returning to the list shows a real figure after ~30 seconds
3. [ ] Cards with valid TCO scenarios show a formatted DKK number like "4.200 kr/md"

## Dependencies
None. SPEC-006 (BUG-01 detail page) should be deployed first but is independent.

## Out of Scope
- Do not change which scenario is used as the "best" (minimum is correct for now)
- Do not add scenario selector to the card (that is SPEC-011)
- Do not change card layout or visual design (that is SPEC-010)
