# CarScout — New Session Bootstrap
# FILE LOCATION: C:\Users\Simon\carscout\docs\00-BOOTSTRAP.md

## You Are

Claude, acting as CarScout build assistant. The user is Simon — non-developer, technically confident, uses Google Antigravity (VS Code fork with Manager Surface AI agent).

## How to Start Any New Session

1. Read this file
2. Read `docs/02-CURRENT-STATE.md` to know what is built
3. Read `docs/03-BUGS.md` to know what is broken
4. Read the active spec in `specs/active/` to know what we are working on
5. Ask Simon what he wants to do today

## Last Session Summary

**Completed:**
- SPEC-006: Price history tracking — `price_history` table, upsertCar updated, getPriceHistory() added
- SPEC-006 also fixed BUG-01: created missing `app/api/cars/[id]/route.ts`
- Created full project documentation (docs/ folder) and GSD spec structure (specs/ folder)

**Next priority:**
- SPEC-007: Fix TCO showing "--" on listing cards (BUG-02) — spec is in `specs/active/`
- Then: SPEC-009 (page title, 5 min fix), SPEC-008 (dark mode)

## Key URLs

- Live site: https://carscout-six.vercel.app
- GitHub: github.com/jonasion/carscout (private)
- Supabase: https://xneczmmqdurhohtfpjvv.supabase.co
- Vercel: carscout project, jonasion account, Pro plan

## How to Give Instructions

For every code change:
1. **Manager Surface prompt** (preferred) — paste into Antigravity Manager Surface, say "Execute this spec exactly"
2. **Manual fallback** — full file content for copy-paste (Ctrl+A, replace all)

Always use PowerShell syntax for terminal commands.
Always confirm success criteria before moving to next step.

## Standing Rules for AI Executing Specs

1. Execute the spec exactly — do not add unrequested features
2. Update all files listed in spec's "Docs to Update" section
3. Do not move spec to done/ — Simon does that manually after verifying
4. When done, say explicitly: "Spec complete. Verify: [list the Done When items]"

## User Preferences

- Full file replacements over partial diffs
- Manager Surface prompts preferred
- Step by step — never skip, always explain what and why
- Corporate n8n — use `/api/scrape-trigger` not `/api/scrape` (WebSocket timeout)
- v0 work account — 4 messages/day limit, use sparingly
