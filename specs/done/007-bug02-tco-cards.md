# SPEC-007: Fix TCO display on Listing cards (BUG-02)
# FILE LOCATION: C:\Users\Simon\carscout\specs\active\007-bug02-tco-cards.md

## Status
active

## Domain Objects Touched
Listing, TcoScenario

## Problem
Listing cards display "From --" instead of a monthly TCO figure. The card component (`components/car-card.tsx`) fetches `/api/cars/[id]/tco` for each card and calls `Math.min()` on the results. If the array is empty, `Math.min(...[])` returns `Infinity`, which renders as "--".

This is the most damaging visible bug — the primary value proposition of CarScout is invisible on every card.

## Approach
Two-part fix:

**Part 1 — Handle empty TcoScenario array gracefully**
If `tco_scenarios` is empty, show "Beregnes..." instead of "--" or Infinity.

**Part 2 — Trigger TCO computation if missing**
If GET `/api/cars/[id]/tco` returns empty array, fire POST to same endpoint to trigger computation, then re-fetch. Show "Beregnes..." while waiting.

Four display states:
- `loading` — initial fetch in progress → show skeleton
- `computing` — POST fired, waiting → show "Beregnes..."
- `ready` — scenarios available → show minimum monthly_equivalent_dkk
- `failed` — computation failed → show "—"

## Files to Modify
- `components/car-card.tsx` — update TCO fetch logic and display states

## Files NOT to Touch
- `app/api/cars/[id]/tco/route.ts`
- `lib/tco/calculate.ts`
- `lib/db/tco.ts`
- Any other file

## Implementation Notes

Fetch sequence:
```typescript
// 1. GET scenarios
const res = await fetch(`/api/cars/${car.id}/tco`)
const data = await res.json()
const scenarios = data.tco_scenarios ?? []

// 2. If empty, trigger computation
if (scenarios.length === 0) {
  setStatus('computing')
  await fetch(`/api/cars/${car.id}/tco`, { method: 'POST' })
  const res2 = await fetch(`/api/cars/${car.id}/tco`)
  const data2 = await res2.json()
  scenarios = data2.tco_scenarios ?? []
}

// 3. Find minimum
const values = scenarios
  .map(s => s.monthly_equivalent_dkk)
  .filter(v => v != null && isFinite(v) && v > 0)
const lowest = values.length > 0 ? Math.min(...values) : null
```

Display format: `new Intl.NumberFormat('da-DK').format(value)` + " kr/md"
Example output: "4.200 kr/md"

## Done When
1. [ ] All cards on https://carscout-six.vercel.app show a TCO figure OR "Beregnes..." — never "--"
2. [ ] No card shows "Infinity" or NaN
3. [ ] Cards with valid scenarios show formatted Danish number like "4.200 kr/md"
4. [ ] Cards that triggered computation show "Beregnes..." while waiting

## Docs to Update
- `docs/02-CURRENT-STATE.md` — SPEC-007 marked done
- `docs/03-BUGS.md` — BUG-02 marked resolved

## Dependencies
SPEC-006 (BUG-01 fix) should be deployed first — it is.

## Out of Scope
- Do not change card visual layout
- Do not add scenario selector to card
- Do not change which scenario is used as headline (minimum is correct for now)
