# CarScout — GSD Methodology & Spec Template

## What GSD Is

Get Shit Done (GSD) is a spec-driven development methodology for AI-assisted coding. It solves two problems:

1. **Vibecoding** — vague instructions produce vague code
2. **Context rot** — AI loses project history across sessions

The solution: write a precise spec before any AI touches code. The spec is the context. The AI executes the spec. You verify against the spec.

---

## Folder Structure

```
specs/
  _template.md          This file — copy to create new specs
  done/                 Completed specs (archive, never delete)
    001-schema.md
    002-tco-engine.md
    003-scrapers.md
    004-n8n-automation.md
    005-frontend-v1.md
    006-price-history.md
  active/               Currently being worked on (max 1-2 at a time)
    007-bug02-tco-cards.md
  backlog/              Approved, not yet started
    008-dark-mode.md
    009-page-title.md
    010-listing-card-redesign.md
    011-global-scenario-selector.md
    012-favorites.md
    013-comparison-view.md
    014-navigation.md
    015-search-filters.md
    016-price-drop-badges.md
    017-days-on-market.md
    018-about-page.md
    019-eu-import-detail.md
    020-scraper-refactor.md
```

---

## The Spec Lifecycle

```
Idea → backlog/ → active/ → (execute) → done/
```

1. **Idea** — comes from roadmap, bug report, or user observation
2. **Backlog** — written as a spec, waiting for prioritization
3. **Active** — being executed right now
4. **Done** — verified complete, moved to archive

Never have more than 2 specs in `active/` simultaneously.

---

## How to Execute a Spec

**In Google Antigravity Manager Surface:**
1. Open a new chat/session in Manager Surface
2. Paste the contents of the active spec
3. Say: "Execute this spec exactly. Ask me before deviating from it."
4. Review the output against the spec's "Done When" criteria
5. If it passes: move spec to `done/`, commit code
6. If it fails: note what went wrong in the spec, retry

**In Claude.ai (for complex reasoning or design):**
1. Paste `00-BOOTSTRAP.md` + `08-DOMAIN-MODEL.md` + the specific spec
2. Ask for help refining the spec or reasoning through the approach
3. Then hand the refined spec to Antigravity for execution

---

## The Spec Template

```markdown
# SPEC-[NUMBER]: [Title]

## Status
backlog | active | done

## Domain Objects Touched
List which objects from 08-DOMAIN-MODEL.md this spec involves.
Example: Listing, PriceEvent, TcoScenario

## Problem
One paragraph. What is broken or missing? Why does it matter?
Be specific — reference domain objects and file names.

## Approach
How we will solve it. Reference existing patterns in the codebase.
If creating new classes/objects, define their interface here.

## Files to Create
- `path/to/new-file.ts` — what it contains

## Files to Modify
- `path/to/existing-file.ts` — what changes and why

## Files NOT to Touch
List files that might seem related but should not be changed.
This prevents scope creep.

## Implementation Notes
Specific technical decisions, constraints, or patterns to follow.
Reference the domain model naming conventions.
Include any SQL if schema changes are needed.

## Done When
Numbered, testable checklist. Each item must be verifiable by
opening the browser or running a command — not by reading code.

1. [ ] Opening the site shows X
2. [ ] Clicking Y does Z
3. [ ] Database table contains expected rows

## Dependencies
List any specs that must be done first.
Example: "Requires SPEC-007 (BUG-02) to be complete first"

## Out of Scope
Explicitly list things this spec does NOT do.
This is as important as what it does do.
```

---

## Naming Conventions in Specs

Always use domain model names (from `08-DOMAIN-MODEL.md`):
- `Listing` not "car" or "vehicle"
- `PriceEvent` not "price history entry"
- `TcoScenario` not "scenario" or "result"
- `monthly_equivalent_dkk` not "TCO" or "monthly cost"
- `session_id` not "user" (pre-auth)

---

## What Makes a Good Spec

**Too vague (bad):**
```
Add dark mode to the site.
```

**Too detailed (bad — this is code, not a spec):**
```
In globals.css line 47, change --background from #ffffff to #0a0a0a.
In layout.tsx add className="dark" to the html element...
```

**Just right:**
```
## Problem
The site has no dark mode. It is used primarily in the evening
for research. Tailwind's darkMode: 'class' strategy is already
configured. We need to add a toggle that persists in localStorage.

## Approach
Add a ThemeProvider component that reads/writes localStorage key
'carscout-theme'. Wrap app/layout.tsx with it. Add a toggle button
to the header. Use Tailwind dark: prefix classes throughout.

## Done When
1. [ ] A sun/moon toggle appears in the header
2. [ ] Clicking it switches the site to dark mode
3. [ ] Refreshing the page preserves the selected theme
4. [ ] All existing UI elements are readable in dark mode
```

---

## Anti-Patterns to Avoid

**Scope creep** — the AI will often do more than asked. The spec's "Out of Scope" section prevents this. If the AI adds unrequested features, reject and re-run.

**Missing "Done When"** — without testable criteria, you can't know if the spec was executed correctly. Every spec needs at least 3 verifiable items.

**Skipping domain objects** — if the spec doesn't reference domain objects, the AI will invent its own names. This creates inconsistency across sessions.

**Active without backlog** — never start building before writing the spec. The 10 minutes writing the spec saves hours of debugging AI mistakes.
