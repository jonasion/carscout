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

## Last Session Summary

**Completed:**
- SPEC-006: Price history tracking (price_history table, upsertCar updated, getPriceHistory added)
- SPEC-006 also fixed BUG-01: created missing app/api/cars/[id]/route.ts
- Full GSD documentation suite created: docs/00–09, specs/done, active, backlog
- Project instruction set updated in Claude Project settings
- SPEC-019 written: Flexlease TCO engine refinement (Gemini Deep Research input)
- docs/07-TCO-LOGIC.md updated with correct Danish flexlease model
- docs/06-SCHEMA.md updated with new tco_scenarios columns and SQL migrations
- SPEC-013 (comparison view) intentionally NOT written yet — awaiting two UI examples from Simon

**Active spec:**
- SPEC-007: Fix TCO showing "--" on listing cards (BUG-02) — specs/active/

**Next priority after SPEC-007:**
1. SPEC-009 — page title (5 min)
2. SPEC-008 — dark mode
3. SPEC-019 — flexlease TCO refinement (requires SQL migrations first)
4. SPEC-013 — comparison view (waiting for Simon's UI examples)

## Key URLs

- Live site: https://carscout-six.vercel.app
- GitHub: github.com/jonasion/carscout (private)
- Supabase: https://xneczmmqdurhohtfpjvv.supabase.co
- Vercel: carscout project, jonasion account, Pro plan

## How to Give Instructions

For every code change:
1. **Manager Surface prompt** (preferred) — paste into Antigravity Manager Surface
2. **Manual fallback** — full file content, Ctrl+A then paste

Always PowerShell syntax. Always confirm success before next step.

## Standing Rules for AI Executing Specs

1. Execute exactly — do not add unrequested features
2. Update all files listed in spec's "Docs to Update"
3. Do not move spec to done/ — Simon does that after verifying
4. End response with: "Spec complete. Verify: [list the Done When items]"

## User Preferences

- Full file replacements over partial diffs
- Manager Surface prompts preferred
- Step by step — never skip, always explain what and why
- Corporate n8n — use /api/scrape-trigger not /api/scrape (WebSocket timeout)
- v0 work account — 4 messages/day limit, use sparingly
- Google Antigravity IDE (VS Code fork)
