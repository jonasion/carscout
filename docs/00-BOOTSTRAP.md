# CarScout — New Session Bootstrap
# FILE LOCATION: C:\Users\Simon\carscout\docs\00-BOOTSTRAP.md

## You Are

Claude, acting as CarScout build assistant. The user is Simon — non-developer,
technically confident, uses Google Antigravity (VS Code fork with Manager Surface AI agent).

## How to Start Any New Session

1. Read this file
2. Read `docs/02-CURRENT-STATE.md` — what is built
3. Read `docs/03-BUGS.md` — what is broken
4. Read the active spec in `specs/active/` — what we are working on
5. Ask Simon what he wants to do today

## Last Session Summary (2026-03-29)

**Completed:**
- SPEC-007: BUG-02 fixed — TCO cards show real values (was already done in code)
- SPEC-009: Page title changed to "CarScout" (no spec file existed, just a roadmap item)
- SPEC-008: Dark mode with next-themes, system preference detection, toggle in settings
- SPEC-020: Unified TCO engine update (supersedes SPEC-019):
  - Purchase origin handling: dk_registered, dk_exlease, de_import, de_import_exlease
  - Registration tax correctly calculated on afgiftspligtig værdi (base + moms)
  - German cars compute both de_import AND de_import_exlease scenarios
  - Flexlease full decomposition: tax bracket, state interest, finance interest, admin, moms
  - Flexlease depreciation on base_value only (not on_road_cost)
  - Age-dependent forholdsmæssig registreringsafgift (0.5%/1%/2%)
  - i18n foundation: lib/i18n/ with dictionary, useLocale hook, DA/EN toggle in settings
  - SQL migrations: new tco_config rows, new tco_scenarios columns, origin rename
- SPEC-013 Phase 1: Client-side comparison engine (lib/comparison/)
- SPEC-013 Phase 2: Comparison view at /compare with:
  - Full purchase breakdown per origin (moms, afgiftspligtig værdi, reg tax, totalpris)
  - Full flexlease decomposition (monthly components ex/incl moms)
  - Settings sidebar with all adjustable variables
  - Car search modal, add/remove cars, max 5
  - EUR→DKK conversion with original in brackets
  - Info icon tooltips on complex terms
  - Lowest TCO highlighting (green)
- Flexlease TCO formula fix: removed exit value subtraction, added depreciation
- Math validated: all Porsche Taycan numbers verified line by line ✓

**Engine verified with Porsche Taycan (DE Import, EV, 24 months):**
- DE Import (brugtmoms): 485,143 on plates → 8,032 kr/md ✓
- DE Import (ex-leasing): 648,916 on plates → 10,898 kr/md ✓
- Flexlease: 3,521 kr/md incl moms, TCO 265,821 → 11,076 kr/md ✓

**Not completed / deferred:**
- SPEC-013 Phase 3: Checkboxes on car cards, sticky comparison bar, nav link
- SPEC-013 Phase 4: Mobile layout, kW/HP toggle, backport EUR/flags to cards
- BUG-06 through BUG-09 (logged, not fixed)
- SPEC-021: Corporate cost model (written, in backlog)
- N/A display for irrelevant zero-value rows in comparison view
- Company scenario hidden/removed (SPEC-021 handles this properly)
- Batch doc updates deferred to start of next session

**Active spec:**
- SPEC-020 is complete (move to done/)
- SPEC-013 Phase 2 is complete
- Next priorities below

**Next priority:**
1. SPEC-021 — Corporate cost model (remove erhvervskøb, split erhvervsleasing, beskatningsgrundlag)
2. SPEC-013 Phase 3 — Car selection from listing grid
3. SPEC-013 Phase 4 — Polish (mobile, kW/HP, backports)
4. N/A display for zero rows in comparison view
5. BUG-06 (kW/HP confusion), BUG-07 (EUR on cards), BUG-08 (flags), BUG-09 (hidden 5yr)

## Key URLs

- Live site: https://carscout-six.vercel.app
- Comparison: https://carscout-six.vercel.app/compare
- GitHub: github.com/jonasion/carscout (private)
- Supabase: https://xneczmmqdurhohtfpjvv.supabase.co
- Vercel: carscout project, jonasion account, Pro plan

## How to Give Instructions

For every code change:
1. **Manager Surface prompt** (preferred) — paste into Antigravity Manager Surface
2. **Manual fallback** — full file content, Ctrl+A then paste

**WARNING:** The Manager Surface has overwritten app/page.tsx multiple times
when asked to create app/compare/page.tsx. For any file creation in the /compare
directory, use PowerShell Set-Content or manual file creation in Antigravity.
Never delegate compare page creation to the agent.

Always PowerShell syntax. Always confirm success before next step.

## Standing Rules for AI Executing Specs

1. Execute exactly — do not add unrequested features
2. Update all files listed in spec's "Docs to Update"
3. Do not move spec to done/ — Simon does that after verifying
4. End response with: "Spec complete. Verify: [list the Done When items]"

## User Preferences

- Full file replacements over partial diffs
- Manager Surface prompts preferred (but NOT for /compare page creation)
- Step by step — never skip, always explain what and why
- Corporate n8n — use /api/scrape-trigger not /api/scrape (WebSocket timeout)
- v0 work account — limited messages/day, use sparingly
- Google Antigravity IDE (VS Code fork)

## Architecture Notes

- Server-side TCO engine: lib/tco/calculate.ts
- Client-side comparison engine: lib/comparison/calculate.ts (must stay in sync)
- i18n: lib/i18n/dictionary.ts + useLocale.ts hook
- Comparison store: lib/comparison/store.ts (localStorage)
- Origin types: dk_registered, dk_exlease, de_import, de_import_exlease
- Registration tax input: afgiftspligtig værdi (base + moms), NOT base alone
- Flexlease depreciation: on base_value only, NOT on_road_cost
- Flexlease formula: does NOT subtract exit value (lessee returns car)
